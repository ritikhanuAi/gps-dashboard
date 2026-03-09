import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import RoadAthena from "../../assets/svgs/RoadAthena";
import FilterControls from "./components/FilterControls";
import FilterStatus from "./components/FilterStatus";
import { MAP_LAYERS, STATS_TEMPLATE } from "./constants";
import { useFilterCascade, useMapAnimation, useRoadData } from "./hooks";
import {
  filterGeoJsonByCities,
  getFeatureStyle,
  isValidGeoJSON,
} from "./utils";

const Dashboard = () => {
  // Road data management
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
  } = useRoadData();

  // Filter cascade logic
  const {
    selectedCities,
    setSelectedCities,
    selectedMunicipalCouncil,
    setSelectedMunicipalCouncil,
    setSelectedMunicipalCouncilOption,
    selectedWard,
    setSelectedWard,
    selectedRoads,
    setSelectedRoads,
    isLoadingMunicipalCouncil,
    isLoadingWard,
    isLoadingRoad,
    municipalCouncilOptions,
    wardOptions,
    roadOptions,
  } = useFilterCascade(geoJsonData, setFilteredGeoJsonData, setMapCenter, setMapZoom, setMapKey);

  // Map animation
  const { isAnimating, animatedMapCenter, animatedMapZoom, animatedMapKey } =
    useMapAnimation(selectedCities, geoJsonData, mapCenter, mapZoom, mapKey);

  // Map layer selection
  const mapLayers = MAP_LAYERS;
  const [mapLayer, setMapLayer] = useState("default");

  // Filter state
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // Handle city selection
  const handleCityChange = (city) => {
    setSelectedCities([city]);
    if (geoJsonData) {
      const filteredData = filterGeoJsonByCities(geoJsonData, [city]);
      setFilteredGeoJsonData(filteredData);
    }
  };

  // Clear city selection
  const handleClearSelection = () => {
    setSelectedCities([]);
    setFilteredGeoJsonData(geoJsonData);
  };

  // Handle municipal council change
  const handleMunicipalCouncilChange = (value, optionItem) => {
    setSelectedMunicipalCouncil(value);
    setSelectedMunicipalCouncilOption(optionItem || null);
    setSelectedWard("");
    setSelectedRoads([]);
  };

  // Handle ward change (single select)
  const handleWardChange = (value) => {
    setSelectedWard(value);
    setSelectedRoads([]);
  };

  // Handle road toggle (checkbox multi-select)
  const handleRoadToggle = (road) => {
    setSelectedRoads((prev) => {
      const isAlreadySelected = prev.some((r) => r.value === road.value);
      if (isAlreadySelected) {
        return prev.filter((r) => r.value !== road.value);
      } else {
        return [...prev, road];
      }
    });
  };

  const handleClearRoads = () => setSelectedRoads([]);
  const handleSelectAllRoads = () => setSelectedRoads([...roadOptions]);
  const handleApplyFilter = () => setIsFilterApplied(true);

  const handleResetFilter = () => {
    setSelectedMunicipalCouncil("");
    setSelectedWard("");
    setSelectedRoads([]);
    if (selectedCities.length === 0) {
      setMapCenter([29.0588, 75.8507]);
      setMapZoom(10);
    }
    setMapKey((prev) => prev + 1);
    setIsFilterApplied(false);
  };

  // Road popup with clean styling
  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const popupContent = `
      <div style="font-family: 'Segoe UI', system-ui, sans-serif; padding: 2px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
          ${props?.name || "Unnamed Road"}
        </div>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 12px;">
          <span style="color: #94a3b8; font-weight: 500;">ID</span>
          <span style="color: #3b82f6; font-weight: 600;">#${props?.id || "—"}</span>
          <span style="color: #94a3b8; font-weight: 500;">Ward</span>
          <span style="color: #475569;">${props?.ward || "—"}</span>
          <span style="color: #94a3b8; font-weight: 500;">City</span>
          <span style="color: #475569; text-transform: capitalize;">${props?.city || "—"}</span>
        </div>
      </div>
    `;
    layer.bindPopup(popupContent);
    layer.setStyle(getFeatureStyle(feature));
  };

  // Build context breadcrumb
  const breadcrumb = [
    selectedCities.length > 0
      ? selectedCities.map((c) => c.label).join(", ")
      : null,
    selectedMunicipalCouncil || null,
    selectedWard ? `Ward ${selectedWard}` : null,
    selectedRoads.length > 0
      ? selectedRoads.length === 1
        ? selectedRoads[0].label
        : `${selectedRoads.length} roads`
      : null,
  ].filter(Boolean);

  // Derived stats
  const totalRoadsOnMap = filteredGeoJsonData?.features?.length || 0;

  return (
    <div className="min-h-screen bg-[#f8f9fb] relative">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200/80 px-5 sm:px-6 py-2.5 flex items-center justify-between z-50">
        <div className="flex items-center gap-2.5">
          <RoadAthena width={22} height={28} />
          <span className="text-[15px] font-semibold text-gray-900 myriad-pro-semibold tracking-tight">
            RoadAthena
          </span>
        </div>
        {/* Breadcrumb context */}
        {breadcrumb.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 myriad-pro-regular">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">›</span>}
                <span className={i === breadcrumb.length - 1 ? "text-gray-600 font-medium" : ""}>
                  {item}
                </span>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="pt-[52px]">
        {/* Filter Section */}
        <section className="bg-white border-b border-gray-200/60 px-4 sm:px-6 lg:px-8 py-4">
          <FilterControls
            selectedCities={selectedCities}
            cityOptions={cityOptions}
            isLoadingCityData={isLoadingCityData}
            onCityChange={handleCityChange}
            onClearSelection={handleClearSelection}
            selectedMunicipalCouncil={selectedMunicipalCouncil}
            onMunicipalCouncilChange={handleMunicipalCouncilChange}
            municipalCouncilOptions={municipalCouncilOptions}
            isLoadingMunicipalCouncil={isLoadingMunicipalCouncil}
            selectedWard={selectedWard}
            onWardChange={handleWardChange}
            wardOptions={wardOptions}
            isLoadingWard={isLoadingWard}
            selectedRoads={selectedRoads}
            onRoadToggle={handleRoadToggle}
            onClearRoads={handleClearRoads}
            onSelectAllRoads={handleSelectAllRoads}
            roadOptions={roadOptions}
            isLoadingRoad={isLoadingRoad}
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleResetFilter}
          />

          <FilterStatus
            isLoadingCityData={isLoadingCityData}
            selectedCities={selectedCities}
          />
        </section>

        {/* Map Section */}
        <section className="px-4 sm:px-6 lg:px-6 pt-4 pb-2">
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
            {/* Map Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider myriad-pro-semibold">Map</span>
                {totalRoadsOnMap > 0 && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">
                    {totalRoadsOnMap} roads
                  </span>
                )}
              </div>
              <select
                value={mapLayer}
                onChange={(e) => setMapLayer(e.target.value)}
                className="px-2.5 py-1.5 rounded-md text-xs border border-gray-200 bg-white text-gray-600 cursor-pointer hover:border-gray-300 transition-colors focus:outline-none focus:border-blue-400"
              >
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <option key={key} value={key}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Leaflet Map */}
            <div className="h-[500px] sm:h-[600px] lg:h-[70vh] w-full">
              {filteredGeoJsonData && isValidGeoJSON(filteredGeoJsonData) ? (
                <MapContainer
                  key={animatedMapKey}
                  center={animatedMapCenter}
                  zoom={animatedMapZoom}
                  style={{ height: "100%", width: "100%" }}
                  zoomAnimation={true}
                  fadeAnimation={true}
                  markerZoomAnimation={true}
                  animate={true}
                  duration={0.75}
                  easeLinearity={0.25}
                >
                  <TileLayer
                    url={mapLayers[mapLayer].url}
                    attribution={mapLayers[mapLayer].attribution}
                  />
                  <GeoJSON data={filteredGeoJsonData} onEachFeature={onEachFeature} />
                </MapContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 gap-2">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-400 myriad-pro-regular">Loading map…</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-4 sm:px-6 lg:px-6 pb-6 pt-1">
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
            {/* Stats Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider myriad-pro-semibold">
                Statistics
              </h3>
              {isFilterApplied && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                  Filter Applied
                </span>
              )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100">
              {STATS_TEMPLATE.map(({ label, value, unit, icon }) => (
                <div
                  key={label}
                  className="bg-white px-5 py-5 flex flex-col items-center justify-center"
                >
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide myriad-pro-semibold mb-1.5">
                    {icon} {label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 myriad-pro-bold tabular-nums">
                      {isFilterApplied ? value : "—"}
                    </span>
                    {unit && isFilterApplied && (
                      <span className="text-xs font-medium text-gray-400">
                        {unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
