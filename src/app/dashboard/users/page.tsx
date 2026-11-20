"use client";

import React, { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { School, Building2, Users, UserCheck } from "lucide-react";
import dynamic from "next/dynamic";
import ResponseLoader from "@/components/ResponseLoader";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { toast } from "sonner";

// Lazy load tab components for optimal bundle performance
const SchoolMaster = dynamic(
  () => import("@/app/dashboard/users/school-master/page"),
  { ssr: false }
);

const BranchMaster = dynamic(
  () => import("@/app/dashboard/users/branch-master/page"),
  { ssr: false }
);

const UserAccessPage = dynamic(
  () => import("@/app/dashboard/users/user-access/page"),
  { ssr: false }
);

const CoordinatorPage = dynamic(
  () => import("@/app/dashboard/users/coordinator/page"),
  { ssr: false }
);

type TabKey = "national-head" | "bm" | "rso" | "aom";

interface TabItem {
  id: TabKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

function UsersManagementTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAuthStore((state) => state.decodedToken);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchronously resolve user token from store or local storage/cookies
  const user = useMemo(() => {
    if (authUser) return authUser;
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || Cookies.get("token");
      if (token) {
        try {
          return getDecodedToken(token);
        } catch {}
      }
    }
    return null;
  }, [authUser]);

  const normalized = normalizePrekRole(user?.role);
  const isSuperAdmin =
    normalized === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "Central" ||
    user?.role === "central" ||
    user?.username === "central_admin";
  const isNationalHead =
    normalized === PREK_ROLES.NATIONAL_HEAD ||
    user?.role === "school" ||
    user?.role === "National Head" ||
    user?.role === "NationalHead";
  const isRSO =
    normalized === PREK_ROLES.RSO ||
    user?.role === "branchGroup" ||
    user?.role === "RSO";
  const isBM =
    normalized === PREK_ROLES.BM ||
    user?.role === "branch" ||
    user?.role === "BM";

  useEffect(() => {
    if (isNationalHead) {
      toast.error(
        "Access Denied: Role National Head cannot manage user accounts.",
      );
      router.replace("/dashboard/incident");
    }
  }, [isNationalHead, router]);

  // Build available tabs based on 5-tier role hierarchy
  const availableTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [];

    // 1. National Head - Only Central / SuperAdmin can manage National Head accounts
    if (isSuperAdmin) {
      tabs.push({
        id: "national-head",
        label: "National Head",
        shortLabel: "National Head",
        icon: School,
      });
    }

    // 2. Business Manager (BM) - Central and RSO
    if (isSuperAdmin || isRSO) {
      tabs.push({
        id: "bm",
        label: "Business Manager (BM)",
        shortLabel: "Business Manager",
        icon: Building2,
      });
    }

    // 3. Regional Safety Officer (RSO) - Central only
    if (isSuperAdmin) {
      tabs.push({
        id: "rso",
        label: "Regional Safety Officer (RSO)",
        shortLabel: "Regional Safety",
        icon: Users,
      });
    }

    // 4. Area Operations Manager (AOM) - Central, RSO, and BM
    if (isSuperAdmin || isRSO || isBM) {
      tabs.push({
        id: "aom",
        label: "Area Operations Manager (AOM)",
        shortLabel: "Area Operations",
        icon: UserCheck,
      });
    }

    return tabs;
  }, [isSuperAdmin, isRSO, isBM]);

  const paramTab = searchParams.get("tab") as TabKey | null;

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (paramTab && availableTabs.some((t) => t.id === paramTab)) {
      return paramTab;
    }
    return availableTabs[0]?.id || "aom";
  });

  // Track visited tabs to keep them alive in DOM (fast instant switching without unmounting)
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(
    () => new Set([activeTab])
  );

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Preload tab chunks in background idle so even the first click is instantaneous
  useEffect(() => {
    if (typeof window === "undefined") return;
    const preloadTimer = setTimeout(() => {
      if (isSuperAdmin) import("@/app/dashboard/users/school-master/page");
      if (isSuperAdmin || isNationalHead || isRSO)
        import("@/app/dashboard/users/branch-master/page");
      if (isSuperAdmin || isNationalHead)
        import("@/app/dashboard/users/user-access/page");
      if (isSuperAdmin || isNationalHead || isRSO || isBM)
        import("@/app/dashboard/users/coordinator/page");
    }, 150);
    return () => clearTimeout(preloadTimer);
  }, [isSuperAdmin, isNationalHead, isRSO, isBM]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabKey | null;
      if (tab && availableTabs.some((t) => t.id === tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [availableTabs]);

  // Keep activeTab aligned when URL paramTab changes or availableTabs changes
  useEffect(() => {
    if (availableTabs.length === 0) return;

    // 1. If paramTab in URL is a valid available tab, use it
    if (paramTab && availableTabs.some((t) => t.id === paramTab)) {
      if (activeTab !== paramTab) {
        setActiveTab(paramTab);
      }
      return;
    }

    // 2. If activeTab is not in availableTabs (e.g. role switched or invalid param):
    if (!availableTabs.some((t) => t.id === activeTab)) {
      const fallback = availableTabs[0].id;
      setActiveTab(fallback);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", fallback);
        window.history.replaceState(null, "", url.toString());
      }
    } else if (!paramTab) {
      // 3. If there is no tab in URL, reflect activeTab in URL
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", activeTab);
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [availableTabs, paramTab, activeTab]);

  const handleTabChange = (tabId: TabKey) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/60">
        <ResponseLoader isLoading={true} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/60">
      {/* Top Tab Bar Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-5 pb-0 sticky top-0 z-20 shadow-2xs">
        {/* Tab Navigation List */}
        <nav
          className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar -mb-px"
          aria-label="User Management Roles"
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap select-none
                  ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }
                `}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Container with Keep-Alive to eliminate remount latency */}
      <div className="flex-1 relative">
        {isSuperAdmin && visitedTabs.has("national-head") && (
          <div
            className={
              activeTab === "national-head"
                ? "block animate-in fade-in-50 duration-150"
                : "hidden"
            }
          >
            <SchoolMaster />
          </div>
        )}
        {(isSuperAdmin || isNationalHead || isRSO) &&
          visitedTabs.has("bm") && (
            <div
              className={
                activeTab === "bm"
                  ? "block animate-in fade-in-50 duration-150"
                  : "hidden"
              }
            >
              <BranchMaster />
            </div>
          )}
        {(isSuperAdmin || isNationalHead) && visitedTabs.has("rso") && (
          <div
            className={
              activeTab === "rso"
                ? "block animate-in fade-in-50 duration-150"
                : "hidden"
            }
          >
            <UserAccessPage />
          </div>
        )}
        {(isSuperAdmin || isNationalHead || isRSO || isBM) &&
          visitedTabs.has("aom") && (
            <div
              className={
                activeTab === "aom"
                  ? "block animate-in fade-in-50 duration-150"
                  : "hidden"
              }
            >
              <CoordinatorPage />
            </div>
          )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<ResponseLoader isLoading={true} />}>
      <UsersManagementTabs />
    </Suspense>
  );
}
