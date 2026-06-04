import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_URL) {
  console.error('[SafeLease] REACT_APP_API_URL is not set! Add it in your Vercel environment variables.');
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[API ERROR] ${original?.method?.toUpperCase()} ${original?.url}`,
        error.response?.status,
        (error.response?.data as any)?.message,
      );
    }

    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      const newToken: string = data.data.accessToken;
      localStorage.setItem('accessToken', newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
