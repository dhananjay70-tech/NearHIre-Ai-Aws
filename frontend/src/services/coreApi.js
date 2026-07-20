import axios from "axios";

const coreApi = axios.create({
  baseURL:
    import.meta.env.VITE_CORE_API_URL ||
    "http://localhost:5001/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

coreApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default coreApi;