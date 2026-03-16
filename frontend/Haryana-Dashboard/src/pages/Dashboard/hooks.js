import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
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

  // Target bounds for smooth fly-to (instead of re-mounting)
  const [flyTarget, setFlyTarget] = useState(null);

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
    flyTarget,
    setFlyTarget,
  };
};


/**
 * Custom hook to manage filter cascade logic
 * City -> Municipal Council -> Ward -> Road(s)
 */
export const useFilterCascade = (geoJsonData, setFilteredGeoJsonData, setMapCenter, setMapZoom, setMapKey, setFlyTarget) => {
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedMunicipalCouncil, setSelectedMunicipalCouncil] = useState("");
  const [selectedMunicipalCouncilOption, setSelectedMunicipalCouncilOption] = useState(null);
  const [selectedWard, setSelectedWard] = useState(""); // Single select - stores ward VALUE (number string)
  const [selectedWardLabel, setSelectedWardLabel] = useState(""); // Display label for ward
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
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    } else {
      setMunicipalCouncilOptions([]);
      setWardOptions([]);
      setRoadOptions([]);
      setSelectedMunicipalCouncil("");
      setSelectedMunicipalCouncilOption(null);
      setSelectedWard("");
      setSelectedWardLabel("");
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
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    } else {
      setWardOptions([]);
      setSelectedWard("");
      setSelectedWardLabel("");
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
            // Include all roads (do not filter out No Name roads)
            let cleanedGeoJson = response.data;

            // Filter locally by ward to ensure map only shows roads for the selected ward
            if (cleanedGeoJson && Array.isArray(cleanedGeoJson.features)) {
              cleanedGeoJson = {
                ...cleanedGeoJson,
                features: cleanedGeoJson.features.filter(
                  (f) => String(f.properties?.ward) === String(selectedWard)
                )
              };
            }

            // Store for later road filtering
            setWardGeoJsonData(cleanedGeoJson);

            // Display on map
            if (isValidGeoJSON(cleanedGeoJson) && cleanedGeoJson.features.length > 0) {
              setFilteredGeoJsonData(cleanedGeoJson);

              // Fly to fit roads (smooth transition)
              const bounds = getBoundsForGeoJson(cleanedGeoJson);
              if (bounds) {
                setFlyTarget({ center: bounds.center, zoom: bounds.zoom, bounds: bounds.bounds });
              }
            }

            // Extract road names for dropdown
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

      // Fly to selected roads (smooth transition)
      const bounds = getBoundsForGeoJson(filteredData);
      if (bounds) {
        setFlyTarget({ center: bounds.center, zoom: bounds.zoom, bounds: bounds.bounds });
      }
    } else if (wardGeoJsonData && selectedRoads.length === 0) {
      // Show all named roads in the ward when no specific roads selected
      setFilteredGeoJsonData(wardGeoJsonData);

      // Fly to all ward roads
      const bounds = getBoundsForGeoJson(wardGeoJsonData);
      if (bounds) {
        setFlyTarget({ center: bounds.center, zoom: bounds.zoom, bounds: bounds.bounds });
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
  };
};

/**
 * Component that smoothly flies the map to a target location.
 * Must be rendered as a child of <MapContainer>.
 */
export const MapFlyTo = ({ flyTarget }) => {
  const map = useMap();
  const prevTargetRef = useRef(null);

  useEffect(() => {
    if (!flyTarget || !map) return;

    // Avoid re-flying to the same target
    const targetKey = JSON.stringify(flyTarget);
    if (prevTargetRef.current === targetKey) return;
    prevTargetRef.current = targetKey;

    if (flyTarget.bounds) {
      // Use fitBounds for the smoothest/most accurate fit
      const leafletBounds = [
        [flyTarget.bounds[0][0], flyTarget.bounds[0][1]],
        [flyTarget.bounds[1][0], flyTarget.bounds[1][1]],
      ];
      map.flyToBounds(leafletBounds, {
        padding: [30, 30],
        duration: 1.2,
        easeLinearity: 0.25,
        maxZoom: flyTarget.zoom || 18,
      });
    } else if (flyTarget.center) {
      map.flyTo(flyTarget.center, flyTarget.zoom || 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [flyTarget, map]);

  return null;
};

/**
 * Custom hook to manage map zoom animation for city selection
 * Uses flyTo instead of re-mounting the map
 */
export const useMapAnimation = (selectedCities, geoJsonData, mapCenter, mapZoom, mapKey, setFlyTarget) => {
  // City selection animation (fly to city bounds)
  useEffect(() => {
    if (selectedCities && selectedCities.length > 0) {
      const bounds = getBoundsForCities(geoJsonData, selectedCities);
      if (bounds) {
        setFlyTarget({ center: bounds.center, zoom: bounds.zoom + 1 });
      }
    } else if (geoJsonData) {
      const bounds = getBoundsForCities(geoJsonData, []);
      if (bounds) {
        setFlyTarget({ center: bounds.center, zoom: bounds.zoom });
      }
    }
  }, [selectedCities, geoJsonData]);

  return {
    // No longer returning animated values — we use the original ones
    // and let MapFlyTo handle smooth transitions
    animatedMapCenter: mapCenter,
    animatedMapZoom: mapZoom,
    animatedMapKey: mapKey,
  };
};
