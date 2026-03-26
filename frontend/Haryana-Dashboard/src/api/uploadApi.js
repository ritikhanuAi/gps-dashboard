import axiosInstance from './axiosInstance';

/**
 * Upload a single GeoJSON file to the server.
 * Endpoint: POST /upload-geo
 * 
 * @param {File} file - A .geojson / .json file
 * @returns {Promise<any>} - API response data
 */
export const uploadGeoJsonFile = async (file) => {
  const formData = new FormData();
  formData.append('files', file);

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
 * @returns {Promise<{ succeeded: number, failed: number }>}
 */
export const uploadGeoJsonFiles = async (files, onProgress) => {
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    try {
      await uploadGeoJsonFile(files[i]);
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
