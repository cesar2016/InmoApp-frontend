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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const code = data?.code;

    if (code === 'payment_expired') {
      localStorage.removeItem('token');
      window.dispatchEvent(
        new CustomEvent('app:blocked', {
          detail: {
            message:
              data?.message ||
              'Su periodo de prueba GRATUITO ha caducado, póngase en contacto con el Server Administrator',
            code: 'payment_expired',
          },
        })
      );
    } else if (status === 401) {
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

export default api;
