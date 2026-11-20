"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { useDebounce } from "@/hooks/useDebounce";
import { userService } from "@/services/api/userService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SortingState,
  PaginationState,
  ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Combobox } from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Eye, EyeOff, LogIn, ChevronDown, X, Loader2 } from "lucide-react";
import { zoneService, ZoneItem } from "@/services/api/zoneService";
import { clusterService, ClusterItem } from "@/services/api/clusterService";
import { centreService, CentreItem } from "@/services/api/centreService";
import { createPortal } from "react-dom";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { loginUser } from "@/services/userService";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";

export interface AOMUser extends Record<string, unknown> {
  _id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: "AOM" | string;
  zone: string;
  cluster: string;
  centres: string[];
  isActive?: boolean;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  phone?: string;
  mobileNo?: string;
}

const getProperErrorMessage = (err: any, fallback: string): string => {
  let msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  if (typeof msg !== "string") {
    try {
      msg = JSON.stringify(msg);
    } catch {
      return fallback;
    }
  }

  if (
    /cluster allocation conflict/i.test(msg) ||
    /cannot have multiple business managers/i.test(msg)
  ) {
    const match = msg.match(
      /(?:Cluster allocation conflict:\s*)?(A single cluster cannot have multiple Business Managers\.)\s*(Cluster\s+'[^']+'\s+is already managed by\s+[^.]+\.)/i,
    );
    if (match) {
      return `${match[2]} ${match[1]}`;
    }
    return msg.replace(/^Cluster allocation conflict:\s*/i, "").trim();
  }

  return msg;
};

const PasswordCell = ({ password }: { password?: string }) => {
  const [show, setShow] = useState(false);
  const { decodedToken } = useAuthStore();
  const isSuperSupport = decodedToken?.username === "supersupport";

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      <span className="font-mono text-xs">
        {show && !isSuperSupport ? password : "•".repeat(password?.length || 8)}
      </span>

      {!isSuperSupport && (
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={(e) => {
            e.stopPropagation();
            setShow((prev) => !prev);
          }}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
        >
          {show ? (
            <EyeOff
              className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300"
              aria-hidden="true"
            />
          ) : (
            <Eye
              className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300"
              aria-hidden="true"
            />
          )}
        </button>
      )}
    </div>
  );
};

const TableCentresDropdown: React.FC<{
  centres: string[];
}> = ({ centres }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ left: 0, width: 220, maxHeight: 240 });

  const calculatePosition = useCallback(() => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const width = Math.max(rect.width, 220);

    // If space below is less than 200px and space above is greater, open upwards
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    if (openUpward) {
      return {
        bottom: viewportHeight - rect.top + 4,
        left,
        width,
        maxHeight: Math.min(240, spaceAbove - 16),
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width,
        maxHeight: Math.min(240, spaceBelow - 16),
      };
    }
  }, []);

  const updatePosition = useCallback(() => {
    const pos = calculatePosition();
    if (pos) {
      setDropdownPosition(pos);
    }
  }, [calculatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const pos = calculatePosition();
    if (pos) {
      setDropdownPosition(pos);
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredCentres = useMemo(() => {
    if (!searchTerm.trim()) return centres;
    return centres.filter((c) =>
      c.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [centres, searchTerm]);

  if (!centres || centres.length === 0) {
    return <span className="text-slate-400 text-xs italic">No centres</span>;
  }

  return (
    <div className="relative w-full max-w-[200px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full border border-slate-200 hover:border-slate-300 rounded-md px-2.5 py-1 text-left bg-white hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs flex items-center justify-between shadow-2xs"
      >
        <span className="text-slate-800 font-medium truncate flex-1">
          {centres.length === 1 ? centres[0] : `${centres.length} Centres`}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 shrink-0 ml-1.5 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden"
            style={{
              top:
                dropdownPosition.top !== undefined
                  ? `${dropdownPosition.top}px`
                  : "auto",
              bottom:
                dropdownPosition.bottom !== undefined
                  ? `${dropdownPosition.bottom}px`
                  : "auto",
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
            }}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Assigned Centres ({centres.length})
              </span>
              <button
                type="button"
                aria-label="Close centres list"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {centres.length > 3 && (
              <div className="p-2 border-b border-slate-100 bg-white">
                <input
                  type="text"
                  placeholder="Filter centres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="overflow-y-auto divide-y divide-slate-100 max-h-44">
              {filteredCentres.length > 0 ? (
                filteredCentres.map((centre, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/50 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">{centre}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-xs text-slate-400">
                  No centres found
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default function CoordinatorPage() {
  const queryClient = useQueryClient();
  const { login: authLogin } = useAuthStore();
  const user = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(user?.role);
  const isCentral =
    normalizedRole === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "central" ||
    user?.role === "Central";
  const { setAccess } = useAccessStore();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filterZone, setFilterZone] = useState<string | undefined>();
  const [filterCluster, setFilterCluster] = useState<string | undefined>();

  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAOM, setSelectedAOM] = useState<AOMUser | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [availableClusters, setAvailableClusters] = useState<ClusterItem[]>([]);
  const [availableCentres, setAvailableCentres] = useState<CentreItem[]>([]);
  const [addZone, setAddZone] = useState("");
  const [editZone, setEditZone] = useState("");
  const [addCluster, setAddCluster] = useState("");
  const [editCluster, setEditCluster] = useState("");
  const [addCentre, setAddCentre] = useState("");
  const [editCentre, setEditCentre] = useState("");
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [isLoadingCentres, setIsLoadingCentres] = useState(false);
  const zonesLoadedRef = useRef(false);
  const clustersLoadedRef = useRef(false);
  const centresLoadedRef = useRef(false);

  const fetchZonesOnDemand = useCallback(async () => {
    if (zonesLoadedRef.current || isLoadingZones) return;
    setIsLoadingZones(true);
    try {
      const res = await zoneService.getZones({ isActive: true });
      if (res?.data && Array.isArray(res.data)) {
        setAvailableZones(res.data);
        zonesLoadedRef.current = true;
      }
    } catch (err) {
      console.warn("Could not load zones for AOM:", err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [isLoadingZones]);

  const fetchClustersOnDemand = useCallback(async () => {
    if (clustersLoadedRef.current || isLoadingClusters) return;
    setIsLoadingClusters(true);
    try {
      const res = await clusterService.getClusters({ isActive: true });
      if (res?.data && Array.isArray(res.data)) {
        setAvailableClusters(res.data);
        clustersLoadedRef.current = true;
      }
    } catch (err) {
      console.warn("Could not load clusters for AOM:", err);
    } finally {
      setIsLoadingClusters(false);
    }
  }, [isLoadingClusters]);

  const fetchCentresOnDemand = useCallback(async () => {
    if (centresLoadedRef.current || isLoadingCentres) return;
    setIsLoadingCentres(true);
    try {
      const res = await centreService.getCentres({ isActive: true });
      if (res?.data && Array.isArray(res.data)) {
        setAvailableCentres(res.data);
        centresLoadedRef.current = true;
      }
    } catch (err) {
      console.warn("Could not load centres for AOM:", err);
    } finally {
      setIsLoadingCentres(false);
    }
  }, [isLoadingCentres]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, filterZone, filterCluster]);

  const sortOrder = sorting[0]?.desc ? "desc" : "asc";
  const sortBy = sorting[0]?.id;

  // Query AOM Users
  const {
    data: aomResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "aomUsers",
      pagination.pageIndex,
      pagination.pageSize,
      sortOrder,
      sortBy,
      debouncedSearch,
      filterZone,
      filterCluster,
    ],
    queryFn: async () => {
      return await userService.getUsers({
        role: "AOM",
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortOrder: sortOrder || "asc",
        sortBy: sortBy || undefined,
        search: debouncedSearch || undefined,
        zone: filterZone || undefined,
        cluster: filterCluster || undefined,
      });
    },
  });

  const aomList: AOMUser[] = useMemo(() => {
    const list =
      aomResponse?.data || (Array.isArray(aomResponse) ? aomResponse : []);
    if (!Array.isArray(list)) return [];
    return list.map((u: any) => ({
      ...u,
      _id: u._id || u.id,
      name: u.name || u.username,
      username: u.username || "",
      email: u.email || "",
      password: u.password || "",
      role: u.role || "AOM",
      zone: u.zone || "",
      cluster: u.cluster || "",
      centres: Array.isArray(u.centres) ? u.centres : [],
      isActive: u.isActive !== undefined ? u.isActive : (u.Active ?? true),
      isLocked: !!u.isLocked,
      createdAt: u.createdAt || "",
      updatedAt: u.updatedAt || "",
      phone: u.phone || u.mobileNo || "",
      mobileNo: u.mobileNo || u.phone || "",
    }));
  }, [aomResponse]);

  const totalCount = useMemo(() => {
    if (typeof aomResponse?.total === "number") return aomResponse.total;
    if (typeof aomResponse?.pagination?.total === "number")
      return aomResponse.pagination.total;
    return aomList.length;
  }, [aomResponse, aomList.length]);

  // Unique options for filters
  const zoneOptions = useMemo(() => {
    const zones = new Set<string>();
    aomList.forEach((u) => {
      if (u.zone) zones.add(u.zone);
    });
    return Array.from(zones).map((z) => ({ label: z, value: z }));
  }, [aomList]);

  const clusterOptions = useMemo(() => {
    const clusters = new Set<string>();
    aomList.forEach((u) => {
      if (u.cluster) clusters.add(u.cluster);
    });
    return Array.from(clusters).map((c) => ({ label: c, value: c }));
  }, [aomList]);

  const formZoneItems = useMemo(() => {
    return availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
  }, [availableZones]);

  const addZoneItems = useMemo(() => {
    const list = [...formZoneItems];
    if (
      addZone &&
      !list.some((i) => i.value.toLowerCase() === addZone.toLowerCase())
    ) {
      list.unshift({ value: addZone, label: addZone });
    }
    return list;
  }, [formZoneItems, addZone]);

  const editZoneItems = useMemo(() => {
    const list = [...formZoneItems];
    if (
      editZone &&
      !list.some((i) => i.value.toLowerCase() === editZone.toLowerCase())
    ) {
      list.unshift({ value: editZone, label: editZone });
    }
    return list;
  }, [formZoneItems, editZone]);

  const allUniqueClusters = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; zone?: string }>();
    availableClusters.forEach((c) => {
      if (c.name) {
        map.set(c.name.toLowerCase(), {
          name: c.name,
          code: c.code,
          zone: c.zone,
        });
      }
    });
    aomList.forEach((a) => {
      if (a.cluster && !map.has(a.cluster.toLowerCase())) {
        map.set(a.cluster.toLowerCase(), {
          name: a.cluster,
          zone: a.zone || undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [availableClusters, aomList]);

  const addClusterItems = useMemo(() => {
    let list = allUniqueClusters;
    if (addZone) {
      const matched = list.filter(
        (c) => c.zone?.toLowerCase() === addZone.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      addCluster &&
      !mapped.some((i) => i.value.toLowerCase() === addCluster.toLowerCase())
    ) {
      mapped.unshift({ value: addCluster, label: addCluster });
    }
    return mapped;
  }, [allUniqueClusters, addZone, addCluster]);

  const editClusterItems = useMemo(() => {
    let list = allUniqueClusters;
    if (editZone) {
      const matched = list.filter(
        (c) => c.zone?.toLowerCase() === editZone.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      editCluster &&
      !mapped.some((i) => i.value.toLowerCase() === editCluster.toLowerCase())
    ) {
      mapped.unshift({ value: editCluster, label: editCluster });
    }
    return mapped;
  }, [allUniqueClusters, editZone, editCluster]);

  const allUniqueCentres = useMemo(() => {
    const map = new Map<
      string,
      { name: string; code?: string; zone?: string; cluster?: string }
    >();
    availableCentres.forEach((c) => {
      if (c.name) {
        map.set(c.name.toLowerCase(), {
          name: c.name,
          code: c.code,
          zone: c.zone,
          cluster: c.cluster,
        });
      }
    });
    aomList.forEach((a) => {
      if (Array.isArray(a.centres)) {
        a.centres.forEach((cName) => {
          if (cName && !map.has(cName.toLowerCase())) {
            map.set(cName.toLowerCase(), {
              name: cName,
              zone: a.zone || undefined,
              cluster: a.cluster || undefined,
            });
          }
        });
      }
    });
    return Array.from(map.values());
  }, [availableCentres, aomList]);

  const addCentreItems = useMemo(() => {
    let list = allUniqueCentres;
    if (addCluster) {
      const matched = list.filter(
        (c) => c.cluster?.toLowerCase() === addCluster.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    } else if (addZone) {
      const matched = list.filter(
        (c) => c.zone?.toLowerCase() === addZone.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      addCentre &&
      !mapped.some((i) => i.value.toLowerCase() === addCentre.toLowerCase())
    ) {
      mapped.unshift({ value: addCentre, label: addCentre });
    }
    return mapped;
  }, [allUniqueCentres, addCluster, addZone, addCentre]);

  const editCentreItems = useMemo(() => {
    let list = allUniqueCentres;
    if (editCluster) {
      const matched = list.filter(
        (c) => c.cluster?.toLowerCase() === editCluster.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    } else if (editZone) {
      const matched = list.filter(
        (c) => c.zone?.toLowerCase() === editZone.toLowerCase(),
      );
      if (matched.length > 0) list = matched;
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      editCentre &&
      !mapped.some((i) => i.value.toLowerCase() === editCentre.toLowerCase())
    ) {
      mapped.unshift({ value: editCentre, label: editCentre });
    }
    return mapped;
  }, [allUniqueCentres, editCluster, editZone, editCentre]);

  // Login As
  const handleLoginAs = useCallback(
    async (username: string, password?: string, id?: string) => {
      if (!isCentral) {
        toast.error("Only Central administrators have authority to Login As.");
        return;
      }
      if (!username || !password || !id) return;
      setLoginAsLoading(id);
      try {
        Cookies.remove("token");
        localStorage.clear();

        const data = await loginUser(username, password);
        const authToken = data?.token || data?.accessToken;
        if (authToken) {
          authLogin(authToken, data.refreshToken);
          if (data.access) {
            setAccess(data.access);
          }
          toast.success(`Logged in as ${username}`);
          window.location.replace("/dashboard/incident");
        } else {
          toast.error("Login failed: Invalid server response");
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Login failed");
      } finally {
        setLoginAsLoading(null);
      }
    },
    [authLogin, setAccess, isCentral],
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.createUser({
        ...payload,
        role: "AOM",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aomUsers"] });
      setIsAddOpen(false);
      setAddZone("");
      setAddCluster("");
      setAddCentre("");
      toast.success("Area Operations Manager added successfully.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        getProperErrorMessage(
          err,
          "Failed to create Area Operations Manager",
        ),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.updateUser(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aomUsers"] });
      setIsEditOpen(false);
      setSelectedAOM(null);
      setEditZone("");
      setEditCluster("");
      setEditCentre("");
      toast.success("Area Operations Manager updated successfully.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        getProperErrorMessage(
          err,
          "Failed to update Area Operations Manager",
        ),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aomUsers"] });
      toast.success("Area Operations Manager deleted successfully.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to delete Area Operations Manager",
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (user: AOMUser) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators can activate or deactivate users.");
      }
      const currentActive = user.isActive !== undefined ? user.isActive : true;
      return await userService.updateUserStatus(user._id, !currentActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aomUsers"] });
      toast.success("Status updated successfully.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update status");
    },
  });

  const handleDelete = useCallback(
    (user: AOMUser) => {
      if (!isCentral) {
        toast.error("Access Restricted: Only Central administrators have authority for user administration.");
        return;
      }
      if (
        confirm(
          `Are you sure you want to delete "${user.name || user.username}"?`,
        )
      ) {
        deleteMutation.mutate(user._id);
      }
    },
    [deleteMutation, isCentral],
  );

  // Table Columns
  const columns: any[] = useMemo(
    () => [
      {
        header: "Area Operations Manager",
        accessorKey: "name",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-2 w-full">
              <span className="font-semibold text-slate-900 break-words whitespace-normal flex-1">
                {user.name || user.username || "N/A"}
              </span>
              {isCentral && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Login as ${user.name || user.username}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoginAs(user.username, user.password, user._id);
                      }}
                      disabled={loginAsLoading === user._id}
                      className="shrink-0 w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-600/60 dark:hover:bg-slate-500 flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-2xs hover:shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                      {loginAsLoading === user._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                      ) : (
                        <LogIn
                          className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Login as {user.name || user.username}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
        meta: { minWidth: "220px" },
      },
      {
        header: "Cluster",
        accessorKey: "cluster",
        cell: ({ row }) => (
          <span className="text-slate-800 font-medium">
            {row.original.cluster || "N/A"}
          </span>
        ),
        meta: { minWidth: "150px" },
      },
      {
        header: "Zone",
        accessorKey: "zone",
        cell: ({ row }) => (
          <span className="text-slate-800">{row.original.zone || "N/A"}</span>
        ),
        meta: { minWidth: "110px" },
      },
      {
        header: "Centre",
        id: "centres",
        cell: ({ row }) => {
          const centresList: string[] = Array.isArray(row.original.centres)
            ? row.original.centres.filter(Boolean)
            : [];
          if (centresList.length === 0) {
            return <span className="text-slate-400 text-xs italic">N/A</span>;
          }
          return (
            <div className="min-w-[240px] text-slate-800 font-medium text-xs leading-relaxed break-words whitespace-normal text-center">
              {centresList.join(", ")}
            </div>
          );
        },
        meta: {
          minWidth: "260px",
          width: "280px",
          wrapConfig: { minWidth: "260px", maxWidth: "340px", wrap: "wrap" },
        },
      },
      {
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="truncate text-slate-700">
            {row.original.email || "N/A"}
          </span>
        ),
        meta: { minWidth: "180px" },
      },
      ...(isCentral
        ? [
            {
              header: "Username",
              accessorKey: "username",
              cell: ({ row }: any) => (
                <span className="font-mono text-xs text-slate-700">
                  {row.original.username || "N/A"}
                </span>
              ),
              meta: { minWidth: "130px" },
            },
            {
              header: "Password",
              accessorKey: "password",
              cell: ({ row }: any) => (
                <PasswordCell password={row.original.password} />
              ),
              meta: { minWidth: "140px" },
            },
          ]
        : []),
      {
        header: "Status",
        accessorKey: "isActive",
        cell: ({ row }) => {
          const u = row.original;
          const isAct = u.isActive !== undefined ? u.isActive : true;
          const isLck = !!u.isLocked;
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                isLck
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : isAct
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {isLck ? "Locked" : isAct ? "Active" : "Inactive"}
            </span>
          );
        },
        meta: { minWidth: "110px" },
      },
      {
        header: "Registration Date",
        accessorKey: "createdAt",
        cell: ({ row }) => {
          const d = row.original.createdAt;
          return (
            <span className="text-slate-600 text-xs">
              {d ? new Date(d).toLocaleDateString("en-GB") : "N/A"}
            </span>
          );
        },
        meta: { minWidth: "140px" },
      },
      ...(isCentral
        ? [
            {
              id: "actions",
              header: "Action",
              cell: ({ row }: any) => {
                const user = row.original;
                const isAct = user.isActive !== undefined ? user.isActive : true;
                return (
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAOM(user);
                        setEditZone(user.zone || "");
                        setEditCluster(user.cluster || "");
                        const initialCentre =
                          Array.isArray(user.centres) && user.centres.length > 0
                            ? user.centres[0]
                            : "";
                        setEditCentre(initialCentre);
                        fetchZonesOnDemand();
                        fetchClustersOnDemand();
                        fetchCentresOnDemand();
                        setIsEditOpen(true);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => deactivateMutation.mutate(user)}
                      disabled={deactivateMutation.isPending}
                      className={`text-xs font-semibold py-1 px-3 rounded-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                        isAct
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      {isAct ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                );
              },
              meta: { minWidth: "220px" },
            },
          ]
        : []),
    ],
    [handleLoginAs, loginAsLoading, handleDelete, deactivateMutation, isCentral],
  );

  const { table, tableElement } = useCustomTable({
    data: aomList,
    columns,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No Area Operations Managers found",
    pageSizeOptions: [5, 10, 15, 20, 50, 100],
    showSerialNumber: true,
    enableSorting: true,
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "calc(100vh - 200px)",
  });

  // Handle Add Form Submit
  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const centresRaw = (formData.get("centres") as string) || "";
    const centresArray = centresRaw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const zoneVal = addZone || (formData.get("zone") as string) || "";
    const clusterVal = addCluster || (formData.get("cluster") as string) || "";

    if (!zoneVal) {
      toast.error("Please select a Zone");
      return;
    }
    if (!clusterVal) {
      toast.error("Please select a Cluster");
      return;
    }

    const payload = {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      phone: formData.get("mobileNo") as string,
      zone: zoneVal,
      cluster: clusterVal,
      centres: addCentre ? [addCentre] : [],
    };

    createMutation.mutate(payload);
  };

  // Handle Edit Form Submit
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    if (!selectedAOM) return;
    const formData = new FormData(e.currentTarget);
    const centresRaw = (formData.get("centres") as string) || "";
    const centresArray = centresRaw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const zoneVal = editZone || (formData.get("zone") as string) || "";
    const clusterVal = editCluster || (formData.get("cluster") as string) || "";

    if (!zoneVal) {
      toast.error("Please select a Zone");
      return;
    }
    if (!clusterVal) {
      toast.error("Please select a Cluster");
      return;
    }

    const updatedData: any = {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      phone: formData.get("mobileNo") as string,
      zone: zoneVal,
      cluster: clusterVal,
      centres: editCentre ? [editCentre] : [],
    };

    const newPassword = formData.get("password") as string;
    if (newPassword && newPassword.trim()) {
      updatedData.password = newPassword.trim();
    }

    updateMutation.mutate({
      id: selectedAOM._id,
      data: updatedData,
    });
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Toolbar / Filters & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          {/* Search Bar */}
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search AOM by name, username, cluster..."
            width="w-full sm:w-[260px] md:w-[300px]"
          />

          {/* Column Visibility */}
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />

          {/* Zone Filter */}
          {zoneOptions.length > 0 && (
            <Combobox
              items={zoneOptions}
              value={filterZone}
              onValueChange={(val) => setFilterZone(val || undefined)}
              placeholder="Filter Zone"
              searchPlaceholder="Search Zone..."
              width="w-full sm:w-[160px]"
              emptyMessage="No zones found"
            />
          )}

          {/* Cluster Filter */}
          {clusterOptions.length > 0 && (
            <Combobox
              items={clusterOptions}
              value={filterCluster}
              onValueChange={(val) => setFilterCluster(val || undefined)}
              placeholder="Filter Cluster"
              searchPlaceholder="Search Cluster..."
              width="w-full sm:w-[180px]"
              emptyMessage="No clusters found"
            />
          )}
        </div>

        {/* Add AOM Button */}
        {isCentral && (
          <Button
            type="button"
            className="cursor-pointer w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              setShowAddPassword(false);
              setAddZone("");
              setAddCluster("");
              setAddCentre("");
              fetchZonesOnDemand();
              fetchClustersOnDemand();
              fetchCentresOnDemand();
              setIsAddOpen(true);
            }}
            disabled={createMutation.isPending}
          >
            Add Area Operations Manager
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 pt-2">{tableElement}</div>

      {/* Add Dialog */}
      {isCentral && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Area Operations Manager</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-name">Area Operations Manager Name *</Label>
                <Input
                  id="add-name"
                  name="name"
                  placeholder="e.g. Sunil Gupta (AOM Delhi Area)"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="add-zone">Zone *</Label>
                  <input type="hidden" name="zone" value={addZone} />
                  <Combobox
                    items={addZoneItems}
                    value={addZone}
                    onValueChange={(val) => {
                      const newZone = val || "";
                      setAddZone(newZone);
                      if (
                        addCluster &&
                        !allUniqueClusters.some(
                          (c) =>
                            c.name.toLowerCase() === addCluster.toLowerCase() &&
                            (!c.zone || c.zone.toLowerCase() === newZone.toLowerCase()),
                        )
                      ) {
                        setAddCluster("");
                      }
                    }}
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchZonesOnDemand();
                    }}
                    placeholder={isLoadingZones ? "Loading zones..." : "Select Zone"}
                    searchPlaceholder="Search zone..."
                    emptyMessage={isLoadingZones ? "Loading zones..." : "No zones found."}
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="add-cluster">Cluster *</Label>
                  <input type="hidden" name="cluster" value={addCluster} />
                  <Combobox
                    items={addClusterItems}
                    value={addCluster}
                    onValueChange={(val) => {
                      const newCluster = val || "";
                      setAddCluster(newCluster);
                      const matched = allUniqueClusters.find(
                        (c) => c.name.toLowerCase() === newCluster.toLowerCase(),
                      );
                      if (matched?.zone && !addZone) {
                        setAddZone(matched.zone);
                      }
                    }}
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchClustersOnDemand();
                    }}
                    placeholder={
                      isLoadingClusters ? "Loading clusters..." : "Select Cluster"
                    }
                    searchPlaceholder="Search cluster..."
                    emptyMessage={
                      isLoadingClusters
                        ? "Loading clusters..."
                        : addZone
                        ? `No clusters found in ${addZone}`
                        : "No clusters found."
                    }
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-centres">Assigned Centre</Label>
                <input type="hidden" name="centres" value={addCentre} />
                <Combobox
                  items={addCentreItems}
                  value={addCentre}
                  onValueChange={(val) => {
                    const newCentre = val || "";
                    setAddCentre(newCentre);
                    if (newCentre) {
                      const matched = allUniqueCentres.find(
                        (c) => c.name.toLowerCase() === newCentre.toLowerCase(),
                      );
                      if (matched?.cluster && !addCluster) {
                        setAddCluster(matched.cluster);
                      }
                      if (matched?.zone && !addZone) {
                        setAddZone(matched.zone);
                      }
                    }
                  }}
                  onOpenChange={(isOpen) => {
                    if (isOpen) fetchCentresOnDemand();
                  }}
                  placeholder={
                    isLoadingCentres
                      ? "Loading centres..."
                      : "Select Centre / School"
                  }
                  searchPlaceholder="Search centre or code..."
                  emptyMessage={
                    isLoadingCentres
                      ? "Loading centres..."
                      : addCluster
                      ? `No centres found in ${addCluster}`
                      : addZone
                      ? `No centres found in ${addZone}`
                      : "No centres found."
                  }
                  width="w-full"
                  className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    name="email"
                    type="email"
                    placeholder="aom.delhi@lighthouse.com"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="add-mobileNo">Mobile No</Label>
                  <Input
                    id="add-mobileNo"
                    name="mobileNo"
                    type="tel"
                    placeholder="10-digit number"
                    pattern="[0-9]{10}"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-username">Username *</Label>
                <Input
                  id="add-username"
                  name="username"
                  placeholder="e.g. aom_delhi"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="add-password"
                    name="password"
                    type={showAddPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showAddPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                  >
                    {showAddPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : "Add AOM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* Edit Dialog */}
      {isCentral && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          {selectedAOM && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Edit Area Operations Manager</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-name">
                    Area Operations Manager Name *
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedAOM.name}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-zone">Zone *</Label>
                    <input type="hidden" name="zone" value={editZone} />
                    <Combobox
                      items={editZoneItems}
                      value={editZone}
                      onValueChange={(val) => {
                        const newZone = val || "";
                        setEditZone(newZone);
                        if (
                          editCluster &&
                          !allUniqueClusters.some(
                            (c) =>
                              c.name.toLowerCase() === editCluster.toLowerCase() &&
                              (!c.zone || c.zone.toLowerCase() === newZone.toLowerCase()),
                          )
                        ) {
                          setEditCluster("");
                        }
                      }}
                      onOpenChange={(isOpen) => {
                        if (isOpen) fetchZonesOnDemand();
                      }}
                      placeholder={isLoadingZones ? "Loading zones..." : "Select Zone"}
                      searchPlaceholder="Search zone..."
                      emptyMessage={isLoadingZones ? "Loading zones..." : "No zones found."}
                      width="w-full"
                      className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-cluster">Cluster *</Label>
                    <input type="hidden" name="cluster" value={editCluster} />
                    <Combobox
                      items={editClusterItems}
                      value={editCluster}
                      onValueChange={(val) => {
                        const newCluster = val || "";
                        setEditCluster(newCluster);
                        const matched = allUniqueClusters.find(
                          (c) => c.name.toLowerCase() === newCluster.toLowerCase(),
                        );
                        if (matched?.zone && !editZone) {
                          setEditZone(matched.zone);
                        }
                      }}
                      onOpenChange={(isOpen) => {
                        if (isOpen) fetchClustersOnDemand();
                      }}
                      placeholder={
                        isLoadingClusters ? "Loading clusters..." : "Select Cluster"
                      }
                      searchPlaceholder="Search cluster..."
                      emptyMessage={
                        isLoadingClusters
                          ? "Loading clusters..."
                          : editZone
                          ? `No clusters found in ${editZone}`
                          : "No clusters found."
                      }
                      width="w-full"
                      className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-centres">Assigned Centre</Label>
                  <input type="hidden" name="centres" value={editCentre} />
                  <Combobox
                    items={editCentreItems}
                    value={editCentre}
                    onValueChange={(val) => {
                      const newCentre = val || "";
                      setEditCentre(newCentre);
                      if (newCentre) {
                        const matched = allUniqueCentres.find(
                          (c) => c.name.toLowerCase() === newCentre.toLowerCase(),
                        );
                        if (matched?.cluster && !editCluster) {
                          setEditCluster(matched.cluster);
                        }
                        if (matched?.zone && !editZone) {
                          setEditZone(matched.zone);
                        }
                      }
                    }}
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchCentresOnDemand();
                    }}
                    placeholder={
                      isLoadingCentres
                        ? "Loading centres..."
                        : "Select Centre / School"
                    }
                    searchPlaceholder="Search centre or code..."
                    emptyMessage={
                      isLoadingCentres
                        ? "Loading centres..."
                        : editCluster
                        ? `No centres found in ${editCluster}`
                        : editZone
                        ? `No centres found in ${editZone}`
                        : "No centres found."
                    }
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      defaultValue={selectedAOM.email}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-mobileNo">Mobile No</Label>
                    <Input
                      id="edit-mobileNo"
                      name="mobileNo"
                      type="tel"
                      defaultValue={
                        selectedAOM.mobileNo || selectedAOM.phone || ""
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-username">Username *</Label>
                  <Input
                    id="edit-username"
                    name="username"
                    defaultValue={selectedAOM.username}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      name="password"
                      type={showEditPassword ? "text" : "password"}
                      defaultValue={selectedAOM.password}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      aria-label={
                        showEditPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
