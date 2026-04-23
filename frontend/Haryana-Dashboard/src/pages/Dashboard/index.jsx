import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, WMSTileLayer, useMap } from "react-leaflet";
import { RoadAthena, City, Muncipal, Road, Ward } from "../../assets/svgs";
import InputDropdown from "../../component/InputDropdown/InputDropdown";
import RoadSelector from "./components/RoadSelector";
import RoadDetailsDialog from "./components/RoadDetailsDialog";
import { MAP_LAYERS } from "./constants";
import { useFilterCascade, useMapAnimation, useRoadData, MapFlyTo, useRegionOverview } from "./hooks";
import {
  filterGeoJsonByCities,
  getFeatureStyle,
  isValidGeoJSON,
} from "./utils";
import haryanaBorderRaw from "../../../haryanaOverlay.geojson?raw";

const haryanaBorderGeoJSON = JSON.parse(haryanaBorderRaw);

const wmsSldBody = `
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>gps_workspace:road_geometry</Name>
    <UserStyle>
      <FeatureTypeStyle>
        <Rule>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#3b82f6</CssParameter>
              <CssParameter name="stroke-width">3</CssParameter>
              <CssParameter name="stroke-opacity">0.9</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
`.trim();


const DynamicZoomController = ({ isEnabled }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (isEnabled) {
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      if (map.touchZoom) map.touchZoom.enable();
    } else {
      if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
      if (map.touchZoom) map.touchZoom.disable();
    }
  }, [map, isEnabled]);
  return null;
};

const Dashboard = () => {
  // ── Road data & map state ────────────────────────────────────────────
  const {
    geoJsonData,
    filteredGeoJsonData,
    setFilteredGeoJsonData,
    cityOptions,
    isLoadingCityData,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapKey,
    setMapKey,
    flyTarget,
    setFlyTarget,
  } = useRoadData();

  // ── Filter cascade: City → MC → Ward → Roads ─────────────────────────
  const {
    selectedCities,
    setSelectedCities,
    selectedMunicipalCouncil,
    setSelectedMunicipalCouncil,
    setSelectedMunicipalCouncilOption,
    selectedWard,
    setSelectedWard,
    selectedWardLabel,
    setSelectedWardLabel,
    selectedRoads,
    setSelectedRoads,
    isLoadingMunicipalCouncil,
    isLoadingWard,
    isLoadingRoad,
    municipalCouncilOptions,
    wardOptions,
    roadOptions,
  } = useFilterCascade(
    geoJsonData,
    setFilteredGeoJsonData,
    setMapCenter,
    setMapZoom,
    setMapKey,
    setFlyTarget,
  );

  // ── Map animation ─────────────────────────────────────────────────────
  const { animatedMapCenter, animatedMapZoom, animatedMapKey } =
    useMapAnimation(selectedCities, geoJsonData, mapCenter, mapZoom, mapKey, setFlyTarget);

  // ── Region Overview API ───────────────────────────────────────────────
  const selectedCityId = selectedCities.length > 0 ? selectedCities[0].value : null;
  const { overviewData, isLoadingOverview } = useRegionOverview(selectedCityId);

  // ── Map layer ─────────────────────────────────────────────────────────
  const mapLayers = MAP_LAYERS;
  const [mapLayer, setMapLayer] = useState("default");

  // ── View mode: general | category ────────────────────────────────────
  const [viewMode, setViewMode] = useState("general");
  const [showHasWidth, setShowHasWidth] = useState(true);
  const [showNoWidth, setShowNoWidth] = useState(true);

  // ── Filter state ──────────────────────────────────────────────────────
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // ── Road detail dialog ────────────────────────────────────────────────
  const [selectedRoadId, setSelectedRoadId] = useState(null);

  // ── Border Toggle ─────────────────────────────────────────────────────
  const [showHaryanaBorder, setShowHaryanaBorder] = useState(true);

  // ── Zoom Error Overlay ────────────────────────────────────────────────
  const [showZoomError, setShowZoomError] = useState(false);
  
  // ── WMS Loading State ─────────────────────────────────────────────────
  const [isWmsLoading, setIsWmsLoading] = useState(true);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleClearSelection = () => {
    setSelectedCities([]);
    setSelectedMunicipalCouncil("");
    setSelectedMunicipalCouncilOption(null);
    setSelectedWard("");
    setSelectedWardLabel("");
    setSelectedRoads([]);
    setFilteredGeoJsonData(geoJsonData);
    setIsFilterApplied(false);
    setFlyTarget({ center: [29.0588, 75.8507], zoom: 9 });
  };

  const handleCityDropdownChange = (event) => {
    const city = event.selectedItem;
    setSelectedCities([city]);
    if (geoJsonData) {
      setFilteredGeoJsonData(filterGeoJsonByCities(geoJsonData, [city]));
    }
  };

  const handleMCDropdownChange = (event) => {
    // The new API uses the raw circle string (e.g. "Municipal Council Rewari")
    // as both label and value — just store it directly.
    setSelectedMunicipalCouncil(event.selectedItem.value);
    setSelectedMunicipalCouncilOption(null); // interface compat — no-op in new hook
    setSelectedWard("");
    setSelectedWardLabel("");
    setSelectedRoads([]);
  };

  const handleWardDropdownChange = (event) => {
    setSelectedWard(event.selectedItem.value);
    setSelectedWardLabel(event.selectedItem.label);
    setSelectedRoads([]);
  };

  const handleRoadToggle = (road) => {
    setSelectedRoads((prev) => {
      const exists = prev.some((r) => r.value === road.value);
      return exists ? prev.filter((r) => r.value !== road.value) : [...prev, road];
    });
  };

  const handleClearRoads = () => setSelectedRoads([]);
  const handleSelectAllRoads = () => setSelectedRoads([...roadOptions]);
  const handleApplyFilter = () => setIsFilterApplied(true);

  const handleResetFilter = () => {
    setSelectedMunicipalCouncil("");
    setSelectedMunicipalCouncilOption(null);
    setSelectedWard("");
    setSelectedWardLabel("");
    setSelectedRoads([]);
    if (selectedCities.length === 0) {
      setFlyTarget({ center: [29.0588, 75.8507], zoom: 9 });
    }
    setIsFilterApplied(false);
  };

  // ── Category-filtered GeoJSON (for category view checkboxes) ──────────
  // hasWidth = width is a number strictly > 0
  // noWidth  = width is null, undefined, empty string, or 0
  const displayGeoJson = useMemo(() => {
    if (!filteredGeoJsonData || !isValidGeoJSON(filteredGeoJsonData)) return filteredGeoJsonData;
    if (viewMode !== "category") return filteredGeoJsonData;
    if (showHasWidth && showNoWidth) return filteredGeoJsonData;
    return {
      ...filteredGeoJsonData,
      features: filteredGeoJsonData.features.filter((f) => {
        const w = f.properties?.width;
        // Treat 0, null, undefined, "", " " all as "no width"
        const numW = parseFloat(w);
        const hasWidth = w !== null && w !== undefined &&
          String(w).trim() !== "" && !isNaN(numW) && numW > 0;
        return hasWidth ? showHasWidth : showNoWidth;
      }),
    };
  }, [filteredGeoJsonData, viewMode, showHasWidth, showNoWidth]);

  // GeoJSON key — forces re-render when data, view mode, OR width filters change
  const geoJsonKey = displayGeoJson
    ? `${JSON.stringify(displayGeoJson).length}_${viewMode}_${showHasWidth ? 1 : 0}_${showNoWidth ? 1 : 0}`
    : `empty_${viewMode}`;

  // ── Map feature styling + interaction ───────────────────────────────
  const onEachFeature = useCallback((feature, layer) => {
    const baseStyle = getFeatureStyle(feature, viewMode);
    layer.setStyle(baseStyle);

    // ── r_temp_id tooltip label ──
    const props = feature.properties || {};
    const tempId = props.r_temp_id ?? props.rTempId ?? null;
    if (tempId) {
      layer.bindTooltip(String(tempId), {
        permanent: false,
        sticky: true,
        direction: "top",
        className: "road-label-tooltip",
        offset: [0, -4],
      });
    }

    // ── Hover: widen line for easy precision selection ──
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ ...baseStyle, weight: 10, opacity: 1 });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(baseStyle);
      },
      click: (e) => {
        const p = e.target.feature.properties;
        const rid = p?.road_id ?? p?.id;
        if (rid) setSelectedRoadId(rid);
      },
    });
  }, [viewMode]);

  // ── Breadcrumb for overlay ────────────────────────────────────────────
  const cityLabel = selectedCities.length > 0 ? selectedCities.map((c) => c.label).join(", ") : "City";
  const councilLabel = selectedMunicipalCouncil || "Council";
  const wardLabel = selectedWardLabel || "Ward";
  const roadsLabel =
    selectedRoads.length === 0
      ? "Road"
      : selectedRoads.length === 1
        ? selectedRoads[0].label
        : `${selectedRoads.length} roads`;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">

      {/* ══ Header ══════════════════════════════════════════════════════ */}
      <header className="flex-none flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200 shadow-[0_1px_6px_-2px_rgba(15,23,42,0.1)] z-50">
        <RoadAthena width={24} height={30} />
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-[17px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            Road
          </span>
          <span className="text-[17px] font-extrabold text-blue-600 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            Atthena
          </span>
        </div>
        <span className="ml-auto text-[12px] text-slate-400 font-medium hidden sm:block" style={{ fontFamily: 'Inter, sans-serif' }}>
          Haryana Road Network Dashboard
        </span>
      </header>

      {/* ══ Filter Row ══════════════════════════════════════════════════ */}
      <div className="flex-none bg-white border-b border-slate-200 px-5 lg:px-7 py-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <InputDropdown
            label="City"
            value={selectedCities.length > 0 ? selectedCities[0].label : ""}
            onChange={handleCityDropdownChange}
            onClear={handleClearSelection}
            optionList={cityOptions}
            placeholder="Select City"
            name="city"
            icon={<City width={18} />}
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Municipal Council"
            value={selectedMunicipalCouncil}
            onChange={handleMCDropdownChange}
            optionList={municipalCouncilOptions}
            placeholder="Select Council"
            name="municipalCouncil"
            icon={<Muncipal width={18} />}
            width="100%"
            isSearchable
            disabled={selectedCities.length === 0}
          />
          <InputDropdown
            label="Ward"
            value={selectedWardLabel}
            onChange={handleWardDropdownChange}
            optionList={wardOptions}
            placeholder="Select Ward"
            name="ward"
            icon={<Ward width={18} />}
            width="100%"
            isSearchable
            disabled={!selectedMunicipalCouncil}
          />
          <RoadSelector
            selectedRoads={selectedRoads}
            roadOptions={roadOptions}
            isLoadingRoad={isLoadingRoad}
            onRoadToggle={handleRoadToggle}
            onClearRoads={handleClearRoads}
            onSelectAllRoads={handleSelectAllRoads}
            disabled={!selectedWard}
            icon={<Road width={18} />}
          />
          <div className="flex gap-2 h-[42px]">
            <button
              onClick={handleApplyFilter}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-all duration-150 whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1" style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Apply
            </button>
            <button
              onClick={handleClearSelection}
              className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 border border-red-200 rounded-lg text-[13px] font-semibold transition-all duration-150 whitespace-nowrap outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              title="Reset all filters and return to full map view"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ══ Map Area — fills remaining space ════════════════════════════ */}
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">

          {/* ── Loading overlay ── */}
          {(isLoadingCityData || isLoadingMunicipalCouncil || isLoadingWard || isLoadingRoad || (selectedCities.length === 0 && isWmsLoading)) && (
            <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-2xl shadow-xl border border-slate-100">
                <div className="w-9 h-9 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest myriad-pro-semibold">
                  {isLoadingCityData ? "Loading Map Data" :
                    isLoadingMunicipalCouncil ? "Loading Circles…" :
                      isLoadingWard ? "Loading Wards…" :
                        (selectedCities.length === 0 && isWmsLoading) ? "Loading Geoserver Data…" : "Loading Roads…"}
                </p>
              </div>
            </div>
          )}

          {/* ── Floating toolbar: Layer + View Mode ── */}
          <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-3
                          bg-white/92 backdrop-blur-xl rounded-2xl px-4 py-3
                          shadow-[0_6px_28px_-4px_rgba(15,23,42,0.20)] border border-slate-100/80"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Layer picker */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Layer</span>
              <select
                value={mapLayer}
                onChange={(e) => setMapLayer(e.target.value)}
                className="text-[13px] border border-slate-200 bg-white text-slate-700 rounded-lg px-3 py-1.5
                           cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30
                           transition-shadow font-semibold min-w-[90px]"
              >
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <option key={key} value={key}>{layer.name}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-slate-200" />
            
            {/* Border Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Border</span>
              <div className={`relative inline-flex h-[20px] w-8 items-center rounded-full transition-colors ${showHaryanaBorder ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${showHaryanaBorder ? 'translate-x-[15px]' : 'translate-x-[3px]'}`} />
              </div>
              <input type="checkbox" checked={showHaryanaBorder} onChange={(e) => setShowHaryanaBorder(e.target.checked)} className="sr-only" />
            </label>

            <div className="w-px h-6 bg-slate-200" />

            {/* View mode pill toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">View</span>
              {["general", "category"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setShowHasWidth(true); setShowNoWidth(true); }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold tracking-wide transition-all duration-150
                    ${viewMode === mode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 border border-slate-200"}`}
                >
                  {mode === "general" ? "General" : "Category"}
                </button>
              ))}
            </div>

            {/* Category checkboxes — only in category mode */}
            {viewMode === "category" && (
              <>
                <div className="w-px h-6 bg-slate-200" />
                {/* Has Width toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <span
                    className={`w-4 h-4 rounded-full flex-shrink-0 ring-2 transition-all
                      ${showHasWidth
                        ? "bg-blue-500 ring-blue-200"
                        : "bg-slate-300 ring-slate-200"}`}
                  />
                  <input
                    type="checkbox"
                    checked={showHasWidth}
                    onChange={(e) => setShowHasWidth(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`text-[13px] font-semibold transition-colors ${showHasWidth ? "text-blue-700" : "text-slate-400 line-through"
                    }`}>Has Width</span>
                </label>
                {/* No Width toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <span
                    className={`w-4 h-4 rounded-full flex-shrink-0 ring-2 transition-all
                      ${showNoWidth
                        ? "bg-amber-400 ring-amber-200"
                        : "bg-slate-300 ring-slate-200"}`}
                  />
                  <input
                    type="checkbox"
                    checked={showNoWidth}
                    onChange={(e) => setShowNoWidth(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`text-[13px] font-semibold transition-colors ${showNoWidth ? "text-amber-700" : "text-slate-400 line-through"
                    }`}>No Width</span>
                </label>
              </>
            )}
          </div>

          {/* ── Leaflet Map ── */}
          <div 
            className="h-full w-full"
            onWheelCapture={() => {
              if (selectedCities.length === 0) {
                setShowZoomError(true);
                // Automatically hide the error message after 3.5 seconds
                setTimeout(() => setShowZoomError(false), 3500);
              }
            }}
          >
            
            {/* ── Error Handling / Initial Load Hint ── */}
            {selectedCities.length === 0 && showZoomError && (
              <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 backdrop-blur-sm border border-red-200 px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(220,38,38,0.15)] pointer-events-none flex items-center gap-3 transition-opacity duration-300">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-[13.5px] font-semibold text-red-700 tracking-wide">
                  Please select a city from the dropdown before zooming into any detail
                </span>
              </div>
            )}

            {displayGeoJson && isValidGeoJSON(displayGeoJson) ? (
              <MapContainer
                key={animatedMapKey}
                center={animatedMapCenter}
                zoom={animatedMapZoom}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
                zoomAnimation
                fadeAnimation
                markerZoomAnimation
              >
                <DynamicZoomController isEnabled={selectedCities.length > 0} />
                <TileLayer
                  url={mapLayers[mapLayer].url}
                  attribution={mapLayers[mapLayer].attribution}
                />
                {selectedCities.length === 0 ? (
                  <WMSTileLayer
                    url="http://localhost:8080/geoserver/gps_workspace/wms"
                    layers="gps_workspace:road_geometry"
                    format="image/png"
                    transparent={true}
                    sld_body={wmsSldBody}
                    eventHandlers={{
                      loading: () => setIsWmsLoading(true),
                      load: () => setIsWmsLoading(false),
                      tileerror: () => setIsWmsLoading(false),
                    }}
                  />
                ) : (
                  <GeoJSON
                    key={geoJsonKey}
                    data={displayGeoJson}
                    onEachFeature={onEachFeature}
                  />
                )}
                
                {/* ── Haryana Border Permanent Layer ── */}
                {showHaryanaBorder && haryanaBorderGeoJSON && (
                  <GeoJSON
                    key={`haryana-border-${showHaryanaBorder}`}
                    data={haryanaBorderGeoJSON}
                    style={{
                      color: "#334155",
                      weight: 3,
                      fill: false,
                      opacity: 0.5,
                      dashArray: "6, 8"
                    }}
                    interactive={false}
                  />
                )}
                
                <MapFlyTo flyTarget={flyTarget} />
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <div className="text-4xl mb-3 opacity-30">🗺️</div>
                  <p className="text-slate-400 font-medium text-sm">No map data available</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Region Overview — bottom-right frosted overlay ── */}
          <div className="absolute bottom-4 right-3 z-[500]
                          bg-white/92 backdrop-blur-xl rounded-2xl
                          border border-slate-100/80
                          shadow-[0_8px_32px_-8px_rgba(15,23,42,0.22)]
                          px-5 py-4 min-w-[260px] max-w-[320px] pointer-events-none"
            style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-slate-600 uppercase tracking-[0.12em]">
                  Region Overview
                </p>
              </div>
              {isLoadingOverview && (
                <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
              )}
            </div>

            {/* Breadcrumb chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { val: cityLabel, dflt: "City", cls: "bg-blue-50 text-blue-700 border-blue-100" },
                { val: councilLabel, dflt: "Council", cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
                { val: wardLabel, dflt: "Ward", cls: "bg-violet-50 text-violet-700 border-violet-100" },
                { val: roadsLabel, dflt: "Road", cls: "bg-slate-50 text-slate-600 border-slate-200" },
              ].map(({ val, dflt, cls }) => (
                <span
                  key={dflt}
                  className={`text-[11px] font-semibold border rounded-lg px-2 py-0.5 truncate max-w-[140px]
                              ${val === dflt ? "opacity-40" : ""} ${cls}`}
                >
                  {val}
                </span>
              ))}
            </div>

            {/* Live Stat cards from /region-overview */}
            {(() => {
              const fmt = (n) => {
                if (n == null) return "—";
                const num = Number(n);
                if (isNaN(num)) return "—";
                if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
                if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
                return num % 1 === 0 ? String(num) : num.toFixed(2);
              };
              const ls = overviewData?.length_stats;
              const stats = [
                { label: "Total Roads", value: fmt(overviewData?.total_roads), unit: "", color: "bg-blue-50 border-blue-100 text-blue-700" },
                { label: "Total Length", value: fmt(ls?.total_length), unit: "km", color: "bg-indigo-50 border-indigo-100 text-indigo-700" },
                { label: "Avg Length", value: fmt(ls?.avg_length), unit: "km", color: "bg-violet-50 border-violet-100 text-violet-700" },
                { label: "Max Length", value: fmt(ls?.max_length), unit: "km", color: "bg-slate-50 border-slate-200 text-slate-600" },
              ];
              return (
                <div className="grid grid-cols-2 gap-2">
                  {stats.map(({ label, value, unit, color }) => (
                    <div key={label} className={`flex flex-col rounded-xl px-3 py-2.5 border ${color}`}>
                      <span className={`text-[16px] font-bold leading-tight ${isLoadingOverview ? "opacity-40" : ""
                        }`}>
                        {value}
                        {unit && value !== "—" && (
                          <span className="text-[10px] font-medium opacity-70 ml-0.5">{unit}</span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mt-0.5">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ══ Road Details Dialog ══════════════════════════════════════════ */}
      <RoadDetailsDialog
        roadId={selectedRoadId}
        onClose={() => setSelectedRoadId(null)}
      />
    </div>
  );
};

export default Dashboard;
