import axios from "axios";
import { getStoredAccessToken, handleTokenRefresh } from "./tokenRefresh";

const authAxios = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_BASE_URL || "http://63.142.251.57:9000") + "/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

authAxios.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh access token on 401 for protected auth routes (except auth management routes)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/login") &&
      !originalRequest.url?.includes("/logout") &&
      !originalRequest.url?.includes("/refresh-token") &&
      !originalRequest.url?.includes("/reset-password")
    ) {
      return handleTokenRefresh(originalRequest, authAxios);
    }

    return Promise.reject(error);
  }
);

export default authAxios;
