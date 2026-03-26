/**
 * Extract unique cities from GeoJSON data
 */
export const extractUniqueCities = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueCitiesMap = new Map(); // Use Map to store city with its ID
  geoData.features.forEach((feature) => {
    const city = feature.properties?.city;
    const cityId = feature.properties?.id; // Extract city ID from properties
    if (city && cityId) {
      // Store by city name to ensure uniqueness, keeping the ID
      if (!uniqueCitiesMap.has(city)) {
        uniqueCitiesMap.set(city, cityId);
      }
    }
  });

  return Array.from(uniqueCitiesMap).map(([city, cityId]) => ({
    label: city.charAt(0).toUpperCase() + city.slice(1),
    value: cityId, // Use the actual ID from properties
  }));
};

/**
 * Filter GeoJSON data based on selected cities
 */
export const filterGeoJsonByCities = (geoData, selectedCities) => {
  if (!selectedCities || selectedCities.length === 0) {
    return geoData; // Return all data if no cities selected
  }

  const selectedCityIds = selectedCities.map(city => city.value); // Use value which is now the city ID
  const filteredFeatures = geoData.features.filter((feature) =>
    feature.properties?.id &&
    selectedCityIds.includes(feature.properties.id)
  );

  return {
    ...geoData,
    features: filteredFeatures
  };
};

/**
 * Get bounds and zoom level for selected cities or all data
 */
export const getBoundsForCities = (geoJsonData, cities = []) => {
  if (!geoJsonData || !Array.isArray(geoJsonData.features)) return null;

  let featuresToCheck = geoJsonData.features;

  // If cities are selected, filter features by city ID
  if (cities && cities.length > 0) {
    const selectedCityIds = cities.map(city => city.value); // Use value which is now the city ID
    featuresToCheck = geoJsonData.features.filter((feature) =>
      feature.properties?.id &&
      selectedCityIds.includes(feature.properties.id)
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
export const extractUniqueMunicipalCouncils = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueCouncils = new Map();

  geoData.features.forEach((feature) => {
    if (feature.properties?.municipal_council) {
      const councilName = feature.properties.municipal_council;
      const roadId = feature.properties?.id; // Extract road_id for ward API calls
      // Create value: remove spaces and lowercase, Keep label as original but capitalize
      const value = councilName.replace(/\s+/g, "").toLowerCase();
      const label = councilName.charAt(0).toUpperCase() + councilName.slice(1).toLowerCase();

      // Use Map to ensure uniqueness by value, store road_id for ward fetching
      if (!uniqueCouncils.has(value)) {
        uniqueCouncils.set(value, { label, value, road_id: roadId });
      }
    }
  });

  return Array.from(uniqueCouncils.values());
};

/**
 * Extract unique roads from GeoJSON data
 * Uses the 'name' property for road display name
 */
export const extractUniqueRoads = (geoData) => {
  if (!geoData || !Array.isArray(geoData.features)) return [];

  const uniqueRoads = new Map();

  geoData.features.forEach((feature) => {
    const roadName = feature.properties?.name;
    const roadId = feature.properties?.id;

    if (!roadId) return; // Skip features without an ID

    // Use roadId as key to ensure uniqueness
    if (!uniqueRoads.has(roadId)) {
      // Determine the display label
      const isUnnamed =
        !roadName ||
        roadName.trim() === "" ||
        roadName.trim().toLowerCase() === "no name";

      uniqueRoads.set(roadId, {
        label: isUnnamed ? `No Name (ID: ${roadId})` : roadName,
        value: String(roadId),
        isUnnamed, // flag for styling in the dropdown
      });
    }
  });

  return Array.from(uniqueRoads.values());
};
