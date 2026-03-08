import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import InputDropdown from "../component/InputDropdown/InputDropdown";
import RoadAthena from "../assets/svgs/RoadAthena";

const HaryanaTab = () => {

    // state declare 


  const [selectedCity, setSelectedCity] = useState("");
  const [selectedMunicipalCouncil, setSelectedMunicipalCouncil] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedRoad, setSelectedRoad] = useState("");
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [mapLayer, setMapLayer] = useState("default");
  const [mapCenter, setMapCenter] = useState([29.0588, 75.8507]);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapKey, setMapKey] = useState(0);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);

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

  // Get bounds (ZOOMING FUNCTIONALITY) and center of a city
  const getCityBounds = (city) => {
    if (!geoJsonData || !Array.isArray(geoJsonData.features)) return null;

    const cityFeatures = geoJsonData.features.filter(
      (feature) =>
        feature.properties?.city?.toLowerCase() === city.toLowerCase(),
    );

    if (cityFeatures.length === 0) return null;

    let minLat = Infinity,
      maxLat = -Infinity;
    let minLng = Infinity,
      maxLng = -Infinity;

    cityFeatures.forEach((feature) => {
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
    const zoom =
      maxDiff < 0.01 ? 14 : maxDiff < 0.05 ? 13 : maxDiff < 0.1 ? 12 : 11;

    return { center: [centerLat, centerLng], zoom };
  };

  // Load data from API on PAGE LOAD
  useEffect(() => {
    const fetchGeoJsonData = async () => {
      try {
        const response = await axios.get(
          "http://192.168.1.208:8000/api/fetchRoadData",
        );

        console.log("API Response Status:", response);
        const geoData = response.data.data;
        console.log("Raw API Response:", geoData);
        // Validate GeoJSON before setting state
        if (isValidGeoJSON(geoData)) {
          setGeoJsonData(geoData);
          // Extract and set unique cities
          const cities = extractUniqueCities(geoData);
          setCityOptions(cities);
        } else {
          console.error("Invalid GeoJSON received");
          setCityOptions([]);
        }
      } catch (error) {
        console.log("Error fetching GeoJSON data:", error);
      }
    };
    fetchGeoJsonData();
  }, []);

  //   dummy dataaaaaaaa for dropdowns
  const tehsilOptions = [
    { label: "Kalanaur", value: "kalanaur" },
    { label: "Hisar", value: "hisar" },
    { label: "Rohtak", value: "rohtak" },
    { label: "Panipat", value: "panipat" },
    { label: "Sunaria", value: "sunaria" },
  ];

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

  const handleDropdownChange = (setter) => (event) => {
    setter(event.selectedItem.label);
  };

  // Fetch GeoJSON data with filter parameters
  //   const fetchGeoJsonWithFilters = async () => {
  //     try {
  //       // Build query parameters from selected values
  //       const params = new URLSearchParams();
  //       if (selectedCity) params.append("city", selectedCity);
  //       if (selectedMunicipalCouncil)
  //         params.append("municipalCouncil", selectedMunicipalCouncil);
  //       if (selectedWard) params.append("ward", selectedWard);
  //       if (selectedRoad) params.append("road", selectedRoad);

  //       // Use the actual API endpoint
  //       const url = `http://192.168.1.208:8000/api/fetchRoadData`;

  //       const response = await fetch(url);

  //       if (!response.ok) {
  //         console.error('API Error:', response.status);
  //         setGeoJsonData(dummyGeoJsonData);
  //         return;
  //       }

  //       const data = await response.json();
  //       console.log('Filtered GeoJSON Data:', data);
  //       setGeoJsonData(data);

  //         // Zoom to first feature's coordinate if available
  //         if (geoData.features && geoData.features.length > 0) {
  //           const coords = geoData.features[0].geometry.coordinates;
  //           if (Array.isArray(coords[0])) {
  //             // LineString or Polygon
  //             setMapCenter([coords[0][1], coords[0][0]]);
  //             setMapZoom(12);
  //           }

  //       } else {
  //         console.error('Invalid GeoJSON in filter response, using dummy data');
  //         setGeoJsonData(dummyGeoJsonData);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching GeoJ data:", error);
  //       setGeoJsonData(dummyGeoJsonData);
  //     }

  //     // Force map re-render
  //     setMapKey((prev) => prev + 1);
  //   };

  const handleApplyFilter = () => {
    setIsFilterApplied(true);
    fetchGeoJsonWithFilters();
  };

  const handleResetFilter = () => {
    setSelectedMunicipalCouncil("");
    setSelectedWard("");
    setSelectedRoad("");


    // Keep city selected to maintain zoom functionality
   
    if (!selectedCity) {
      setMapCenter([29.0588, 75.8507]);
      setMapZoom(10);
    }
    setMapKey((prev) => prev + 1);
    setIsFilterApplied(false);
  };

  // Reset dependent dropdowns when City changes
  useEffect(() => {
    setSelectedMunicipalCouncil("");
    setSelectedWard("");
    setSelectedRoad("");
  }, [selectedCity]);

  // Reset dependent dropdowns when Municipal Council changes
  useEffect(() => {
    setSelectedWard("");
    setSelectedRoad("");
  }, [selectedMunicipalCouncil]);

  // Reset Road when Ward changes
  useEffect(() => {
    setSelectedRoad("");
  }, [selectedWard]);

  // Zoom to selected city
  useEffect(() => {
    if (selectedCity) {
      const bounds = getCityBounds(selectedCity);
      if (bounds) {
        setMapCenter(bounds.center);
        setMapZoom(bounds.zoom);
        setMapKey((prev) => prev + 1);
      }
    }
  }, [selectedCity]);

 
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

  //  STATS DUMMY DATA 
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

  //   const legend = [
  //     { label: "Good (>80%)", color: "bg-emerald-500" },
  //     { label: "Average (50–80%)", color: "bg-amber-400" },
  //     { label: "Poor (<50%)", color: "bg-red-500" },
  //   ];

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
          <InputDropdown
            label="City"
            value={selectedCity}
            onChange={handleDropdownChange(setSelectedCity)}
            optionList={cityOptions}
            placeholder={"Select City"}
            name="city"
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Municipal Council"
            value={selectedMunicipalCouncil}
            onChange={handleDropdownChange(setSelectedMunicipalCouncil)}
            optionList={municipalCouncilOptions}
            placeholder={"Select Council"}
            name="municipalCouncil"
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Ward"
            value={selectedWard}
            onChange={handleDropdownChange(setSelectedWard)}
            optionList={wardOptions}
            placeholder={"Select Ward"}
            name="ward"
            width="100%"
            isSearchable
          />
          <InputDropdown
            label="Road"
            value={selectedRoad}
            onChange={handleDropdownChange(setSelectedRoad)}
            optionList={roadOptions}
            name="road"
            width="100%"
            placeholder="Select Road"
            isSearchable
          />
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
            {geoJsonData && isValidGeoJSON(geoJsonData) ? (
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url={mapLayers[mapLayer].url}
                  attribution={mapLayers[mapLayer].attribution}
                />
                <GeoJSON data={geoJsonData} onEachFeature={onEachFeature} />
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
              {selectedCity || "City"} — {selectedMunicipalCouncil || "Council"}
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
