import "leaflet/dist/leaflet.css";
import { useRef, useState } from "react";
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
    flyTarget,
    setFlyTarget,
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

  // Map animation
  const { animatedMapCenter, animatedMapZoom, animatedMapKey } =
    useMapAnimation(selectedCities, geoJsonData, mapCenter, mapZoom, mapKey, setFlyTarget);

  // Map layer selection
  const mapLayers = MAP_LAYERS;
  const [mapLayer, setMapLayer] = useState("default");

  // Filter state
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // GeoJSON key to force re-render when data changes
  const geoJsonKeyRef = useRef(0);

  // Handle city selection
  const handleCityChange = (city) => {
    setSelectedCities([city]);
    if (geoJsonData) {
      const filteredData = filterGeoJsonByCities(geoJsonData, [city]);
      setFilteredGeoJsonData(filteredData);
    }
  };

  // Clear city selection (and all downstream filters)
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

  // Handle municipal council change
  const handleMunicipalCouncilChange = (value, optionItem) => {
    setSelectedMunicipalCouncil(value);
    setSelectedMunicipalCouncilOption(optionItem || null);
    setSelectedWard("");
    setSelectedWardLabel("");
    setSelectedRoads([]);
  };

  // Handle ward change (single select) — uses value (number), not label
  const handleWardChange = (value, label) => {
    setSelectedWard(value);
    setSelectedWardLabel(label || `Ward ${value}`);
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
    setSelectedWardLabel("");
    setSelectedRoads([]);
  };

  // Ward dropdown change — use VALUE (e.g. "5"), not LABEL (e.g. "Ward 5")
  const handleWardDropdownChange = (event) => {
    const wardValue = event.selectedItem.value;   // e.g. "5"
    const wardLabel = event.selectedItem.label;    // e.g. "Ward 5"
    setSelectedWard(wardValue);
    setSelectedWardLabel(wardLabel);
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
    setSelectedMunicipalCouncilOption(null);
    setSelectedWard("");
    setSelectedWardLabel("");
    setSelectedRoads([]);
    if (selectedCities.length === 0) {
      setFlyTarget({ center: [29.0588, 75.8507], zoom: 9 });
    }
    setIsFilterApplied(false);
  };

  const [selectedRoadId, setSelectedRoadId] = useState(null);

  // Handle map click events
  const onEachFeature = (feature, layer) => {
    layer.setStyle(getFeatureStyle(feature));
    
    // Add click event listener to open custom dialog
    layer.on({
      click: (e) => {
        const props = e.target.feature.properties;
        if (props && props.id) {
          setSelectedRoadId(props.id);
        }
      }
    });
  };

  // Build context breadcrumb
  const breadcrumb = [
    selectedCities.length > 0
      ? selectedCities.map((c) => c.label).join(", ")
      : null,
    selectedMunicipalCouncil || null,
    selectedWardLabel || null,
    selectedRoads.length > 0
      ? selectedRoads.length === 1
        ? selectedRoads[0].label
        : `${selectedRoads.length} roads`
      : null,
  ].filter(Boolean);

  // Derived stats
  const totalRoadsOnMap = filteredGeoJsonData?.features?.length || 0;

  // GeoJSON key: increment every time filteredGeoJsonData changes so GeoJSON re-renders
  const geoJsonKey = filteredGeoJsonData ? JSON.stringify(filteredGeoJsonData).length : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-6">
      {/* ── Header ── */}
      <div className="sticky top-0 w-full bg-white border-b border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 z-50">
        <RoadAthena width={24} height={30} />
        <span className="text-lg font-bold text-slate-800 tracking-tight myriad-pro-semibold">
          RoadAthena
        </span>
      </div>

      {/* ── Filter Row ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-6 lg:px-8 py-5 m-4 mb-4 transition-all duration-300 hover:shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
          <InputDropdown
            label="City"
            value={selectedCities.length > 0 ? selectedCities[0].label : ""}
            onChange={handleCityDropdownChange}
            onClear={handleClearSelection}
            optionList={cityOptions}
            placeholder={"Select City"}
            name="city"
            icon={<City width={20} />}
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
            icon={<Muncipal width={20} />}
            width="100%"
            isSearchable
            disabled={selectedCities.length === 0}
          />
          <InputDropdown
            label="Ward"
            value={selectedWardLabel}
            onChange={handleWardDropdownChange}
            optionList={wardOptions}
            placeholder={"Select Ward"}
            name="ward"
            icon={<Ward width={20} />}
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
            icon={<Road width={20} />}
          />
          <div className="flex gap-3 h-10">
            <button
              onClick={handleApplyFilter}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors duration-200 myriad-pro-semibold whitespace-nowrap outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors duration-200 myriad-pro-semibold whitespace-nowrap outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* ── Map Part ── */}
      <div className="px-4 sm:px-6 lg:px-8">
        {/* ── Map Panel ── */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5 relative">
          
          {isLoadingCityData && (
            <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-md flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 bg-white/90 px-8 py-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100/50 transform scale-100 animate-fade-in-up">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-widest myriad-pro-semibold">Loading Map Data</p>
              </div>
            </div>
          )}

          {/* Map Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <label className="text-sm font-semibold text-slate-600 myriad-pro-semibold">
              Layer:
            </label>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
            >
              {Object.entries(mapLayers).map(([key, layer]) => (
                <option key={key} value={key}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Leaflet Map */}
          <div className="h-[420px] sm:h-[500px] lg:h-[550px] w-full bg-slate-50 z-10">
            {filteredGeoJsonData && isValidGeoJSON(filteredGeoJsonData) ? (
              <MapContainer
                key={animatedMapKey}
                center={animatedMapCenter}
                zoom={animatedMapZoom}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
                zoomAnimation={true}
                fadeAnimation={true}
                markerZoomAnimation={true}
              >
                <TileLayer
                  url={mapLayers[mapLayer].url}
                  attribution={mapLayers[mapLayer].attribution}
                />
                <GeoJSON
                  key={geoJsonKey}
                  data={filteredGeoJsonData}
                  onEachFeature={onEachFeature}
                />
                {/* Smooth fly-to handler */}
                <MapFlyTo flyTarget={flyTarget} />
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-50/50">
                <p className="text-slate-400 font-medium">No map data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Road Detail — Below Map ── */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 sm:px-6 lg:px-8">
        {/* Context Info & Stats */}
        <div className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl border border-slate-200 px-6 py-5 w-full">
          {/* Context Info */}
          <div className="mb-4 pb-4 border-b border-slate-100">
            <p className="text-xl font-bold text-slate-800 tracking-tight myriad-pro-semibold">
              Region Overview
            </p>
            <p className="text-sm font-medium text-slate-500 mt-1 myriad-pro-regular">
              {selectedCities.length > 0
                ? selectedCities.map((c) => c.label).join(", ")
                : "City"}{" "}
              <span className="text-slate-300 mx-1">•</span> {selectedMunicipalCouncil || "Council"}{" "}
              <span className="text-slate-300 mx-1">•</span> {selectedWardLabel || "Ward"}{" "}
              <span className="text-slate-300 mx-1">•</span>{" "}
              {selectedRoads.length > 0
                ? selectedRoads.length === 1
                  ? selectedRoads[0].label
                  : `${selectedRoads.length} roads`
                : "Road"}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
            {STATS_TEMPLATE.map(({ label, value, unit, icon, borderColor }) => (
              <div
                key={label}
                className={`bg-slate-50/50 rounded-xl px-5 py-4 border border-slate-100 shadow-sm hover:shadow relative overflow-hidden group transition-all duration-300`}
              >
                {/* Left accent border */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor ? borderColor.replace('border-l-', 'bg-') : 'bg-blue-500'} group-hover:w-1.5 transition-all duration-300`}></div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg opacity-80">{icon}</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest myriad-pro-semibold">
                    {label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pl-1">
                  <span className="text-2xl font-bold text-slate-800 tracking-tight myriad-pro-regular">
                    {isFilterApplied ? value : "NA"}
                  </span>
                  {unit && (
                    <span className="text-xs font-semibold text-slate-400">
                      {isFilterApplied ? unit : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Road Details Dialog ── */}
      <RoadDetailsDialog 
        roadId={selectedRoadId} 
        onClose={() => setSelectedRoadId(null)} 
      />
    </div>
  );
};

export default Dashboard;
