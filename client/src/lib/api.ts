import axios from 'axios';

// Always guarantee fallback to Railway production backend URL
const defaultBackend = 'https://dmhdineflow-production.up.railway.app';
const envApiUrl = import.meta.env.VITE_API_URL;

const rawUrl = (envApiUrl && envApiUrl.trim() !== '') ? envApiUrl : defaultBackend;
const apiBase = `${rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')}/api`;

export const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token + Customer Session Token
api.interceptors.request.use((config) => {
  // JWT auth token
  const token = localStorage.getItem('dineflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Customer Session Token for privacy isolation
  let customerSessionToken = localStorage.getItem('dineflow_customer_session');
  if (!customerSessionToken) {
    customerSessionToken = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('dineflow_customer_session', customerSessionToken);
  }
  config.headers['X-Customer-Session'] = customerSessionToken;

  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/m/')) {
      localStorage.removeItem('dineflow_token');
      localStorage.removeItem('dineflow_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
