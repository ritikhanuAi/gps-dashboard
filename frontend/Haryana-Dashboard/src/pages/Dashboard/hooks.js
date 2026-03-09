import { useEffect, useState } from "react";
import { fetchRoadData, fetchRoadDataByCity, fetchRoadsByWard, fetchUniqueWards } from "../../api/RoadApi";
import { HARYANA_CENTER, HARYANA_DEFAULT_ZOOM } from "./constants";
import {
  extractUniqueCities,
  extractUniqueMunicipalCouncils,
  extractUniqueRoads,
  getBoundsForCities,
  getBoundsForGeoJson,
  isValidGeoJSON
} from "./utils";

/**
 * Custom hook to manage road data fetching and map state
 */
export const useRoadData = () => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [filteredGeoJsonData, setFilteredGeoJsonData] = useState(null);
  const [cityOptions, setCityOptions] = useState([]);
  const [isLoadingCityData, setIsLoadingCityData] = useState(true);
  const [mapCenter, setMapCenter] = useState(HARYANA_CENTER);
  const [mapZoom, setMapZoom] = useState(HARYANA_DEFAULT_ZOOM);
  const [mapKey, setMapKey] = useState(0);

  // Load road data on mount
  useEffect(() => {
    const loadRoadData = async () => {
      setIsLoadingCityData(true);
      try {
        const response = await fetchRoadData();
        console.log("Road API Response:", response);

        const geoData = response.data;
        console.log("GeoJSON Data:", geoData);

        if (isValidGeoJSON(geoData)) {
          setGeoJsonData(geoData);
          const cities = extractUniqueCities(geoData);
          setCityOptions(cities);
          setFilteredGeoJsonData(geoData);

          const bounds = getBoundsForCities(geoData, []);
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

  return {
    geoJsonData,
    setGeoJsonData,
    filteredGeoJsonData,
    setFilteredGeoJsonData,
    cityOptions,
    setCityOptions,
    isLoadingCityData,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    mapKey,
    setMapKey,
  };
};

/**
 * Helper: filter out "No Name" roads from GeoJSON
 */
const filterOutNoNameRoads = (geoJsonData) => {
  if (!geoJsonData || !Array.isArray(geoJsonData.features)) return geoJsonData;
  return {
    ...geoJsonData,
    features: geoJsonData.features.filter((feature) => {
      const name = feature.properties?.name;
      return name && name.trim().toLowerCase() !== "no name";
    }),
  };
};

/**
 * Custom hook to manage filter cascade logic
 * City -> Municipal Council -> Ward -> Road(s)
 */
export const useFilterCascade = (geoJsonData, setFilteredGeoJsonData, setMapCenter, setMapZoom, setMapKey) => {
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedMunicipalCouncil, setSelectedMunicipalCouncil] = useState("");
  const [selectedMunicipalCouncilOption, setSelectedMunicipalCouncilOption] = useState(null);
  const [selectedWard, setSelectedWard] = useState(""); // Single select
  const [selectedRoads, setSelectedRoads] = useState([]); // Array for multi-select
  const [wardGeoJsonData, setWardGeoJsonData] = useState(null); // GeoJSON for selected ward (without No Name roads)

  const [isLoadingMunicipalCouncil, setIsLoadingMunicipalCouncil] = useState(false);
  const [isLoadingWard, setIsLoadingWard] = useState(false);
  const [isLoadingRoad, setIsLoadingRoad] = useState(false);

  const [municipalCouncilOptions, setMunicipalCouncilOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [roadOptions, setRoadOptions] = useState([]);

  // When city is selected, fetch municipal councils and display all roads on map
  useEffect(() => {
    if (selectedCities.length > 0) {
      setIsLoadingMunicipalCouncil(true);
      const fetchMunicipalCouncils = async () => {
        try {
          const cityValue = selectedCities[0].value;
          console.log("Selected city value for API call:", cityValue);
          const response = await fetchRoadDataByCity(cityValue);
          console.log("Municipal Council API Response:", response);

          if (response && response.data) {
            setFilteredGeoJsonData(response.data);
            const councils = extractUniqueMunicipalCouncils(response.data);
            setMunicipalCouncilOptions(councils);
          }
        } catch (error) {
          console.error("Error fetching municipal councils:", error);
          setMunicipalCouncilOptions([]);
        } finally {
          setIsLoadingMunicipalCouncil(false);
        }
      };

      fetchMunicipalCouncils();
      setSelectedMunicipalCouncil("");
      setSelectedMunicipalCouncilOption(null);
      setSelectedWard("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    } else {
      setMunicipalCouncilOptions([]);
      setWardOptions([]);
      setRoadOptions([]);
      setSelectedMunicipalCouncil("");
      setSelectedMunicipalCouncilOption(null);
      setSelectedWard("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedCities]);

  // When municipal council is selected, fetch unique wards from API
  useEffect(() => {
    if (selectedMunicipalCouncilOption && selectedMunicipalCouncilOption.road_id) {
      setIsLoadingWard(true);
      const fetchWards = async () => {
        try {
          const roadId = selectedMunicipalCouncilOption.road_id;
          console.log("Fetching wards for road_id:", roadId);
          const response = await fetchUniqueWards(roadId);
          console.log("Wards API Response:", response);

          if (response && response.wards) {
            const wardOpts = response.wards
              .filter((ward) => ward !== null && ward !== undefined)
              .map((ward) => ({
                label: `Ward ${ward}`,
                value: String(ward),
              }));
            setWardOptions(wardOpts);
          } else {
            setWardOptions([]);
          }
        } catch (error) {
          console.error("Error fetching wards:", error);
          setWardOptions([]);
        } finally {
          setIsLoadingWard(false);
        }
      };

      fetchWards();
      setSelectedWard("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    } else {
      setWardOptions([]);
      setSelectedWard("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedMunicipalCouncilOption]);

  // When ward is selected, fetch roads and display on map (filter out "No Name" roads)
  useEffect(() => {
    if (selectedWard && selectedCities.length > 0) {
      setIsLoadingRoad(true);
      const fetchRoads = async () => {
        try {
          const cityId = selectedCities[0].value;
          console.log("Fetching roads for cityId:", cityId, "ward:", selectedWard);
          const response = await fetchRoadsByWard(cityId, selectedWard);
          console.log("Roads API Response:", response);

          if (response && response.data) {
            // Filter out "No Name" roads
            const cleanedGeoJson = filterOutNoNameRoads(response.data);

            // Store for later road filtering
            setWardGeoJsonData(cleanedGeoJson);

            // Display on map
            if (isValidGeoJSON(cleanedGeoJson) && cleanedGeoJson.features.length > 0) {
              setFilteredGeoJsonData(cleanedGeoJson);

              // Zoom to fit roads
              const bounds = getBoundsForGeoJson(cleanedGeoJson);
              if (bounds) {
                setMapCenter(bounds.center);
                setMapZoom(bounds.zoom);
                setMapKey((prev) => prev + 1);
              }
            }

            // Extract road names for dropdown (already without "No Name")
            const roads = extractUniqueRoads(cleanedGeoJson);
            setRoadOptions(roads);
          } else {
            setRoadOptions([]);
            setWardGeoJsonData(null);
          }
        } catch (error) {
          console.error("Error fetching roads:", error);
          setRoadOptions([]);
          setWardGeoJsonData(null);
        } finally {
          setIsLoadingRoad(false);
        }
      };

      fetchRoads();
      setSelectedRoads([]);
    } else {
      setRoadOptions([]);
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedWard]);

  // When road selection changes (checkbox toggle), filter map to show only selected roads
  useEffect(() => {
    if (wardGeoJsonData && selectedRoads.length > 0) {
      const selectedRoadIds = selectedRoads.map((r) => r.value);
      const filteredFeatures = wardGeoJsonData.features.filter((feature) =>
        selectedRoadIds.includes(String(feature.properties?.id))
      );
      const filteredData = {
        ...wardGeoJsonData,
        features: filteredFeatures,
      };
      setFilteredGeoJsonData(filteredData);

      // Zoom to selected roads
      const bounds = getBoundsForGeoJson(filteredData);
      if (bounds) {
        setMapCenter(bounds.center);
        setMapZoom(bounds.zoom);
        setMapKey((prev) => prev + 1);
      }
    } else if (wardGeoJsonData && selectedRoads.length === 0) {
      // Show all named roads in the ward when no specific roads selected
      setFilteredGeoJsonData(wardGeoJsonData);

      // Zoom to all ward roads
      const bounds = getBoundsForGeoJson(wardGeoJsonData);
      if (bounds) {
        setMapCenter(bounds.center);
        setMapZoom(bounds.zoom);
        setMapKey((prev) => prev + 1);
      }
    }
  }, [selectedRoads]);

  return {
    selectedCities,
    setSelectedCities,
    selectedMunicipalCouncil,
    setSelectedMunicipalCouncil,
    selectedMunicipalCouncilOption,
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
  };
};

/**
 * Custom hook to manage map zoom animation
 * Handles both city selection animation and external zoom updates (ward/road selection)
 */
export const useMapAnimation = (selectedCities, geoJsonData, mapCenter, mapZoom, mapKey) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedMapCenter, setAnimatedMapCenter] = useState(mapCenter);
  const [animatedMapZoom, setAnimatedMapZoom] = useState(mapZoom);
  const [animatedMapKey, setAnimatedMapKey] = useState(mapKey);

  // Sync animated values when parent mapCenter/mapZoom/mapKey change
  useEffect(() => {
    if (!isAnimating) {
      setAnimatedMapCenter(mapCenter);
      setAnimatedMapZoom(mapZoom);
      setAnimatedMapKey(mapKey);
    }
  }, [mapCenter, mapZoom, mapKey]);

  // City selection animation (zoom out then zoom in)
  useEffect(() => {
    if (selectedCities && selectedCities.length > 0) {
      const bounds = getBoundsForCities(geoJsonData, selectedCities);
      if (bounds) {
        setIsAnimating(true);

        setTimeout(() => {
          setAnimatedMapCenter([29.0588, 75.8507]);
          setAnimatedMapZoom(7);
        }, 100);

        setTimeout(() => {
          setAnimatedMapCenter(bounds.center);
          setAnimatedMapZoom(13);
          setAnimatedMapKey((prev) => prev + 1);
          setIsAnimating(false);
        }, 950);
      }
    } else if (geoJsonData) {
      const bounds = getBoundsForCities(geoJsonData, []);
      if (bounds) {
        setTimeout(() => {
          setAnimatedMapCenter(bounds.center);
          setAnimatedMapZoom(bounds.zoom);
          setAnimatedMapKey((prev) => prev + 1);
        }, 100);
      }
    }
  }, [selectedCities, geoJsonData]);

  return {
    isAnimating,
    animatedMapCenter,
    animatedMapZoom,
    animatedMapKey,
  };
};
