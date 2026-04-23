import axiosInstance from './axiosInstance';

/**
 * Update road attributes (PATCH)
 * @param {number} roadId - ID of the road to update
 * @param {object} updateData - Fields to update (e.g., { road_name, status, width })
 * @returns {Promise<object>} Response with message and updated data
 */
export const updateRoadAttributes = async (roadId, updateData) => {
  try {
    const response = await axiosInstance.patch(
      `/smoothening/road/${roadId}/update/`,
      updateData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating road attributes:', error);
    throw error;
  }
};

/**
 * Update road geometry (PATCH)
 * @param {number} roadId - ID of the road
 * @param {object} geojsonGeometry - GeoJSON MultiLineString object
 * @returns {Promise<object>} Response with message and geometry_id
 */
export const updateRoadGeometry = async (roadId, geojsonGeometry) => {
  try {
    const response = await axiosInstance.patch(
      `/smoothening/road/${roadId}/geometry/`,
      { geometry: geojsonGeometry }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating road geometry:', error);
    throw error;
  }
};

/**
 * Smooth road geometry (POST)
 * @param {number} roadId - ID of the road
 * @param {object} options - Smoothing options
 * @param {string} options.algorithm - 'chaikin' or 'douglas_peucker'
 * @param {number} [options.iterations] - For chaikin (default 3)
 * @param {number} [options.tolerance] - For douglas_peucker (default 0.00001)
 * @param {boolean} [options.preview] - If true, don't save (default false)
 * @returns {Promise<object>} Response with smoothed geometry and metadata
 */
export const smoothRoadGeometry = async (roadId, options = {}) => {
  try {
    const payload = {
      algorithm: options.algorithm || 'chaikin',
      preview: options.preview || false,
    };

    if (options.algorithm === 'chaikin') {
      payload.iterations = options.iterations || 3;
    } else if (options.algorithm === 'douglas_peucker') {
      payload.tolerance = options.tolerance || 0.00001;
    }

    const response = await axiosInstance.post(
      `/smoothening/road/${roadId}/smooth/`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error smoothing road geometry:', error);
    throw error;
  }
};
