import axios from 'axios';

// Use `VITE_API_URL` if defined, otherwise default to local development port seen in terminal (8191)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8191/api';
//const baseURL = 'https://inmo-app-anmoapp-backend.qiaz7f.easypanel.host/api';

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
