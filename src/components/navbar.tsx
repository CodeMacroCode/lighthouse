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
    <header className="w-full h-14 md:h-16 flex items-center justify-between px-3 sm:px-6 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 shadow-2xs">
      {/* Left: Sidebar trigger + Modern Breadcrumb Navigation */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {showSidebarTrigger && (
          <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent size-8 sm:size-9 rounded-lg cursor-pointer shrink-0 transition-colors" />
        )}
        
        <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" aria-hidden="true" />

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
            Lighthouse
          </span>
          <span className="text-slate-300 hidden sm:inline-block text-xs select-none" aria-hidden="true">
            /
          </span>
          <h1 className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[220px] sm:max-w-[420px]">
            {activeSection || "Master Operations"}
          </h1>
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right Section: Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </header>
  );
}
