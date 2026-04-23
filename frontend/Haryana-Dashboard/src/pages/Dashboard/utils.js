/**
 * Extract unique cities from GeoJSON data.
 * Supports new API shape: { city_id, city_name } as well as legacy { id, city }.
 */
export const extractUniqueCities = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueCitiesMap = new Map();
  geoData.features.forEach((feature) => {
    const props = feature.properties || {};
    // New API: city_id + city_name; fall back to legacy: id + city
    const cityId   = props.city_id   ?? props.id;
    const cityName = props.city_name ?? props.city;
    if (cityId && cityName) {
      if (!uniqueCitiesMap.has(cityId)) {
        const label = cityName.charAt(0).toUpperCase() + cityName.slice(1);
        uniqueCitiesMap.set(cityId, { label, value: cityId });
      }
    }
  });

  return Array.from(uniqueCitiesMap.values());
};

/**
 * Filter GeoJSON data based on selected cities
 */
export const filterGeoJsonByCities = (geoData, selectedCities) => {
  if (!selectedCities || selectedCities.length === 0) {
    return geoData;
  }

  const selectedCityIds = selectedCities.map(city => city.value);
  const filteredFeatures = geoData.features.filter((feature) => {
    const props = feature.properties || {};
    const id = props.city_id ?? props.id;
    return id && selectedCityIds.includes(id);
  });

  return { ...geoData, features: filteredFeatures };
};

/**
 * Get bounds and zoom level for selected cities or all data
 */
export const getBoundsForCities = (geoJsonData, cities = []) => {
  if (!geoJsonData || !Array.isArray(geoJsonData.features)) return null;

  let featuresToCheck = geoJsonData.features;

  if (cities && cities.length > 0) {
    const selectedCityIds = cities.map(city => city.value);
    featuresToCheck = geoJsonData.features.filter((feature) => {
      const props = feature.properties || {};
      const id = props.city_id ?? props.id;
      return id && selectedCityIds.includes(id);
    });
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
    // For filtered cities, zoom in closer (reduced to avoid excessive zoom)
    zoom = maxDiff < 0.01 ? 13 : maxDiff < 0.05 ? 12 : maxDiff < 0.1 ? 11 : 10;
  } else {
    // For all data, zoom out more (increased by 1)
    zoom = maxDiff < 0.1 ? 11 : maxDiff < 0.5 ? 10 : maxDiff < 1 ? 9 : 8;
  }

  return { center: [centerLat, centerLng], zoom };
};

/**
 * Get bounds and zoom level for any GeoJSON data (ward roads, filtered roads, etc.)
 * Returns bounds with padding for well-fitted map display
 */
export const getBoundsForGeoJson = (geoJsonData) => {
  if (!geoJsonData || !Array.isArray(geoJsonData.features) || geoJsonData.features.length === 0) {
    return null;
  }

  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  geoJsonData.features.forEach((feature) => {
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

  if (minLat === Infinity) return null;

  // Add padding so roads aren't at the very edge
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const latPadding = Math.max(latDiff * 0.08, 0.0005);
  const lngPadding = Math.max(lngDiff * 0.08, 0.0005);

  const paddedMinLat = minLat - latPadding;
  const paddedMaxLat = maxLat + latPadding;
  const paddedMinLng = minLng - lngPadding;
  const paddedMaxLng = maxLng + lngPadding;

  const centerLat = (paddedMinLat + paddedMaxLat) / 2;
  const centerLng = (paddedMinLng + paddedMaxLng) / 2;
  const paddedLatDiff = paddedMaxLat - paddedMinLat;
  const paddedLngDiff = paddedMaxLng - paddedMinLng;
  const maxDiff = Math.max(paddedLatDiff, paddedLngDiff);

  const featureCount = geoJsonData.features.length;

  // Zoom: base log2 + boost depending on how many features
  let zoom;
  if (maxDiff <= 0) {
    zoom = 19;
  } else {
    const baseZoom = Math.floor(Math.log2(360 / maxDiff));
    if (featureCount <= 3) {
      // Individual roads — zoom in tight
      zoom = baseZoom + 9;
      zoom = Math.max(17, Math.min(zoom, 19));
    } else if (featureCount <= 10) {
      // Multi-road selection — fit selected roads nicely
      zoom = baseZoom + 1;
      zoom = Math.max(12, Math.min(zoom, 17));
    } else {
      // Ward-level (many roads) — fit all roads comfortably
      zoom = baseZoom + 2;
      zoom = Math.max(13, Math.min(zoom, 17));
    }
  }

  return {
    center: [centerLat, centerLng],
    zoom,
    bounds: [[paddedMinLat, paddedMinLng], [paddedMaxLat, paddedMaxLng]],
  };
};

/**
 * Validate GeoJSON structure
 */
export const isValidGeoJSON = (data) => {
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

/**
 * Get feature style based on viewMode:
 *  - 'general'  → quality-based colours (green / amber / red)
 *  - 'category' → width-based colours  (blue = has width, amber = no/zero width)
 *
 * @param {object} feature  - GeoJSON feature
 * @param {string} viewMode - 'general' | 'category'
 */
export const getFeatureStyle = (feature, viewMode = "general") => {
  if (viewMode === "category") {
    const w = feature.properties?.width;
    const hasWidth = w !== null && w !== undefined && parseFloat(w) > 0;
    return {
      color: hasWidth ? "#3b82f6" : "#f59e0b", // blue-500 | amber-400
      weight: 4,
      opacity: 0.9,
    };
  }

  // General: quality-based colouring
  const quality = feature.properties?.quality;
  let color = "#3388ff"; // default blue

  if (quality !== undefined) {
    if (quality > 80)      color = "#22c55e"; // green  — good
    else if (quality > 50) color = "#f59e0b"; // amber  — average
    else                   color = "#ef4444"; // red    — poor
  }

  return { color, weight: 4, opacity: 0.9 };
};

/**
 * Extract unique municipal councils from GeoJSON data
 * Removes spaces, converts to lowercase for value, but keeps nice display name
 */
/**
 * Extract unique circles (municipal councils) from GeoJSON data.
 * Supports new API shape: { circle } as well as legacy { municipal_council }.
 */
export const extractUniqueMunicipalCouncils = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueCouncils = new Map();

  geoData.features.forEach((feature) => {
    const props = feature.properties || {};
    // New API uses `circle`; legacy used `municipal_council`
    const circleName = props.circle ?? props.municipal_council;
    if (!circleName) return;

    // value = the raw circle string (sent back to the API as-is)
    const value = circleName.trim();
    const label = value.charAt(0).toUpperCase() + value.slice(1);

    if (!uniqueCouncils.has(value)) {
      uniqueCouncils.set(value, { label, value });
    }
  });

  return Array.from(uniqueCouncils.values());
};

/**
 * Extract unique roads from GeoJSON data
 * Uses the 'name' property for road display name
 */
/**
 * Extract unique roads from GeoJSON data.
 * Supports new API shape: { road_id, road_name } as well as legacy { id, name }.
 */
export const extractUniqueRoads = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueRoads = new Map();

  geoData.features.forEach((feature) => {
    const props = feature.properties || {};
    // New API: road_id + road_name; legacy: id + name
    const roadId   = props.road_id   ?? props.id;
    const roadName = props.road_name ?? props.name;

    if (!roadId) return;

    if (!uniqueRoads.has(roadId)) {
      const isUnnamed =
        !roadName ||
        roadName.trim() === '' ||
        roadName.trim().toLowerCase() === 'no name';

      uniqueRoads.set(roadId, {
        label: isUnnamed ? `No Name (ID: ${roadId})` : roadName,
        value: String(roadId),
        isUnnamed,
      });
    }
  });

  return Array.from(uniqueRoads.values());
};
