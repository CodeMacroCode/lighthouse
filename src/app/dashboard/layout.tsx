"use client";
import { useEffect, useRef } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { AppSidebar } from "@/components/app-sidebar";
import FCMHandler from "@/components/FCMHandler";
import { Navbar } from "@/components/navbar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/store/navigationStore";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSection = useNavigationStore((state) => state.activeSection);
  const SHOW_SIDEBAR_SECTIONS = [
    "Master",
    // "Admin",
    "School",
    "Users",
    "Reports",
    "Support",
  ];
  const router = useRouter();

  const store = useDeviceStore();
  const pathname = usePathname();
  const isDashboard =
    pathname === "/dashboard/users/school-master" ||
    pathname === "/dashboard/users/branch-master" ||
    pathname === "/dashboard/users/user-access" ||
    pathname === "/dashboard/incident";
  const hasConnected = useRef(false);

  useEffect(() => {
    if (!store.isConnected) return;

    if (isDashboard) {
      console.log("[Dashboard] Subscribing to all device data");
      console.log("[Dashboard] Connection Status: ", store.streamingMode);
      store.switchToAllDevices(); // emit / subscribe
    } else {
      console.log("[Dashboard] Unsubscribing from all device data");
      store.stopAllDeviceData(); // stop emits / listeners
    }
  }, [isDashboard, store.isConnected]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!hasConnected.current && !store.isConnected) {
      hasConnected.current = true;
      console.log("[Socket] Connecting once on app load");
      store.connect();
    }
  }, [router, store]);
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        {SHOW_SIDEBAR_SECTIONS.includes(activeSection) && <AppSidebar />}
        <SidebarInset className="overflow-x-clip overflow-y-auto flex flex-col h-screen w-full min-w-0 bg-[#f8fafc]">
          <header className="sticky top-0 z-30 shrink-0 w-full h-14 md:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
            <Navbar showSidebarTrigger={SHOW_SIDEBAR_SECTIONS.includes(activeSection)} />
          </header>

          <main className="pt-2 md:pt-4 px-2 sm:px-3 md:px-4 overflow-x-clip overflow-y-auto flex-1 h-full w-full max-w-full">
            {/* <FCMHandler /> */}
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
