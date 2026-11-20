import authAxios from "@/lib/authAxios";
import axios from "axios";
import Cookies from "js-cookie";

export const loginUser = async (username: string, password: string) => {
  const response = await authAxios.post("/login", { username, password });
  return response.data;
};

export const refreshAuthToken = async (refreshToken: string) => {
  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://63.142.251.57:9000";
  const response = await axios.post(`${baseURL}/auth/refresh-token`, {
    refreshToken,
  });
  return response.data;
};

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export const logoutUser = async (
  refreshToken?: string | null,
  accessToken?: string | null
): Promise<LogoutResponse> => {
  try {
    const rawBase = (
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://63.142.251.57:9000"
    ).replace(/\/+$/, "");
    const targetUrl = rawBase.endsWith("/auth")
      ? `${rawBase}/logout`
      : `${rawBase}/auth/logout`;

    const token =
      accessToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || Cookies.get("token")
        : null);
    const storedRefreshToken =
      refreshToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("refreshToken") || Cookies.get("refreshToken")
        : null);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("🌐 [logoutUser] Sending POST to:", targetUrl, {
      hasAuthHeader: !!headers["Authorization"],
      refreshTokenPresent: !!storedRefreshToken,
    });

    // Try standard fetch with keepalive: true first (guaranteed completion during unload)
    try {
      const fetchRes = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken: storedRefreshToken || "" }),
        keepalive: true,
      });

      if (fetchRes.ok) {
        const data = await fetchRes.json().catch(() => ({ success: true, message: "Logged out successfully." }));
        console.log("✅ [logoutUser] Success response:", data);
        return data;
      } else {
        const errData = await fetchRes.json().catch(() => ({}));
        console.warn("⚠️ [logoutUser] Non-200 response:", fetchRes.status, errData);
      }
    } catch (fetchErr) {
      console.warn("⚠️ [logoutUser] fetch error, falling back to axios:", fetchErr);
    }

    // Fallback to axios
    const response = await axios.post<LogoutResponse>(
      targetUrl,
      { refreshToken: storedRefreshToken || "" },
      {
        headers,
        timeout: 5000,
      }
    );

    console.log("✅ [logoutUser] Axios success:", response.data);
    return response.data;
  } catch (error: any) {
    console.warn("⚠️ [logoutUser] Request failed:", error?.response?.data || error?.message || error);
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to logout from server",
    };
  }
};

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

export const resetPassword = async (
  username: string,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  const rawBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://63.142.251.57:9000"
  ).replace(/\/+$/, "");
  const targetUrl = rawBase.endsWith("/auth")
    ? `${rawBase}/reset-password`
    : `${rawBase}/auth/reset-password`;

  console.log("🌐 [resetPassword] Sending POST to:", targetUrl, { username });

  try {
    const response = await axios.post<ResetPasswordResponse>(
      targetUrl,
      { username, newPassword },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log("✅ [resetPassword] Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.warn("⚠️ [resetPassword] Error:", error?.response?.data || error?.message || error);
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to reset password. Please check username and try again.";
    throw new Error(errorMessage);
  }
};
