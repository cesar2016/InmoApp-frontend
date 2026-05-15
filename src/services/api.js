import axios from 'axios';

// Use `VITE_API_URL` when provided (production). Otherwise default to local backend.
//const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const baseURL = 'https://inmo-app-anmoapp-backend.qiaz7f.easypanel.host/api';

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
