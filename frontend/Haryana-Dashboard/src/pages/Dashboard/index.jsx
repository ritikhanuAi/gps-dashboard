import "leaflet/dist/leaflet.css";
import { useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { RoadAthena, City, Muncipal, Road, Ward } from "../../assets/svgs";
import InputDropdown from "../../component/InputDropdown/InputDropdown";
import RoadSelector from "./components/RoadSelector";
import RoadDetailsDialog from "./components/RoadDetailsDialog";
import { MAP_LAYERS, STATS_TEMPLATE } from "./constants";
import { useFilterCascade, useMapAnimation, useRoadData, MapFlyTo } from "./hooks";
import {
  filterGeoJsonByCities,
  getFeatureStyle,
  isValidGeoJSON,
} from "./utils";

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

  // ── Map layer ─────────────────────────────────────────────────────────
  const mapLayers = MAP_LAYERS;
  const [mapLayer, setMapLayer] = useState("default");

  // ── View mode: general | category ────────────────────────────────────
  const [viewMode, setViewMode] = useState("general");
  const [showHasWidth, setShowHasWidth] = useState(true);
  const [showNoWidth, setShowNoWidth]   = useState(true);

  // ── Filter state ──────────────────────────────────────────────────────
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // ── Road detail dialog ────────────────────────────────────────────────
  const [selectedRoadId, setSelectedRoadId] = useState(null);

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
    setSelectedMunicipalCouncil(event.selectedItem.label);
    setSelectedMunicipalCouncilOption(event.selectedItem);
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

  const handleClearRoads    = () => setSelectedRoads([]);
  const handleSelectAllRoads = () => setSelectedRoads([...roadOptions]);
  const handleApplyFilter   = () => setIsFilterApplied(true);

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
  const displayGeoJson = useMemo(() => {
    if (!filteredGeoJsonData || !isValidGeoJSON(filteredGeoJsonData)) return filteredGeoJsonData;
    if (viewMode !== "category") return filteredGeoJsonData;
    if (showHasWidth && showNoWidth) return filteredGeoJsonData;
    return {
      ...filteredGeoJsonData,
      features: filteredGeoJsonData.features.filter((f) => {
        const w = f.properties?.width;
        const hasWidth = w !== null && w !== undefined && parseFloat(w) > 0;
        return hasWidth ? showHasWidth : showNoWidth;
      }),
    };
  }, [filteredGeoJsonData, viewMode, showHasWidth, showNoWidth]);

  // GeoJSON key — forces re-render when data OR view mode changes
  const geoJsonKey = displayGeoJson
    ? `${JSON.stringify(displayGeoJson).length}_${viewMode}`
    : `empty_${viewMode}`;

  // ── Map feature styling ───────────────────────────────────────────────
  const onEachFeature = (feature, layer) => {
    layer.setStyle(getFeatureStyle(feature, viewMode));
    layer.on({
      click: (e) => {
        const props = e.target.feature.properties;
        if (props && props.id) setSelectedRoadId(props.id);
      },
    });
  };

  // ── Breadcrumb for overlay ────────────────────────────────────────────
  const cityLabel   = selectedCities.length > 0 ? selectedCities.map((c) => c.label).join(", ") : "City";
  const councilLabel = selectedMunicipalCouncil || "Council";
  const wardLabel    = selectedWardLabel || "Ward";
  const roadsLabel   =
    selectedRoads.length === 0
      ? "Road"
      : selectedRoads.length === 1
      ? selectedRoads[0].label
      : `${selectedRoads.length} roads`;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">

      {/* ══ Header ══════════════════════════════════════════════════════ */}
      <header className="flex-none flex items-center gap-2.5 px-5 py-2.5 bg-white border-b border-slate-200 shadow-[0_1px_6px_-2px_rgba(15,23,42,0.1)] z-50">
        <RoadAthena width={22} height={28} />
        <span className="text-[15px] font-bold text-slate-800 tracking-tight myriad-pro-semibold leading-none">
          RoadAthena
        </span>
        <span className="ml-auto text-xs text-slate-400 font-medium hidden sm:block">
          Haryana Road Network Dashboard
        </span>
      </header>

      {/* ══ Filter Row ══════════════════════════════════════════════════ */}
      <div className="flex-none bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
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
          <div className="flex gap-2 h-[38px]">
            <button
              onClick={handleApplyFilter}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold shadow-sm transition-all duration-150 myriad-pro-semibold whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Apply
            </button>
            <button
              onClick={handleResetFilter}
              className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 rounded-lg text-sm font-semibold transition-all duration-150 myriad-pro-semibold whitespace-nowrap outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
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
          {isLoadingCityData && (
            <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-md flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 bg-white/90 px-8 py-6 rounded-2xl shadow-xl border border-slate-100">
                <div className="w-9 h-9 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest myriad-pro-semibold">
                  Loading Map Data
                </p>
              </div>
            </div>
          )}

          {/* ── Floating toolbar: Layer + View Mode ── */}
          <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-2 bg-white/85 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-white/70">
            {/* Layer picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layer</span>
              <select
                value={mapLayer}
                onChange={(e) => setMapLayer(e.target.value)}
                className="text-xs border border-slate-200 bg-white text-slate-700 rounded-lg px-2 py-1 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              >
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <option key={key} value={key}>{layer.name}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* View mode picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">View</span>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setShowHasWidth(true);
                  setShowNoWidth(true);
                }}
                className="text-xs border border-slate-200 bg-white text-slate-700 rounded-lg px-2 py-1 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              >
                <option value="general">General View</option>
                <option value="category">Category View</option>
              </select>
            </div>

            {/* Category checkboxes — only in category mode */}
            {viewMode === "category" && (
              <>
                <div className="w-px h-4 bg-slate-200" />
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <input
                    type="checkbox"
                    checked={showHasWidth}
                    onChange={(e) => setShowHasWidth(e.target.checked)}
                    className="accent-blue-500 w-3 h-3 cursor-pointer"
                  />
                  Has Width
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <input
                    type="checkbox"
                    checked={showNoWidth}
                    onChange={(e) => setShowNoWidth(e.target.checked)}
                    className="accent-amber-500 w-3 h-3 cursor-pointer"
                  />
                  No Width
                </label>
              </>
            )}
          </div>

          {/* ── Leaflet Map ── */}
          <div className="h-full w-full">
            {displayGeoJson && isValidGeoJSON(displayGeoJson) ? (
              <MapContainer
                key={animatedMapKey}
                center={animatedMapCenter}
                zoom={animatedMapZoom}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
                zoomAnimation
                fadeAnimation
                markerZoomAnimation
              >
                <TileLayer
                  url={mapLayers[mapLayer].url}
                  attribution={mapLayers[mapLayer].attribution}
                />
                <GeoJSON
                  key={geoJsonKey}
                  data={displayGeoJson}
                  onEachFeature={onEachFeature}
                />
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
          <div className="absolute bottom-4 right-3 z-[500] bg-white/75 backdrop-blur-lg rounded-2xl border border-white/70 shadow-xl px-4 py-3 min-w-[200px] max-w-[290px] pointer-events-none">
            {/* Label */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Region Overview
            </p>
            {/* Breadcrumb */}
            <p className="text-[11px] text-slate-600 font-medium mb-2.5 leading-snug truncate">
              <span className="text-slate-800 font-semibold">{cityLabel}</span>
              <span className="text-slate-300 mx-1">•</span>{councilLabel}
              <span className="text-slate-300 mx-1">•</span>{wardLabel}
              <span className="text-slate-300 mx-1">•</span>{roadsLabel}
            </p>
            {/* Stat pills */}
            <div className="flex flex-wrap gap-1.5">
              {STATS_TEMPLATE.map(({ label, value, unit, borderColor }) => {
                const pillColor = borderColor?.includes("blue")
                  ? "bg-blue-50 border-blue-100 text-blue-700"
                  : borderColor?.includes("green")
                  ? "bg-green-50 border-green-100 text-green-700"
                  : "bg-slate-50 border-slate-100 text-slate-700";
                return (
                  <div
                    key={label}
                    className={`flex items-baseline gap-1 rounded-lg px-2.5 py-1.5 border ${pillColor}`}
                  >
                    <span className="text-[12px] font-bold">
                      {isFilterApplied ? value : "—"}
                    </span>
                    {unit && isFilterApplied && (
                      <span className="text-[9px] font-medium opacity-70">{unit}</span>
                    )}
                    <span className="text-[9px] font-semibold uppercase tracking-wide opacity-60 ml-0.5">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
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
