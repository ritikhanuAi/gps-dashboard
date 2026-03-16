import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { RoadAthena, City, Muncipal, Road, Ward } from "../../assets/svgs";
import InputDropdown from "../../component/InputDropdown/InputDropdown";
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
  } = useFilterCascade(
    geoJsonData,
    setFilteredGeoJsonData,
    setMapCenter,
    setMapZoom,
    setMapKey,
  );

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

  // Dropdown change handlers
  const handleCityDropdownChange = (event) => {
    const city = event.selectedItem;
    setSelectedCities([city]);
    if (geoJsonData) {
      const filteredData = filterGeoJsonByCities(geoJsonData, [city]);
      setFilteredGeoJsonData(filteredData);
    }
  };

  const handleMCDropdownChange = (event) => {
    const value = event.selectedItem.label;
    setSelectedMunicipalCouncil(value);
    setSelectedMunicipalCouncilOption(event.selectedItem);
    setSelectedWard("");
    setSelectedRoads([]);
  };

  const handleWardDropdownChange = (event) => {
    const value = event.selectedItem.label;
    setSelectedWard(value);
    setSelectedRoads([]);
  };

  const handleRoadDropdownChange = (event) => {
    const road = event.selectedItem;
    setSelectedRoads((prev) => {
      const isAlreadySelected = prev.some((r) => r.value === road.value);
      if (isAlreadySelected) {
        return prev.filter((r) => r.value !== road.value);
      } else {
        return [...prev, road];
      }
    });
  };

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
    <div className="min-h-screen ">
      {/* ── Header ── */}
      <div className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-lg px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg">
            <RoadAthena width={24} height={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 myriad-pro-semibold">
              RoadAthena
            </h1>
            <p className="text-xs text-gray-500">Road Management Dashboard</p>
          </div>
        </div>
      </div>

      {/* ── Filter Row ── */}
      <div className="relative z-40 bg-white/10 backdrop-blur-lg rounded-lg border border-gray-200 shadow-lg mx-4 sm:mx-6 lg:mx-5 my-4 px-4 sm:px-6 lg:px-8 py-5 overflow-visible">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end relative z-40 overflow-visible">
          <InputDropdown
            label="City"
            value={selectedCities.length > 0 ? selectedCities[0].label : ""}
            onChange={handleCityDropdownChange}
            optionList={cityOptions}
            placeholder={"Select City"}
            name="city"
            icon={<City width={21} />}
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Municipal Council"
            value={selectedMunicipalCouncil}
            onChange={handleMCDropdownChange}
            optionList={municipalCouncilOptions}
            placeholder={"Select Council"}
            name="municipalCouncil"
            icon={<Muncipal width={21} />}
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Ward"
            value={selectedWard}
            onChange={handleWardDropdownChange}
            optionList={wardOptions}
            placeholder={"Select Ward"}
            name="ward"
            icon={<Ward width={21} />}
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Road"
            value={selectedRoads.length > 0 ? selectedRoads[0].label : ""}
            onChange={handleRoadDropdownChange}
            optionList={roadOptions}
            name="road"
            icon={<Road width={21} />}
            width="100%"
            placeholder="Select Road"
            isSearchable
          />
          <div className="flex gap-3">
            <button
              onClick={handleApplyFilter}
              className="flex-1 px-4 py-2.5 text-white font-semibold rounded-sm shadow-md hover:shadow-lg transition duration-300 transform hover:scale-105 myriad-pro-semibold text-sm whitespace-nowrap"
              style={{ backgroundColor: "#374774" }}
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="flex-1 px-4 py-2.5 text-white font-semibold rounded-sm shadow-md hover:shadow-lg transition duration-300 transform hover:scale-105 myriad-pro-semibold text-sm whitespace-nowrap"
              style={{ backgroundColor: "#dc3545" }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── Map Part & Region Overview ── */}
      <div className="relative px-4 sm:px-6 lg:px-4 mb-4">
        {/* ── Map Panel ── */}
        <div className="w-full rounded-lg overflow-hidden shadow-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Map Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
            <label className="text-sm font-semibold text-gray-700 myriad-pro-semibold">
              Layer:
            </label>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white text-gray-700 cursor-pointer shadow-sm hover:border-blue-400 transition focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(mapLayers).map(([key, layer]) => (
                <option key={key} value={key}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Leaflet Map */}
          <div className="h-[420px] sm:h-[500px] lg:h-[600px] w-full">
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
                <GeoJSON
                  data={filteredGeoJsonData}
                  onEachFeature={onEachFeature}
                />
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-pulse"></div>
                  <p className="text-gray-500 font-medium">Loading Map...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Region Overview (Overlaid on Map on Large Screens, Below on Small Screens) ── */}
        <div className="lg:absolute lg:bottom-6 lg:right-6 rounded-lg border border-gray-200 shadow-xl px-4 py-5 w-full lg:w-72 lg:max-w-[calc(100%-2rem)] mt-4 lg:mt-0 lg:z-50 lg:backdrop-blur-sm">
          {/* Context Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-lg font-bold text-gray-900 truncate myriad-pro-semibold">
              Region Overview
            </p>
            <p className="text-sm text-gray-600 mt-1 myriad-pro-regular line-clamp-2">
              {selectedCities.length > 0
                ? selectedCities.map((c) => c.label).join(", ")
                : "Select City"}{" "}
              {selectedMunicipalCouncil && `• ${selectedMunicipalCouncil}`}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-1 gap-3">
            {STATS_TEMPLATE.map(({ label, value, unit, icon, borderColor }) => (
              <div
                key={label}
                className={`rounded-xl p-3 border transition duration-300 hover:shadow-lg hover:scale-105 cursor-pointer bg-white/50 backdrop-blur-sm border-gray-200 ${borderColor || "border-l-blue-500"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                </div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide myriad-pro-semibold truncate">
                  {label}
                </p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-bold text-gray-900 myriad-pro-regular">
                    {isFilterApplied ? value : "—"}
                  </span>
                  {unit && isFilterApplied && (
                    <span className="text-xs font-medium text-gray-500">
                      {unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
