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
  MessageCircle,
  Group,
  Ticket,
} from "lucide-react";
import { GiGps, GiReceiveMoney } from "react-icons/gi";
import Image from "next/image";
import { MdDriveEta, MdDriveFileMoveRtl, MdOutlineLocalPolice } from "react-icons/md";
import { LiaMoneyBillAlt } from "react-icons/lia";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | "parent" | null;

// Icon mapping for menu items
const iconMap: Record<string, React.ElementType> = {
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
  "Regional Head": Users,
  "Safety Head": School,
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
  "Incident": AlertCircle,
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

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch", "parent"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }


    setIsLoading(false);
  }, []);

  const getSidebarData = React.useCallback(
    (section: string, role: UserRole) => {
      switch (section) {
        case "Master":
          if (role === "superAdmin") {
            return [
              { title: "CXO / Leaders", url: "/dashboard/users/school-master" },
              { title: "Regional Head", url: "/dashboard/users/user-access" },
              { title: "Safety Head", url: "/dashboard/users/branch-master" },
              { title: "Coordinator", url: "/dashboard/users/coordinator" },
              { title: "Incident", url: "/dashboard/incident" },
              { title: "Safety and Audit", url: "/dashboard/safety-and-audit" },
            ];
          } else if (role === "school") {
            return [
              { title: "Regional Head", url: "/dashboard/users/user-access" },
              {
                title: "Safety Head",
                url: "/dashboard/users/branch-master",
              },
              { title: "Coordinator", url: "/dashboard/users/coordinator" },
              { title: "Incident", url: "/dashboard/incident" },
              { title: "Safety and Audit", url: "/dashboard/safety-and-audit" },
            ];
          } else if (role === "branchGroup") {
            return [
              { title: "Safety Head", url: "/dashboard/users/branch-master" },
              { title: "Coordinator", url: "/dashboard/users/coordinator" },
              { title: "Incident", url: "/dashboard/incident" },
              { title: "Safety and Audit", url: "/dashboard/safety-and-audit" },
            ]
          } else if (role === "parent") {
            return [
              { title: "Incident", url: "/dashboard/incident" }
            ];
          } else if (role === "branch") {
            return [
              { title: "Coordinator", url: "/dashboard/users/coordinator" },
              { title: "Safety and Audit", url: "/dashboard/safety-and-audit" },
            ];
          }
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
          // If no mapping, always show (e.g., Device, Safety Head)
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
        className="border-r border-blue-600/20 transition-all duration-300 ease-in-out bg-primary h-screen"
      >
        {/* Header with Search - Fixed Height */}
        <SidebarHeader className="border-b border-blue-600/20 bg-primary h-[60px] flex items-center justify-center transition-all duration-300 ease-in-out">
          {isLoading ? (
            <div className={isCollapsed ? "w-auto" : "w-full px-3"}>
              <Skeleton
                className={`rounded-md bg-blue-300/60 transition-all duration-300 ${isCollapsed ? "h-10 w-10" : "h-9 w-full"
                  }`}
              />
            </div>
          ) : (
            <>
              {/* Expanded Search Bar - Only show when NOT collapsed */}
              {!isCollapsed && (
                <div className="w-full px-3 animate-in fade-in duration-200">
                  <div className="relative mt-3">

                  </div>
                </div>
              )}
            </>
          )}
        </SidebarHeader>

        {/* Scrollable Content - Animated */}
        <SidebarContent className="bg-primary px-2 py-2 transition-all duration-300 ease-in-out">
          {isLoading || !userRole || sidebarData.length === 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full rounded bg-blue-300/60 transition-all duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : (
            <SidebarGroup className="p-0">
              {/* Group Label with Fade Animation */}
              <SidebarGroupLabel className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-white group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-90 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 transition-all duration-300 ease-out overflow-hidden">
                {activeSection || "Menu"}
              </SidebarGroupLabel>

              <SidebarSeparator className="bg-blue-600/20 my-1 group-data-[collapsible=icon]:opacity-0 transition-all duration-200" />

              <SidebarGroupContent className="mt-4">
                <SidebarMenu className="gap-0.5">
                  {filteredData.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-white/60 group-data-[collapsible=icon]:hidden transition-all duration-300">
                      No results
                    </div>
                  ) : (
                    filteredData.map((item, index) => {
                      const Icon = iconMap[item.title] || FileText;
                      const isActive = pathname === item.url;

                      return (
                        <SidebarMenuItem
                          key={item.title}
                          className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
                          style={{
                            animationDelay: `${index * 30}ms`,
                            animationDuration: "300ms",
                          }}
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className={`
                              group/button relative transition-all duration-200
                              ${isActive
                                ? "bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700"
                                : "text-white hover:bg-blue-500/30 hover:text-white font-medium"
                              }
                              rounded-lg h-11
                              group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11
                              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-2
                            `}
                          >
                            <Link
                              href={item.url}
                              onClick={(e) => {
                                e.preventDefault();
                                handleItemSelect(item.url);
                              }}
                              className="flex items-center gap-3 w-full px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 transition-all duration-200"
                            >
                              {/* Icon with rotate animation on collapse */}
                              <Icon
                                className={`
                                  h-7 w-7 flex-shrink-0 transition-all duration-300
                                  group-hover/button:scale-110 group-hover/button:rotate-3
                                  group-data-[collapsible=icon]:rotate-0 group-data-[collapsible=icon]:scale-150
                                  ${isActive ? "text-black" : "text-white"}
                                `}
                              />
                              {/* Text with slide and fade animation */}
                              <span className="flex-1 truncate text-sm transition-all duration-300 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-2 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden">
                                {item.title}
                              </span>
                              {/* Active indicator with pulse */}
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:w-2 transition-all duration-200" />
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
