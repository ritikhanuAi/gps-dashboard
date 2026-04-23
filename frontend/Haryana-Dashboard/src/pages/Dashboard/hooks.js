import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { fetchAllRoadsCached, fetchRegionOverview, filterRoads } from "../../api/RoadApi";
import { HARYANA_CENTER, HARYANA_DEFAULT_ZOOM } from "./constants";
import {
  extractUniqueCities,
  extractUniqueMunicipalCouncils,
  extractUniqueRoads,
  getBoundsForCities,
  getBoundsForGeoJson,
  isValidGeoJSON,
} from "./utils";

/**
 * Custom hook to manage road data fetching and map state.
 * Initial load calls GET /api/filterRoads (no params → all roads).
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

  // Load all road data on mount
  useEffect(() => {
    const loadRoadData = async () => {
      setIsLoadingCityData(true);
      try {
        // Use module-level cache — no extra hit if Dashboard was visited before
        const geoData = await fetchAllRoadsCached();
        console.log("Initial GeoJSON load:", geoData);

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
        console.error("Error fetching road data:", error);
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
 * Custom hook to manage filter cascade logic using /api/filterRoads.
 *
 * Cascade:  City (city_id) → Circle (circle) → Ward (ward) → Road (road_id)
 *
 * Each level:
 *   1. Calls the API with all currently-locked params
 *   2. Updates the map with the returned GeoJSON
 *   3. Extracts the next level's options from the returned features
 */
export const useFilterCascade = (
  geoJsonData,
  setFilteredGeoJsonData,
  setMapCenter,
  setMapZoom,
  setMapKey,
  setFlyTarget
) => {
  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedCities, setSelectedCities] = useState([]);

  // Circle (formerly "Municipal Council")
  const [selectedMunicipalCouncil, setSelectedMunicipalCouncil] = useState("");   // display label
  // We also expose a setter-compatible alias so index.jsx keeps working
  const setSelectedMunicipalCouncilOption = (v) => {
    // no-op — the circle value IS the label now; kept for interface compatibility
    void v;
  };

  const [selectedWard, setSelectedWard] = useState("");           // ward number as string
  const [selectedWardLabel, setSelectedWardLabel] = useState(""); // "Ward 12"
  const [selectedRoads, setSelectedRoads] = useState([]);         // multi-select

  // GeoJSON for the current ward level (without road filter)
  const [wardGeoJsonData, setWardGeoJsonData] = useState(null);

  // ── Loading flags ─────────────────────────────────────────────────────────
  const [isLoadingMunicipalCouncil, setIsLoadingMunicipalCouncil] = useState(false);
  const [isLoadingWard, setIsLoadingWard] = useState(false);
  const [isLoadingRoad, setIsLoadingRoad] = useState(false);

  // ── Options ───────────────────────────────────────────────────────────────
  const [municipalCouncilOptions, setMunicipalCouncilOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [roadOptions, setRoadOptions] = useState([]);

  // ── Helper: fly to GeoJSON ────────────────────────────────────────────────
  const flyToGeoJson = (geoJson) => {
    const bounds = getBoundsForGeoJson(geoJson);
    if (bounds) {
      setFlyTarget({ center: bounds.center, zoom: bounds.zoom, bounds: bounds.bounds });
    }
  };

  // ── LEVEL 1: City selected ────────────────────────────────────────────────
  // GET /api/filterRoads?city_id=<id>
  useEffect(() => {
    if (selectedCities.length > 0) {
      setIsLoadingMunicipalCouncil(true);
      const cityId = selectedCities[0].value;

      const fetch = async () => {
        try {
          console.log("Fetching by city_id:", cityId);
          const geoData = await filterRoads({ city_id: cityId });
          console.log("City GeoJSON:", geoData);

          if (geoData && isValidGeoJSON(geoData)) {
            setFilteredGeoJsonData(geoData);
            const circles = extractUniqueMunicipalCouncils(geoData);
            setMunicipalCouncilOptions(circles);
          }
        } catch (err) {
          console.error("Error fetching circles for city:", err);
          setMunicipalCouncilOptions([]);
        } finally {
          setIsLoadingMunicipalCouncil(false);
        }
      };

      fetch();
      // Reset downstream cascade
      setSelectedMunicipalCouncil("");
      setSelectedWard("");
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
      setWardOptions([]);
      setRoadOptions([]);
    } else {
      // City cleared — reset everything
      setMunicipalCouncilOptions([]);
      setWardOptions([]);
      setRoadOptions([]);
      setSelectedMunicipalCouncil("");
      setSelectedWard("");
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedCities]);

  // ── LEVEL 2: Circle selected ──────────────────────────────────────────────
  // GET /api/filterRoads?city_id=<id>&circle=<circle>
  useEffect(() => {
    if (selectedMunicipalCouncil && selectedCities.length > 0) {
      setIsLoadingWard(true);
      const cityId = selectedCities[0].value;
      const circle = selectedMunicipalCouncil;

      const fetch = async () => {
        try {
          console.log("Fetching by circle:", circle);
          const geoData = await filterRoads({ city_id: cityId, circle });
          console.log("Circle GeoJSON:", geoData);

          if (geoData && isValidGeoJSON(geoData)) {
            setFilteredGeoJsonData(geoData);

            // Extract unique wards from the returned features
            const wardSet = new Set();
            geoData.features.forEach((f) => {
              const w = f.properties?.ward ?? f.properties?.div_code;
              if (w !== null && w !== undefined) wardSet.add(w);
            });
            const opts = Array.from(wardSet)
              .sort((a, b) => Number(a) - Number(b))
              .map((w) => ({ label: `Ward ${w}`, value: String(w) }));
            setWardOptions(opts);
          }
        } catch (err) {
          console.error("Error fetching wards for circle:", err);
          setWardOptions([]);
        } finally {
          setIsLoadingWard(false);
        }
      };

      fetch();
      // Reset downstream cascade
      setSelectedWard("");
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
      setRoadOptions([]);
    } else {
      setWardOptions([]);
      setSelectedWard("");
      setSelectedWardLabel("");
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedMunicipalCouncil]);

  // ── LEVEL 3: Ward selected ────────────────────────────────────────────────
  // GET /api/filterRoads?city_id=<id>&circle=<circle>&ward=<ward>
  useEffect(() => {
    if (selectedWard && selectedCities.length > 0 && selectedMunicipalCouncil) {
      setIsLoadingRoad(true);
      const cityId = selectedCities[0].value;
      const circle = selectedMunicipalCouncil;
      const ward   = Number(selectedWard);

      const fetch = async () => {
        try {
          console.log("Fetching by ward:", ward);
          const geoData = await filterRoads({ city_id: cityId, circle, ward });
          console.log("Ward GeoJSON:", geoData);

          if (geoData && isValidGeoJSON(geoData) && geoData.features.length > 0) {
            setWardGeoJsonData(geoData);
            setFilteredGeoJsonData(geoData);
            flyToGeoJson(geoData);

            const roads = extractUniqueRoads(geoData);
            setRoadOptions(roads);
          } else {
            setWardGeoJsonData(null);
            setRoadOptions([]);
          }
        } catch (err) {
          console.error("Error fetching roads for ward:", err);
          setRoadOptions([]);
          setWardGeoJsonData(null);
        } finally {
          setIsLoadingRoad(false);
        }
      };

      fetch();
      setSelectedRoads([]);
    } else {
      setRoadOptions([]);
      setSelectedRoads([]);
      setWardGeoJsonData(null);
    }
  }, [selectedWard]);

  // ── LEVEL 4: Road(s) selected ─────────────────────────────────────────────
  // Filter the already-fetched wardGeoJsonData locally; OR call API for a
  // single road to get road_id-specific geometry.
  useEffect(() => {
    if (!wardGeoJsonData) return;

    if (selectedRoads.length > 0) {
      const selectedRoadIds = new Set(selectedRoads.map((r) => String(r.value)));

      const filteredFeatures = wardGeoJsonData.features.filter((feature) => {
        const props = feature.properties || {};
        const rid = String(props.road_id ?? props.id ?? "");
        return selectedRoadIds.has(rid);
      });

      const filteredData = { ...wardGeoJsonData, features: filteredFeatures };
      setFilteredGeoJsonData(filteredData);
      flyToGeoJson(filteredData);
    } else {
      // No roads selected — show full ward
      setFilteredGeoJsonData(wardGeoJsonData);
      flyToGeoJson(wardGeoJsonData);
    }
  }, [selectedRoads]);

  return {
    selectedCities,
    setSelectedCities,
    selectedMunicipalCouncil,
    setSelectedMunicipalCouncil,
    selectedMunicipalCouncilOption: null,           // kept for interface compatibility
    setSelectedMunicipalCouncilOption,              // kept for interface compatibility
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
 * Custom hook to manage map zoom animation for city selection.
 * Uses flyTo instead of re-mounting the map.
 */
export const useMapAnimation = (
  selectedCities,
  geoJsonData,
  mapCenter,
  mapZoom,
  mapKey,
  setFlyTarget
) => {
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
    animatedMapCenter: mapCenter,
    animatedMapZoom: mapZoom,
    animatedMapKey: mapKey,
  };
};

/**
 * Hook to fetch and reactively update Region Overview statistics.
 *
 * Re-fetches whenever `selectedCityId` changes (pass null for global stats).
 *
 * @param {number|string|null} selectedCityId - city_id (dataset_id) to filter by
 * @returns {{ overviewData, isLoadingOverview }}
 */
export const useRegionOverview = (selectedCityId) => {
  const [overviewData, setOverviewData] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingOverview(true);
      try {
        const data = await fetchRegionOverview(selectedCityId ?? null);
        if (!cancelled) setOverviewData(data);
      } catch (err) {
        console.error("Region overview error:", err);
        if (!cancelled) setOverviewData(null);
      } finally {
        if (!cancelled) setIsLoadingOverview(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCityId]);

  return { overviewData, isLoadingOverview };
};
