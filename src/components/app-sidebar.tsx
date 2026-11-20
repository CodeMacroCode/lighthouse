"use client";

import * as React from "react";
import { getDecodedToken } from "@/lib/jwt";
import { useNavigationStore } from "@/store/navigationStore";
import { useAccessStore } from "@/store/accessStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import RouteLoader from "@/components/RouteLoader";
import { useTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  FileText,
  School,
  MapPin,
  UserCheck,
  UserX,
  FileBarChart,
  Route,
  Clock,
  TrendingUp,
  Map,
  AlertCircle,
  Smartphone,
  Bell,
  CheckCircle,
  XCircle,
  X,
  MessageCircle,
  Group,
  Ticket,
  Shield,
  ShieldAlert,
  LayoutDashboard,
  History,
  Globe,
  Layers,
} from "lucide-react";
import { GiGps, GiReceiveMoney } from "react-icons/gi";
import Image from "next/image";
import { MdDriveEta, MdDriveFileMoveRtl, MdOutlineLocalPolice } from "react-icons/md";
import { LiaMoneyBillAlt } from "react-icons/lia";
import { PREK_ROLES, PrekRole, normalizePrekRole } from "@/constants/roles";

type UserRole = PrekRole | "superAdmin" | "school" | "branchGroup" | "branch" | "parent" | null;

// Icon mapping for menu items
const iconMap: Record<string, any> = {
  "Student Details": GraduationCap,
  Geofence: MapPin,
  "Pickup And Drop": Route,
  Routes: Route,
  Absent: UserX,
  Present: UserCheck,
  "Leave Request": FileText,
  Status: AlertCircle,
  "Approved Request": CheckCircle,
  "Denied Request": XCircle,
  "Admin Master": School,
  "National Head": School,
  "Regional Safety Officer (RSO)": Users,
  "Regional Head": Users,
  "Business Manager (BM)": School,
  "Business Manager": School,
  "Area Operations Manager (AOM)": Users,
  "Area Operations Manager": Users,
  "Parents Master": Users,
  "Driver Approve": UserCheck,
  "Student Approve": UserCheck,
  "Supervisor Approve": UserCheck,
  "Device": Smartphone,
  "Read Device": Smartphone,
  Devices: Smartphone,
  "Group": Group,
  Notification: Bell,
  "Status Report": FileBarChart,
  "Distance Report": Route,
  "History Report": Clock,
  "Stop Report": AlertCircle,
  "Travel Summary": TrendingUp,
  "Trip Report": Route,
  "Idle Report": Clock,
  "Alerts/Events": Bell,
  "Geofence Report": Map,
  "Route Report": Route,
  "Chat Box": MessageCircle,
  "ePolice Stop Report": MdOutlineLocalPolice,
  Model: GiGps,
  Category: FileText,
  "Subscription Config": GiReceiveMoney,
  "Custom Subscription Config": GiReceiveMoney,
  Billing: LiaMoneyBillAlt,
  Driver: MdDriveEta,
  "Ticket Types": Ticket,
  "Incident": ShieldAlert,
  "Safety and Audit": Shield,
  "Analytics Dashboard": LayoutDashboard,
  "Audit Trail": History,
  "Audit Logs": History,
  "User Management": Users,
  "Users": Users,
  "Zone": Globe,
  "Cluster": Layers,
  "School Master": School,
};

// Access permission mapping for Master section
const masterAccessMap: Record<string, string> = {
  "Routes": "route",
  "Geofence": "geofence",
  "Driver Approve": "driver",
};

// Access permission mapping for Reports section
const reportAccessMap: Record<string, string> = {
  "Status Report": "status",
  "History Report": "history",
  "Stoppage Summary": "stoppageSummary",
  "Stop Report": "stop",
  "Travel Summary": "travel",
  "Trip Report": "trip",
  "Idle Report": "idle",
  "Alerts/Events": "alert",
  "Route Report": "routeReport",
  "ePolice Stop Report": "ePoliceReport",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userRole, setUserRole] = React.useState<UserRole>(null);
  const activeSection = useNavigationStore((state) => state.activeSection);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const access = useAccessStore((state) => state.access);

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { setOpenMobile, isMobile, state } = useSidebar();

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;

    if (role && typeof role === "string") {
      const normalized = normalizePrekRole(role);
      setUserRole(normalized || (role as UserRole));
    }

    setIsLoading(false);
  }, []);

  const getSidebarData = React.useCallback(
    (section: string, role: UserRole) => {
      const normalized = normalizePrekRole(role);
      switch (section) {
        case "Master":
          // Central (All-Activity Admin) - Full National Scope
          if (normalized === PREK_ROLES.CENTRAL || role === "superAdmin") {
            return [
              { title: "Analytics Dashboard", url: "/dashboard/analytics" },
              { title: "User Management", url: "/dashboard/users" },
              { title: "Zone", url: "/dashboard/zone" },
              { title: "Cluster", url: "/dashboard/cluster" },
              { title: "School Master", url: "/dashboard/school-master" },
              { title: "Incident", url: "/dashboard/incident" },
              { title: "Audit Trail", url: "/dashboard/audit-logs" },
            ];
          } else if (normalized === PREK_ROLES.NATIONAL_HEAD || role === "school") {
            return [
              { title: "Analytics Dashboard", url: "/dashboard/analytics" },
              { title: "Zone", url: "/dashboard/zone" },
              { title: "Cluster", url: "/dashboard/cluster" },
              { title: "School Master", url: "/dashboard/school-master" },
              { title: "Incident", url: "/dashboard/incident" },
            ];
          } else if (normalized === PREK_ROLES.RSO || role === "branchGroup") {
            return [
              { title: "Analytics Dashboard", url: "/dashboard/analytics" },
              { title: "User Management", url: "/dashboard/users" },
              { title: "Cluster", url: "/dashboard/cluster" },
              { title: "School Master", url: "/dashboard/school-master" },
              { title: "Incident", url: "/dashboard/incident" },
            ];
          } else if (normalized === PREK_ROLES.BM || role === "branch") {
            return [
              { title: "Analytics Dashboard", url: "/dashboard/analytics" },
              { title: "User Management", url: "/dashboard/users" },
              { title: "School Master", url: "/dashboard/school-master" },
              { title: "Incident", url: "/dashboard/incident" },
            ];
          } else if (normalized === PREK_ROLES.AOM || role === "parent") {
            return [
              { title: "School Master", url: "/dashboard/school-master" },
              { title: "Incident", url: "/dashboard/incident" }
            ];
          }
          return [
            { title: "School Master", url: "/dashboard/school-master" },
            { title: "Incident", url: "/dashboard/incident" }
          ];
        default:
          return [];
      }
    },
    []
  );



  const sidebarData = React.useMemo(() => {
    if (!activeSection || !userRole) return [];

    let items = getSidebarData(activeSection, userRole);

    // Apply access filtering for school and branchGroup roles
    if ((userRole === "school" || userRole === "branchGroup") && access) {
      if (activeSection === "Master") {
        items = items.filter(item => {
          const accessKey = masterAccessMap[item.title];
          // If no mapping, always show (e.g., Device, Business Manager)
          if (!accessKey) return true;
          return access.master?.[accessKey as keyof typeof access.master] === true;
        });
      } else if (activeSection === "Reports") {
        items = items.filter(item => {
          const accessKey = reportAccessMap[item.title];
          // If no mapping, always show (e.g., Distance Report)
          if (!accessKey) return true;
          return access.reports?.[accessKey as keyof typeof access.reports] === true;
        });
      }
    }

    return items;
  }, [activeSection, userRole, getSidebarData, access]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return sidebarData;
    return sidebarData.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sidebarData, searchQuery]);

  // Reset search query when active section changes
  React.useEffect(() => {
    setSearchQuery("");
  }, [activeSection]);

  React.useEffect(() => {
    if (!sidebarData || sidebarData.length === 0) return;
    sidebarData.forEach((item) => {
      router.prefetch(item.url);
    });
  }, [sidebarData, router]);

  const handleItemSelect = React.useCallback(
    (url: string) => {
      startTransition(() => {
        router.push(url);
        if (isMobile) {
          setOpenMobile(false);
        }
      });
    },
    [router, isMobile, setOpenMobile]
  );

  const isCollapsed = state === "collapsed";

  return (
    <>
      {isPending && <RouteLoader />}

      <Sidebar
        collapsible="icon"
        {...props}
        className="border-r border-white/10 transition-all duration-300 ease-in-out bg-primary h-screen"
      >
        {/* Header - Fixed Height */}
        <SidebarHeader className="border-b border-white/10 bg-primary h-[60px] flex items-center justify-between px-3.5 transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-2 min-w-0">
            {isCollapsed ? (
              <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/15 shrink-0 flex items-center justify-center p-1">
                <Image
                  src="/image.png"
                  alt="Lighthouse"
                  width={28}
                  height={10}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center min-w-0 py-1">
                <Image
                  src="/image.png"
                  alt="Lighthouse Learning"
                  width={150}
                  height={24}
                  className="h-5.5 sm:h-6 w-auto object-contain"
                  priority
                />
              </div>
            )}
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenMobile(false)}
              className="text-white hover:bg-white/10 size-8 cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          )}
        </SidebarHeader>

        {/* Scrollable Content - Animated */}
        <SidebarContent className="bg-primary px-2.5 py-2.5 transition-all duration-300 ease-in-out">
          {isLoading || !userRole || sidebarData.length === 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full rounded bg-white/10 transition-all duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : (
            <SidebarGroup className="p-0">
              {/* Group Label with Fade Animation */}
              <SidebarGroupLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400/90 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-90 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 transition-all duration-300 ease-out overflow-hidden">
                {activeSection || "Menu"}
              </SidebarGroupLabel>

              <SidebarSeparator className="bg-white/10 my-1 group-data-[collapsible=icon]:opacity-0 transition-all duration-200" />

              <SidebarGroupContent className="mt-3">
                <SidebarMenu className="gap-1">
                  {filteredData.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-slate-400 group-data-[collapsible=icon]:hidden transition-all duration-300">
                      No results
                    </div>
                  ) : (
                    filteredData.map((item, index) => {
                      const Icon = iconMap[item.title] || FileText;
                      const isActive =
                        pathname === item.url ||
                        (item.url === "/dashboard/users" &&
                          pathname.startsWith("/dashboard/users"));

                      return (
                        <SidebarMenuItem
                          key={item.title}
                          className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
                          style={{
                            animationDelay: `${index * 25}ms`,
                            animationDuration: "250ms",
                          }}
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className={`
                              group/button relative transition-all duration-200 rounded-lg h-10 px-3
                              ${isActive
                                ? "bg-white/10 text-white font-semibold shadow-xs border border-white/10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-amber-400 before:rounded-r"
                                : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                              }
                              group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10
                              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-1.5
                            `}
                          >
                            <Link
                              href={item.url}
                              title={item.title}
                              onClick={(e) => {
                                e.preventDefault();
                                handleItemSelect(item.url);
                              }}
                              className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 transition-all duration-200"
                            >
                              {/* Icon with smooth subtle scale on collapse */}
                              <Icon
                                className={`
                                  h-5 w-5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-amber-400" : "text-slate-300"}
                                  group-hover/button:scale-105
                                  group-data-[collapsible=icon]:scale-125
                                `}
                              />
                              {/* Text with slide and fade animation */}
                              <span
                                title={item.title}
                                className="flex-1 truncate text-xs sm:text-sm tracking-tight transition-all duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden"
                              >
                                {item.title}
                              </span>
                              {/* Active indicator */}
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Animated Rail */}
        {/* <SidebarRail className="bg-blue-600/40 hover:bg-blue-600/60 transition-all duration-300 ease-in-out hover:w-2" /> */}
      </Sidebar>
    </>
  );
}
