import axios from 'axios';

// Vite automatically swaps this variable based on your environment.
// We provide a fallback to localhost just to be safe during local development.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

// Create a central Axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // Crucial for matching your NestJS CORS configuration
});

// The Interceptor: Automatically injects the JWT before every request
api.interceptors.request.use(
  (config) => {
    // Grab the token from browser storage
    const token = localStorage.getItem('jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global Error Handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('SECURITY ALERT: Session expired.');
      // Clears the expired token and forces the user back to the login screen
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);