// utils/axiosInstance.ts

import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

instance.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;
