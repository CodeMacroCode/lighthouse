import { create } from "zustand";
import { DecodedToken, getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { getQueryClient } from "@/lib/queryClient";
import { useDeviceStore } from "./deviceStore";
import { useAccessStore } from "./accessStore";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decodedToken: DecodedToken | null;

  hydrateAuth: () => void;
  login: (token: string, expiryDays?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  decodedToken: null,

  // 🔥 HYDRATE FROM COOKIE ON APP LOAD
  hydrateAuth: () => {
    const token = localStorage.getItem("token");

    if (!token) return;

    const decoded = getDecodedToken(token);

    if (!decoded) {
      Cookies.remove("token");
      localStorage.removeItem("token");
      return;
    }

    // Optional: expiry check
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      Cookies.remove("token");
      localStorage.removeItem("token");
      return;
    }

    set({
      isAuthenticated: true,
      token,
      decodedToken: decoded,
    });
  },

  login: (token: string, expiryDays?: number) => {
    if (expiryDays) {
      Cookies.set("token", token, { expires: expiryDays });
      localStorage.setItem("token", token);
    } else {
      localStorage.setItem("token", token);
    }

    const decoded = getDecodedToken(token);

    set({
      isAuthenticated: !!decoded,
      token: decoded ? token : null,
      decodedToken: decoded,
    });
  },

  logout: () => {
    Cookies.remove("token");
    localStorage.removeItem("token");

    // Disconnect sockets
    useDeviceStore.getState().disconnect();

    // Clear access permissions
    useAccessStore.getState().clearAccess();

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      decodedToken: null,
    });
  },
}));
