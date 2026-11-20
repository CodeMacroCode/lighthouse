import axios from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/authStore";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("refreshToken") ||
    Cookies.get("refreshToken") ||
    null
  );
};

export const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || Cookies.get("token") || null;
};

export const saveTokens = (
  accessToken: string,
  refreshToken?: string,
  expiryDays?: number
) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("token", accessToken);
  if (expiryDays) {
    Cookies.set("token", accessToken, { expires: expiryDays });
  } else {
    Cookies.set("token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
    // 30 days expiration per BRD v1.1 refresh token lifecycle
    Cookies.set("refreshToken", refreshToken, { expires: 30 });
  }

  // Update Zustand store
  useAuthStore.getState().setTokens(accessToken, refreshToken);
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  Cookies.remove("token");
  Cookies.remove("refreshToken");
};

/**
 * Direct call to POST /auth/refresh-token
 * Bypasses axios interceptors to avoid circular refresh triggers
 */
export const refreshSessionToken = async (): Promise<string> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("Refresh token not found");
  }

  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://63.142.251.57:9000";

  const response = await axios.post(
    `${baseURL}/auth/refresh-token`,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = response.data;
  const newAccessToken = data.accessToken || data.token;
  const newRefreshToken = data.refreshToken || refreshToken;

  if (!newAccessToken) {
    throw new Error("Invalid response from refresh-token endpoint");
  }

  saveTokens(newAccessToken, newRefreshToken);
  return newAccessToken;
};

/**
 * Interceptor handler for 401 Unauthorized responses
 */
export const handleTokenRefresh = async (
  originalRequest: any,
  callerAxios: any
) => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(callerAxios(originalRequest));
        },
        reject: (err: any) => {
          reject(err);
        },
      });
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const newAccessToken = await refreshSessionToken();
    processQueue(null, newAccessToken);

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return callerAxios(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError, null);
    clearTokens();
    useAuthStore.getState().logout();

    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }

    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
};
