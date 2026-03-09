import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { fetchRoadData } from "../api/RoadApi";
import RoadAthena from "../assets/svgs/RoadAthena";
import InputDropdown from "../component/InputDropdown/InputDropdown";

const HaryanaTab = () => {

    // state declare

  const [selectedCities, setSelectedCities] = useState([]); // Changed to array for multi-select
  const [selectedMunicipalCouncil, setSelectedMunicipalCouncil] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedRoad, setSelectedRoad] = useState("");
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [filteredGeoJsonData, setFilteredGeoJsonData] = useState(null); // For filtered data
  const [mapLayer, setMapLayer] = useState("default");
  const [mapCenter, setMapCenter] = useState([29.0588, 75.8507]);
  const [mapZoom, setMapZoom] = useState(8); // Start with more zoomed out view
  const [mapKey, setMapKey] = useState(0);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoadingCityData, setIsLoadingCityData] = useState(true); // Loading state for city data
  const [isLoadingFilters, setIsLoadingFilters] = useState(false); // Loading state for other filters

  // Dummy data for dropdowns
  const municipalCouncilOptions = [
    { label: "Municipal Council 1", value: "mc_1" },
    { label: "Municipal Council 2", value: "mc_2" },
    { label: "Municipal Council 3", value: "mc_3" },
    { label: "Municipal Council 4", value: "mc_4" },
  ];

  const wardOptions = [
    { label: "Ward 1", value: "ward_1" },
    { label: "Ward 2", value: "ward_2" },
    { label: "Ward 3", value: "ward_3" },
    { label: "Ward 4", value: "ward_4" },
  ];

  const roadOptions = [
    { label: "Road A", value: "road_a" },
    { label: "Road B", value: "road_b" },
    { label: "Road C", value: "road_c" },
    { label: "Road D", value: "road_d" },
  ];

  // Map library configurations

  const mapLayers = {
    default: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: "Default",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri",
      name: "Satellite",
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution:
        "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
      name: "Terrain",
    },
  };



  // Extract unique cities FUNCTION from GeoJSON data
  const extractUniqueCities = (geoData) => {
    if (!geoData || !Array.isArray(geoData.features)) return [];

    const uniqueCities = new Set();
    geoData.features.forEach((feature) => {
      if (feature.properties?.city) {
        uniqueCities.add(feature.properties.city);
      }
    });

    return Array.from(uniqueCities).map((city) => ({
      label: city.charAt(0).toUpperCase() + city.slice(1),
      value: city.toLowerCase(),
    }));
  };

  // Filter GeoJSON data based on selected cities
  const filterGeoJsonByCities = (geoData, selectedCities) => {
    if (!selectedCities || selectedCities.length === 0) {
      return geoData; // Return all data if no cities selected
    }

    const selectedCityValues = selectedCities.map(city => city.value.toLowerCase());
    const filteredFeatures = geoData.features.filter((feature) =>
      feature.properties?.city &&
      selectedCityValues.includes(feature.properties.city.toLowerCase())
    );

    return {
      ...geoData,
      features: filteredFeatures
    };
  };

  // Get bounds for multiple cities or all data
  const getBoundsForCities = (cities = []) => {
    if (!geoJsonData || !Array.isArray(geoJsonData.features)) return null;

    let featuresToCheck = geoJsonData.features;

    // If cities are selected, filter features
    if (cities && cities.length > 0) {
      const selectedCityValues = cities.map(city => city.value.toLowerCase());
      featuresToCheck = geoJsonData.features.filter((feature) =>
        feature.properties?.city &&
        selectedCityValues.includes(feature.properties.city.toLowerCase())
      );
    }

    if (featuresToCheck.length === 0) return null;

    let minLat = Infinity,
      maxLat = -Infinity;
    let minLng = Infinity,
      maxLng = -Infinity;

    featuresToCheck.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      if (
        feature.geometry.type === "LineString" ||
        feature.geometry.type === "MultiLineString"
      ) {
        const coordArray =
          feature.geometry.type === "LineString" ? coords : coords.flat();
        coordArray.forEach((coord) => {
          const [lng, lat] = coord;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      }
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Adjust zoom calculation based on whether we're showing all data or filtered data
    let zoom;
    if (cities && cities.length > 0) {
      // For filtered cities, zoom in closer
      zoom = maxDiff < 0.01 ? 14 : maxDiff < 0.05 ? 13 : maxDiff < 0.1 ? 12 : 11;
    } else {
      // For all data, zoom out more
      zoom = maxDiff < 0.1 ? 10 : maxDiff < 0.5 ? 9 : maxDiff < 1 ? 8 : 7;
    }

    return { center: [centerLat, centerLng], zoom };
  };

  //   Function to validate GeoJSON structure
  const isValidGeoJSON = (data) => {
    if (!data || typeof data !== "object") {
      console.error("GeoJSON is not an object:", data);
      return false;
    }
    if (data.type !== "FeatureCollection" && data.type !== "Feature") {
      console.error("Invalid GeoJSON type:", data.type);
      return false;
    }
    if (data.type === "FeatureCollection" && !Array.isArray(data.features)) {
      console.error("FeatureCollection does not have features array:", data);
      return false;
    }
    return true;
  };

  // Load data from API on PAGE LOAD
  useEffect(() => {
    const loadRoadData = async () => {
      setIsLoadingCityData(true);
      try {
        const response = await fetchRoadData();
        console.log("Road API Response:", response);

        // Extract the actual GeoJSON data from the response
        const geoData = response.data;
        console.log("GeoJSON Data:", geoData);

        // Validate GeoJSON before setting state
        if (isValidGeoJSON(geoData)) {
          setGeoJsonData(geoData);
          // Extract and set unique cities
          const cities = extractUniqueCities(geoData);
          setCityOptions(cities);

          // Initially show all data (no cities selected)
          setFilteredGeoJsonData(geoData);

          // Set initial bounds for all data (zoomed out)
          const bounds = getBoundsForCities([]);
          if (bounds) {
            setMapCenter(bounds.center);
            setMapZoom(bounds.zoom);
          }
        } else {
          console.error("Invalid GeoJSON received");
          setCityOptions([]);
        }
      } catch (error) {
        console.log("Error fetching road data:", error);
      } finally {
        setIsLoadingCityData(false);
      }
    };
    loadRoadData();
  }, []);

  const handleDropdownChange = (setter) => (event) => {
    setter(event.selectedItem.label);
  };

  // Handle city selection (single-select)
  const handleCityChange = (city) => {
    setSelectedCities([city]);

    // Filter data based on selected city
    if (geoJsonData) {
      const filteredData = filterGeoJsonByCities(geoJsonData, [city]);
      setFilteredGeoJsonData(filteredData);
    }

    // Close dropdown after selection
    setIsCityDropdownOpen(false);
  };

  // Clear city selection and return to default view
  const handleClearSelection = () => {
    setSelectedCities([]);
    setFilteredGeoJsonData(geoJsonData);
    setIsCityDropdownOpen(false);
  };

  const handleApplyFilter = () => {
    // TODO: Implement filter functionality later
    setIsFilterApplied(true);
  };

  const handleResetFilter = () => {
    setSelectedMunicipalCouncil("");
    setSelectedWard("");
    setSelectedRoad("");

    // Keep cities selected to maintain zoom functionality
    if (selectedCities.length === 0) {
      setMapCenter([29.0588, 75.8507]);
      setMapZoom(8);
    }
    setMapKey((prev) => prev + 1);
    setIsFilterApplied(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const cityDropdown = document.querySelector('.city-dropdown');
      if (cityDropdown && !cityDropdown.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
    };

    if (isCityDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isCityDropdownOpen]);

  // Zoom to selected cities with smooth transition (zoom out then zoom in)
  useEffect(() => {
    if (selectedCities && selectedCities.length > 0) {
      const bounds = getBoundsForCities(selectedCities);
      if (bounds) {
        setIsAnimating(true);
        
        // Step 1: Zoom out to see context (at 100ms)
        setTimeout(() => {
          setMapCenter([29.0588, 75.8507]); // Center of Haryana
          setMapZoom(7);
        }, 100);
        
        // Step 2: Zoom in to selected city (at 950ms, waits for 0.75s animation to complete)
        setTimeout(() => {
          setMapCenter(bounds.center);
          setMapZoom(bounds.zoom);
          setMapKey((prev) => prev + 1);
          setIsAnimating(false);
        }, 950);
      }
    } else if (geoJsonData) {
      // When no cities selected, show all data with zoomed out view
      const bounds = getBoundsForCities([]);
      if (bounds) {
        setTimeout(() => {
          setMapCenter(bounds.center);
          setMapZoom(bounds.zoom);
          setMapKey((prev) => prev + 1);
        }, 100);
      }
    }
  }, [selectedCities, geoJsonData]);


  // Handle GeoJSON feature click
  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const popupContent = `
      <div style="font-family: Arial, sans-serif; font-size: 12px;">
        <strong>${props?.name || "Road"}</strong><br/>
        Quality: ${props?.quality || "N/A"}<br/>
        Length: ${props?.length || "N/A"}
      </div>
    `;
    layer.bindPopup(popupContent);
    layer.setStyle(getFeatureStyle(feature));
  };

  // Function to style GeoJSON features based on quality
  const getFeatureStyle = (feature) => {
    const quality = feature.properties?.quality;
    let color = "#3388ff"; // Default blue

    if (quality !== undefined) {
      if (quality > 80) {
        color = "#22c55e"; // Green for good quality
      } else if (quality > 50) {
        color = "#f59e0b"; // Amber for average quality
      } else {
        color = "#ef4444"; // Red for poor quality
      }
    }

    return {
      color: color,
      weight: 3,
      opacity: 0.8,
    };
  };

  // Stats data
  const stats = [
    {
      label: "Total Roads",
      value: "45645",
      unit: "",
      icon: "",
      borderColor: "border-l-blue-500",
    },
    {
      label: "Total Length",
      value: "54645",
      unit: "km",
      icon: "",
      borderColor: "border-l-blue-500",
    },
    {
      label: "Avg Quality",
      value: "48856",
      unit: "%",
      icon: "",
      borderColor: "border-l-blue-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ── */}
      <div className="fixed top-0 left-0 right-0 w-full bg-white border-gray-300 shadow-lg px-4 sm:px-6 lg:px-6 py-3 flex items-center gap-2 z-50">
        <RoadAthena width={20} height={26} />
        <span className="text-sm font-semibold text-gray-800 myriad-pro-semibold">
          RoadAthena
        </span>
      </div>

      {/* ── Filter Roww ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 sm:px-6 lg:px-8 py-4 mt-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* City Single-Select Dropdown with Radio Buttons */}
          <div className="relative city-dropdown">
            <label className="block text-sm font-semibold text-gray-700 mb-2 myriad-pro-semibold">
              City
            </label>
            <div className="relative">
              <div
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 min-h-[42px] flex items-center cursor-pointer hover:border-gray-400"
                onClick={() => !isLoadingCityData && setIsCityDropdownOpen(!isCityDropdownOpen)}
              >
                <span className="flex-1 flex items-center gap-2">
                  {isLoadingCityData ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-gray-500">Loading cities...</span>
                    </>
                  ) : (
                    selectedCities.length > 0
                      ? selectedCities[0].label
                      : "Select a city"
                  )}
                </span>
                <span className={`text-gray-400 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {/* Dropdown Options */}
              {isCityDropdownOpen && !isLoadingCityData && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Clear Selection Option */}
                  {selectedCities.length > 0 && (
                    <div
                      onClick={handleClearSelection}
                      className="px-3 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-200 text-sm text-red-600 font-semibold"
                    >
                      ✕ Remove Selection
                    </div>
                  )}
                  
                  {/* City Options */}
                  {cityOptions.map((city) => {
                    const isSelected = selectedCities.some(selected => selected.value === city.value);
                    return (
                      <label
                        key={city.value}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="city-selection"
                          checked={isSelected}
                          onChange={() => handleCityChange(city)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{city.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <InputDropdown
            label="Municipal Council"
            value={selectedMunicipalCouncil}
            onChange={handleDropdownChange(setSelectedMunicipalCouncil)}
            optionList={municipalCouncilOptions}
            placeholder={"Select Council"}
            name="municipalCouncil"
            width="100%"
            isSearchable
            disabled={selectedCities.length === 0}
          />
          {selectedCities.length === 0 && (
            <div className="absolute inset-0 bg-gray-100 opacity-40 rounded-lg pointer-events-none z-10"></div>
          )}
          
          <div className="relative">
            <InputDropdown
              label="Ward"
              value={selectedWard}
              onChange={handleDropdownChange(setSelectedWard)}
              optionList={wardOptions}
              placeholder={"Select Ward"}
              name="ward"
              width="100%"
              isSearchable
              disabled={selectedCities.length === 0}
            />
            {selectedCities.length === 0 && (
              <div className="absolute inset-0 bg-gray-100 opacity-40 rounded-lg pointer-events-none z-10"></div>
            )}
          </div>

          <div className="relative">
            <InputDropdown
              label="Road"
              value={selectedRoad}
              onChange={handleDropdownChange(setSelectedRoad)}
              optionList={roadOptions}
              name="road"
              width="100%"
              placeholder="Select Road"
              isSearchable
              disabled={selectedCities.length === 0}
            />
            {selectedCities.length === 0 && (
              <div className="absolute inset-0 bg-gray-100 opacity-40 rounded-lg pointer-events-none z-10"></div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 btn-accent-secondary rounded-sm text-sm font-semibold myriad-pro-semibold whitespace-nowrap"
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 btn-danger-light rounded-sm text-sm font-semibold myriad-pro-semibold whitespace-nowrap"
            >
              Clear Filter
            </button>
          </div>
        </div>

        {/* Loading or No Selection Message */}
        {isLoadingCityData && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700 text-sm">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="font-semibold">Loading city data...</span>
          </div>
        )}

        {!isLoadingCityData && selectedCities.length === 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-semibold">
            📍 Select a city to enable other filters
          </div>
        )}
      </div>

      {/* ── map part── */}
      <div className="px-4 sm:px-6 lg:px-6 py-3">
        {/* ── Map Panel ── */}
        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden mb-3">
          {/* Map Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
            <label className="text-sm font-semibold text-gray-700 myriad-pro-semibold">
              Layer:
            </label>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white text-gray-700  cursor-pointer"
            >
              {Object.entries(mapLayers).map(([key, layer]) => (
                <option key={key} value={key}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Leaflet Map */}
          <div className="h-[420px] sm:h-[500px] lg:h-[500px] w-full">
            {filteredGeoJsonData && isValidGeoJSON(filteredGeoJsonData) ? (
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={mapZoom}
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
              <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Loading map...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── road Detail — Below Map ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Context Info & Stats */}
        <div className="bg-white  shadow-md px-5 py-4 w-full lg:w-full">
          {/* Context Info */}
          <div className="mb-2 pb-4 border-b border-gray-200">
            <p className="text-base font-bold text-gray-800 truncate myriad-pro-semibold">
              {selectedCities.length > 0
                ? selectedCities.map(city => city.label).join(", ")
                : "All Cities"
              } — {selectedMunicipalCouncil || "Council"}
            </p>
            <p className="text-base text-gray-400 mt-0.5 myriad-pro-regular">
              {selectedWard || "Ward"} · {selectedRoad || "Road"}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="px2">
            <h3 className="text-lg font-bold text-gray-800 myriad-pro-semibold">
              Stats
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map(({ label, value, unit, icon, borderColor }) => (
              <div
                key={label}
                className={`bg-gray-50 rounded-lg px-4 py-4 shadow-sm border-l-4 ${borderColor}`}
              >
                <div className="flex items-center  justify-center gap-2 mb-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide myriad-pro-semibold">
                    {label}
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-2xl font-bold text-gray-900 myriad-pro-regular">
                    {isFilterApplied ? value : "NA"}
                  </span>
                  {unit && (
                    <span className="text-xs font-medium text-gray-600">
                      {isFilterApplied ? unit : ""}
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

export default HaryanaTab;