import axiosInstance from './axiosInstance';

// Road-specific API functions

// Function to fetch road data from the API
export const fetchRoadData = async () => {
  try {
    const response = await axiosInstance.get('/fetchRoadData');
    return response.data;
  } catch (error) {
    console.error('Error fetching road data:', error);
    throw error;
  }
};

// Function to fetch filtered road data
export const fetchFilteredRoadData = async (filters = {}) => {
  try {
    const response = await axiosInstance.get('/fetchRoadData', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching filtered road data:', error);
    throw error;
  }
};

// Function to fetch road data by city ID (for municipal councils)
export const fetchRoadDataByCity = async (cityId) => {
  try {
    const response = await axiosInstance.get('/fetchRoadData', { params: { cityId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching road data by city:', error);
    throw error;
  }
};

// Function to fetch road data by city ID and ward (for road dropdown after ward selection)
export const fetchRoadsByWard = async (cityId, ward) => {
  try {
    const response = await axiosInstance.get('/fetchRoadData', { params: { cityId, ward } });
    return response.data;
  } catch (error) {
    console.error('Error fetching roads by ward:', error);
    throw error;
  }
};

// Function to fetch unique wards by road_id (for ward dropdown after municipal council selection)
export const fetchUniqueWards = async (roadId) => {
  try {
    const response = await axiosInstance.get('/get-unique-wards', { params: { road_id: roadId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching unique wards:', error);
    throw error;
  }
};