import axios from 'axios';
// import.meta.env.REACT_APP_API_URL;

// Create an axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Updated to match the original API endpoint
  timeout: 100000, // Timeout in milliseconds
  headers: {
    'Content-Type': 'application/json',
    // Add any default headers here
  },
});

// Add request interceptor (optional)
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token or other request modifications here
    // For example: config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor (optional)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;