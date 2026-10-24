import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('paywallet_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized & 403 Forbidden
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Clear expired credentials
      localStorage.removeItem('paywallet_token');
      localStorage.removeItem('paywallet_user');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login?expired=true';
      }
    } else if (status === 403) {
      console.warn('Access Forbidden (403): You do not have permission to perform this action.');
    }

    return Promise.reject(error);
  }
);

export default api;
