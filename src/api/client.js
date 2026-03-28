import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
});

// Auto-detect browser timezone once (e.g. "America/Chicago")
const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach browser timezone to all GET requests so the backend groups dates correctly
  if (config.method === 'get' && browserTZ) {
    config.params = { ...config.params, tz: browserTZ };
  }
  return config;
});

let onUnauthorized = null;

export function setOnUnauthorized(cb) {
  onUnauthorized = cb;
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default client;
