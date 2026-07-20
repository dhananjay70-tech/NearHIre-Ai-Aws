import axios from 'axios';

// Base URL for the Python (AI) backend
const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_API_URL || 'http://localhost:8000/api',
  timeout: 60000, // longer timeout for AI operations
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token when available (fallback for non-cookie envs)
aiApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      '';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — centralised error handling
aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail
      || error.response?.data?.message
      || error.message;
    console.error('[aiApi] Error:', msg);
    return Promise.reject(error);
  }
);

export default aiApi;
