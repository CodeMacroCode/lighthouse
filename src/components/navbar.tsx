"use client";

import * as React from "react";
import { useNavigationStore } from "@/store/navigationStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationSheet } from "./NotificationDropdown";

export function Navbar({ showSidebarTrigger = true }: { showSidebarTrigger?: boolean }) {
  const activeSection = useNavigationStore(
    (state) => state.activeSection
  );

  return (
    <div className="w-full h-14 md:h-16 flex items-center justify-between px-2 sm:px-4 bg-primary text-white">
      {/* Left: Sidebar trigger + Section / App Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {showSidebarTrigger && (
          <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white bg-transparent size-8 sm:size-9 cursor-pointer shrink-0" />
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate max-w-[160px] sm:max-w-[320px]">
            {activeSection || "Lighthouse"}
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right Section: Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </div>
  );
}