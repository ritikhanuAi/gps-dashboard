import axiosInstance from './axiosInstance';

// Example API service functions using the axios instance

// Function to fetch data from an endpoint
export const fetchData = async (endpoint, params = {}) => {
  try {
    const response = await axiosInstance.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

// Function to post data to an endpoint
export const postData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.post(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
};

// Function to update data (PUT request)
export const updateData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.put(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
};

// Function to delete data
export const deleteData = async (endpoint) => {
  try {
    const response = await axiosInstance.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
};

// Example specific API call - you can customize this based on your needs
export const getDashboardData = async () => {
  return await fetchData('/dashboard');
};

// Another example
export const getUserData = async (userId) => {
  return await fetchData(`/users/${userId}`);
};