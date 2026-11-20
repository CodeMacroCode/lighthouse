"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Bell, CreditCard, User, SubscriptIcon, Repeat1Icon, KeyRound, QrCode, ChevronDown } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { normalizePrekRole, PREK_ROLES } from "@/constants/roles";
import { logoutUser } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { LogoutLoader } from "./ui/logout-loader";
import { ResetPasswordModal } from "@/components/auth/ResetPasswordModal";
import {
  getStoredPreferences,
  setStoredPreference,
  NOTIFICATION_TYPES,
  NotificationType,
  isNotificationEnabled,
} from "@/util/notificationPrefs";

export function ProfileDropdown() {
  const router = useRouter();
  const [username, setUsername] = React.useState<string>("User");
  const [roleLabel, setRoleLabel] = React.useState<string>("");
  const [showResetPassword, setShowResetPassword] = React.useState(false);
  const [blockedTypes, setBlockedTypes] = React.useState<NotificationType[]>(
    []
  );

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const decodedToken = token ? getDecodedToken(token) : null;
    if (decodedToken?.username) {
      setUsername(decodedToken.username);
    }
    if (decodedToken?.role) {
      const normalized = normalizePrekRole(decodedToken.role);
      setRoleLabel(normalized || decodedToken.role);
    }
    setBlockedTypes(getStoredPreferences());
  }, []);

  const handlePreferenceChange = async (
    type: NotificationType,
    enabled: boolean
  ) => {
    const newBlockedList = await setStoredPreference(type, enabled);
    // Local update to reflect change immediately in UI (though the util returns the new list too)
    // Actually the util returns the new LIST of blocked types? 
    // Let's check the util implementation... 
    // Yes, setStoredPreference returns the updated list.
    setBlockedTypes(newBlockedList);
  };

  const handleRenewalClick = () => {
    router.push("/dashboard/renewal");
  };

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    console.log("🚪 [ProfileDropdown] Logout initiated");

    try {
      const state = useAuthStore.getState();
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

      console.log("📡 [ProfileDropdown] Dispatching POST /auth/logout API...", {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
      });

      // 1. Await the server logout call
      await logoutUser(refreshToken, token);
      console.log("✅ [ProfileDropdown] Logout API call finished");

      // 2. Clear auth store
      await state.logout();
    } catch (err) {
      console.error("❌ [ProfileDropdown] Logout error:", err);
    } finally {
      // 3. Clear non-auth stores & caches
      try {
        useNotificationStore.getState().clearNotifications();
        localStorage.removeItem("fcm_token");
        localStorage.removeItem("ct-notifications");
        localStorage.removeItem("device-store");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        Cookies.remove("token");
        Cookies.remove("token", { path: "/" });
        Cookies.remove("refreshToken");
        Cookies.remove("refreshToken", { path: "/" });
      } catch (_) {}

      // 4. Hard redirect to login page
      window.location.href = "/login";
    }
  };

  return (
    <>
      {isLoggingOut && <LogoutLoader />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200">
          <Avatar className="h-8 w-8 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-white">
            <AvatarImage
              src={`https://api.dicebear.com/9.x/initials/svg?radius=50&seed=${username}`}
              alt={username}
            />
            <AvatarFallback className="bg-slate-900 text-amber-400 font-bold text-xs">
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
            <span className="text-slate-900 font-bold text-sm">
              {username}
            </span>
            <span className="text-slate-500 text-[10px] font-semibold tracking-wider uppercase">
              {roleLabel || "Profile"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-56"
        sideOffset={5}
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{username}</span>
            {roleLabel && (
              <span className="text-[11px] text-muted-foreground font-normal mt-0.5">
                Role: <span className="font-semibold text-blue-600">{roleLabel}</span>
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-slate-100 flex items-center gap-2.5 w-full py-2 px-2.5 font-medium transition-colors"
          onSelect={() => setShowResetPassword(true)}
          onClick={() => setShowResetPassword(true)}
        >
          <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
          <span>Reset Password</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2.5 w-full py-2 px-2.5 font-medium"
          onSelect={handleLogout}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ResetPasswordModal
      open={showResetPassword}
      onOpenChange={setShowResetPassword}
      defaultUsername={username}
    />
  </>
);
}
