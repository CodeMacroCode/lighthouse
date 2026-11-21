import { create } from "zustand";
import { DecodedToken, getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { getQueryClient } from "@/lib/queryClient";
import { useDeviceStore } from "./deviceStore";
import { useAccessStore } from "./accessStore";
import { logoutUser } from "@/services/userService";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  decodedToken: DecodedToken | null;

  hydrateAuth: () => void;
  login: (
    token: string,
    refreshTokenOrExpiry?: string | number,
    expiryDays?: number
  ) => void;
  setTokens: (token: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  decodedToken: null,

  // 🔥 HYDRATE FROM STORAGE ON APP LOAD
  hydrateAuth: () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || Cookies.get("token")
        : null;
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken") || Cookies.get("refreshToken")
        : null;

    if (!token && !refreshToken) return;

    if (token) {
      const decoded = getDecodedToken(token);
      if (decoded && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
        set({
          isAuthenticated: true,
          token,
          refreshToken: refreshToken || null,
          decodedToken: decoded,
        });
        return;
      }
    }

    // Access token expired, but refresh token exists
    if (refreshToken) {
      set({
        isAuthenticated: true,
        token: token || null,
        refreshToken,
        decodedToken: token ? getDecodedToken(token) : null,
      });
      return;
    }

    Cookies.remove("token");
    Cookies.remove("refreshToken");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  },

  login: (
    token: string,
    refreshTokenOrExpiry?: string | number,
    expiryDays?: number
  ) => {
    let actualRefreshToken: string | undefined = undefined;
    let actualExpiry: number | undefined = expiryDays;

    if (typeof refreshTokenOrExpiry === "string") {
      actualRefreshToken = refreshTokenOrExpiry;
    } else if (typeof refreshTokenOrExpiry === "number") {
      actualExpiry = refreshTokenOrExpiry;
    }

    if (actualExpiry) {
      Cookies.set("token", token, { expires: actualExpiry });
    } else {
      Cookies.set("token", token);
    }
    localStorage.setItem("token", token);

    if (actualRefreshToken) {
      // 30 days refresh token lifecycle (BRD v1.1)
      Cookies.set("refreshToken", actualRefreshToken, { expires: 30 });
      localStorage.setItem("refreshToken", actualRefreshToken);
    }

    const decoded = getDecodedToken(token);

    set({
      isAuthenticated: !!decoded || !!actualRefreshToken,
      token: decoded ? token : null,
      refreshToken: actualRefreshToken || null,
      decodedToken: decoded,
    });
  },

  setTokens: (token: string, refreshToken?: string) => {
    localStorage.setItem("token", token);
    Cookies.set("token", token);

    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
      Cookies.set("refreshToken", refreshToken, { expires: 30 });
    }

    const decoded = getDecodedToken(token);

    set((state) => ({
      isAuthenticated: true,
      token,
      refreshToken: refreshToken || state.refreshToken,
      decodedToken: decoded,
    }));
  },

  logout: async () => {
    const state = get();
    const token =
      state.token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || Cookies.get("token")
        : null);
    const refreshToken =
      state.refreshToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("refreshToken") || Cookies.get("refreshToken")
        : null);

    // Call backend logout API with active Authorization and refreshToken before clearing local credentials
    console.log("📡 [AuthStore] Calling backend POST /auth/logout with:", {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
    });
    try {
      await logoutUser(refreshToken, token);
    } catch (err) {
      console.error("Backend logout error:", err);
    }

    // Immediately remove tokens and clear local state
    Cookies.remove("token");
    Cookies.remove("token", { path: "/" });
    Cookies.remove("refreshToken");
    Cookies.remove("refreshToken", { path: "/" });
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
    }

    // Disconnect sockets
    useDeviceStore.getState().disconnect();

    // Clear access permissions
    useAccessStore.getState().clearAccess();

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      decodedToken: null,
    });
  },
}));
