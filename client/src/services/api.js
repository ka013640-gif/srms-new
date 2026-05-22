import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

// ── Cross-page refresh event bus ──────────────────────────────────────────
// Used so Officials/Residents pages can ask each other to re-fetch
// after a save, without each page needing to know the other's function.
const refreshListeners = {
  officials: new Set(),
  residents: new Set()
};
function emitRefresh(kind) {
  refreshListeners[kind].forEach(fn => fn());
}
function onRefresh(kind, fn) {
  refreshListeners[kind].add(fn);
  return () => refreshListeners[kind].delete(fn);
}
api.onRefreshOfficials = (fn) => onRefresh('officials', fn);
api.onRefreshResidents = (fn) => onRefresh('residents', fn);
api.emitRefreshOfficials = () => emitRefresh('officials');
api.emitRefreshResidents = () => emitRefresh('residents');
// ──────────────────────────────────────────────────────────────────────────

// Request interceptor – add auth token; set JSON content-type only for non-FormData bodies
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    // Only force JSON content-type when body is a plain object (not FormData)
    if (!(config.data instanceof FormData) && config.data !== undefined) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
