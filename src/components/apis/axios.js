import axios from 'axios';

const resolveApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

const API_BASE = resolveApiBase();

export const getStoredToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token') || null;

const AUTH_ERROR_MESSAGES = new Set([
  'Chưa đăng nhập',
  'Phiên đăng nhập không hợp lệ',
  'Tài khoản không hợp lệ hoặc đã bị khóa',
]);

export const isAuthErrorResponse = (error) => {
  const message = error?.response?.data?.message;
  const status = error?.response?.status;
  if (!status || status !== 401) return false;
  // Chỉ coi là lỗi phiên khi backend trả đúng message auth (tránh logout vì 401 lạ / proxy).
  if (message && AUTH_ERROR_MESSAGES.has(message)) return true;
  // Một số route chỉ trả 401 không body — vẫn logout nếu request đã gửi Bearer.
  return Boolean(error?.config?.headers?.Authorization);
};

const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.config?.skipAuthRedirect) {
      return Promise.reject(error);
    }

    if (isAuthErrorResponse(error)) {
      const sentAuth = Boolean(error?.config?.headers?.Authorization);
      // Chỉ đá login khi request thực sự mang token và bị từ chối auth.
      if (sentAuth) {
        clearAuthStorage();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export { API_BASE };
