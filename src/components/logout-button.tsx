"use client";

import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Cookies from "js-cookie";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { LogoutLoader } from "./ui/logout-loader";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoading) return;

    setIsLoading(true);
    console.log("🚪 [LogoutButton] Initiating logout sequence...");

    try {
      // 1. Immediately call backend POST /auth/logout and clear auth stores
      console.log("📡 [LogoutButton] Calling authStore.logout()...");
      await logout();
      console.log("✅ [LogoutButton] Logout finished successfully");
    } catch (err) {
      console.error("❌ [LogoutButton] Logout error:", err);
    }

    // 2. Auxiliary cleanup (non-blocking)
    try {
      useNotificationStore.getState().clearNotifications();
      localStorage.removeItem("fcm_token");
      localStorage.removeItem("ct-notifications");
      localStorage.removeItem("device-store");

      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        Cookies.remove("token");
        Cookies.remove("token", { path: "/" });
        Cookies.remove("refreshToken");
        Cookies.remove("refreshToken", { path: "/" });
      }
    } catch (_) {}

    // 3. Navigate to login
    window.location.href = "/login";
  };

  return (
    <>
      {isLoading && <LogoutLoader />}
      <DropdownMenuItem
        onSelect={handleLogout}
        onClick={handleLogout}
        className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2.5 w-full py-2 px-2.5 font-medium"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Logout</span>
      </DropdownMenuItem>
    </>
  );
}
