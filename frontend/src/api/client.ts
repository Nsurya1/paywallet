import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('paywallet_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized) & 403 (Forbidden)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Clear cached session
        localStorage.removeItem('paywallet_token');
        localStorage.removeItem('paywallet_user');

        // Dispatch custom event so AuthProvider can react without page reload if desired
        window.dispatchEvent(new CustomEvent('auth:expired'));

        // If not already on auth/login page, redirect
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register') &&
          window.location.pathname !== '/'
        ) {
          window.location.href = '/login?expired=true';
        }
      } else if (status === 403) {
        console.warn('Forbidden access: Insufficient privileges for requested resource.');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
