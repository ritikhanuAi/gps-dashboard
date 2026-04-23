import axiosInstance from './axiosInstance';

/**
 * Fetch all cities from the server.
 * Endpoint: GET /api/cities/
 * 
 * @returns {Promise<any>} - API response data containing cities
 */
export const getCities = async () => {
  const response = await axiosInstance.get('/cities/');
  return response.data;
};

/**
 * Upload a single GeoJSON file to the server.
 * Endpoint: POST /upload-geo
 * 
 * @param {File} file - A .geojson / .json file
 * @param {number|string} [cityId] - Optional ID of the existing city to update
 * @returns {Promise<any>} - API response data
 */
export const uploadGeoJsonFile = async (file, cityId = null) => {
  const formData = new FormData();
  formData.append('files', file);
  if (cityId) {
    formData.append('city_id', cityId);
  }

  const response = await axiosInstance.post('/upload-geo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Upload multiple GeoJSON files sequentially.
 * Calls onProgress(index, status, error?) after each file completes / fails.
 *
 * @param {File[]} files - Array of files to upload
 * @param {(index: number, status: 'success'|'error', error?: string) => void} onProgress
 * @param {number|string} [cityId] - Optional ID of the existing city to update
 * @returns {Promise<{ succeeded: number, failed: number }>}
 */
export const uploadGeoJsonFiles = async (files, onProgress, cityId = null) => {
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    try {
      await uploadGeoJsonFile(files[i], cityId);
      succeeded++;
      onProgress(i, 'success');
    } catch (err) {
      failed++;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Upload failed';
      onProgress(i, 'error', msg);
    }
  }

  return { succeeded, failed };
};
