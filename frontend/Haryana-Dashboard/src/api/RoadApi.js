import axiosInstance from './axiosInstance';

// ─── Module-level cache for the initial "all roads" fetch ────────────────────
// Both Dashboard and Smoothening need the full dataset on mount.
// We store a single promise so every caller shares the same network request.
let _allRoadsPromise = null;
let _allRoadsData = null;

/**
 * Returns the full GeoJSON (no filters). Hits the API at most once per page
 * load; subsequent calls return the cached result immediately.
 */
export const fetchAllRoadsCached = () => {
  if (_allRoadsData) return Promise.resolve(_allRoadsData);
  if (_allRoadsPromise) return _allRoadsPromise;
  _allRoadsPromise = axiosInstance
    .get('/filterRoads')
    .then((res) => {
      _allRoadsData = res.data;
      return _allRoadsData;
    })
    .catch((err) => {
      _allRoadsPromise = null; // allow retry on error
      throw err;
    });
  return _allRoadsPromise;
};

/**
 * Invalidates the road cache so the next call fetches fresh data.
 * Useful after an upload or data mutation successfully completes.
 */
export const invalidateRoadsCache = () => {
  _allRoadsPromise = null;
  _allRoadsData = null;
};

// Road-specific API functions

/**
 * Core filter function — uses the unified /api/filterRoads endpoint.
 * All params are optional; omit or leave undefined to fetch all.
 *
 * @param {object} params
 * @param {number}  [params.city_id]  - ID from GeoDataset (represents city)
 * @param {string}  [params.circle]   - Circle name from Road table
 * @param {number}  [params.ward]     - Ward number (div_code)
 * @param {number}  [params.road_id]  - Specific road ID
 */
export const filterRoads = async (params = {}) => {
  try {
    // Strip out keys whose value is undefined / empty string so they don't
    // get sent as "?circle=&ward=" which could confuse the backend.
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ''
      )
    );
    const response = await axiosInstance.get('/filterRoads', { params: cleanParams });
    return response.data; // GeoJSON FeatureCollection
  } catch (error) {
    console.error('Error fetching filtered roads:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Legacy wrappers — still used by RoadDetailsDialog; kept for compatibility
// ---------------------------------------------------------------------------

/** @deprecated Use filterRoads() */
export const fetchRoadData = async () => filterRoads();

/** @deprecated Use filterRoads({ city_id }) */
export const fetchRoadDataByCity = async (cityId) =>
  filterRoads({ city_id: cityId });

/** @deprecated Use filterRoads({ city_id, ward }) */
export const fetchRoadsByWard = async (cityId, ward) =>
  filterRoads({ city_id: cityId, ward });

/** @deprecated Use filterRoads({ road_id }) */
export const fetchFilteredRoadData = async (filters = {}) =>
  filterRoads(filters);

/**
 * Fetch region overview statistics.
 *
 * @param {number|string|null} [datasetId] - city_id to filter by; omit for global stats.
 * @returns {{ dataset_id, total_roads, length_stats: { total_length, avg_length, max_length, min_length } }}
 */
export const fetchRegionOverview = async (datasetId = null) => {
  try {
    const params = datasetId != null ? { dataset_id: datasetId } : {};
    const response = await axiosInstance.get('/region-overview', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching region overview:', error);
    throw error;
  }
};

// Function to fetch specific road details by ID (for map click dialog)
export const fetchRoadDetailsById = async (roadId) => {
  try {
    const response = await axiosInstance.get(`/get-road-details/${roadId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching road details:', error);
    throw error;
  }
};