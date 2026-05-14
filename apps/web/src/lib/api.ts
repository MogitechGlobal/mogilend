import axios from 'axios';

// Create a central Axios instance
export const api = axios.create({
  baseURL: 'http://localhost:3000/v1',
  timeout: 10000,
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
      // Add logic here to clear localStorage and redirect to /login
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);