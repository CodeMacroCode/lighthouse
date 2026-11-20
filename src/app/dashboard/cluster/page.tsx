"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Layers,
  Globe,
  School,
  Building2,
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  UserCheck,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  X,
  Shield,
  Briefcase,
  CheckCircle2,
  Filter,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { CustomTable } from "@/components/ui/CustomTable";
import { ColumnDef } from "@/components/ui/customTable(serverSidePagination)";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getDecodedToken } from "@/lib/jwt";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { useAuthStore } from "@/store/authStore";
import Cookies from "js-cookie";
import {
  clusterService,
  ClusterItem,
  SupervisedAOM,
  CreateClusterPayload,
  UpdateClusterPayload,
  ClusterCentre,
} from "@/services/api/clusterService";
import { zoneService, ZoneItem } from "@/services/api/zoneService";

// Helper to extract centre name from string or object
function getCentreName(centre: string | ClusterCentre): string {
  if (typeof centre === "string") return centre;
  return centre?.name || centre?.code || "Unnamed Centre";
}

// Zone badge color helper
function getZoneBadgeColor(zoneName?: string) {
  if (!zoneName) return "bg-slate-100 text-slate-700 border-slate-200";
  const z = zoneName.toLowerCase();
  if (z.includes("west")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (z.includes("north"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (z.includes("south"))
    return "bg-purple-50 text-purple-700 border-purple-200";
  if (z.includes("east")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

function ClusterPageContent() {
  const searchParams = useSearchParams();
  const initialZone = searchParams.get("zone") || "all";

  // Data states
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const zonesLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedZone, setSelectedZone] = useState<string>(initialZone);
  const [bmFilter, setBmFilter] = useState<"all" | "assigned" | "unassigned">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const zoneFilterItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    return [{ value: "all", label: "All Zones" }, ...list];
  }, [availableZones]);

  // User permissions: Central only for mutating endpoints
  const router = useRouter();
  const authUser = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(authUser?.role);
  const isBM =
    normalizedRole === PREK_ROLES.BM ||
    authUser?.role === "branch" ||
    authUser?.role === "BM" ||
    authUser?.role === "bm";

  useEffect(() => {
    if (isBM) {
      toast.error(
        "Access Denied: Role Business Manager (BM) cannot access Cluster Master.",
      );
      router.replace("/dashboard/incident");
    }
  }, [isBM, router]);

  const isCentral = useMemo(() => {
    if (
      normalizedRole === PREK_ROLES.CENTRAL ||
      authUser?.role === "superAdmin" ||
      authUser?.role === "Central" ||
      authUser?.role === "central" ||
      authUser?.username === "central_admin"
    ) {
      return true;
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || Cookies.get("token");
      if (token) {
        try {
          const decoded = getDecodedToken(token);
          const norm = decoded?.role ? normalizePrekRole(decoded.role) : "";
          if (
            norm === PREK_ROLES.CENTRAL ||
            decoded?.role === "superAdmin" ||
            decoded?.role === "Central" ||
            decoded?.role === "central" ||
            decoded?.username === "central_admin"
          ) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  }, [authUser, normalizedRole]);

  const isNationalHead = useMemo(() => {
    return (
      normalizedRole === PREK_ROLES.NATIONAL_HEAD ||
      authUser?.role === "school" ||
      authUser?.role === "National Head" ||
      authUser?.role === "NationalHead"
    );
  }, [authUser, normalizedRole]);

  const canAccessZone = isCentral || isNationalHead;
  const [currentUsername, setCurrentUsername] = useState("");

  // Inspect Modal State
  const [activeCluster, setActiveCluster] = useState<ClusterItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Supervised AOMs Modal State (GET /api/clusters/:id/aoms)
  const [isAOMModalOpen, setIsAOMModalOpen] = useState(false);
  const [aomClusterInfo, setAomClusterInfo] = useState<{
    cluster: string;
    zone: string;
    totalAOMs: number;
    aoms: SupervisedAOM[];
  } | null>(null);
  const [isLoadingAOMs, setIsLoadingAOMs] = useState(false);

  // Create Modal State (POST /api/clusters)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateClusterPayload>({
    name: "",
    code: "",
    zone: "",
    description: "",
  });

  // Edit Modal State (PUT /api/clusters/:id)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<string>("");
  const [editForm, setEditForm] = useState<{
    name: string;
    code: string;
    zone: string;
    description: string;
    isActive: boolean;
  }>({
    name: "",
    code: "",
    zone: "",
    description: "",
    isActive: true,
  });

  const editZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));

    if (editForm.zone) {
      const match = list.find(
        (i) =>
          i.value.toLowerCase() === editForm.zone.toLowerCase() ||
          i.label.toLowerCase().includes(`(${editForm.zone.toLowerCase()})`),
      );
      if (!match) {
        const zoneByCode = availableZones.find(
          (z) => z.code && z.code.toLowerCase() === editForm.zone.toLowerCase(),
        );
        if (zoneByCode) {
          list.unshift({
            value: zoneByCode.name,
            label: `${zoneByCode.name} (${zoneByCode.code})`,
          });
        } else {
          list.unshift({
            value: editForm.zone,
            label: editForm.zone,
          });
        }
      }
    }

    return list;
  }, [availableZones, editForm.zone]);

  const createZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      createForm.zone &&
      !list.some((i) => i.value.toLowerCase() === createForm.zone.toLowerCase())
    ) {
      list.unshift({
        value: createForm.zone,
        label: createForm.zone,
      });
    }
    return list;
  }, [availableZones, createForm.zone]);

  // Delete Modal State (DELETE /api/clusters/:id)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<ClusterItem | null>(
    null,
  );

  // Restore Modal State (when cluster already exists in trash)
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{
    id: string;
    name: string;
    code: string;
    deletedAt?: string;
    message?: string;
  } | null>(null);

  // Detect username on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = getDecodedToken(token);
        if (decoded?.username) setCurrentUsername(decoded.username);
      }
    }
  }, []);

  // Lazy-load zones on demand when user clicks/focuses on the Zone filter or select
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
      console.warn("Could not load zones for cluster filter:", err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [isLoadingZones]);

  // Fetch clusters from GET /api/clusters
  const fetchClusters = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params: {
          zone?: string;
          search?: string;
          unassigned?: boolean;
          isActive?: boolean;
        } = {};

        if (selectedZone && selectedZone !== "all") {
          params.zone = selectedZone;
        }
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (bmFilter === "unassigned") {
          params.unassigned = true;
        }
        if (statusFilter === "active") params.isActive = true;
        if (statusFilter === "inactive") params.isActive = false;

        const res = await clusterService.getClusters(params);
        if (res?.data && Array.isArray(res.data)) {
          setClusters(res.data);
        } else {
          setClusters([]);
        }
      } catch (err: any) {
        console.error("Error loading clusters:", err);
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch clusters.",
        );
        setClusters([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedZone, debouncedSearch, bmFilter, statusFilter],
  );

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Open AOMs Modal (GET /api/clusters/:id/aoms)
  const handleOpenAOMModal = async (cluster: ClusterItem) => {
    setIsLoadingAOMs(true);
    setIsAOMModalOpen(true);
    setAomClusterInfo({
      cluster: cluster.name,
      zone: cluster.zone,
      totalAOMs: cluster.aomCount ?? cluster.supervisedAOMs?.length ?? 0,
      aoms: cluster.supervisedAOMs || [],
    });

    try {
      const res = await clusterService.getClusterAOMs(
        cluster._id || cluster.id || "",
      );
      if (res?.data && Array.isArray(res.data)) {
        setAomClusterInfo({
          cluster: res.cluster || cluster.name,
          zone: res.zone || cluster.zone,
          totalAOMs: res.totalAOMs ?? res.data.length,
          aoms: res.data,
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch fresh cluster AOMs, using row data:", err);
      // Row already contains supervisedAOMs as fallback
    } finally {
      setIsLoadingAOMs(false);
    }
  };

  // Submit Create (POST /api/clusters)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for cluster management.");
      return;
    }
    if (!createForm.name.trim()) {
      toast.error("Cluster name is required.");
      return;
    }
    if (!createForm.code.trim()) {
      toast.error("Cluster code (e.g. CL-MUM) is required.");
      return;
    }
    if (!createForm.zone.trim()) {
      toast.error("Please select a Zone.");
      return;
    }

    setIsCreating(true);
    try {
      const payload: CreateClusterPayload = {
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        zone: createForm.zone.trim(),
        description: createForm.description?.trim(),
      };

      const res = await clusterService.createCluster(payload);
      toast.success(
        res?.message ||
          `Cluster '${createForm.name}' created successfully in Zone '${createForm.zone}'.`,
      );
      setIsCreateOpen(false);
      setCreateForm({ name: "", code: "", zone: "", description: "" });
      await fetchClusters(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (
        data &&
        (data.canRestore === true ||
          data.conflictType === "ALREADY_EXISTS_DELETED" ||
          (data.existingId &&
            typeof data.message === "string" &&
            data.message.includes("restore")))
      ) {
        const existingId =
          data.existingId ||
          data.deletedCluster?.id ||
          data.deletedCluster?._id;
        if (existingId) {
          setRestoreTarget({
            id: existingId,
            name: data.deletedCluster?.name || createForm.name,
            code: data.deletedCluster?.code || createForm.code,
            deletedAt: data.deletedCluster?.deletedAt,
            message: data.message,
          });
          setIsCreateOpen(false);
          setIsRestoreOpen(true);
          return;
        }
      }

      const msg = data?.message || err?.message || "Failed to create cluster.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Submit Restore (PUT /api/clusters/:id/restore)
  const handleRestoreSubmit = async () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for cluster management.");
      return;
    }
    if (!restoreTarget?.id) return;

    setIsRestoring(true);
    try {
      const res = await clusterService.restoreCluster(restoreTarget.id);
      toast.success(
        res?.message ||
          `Cluster '${restoreTarget.name}' restored successfully from trash.`,
      );
      setIsRestoreOpen(false);
      setRestoreTarget(null);
      await fetchClusters(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to restore cluster.";
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (cluster: ClusterItem) => {
    setEditingClusterId(cluster._id || cluster.id || "");
    setEditForm({
      name: cluster.name,
      code: cluster.code,
      zone: cluster.zone || "",
      description: cluster.description || "",
      isActive: cluster.isActive !== false,
    });
    fetchZonesOnDemand();
    setIsEditOpen(true);
  };

  // Submit Edit (PUT /api/clusters/:id)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for cluster management.");
      return;
    }
    if (!editingClusterId) return;

    setIsUpdating(true);
    try {
      const payload: UpdateClusterPayload = {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        zone: editForm.zone.trim(),
        description: editForm.description.trim(),
        isActive: editForm.isActive,
      };

      const res = await clusterService.updateCluster(editingClusterId, payload);
      toast.success(
        res?.message || `Cluster '${editForm.name}' updated successfully.`,
      );
      setIsEditOpen(false);
      await fetchClusters(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update cluster.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (cluster: ClusterItem) => {
    setClusterToDelete(cluster);
    setIsDeleteOpen(true);
  };

  // Submit Delete (DELETE /api/clusters/:id)
  const handleDeleteSubmit = async () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for cluster management.");
      return;
    }
    if (!clusterToDelete?._id && !clusterToDelete?.id) return;
    const id = clusterToDelete._id || clusterToDelete.id!;

    setIsDeleting(true);
    try {
      const res = await clusterService.deleteCluster(id);
      toast.success(
        res?.message ||
          `Cluster '${clusterToDelete.name}' soft deleted successfully.`,
      );
      setIsDeleteOpen(false);
      setClusterToDelete(null);
      await fetchClusters(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to soft delete cluster.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered clusters in-memory for instant search / status match
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      // Zone filter
      if (
        selectedZone !== "all" &&
        c.zone.toLowerCase() !== selectedZone.toLowerCase()
      ) {
        return false;
      }
      // BM assignment filter
      if (bmFilter === "unassigned" && c.assignedBM) {
        return false;
      }
      if (bmFilter === "assigned" && !c.assignedBM) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && c.isActive === false) return false;
      if (statusFilter === "inactive" && c.isActive !== false) return false;

      // Search filter
      const q = debouncedSearch.toLowerCase().trim();
      if (!q) return true;

      const centresNames = Array.isArray(c.centres)
        ? c.centres.map((item) => getCentreName(item).toLowerCase()).join(" ")
        : "";

      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.zone.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.assignedBM?.name && c.assignedBM.name.toLowerCase().includes(q)) ||
        (c.assignedBM?.username &&
          c.assignedBM.username.toLowerCase().includes(q)) ||
        centresNames.includes(q)
      );
    });
  }, [clusters, selectedZone, bmFilter, statusFilter, debouncedSearch]);

  // Table Centres Dropdown Popover
  const TableCentresDropdown: React.FC<{
    centres?: (string | ClusterCentre)[];
    centreCount?: number;
    clusterName: string;
  }> = ({ centres, centreCount, clusterName }) => {
    const arr = Array.isArray(centres) ? centres : [];
    const count = centreCount ?? arr.length;

    if (count === 0 && arr.length === 0) {
      return (
        <span className="text-xs font-medium text-slate-800">
          0 Centres
        </span>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 hover:text-blue-600 cursor-pointer transition-colors"
          >
            <span>{count} Centres</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-64 p-0 shadow-lg border border-slate-200 bg-white rounded-lg z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Centres in {clusterName}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {count}
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {arr.length > 0 ? (
              arr.map((item, idx) => {
                const name = getCentreName(item);
                return (
                  <div
                    key={`centre-${idx}`}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate font-medium">{name}</span>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                {count} centres attached to this cluster
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // CustomTable Columns definition
  const columns = useMemo<ColumnDef<ClusterItem>[]>(
    () => [
      {
        id: "code",
        header: () => <span className="whitespace-nowrap">Code</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <span className="font-mono text-xs font-semibold text-slate-800 tracking-tight">
              {row.code}
            </span>
          ),
        }),
        meta: { flex: 0.6, minWidth: 95, maxWidth: 120, align: "left" },
      },
      {
        id: "cluster",
        header: () => <span className="whitespace-nowrap">Cluster</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <div className="min-w-0 flex-1">
              <p
                className="font-bold text-slate-900 text-sm tracking-tight break-words"
                title={row.name}
              >
                {row.name}
              </p>
            </div>
          ),
        }),
        meta: { flex: 1.3, minWidth: 160, maxWidth: 260, align: "left" },
      },
      {
        id: "description",
        header: () => <span className="whitespace-nowrap">Description</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <div className="min-w-0 flex-1">
              {row.description ? (
                <p
                  className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                  title={row.description}
                >
                  {row.description}
                </p>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  No description
                </span>
              )}
            </div>
          ),
        }),
        meta: { flex: 1.5, minWidth: 180, maxWidth: 320, align: "left" },
      },
      {
        id: "zone",
        header: () => <span className="whitespace-nowrap">Zone</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <span className="text-xs font-medium text-slate-800">
              {row.zone}
            </span>
          ),
        }),
        meta: { flex: 0.8, minWidth: 120, maxWidth: 160, align: "left" },
      },
      {
        id: "centres",
        header: () => <span className="whitespace-nowrap">Centres</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center justify-start w-full">
              <TableCentresDropdown
                centres={row.centres}
                centreCount={row.centreCount}
                clusterName={row.name}
              />
            </div>
          ),
        }),
        meta: { flex: 0.7, minWidth: 95, maxWidth: 130, align: "left" },
      },
      {
        id: "assignedBM",
        header: () => (
          <span className="whitespace-nowrap">Business Manager (BM)</span>
        ),
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <div className="w-full">
              {row.assignedBM ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200">
                    {row.assignedBM.name?.charAt(0) || "B"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-xs truncate max-w-[150px]">
                      {row.assignedBM.name}
                    </p>
                    {row.assignedBM.username && (
                      <Link
                        href={`/dashboard/users?tab=bm&search=${encodeURIComponent(row.assignedBM.username)}`}
                        className="text-[10px] text-slate-400 hover:text-purple-600 font-mono flex items-center gap-0.5 truncate"
                        title="View BM profile"
                      >
                        <span>@{row.assignedBM.username}</span>
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium italic">
                  Unassigned BM
                </span>
              )}
            </div>
          ),
        }),
        meta: { flex: 1.2, minWidth: 160, maxWidth: 220, align: "left" },
        enableSorting: false,
      },
      {
        id: "supervisedAOMs",
        header: () => (
          <span className="whitespace-nowrap">Supervised AOMs</span>
        ),
        accessorFn: (row: ClusterItem) => {
          const count = row.aomCount ?? row.supervisedAOMs?.length ?? 0;
          return {
            type: "custom",
            render: () => (
              <div className="flex items-center justify-start w-full">
                <button
                  type="button"
                  onClick={() => handleOpenAOMModal(row)}
                  className="text-xs font-medium text-slate-800 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  {count} AOMs
                </button>
              </div>
            ),
          };
        },
        meta: { flex: 0.9, minWidth: 145, maxWidth: 180, align: "left" },
      },
      {
        id: "status",
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorFn: (row: ClusterItem) => {
          const isActive = row.isActive !== false;
          return {
            type: "custom",
            render: () => (
              <div className="flex items-center justify-start w-full">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ),
          };
        },
        meta: { flex: 0.6, minWidth: 85, maxWidth: 110, align: "left" },
      },
      {
        id: "actions",
        header: () => <span className="whitespace-nowrap">Actions</span>,
        accessorFn: (row: ClusterItem) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center justify-center gap-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveCluster(row);
                  setIsDetailOpen(true);
                }}
                className="h-8 px-2 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 gap-1 cursor-pointer"
                title="View Cluster Details"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">Details</span>
              </Button>

              {isCentral && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(row)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                    title="Edit Cluster"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDelete(row)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    title="Delete Cluster"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ),
        }),
        meta: {
          minWidth: isCentral ? 140 : 90,
          maxWidth: 180,
          align: "center",
        },
        enableSorting: false,
      },
    ],
    [isCentral],
  );

  if (isBM) {
    return null;
  }

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Filter, Search & Actions Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by cluster name, code, zone, BM, centre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
              Zone:
            </span>
            <Combobox
              items={zoneFilterItems}
              value={selectedZone}
              onValueChange={(val) => setSelectedZone(val || "all")}
              onOpenChange={(isOpen) => {
                if (isOpen) fetchZonesOnDemand();
              }}
              placeholder={isLoadingZones ? "Loading..." : "All Zones"}
              searchPlaceholder="Search zone..."
              emptyMessage={
                isLoadingZones ? "Loading zones..." : "No zones found."
              }
              width="w-[170px]"
              className="h-8 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200"
            />
          </div>

          {/* BM Filter (Merged Segmented Control) */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() =>
                setBmFilter(bmFilter === "assigned" ? "all" : "assigned")
              }
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                bmFilter === "assigned"
                  ? "bg-white text-purple-800 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck
                className={`w-3.5 h-3.5 ${
                  bmFilter === "assigned" ? "text-purple-600" : "text-slate-500"
                }`}
              />
              <span>Assigned BM</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setBmFilter(bmFilter === "unassigned" ? "all" : "unassigned")
              }
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                bmFilter === "unassigned"
                  ? "bg-amber-800 shadow-2xs font-semibold bg-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Filter
                className={`w-3.5 h-3.5 ${
                  bmFilter === "unassigned" ? "text-amber-600" : "text-slate-500"
                }`}
              />
              <span>Unassigned BM</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-white text-slate-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClusters(true)}
            disabled={isRefreshing || isLoading}
            className="h-8 px-2.5 text-slate-600 bg-white hover:bg-slate-50 border-slate-200"
            title="Refresh clusters"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
            />
          </Button>

          <span className="text-xs text-slate-400 font-medium pl-1 hidden sm:inline">
            Showing{" "}
            <strong className="text-slate-700">
              {filteredClusters.length}
            </strong>{" "}
            clusters
          </span>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Action Buttons */}
          {isCentral && (
            <Button
              onClick={() => {
                setCreateForm({
                  name: "",
                  code: "",
                  zone: "",
                  description: "",
                });
                fetchZonesOnDemand();
                setIsCreateOpen(true);
              }}
              className="text-xs font-semibold gap-1.5 h-9 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Cluster</span>
            </Button>
          )}

          {canAccessZone && (
            <Link href="/dashboard/zone">
              <Button
                variant="outline"
                className="text-xs font-semibold gap-1.5 h-9 bg-white"
              >
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                <span>Zone Master</span>
              </Button>
            </Link>
          )}
          <Link href="/dashboard/users?tab=bm">
            <Button
              variant="outline"
              className="text-xs font-semibold gap-1.5 h-9 bg-white"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>BMs</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Cluster Table */}
      <CustomTable
        data={filteredClusters}
        columns={columns}
        isLoading={isLoading}
        showSerialNumber={true}
        maxHeight={"calc(100vh - 240px)"}
        pageSizeArray={[10, 20, 50, "All"]}
        noDataMessage={
          searchQuery ||
          selectedZone !== "all" ||
          bmFilter !== "all" ||
          statusFilter !== "all"
            ? "No clusters match your filters."
            : "No clusters found. Create a cluster to get started."
        }
      />

      {/* Supervised AOMs Modal (GET /api/clusters/:id/aoms) */}
      <Dialog open={isAOMModalOpen} onOpenChange={setIsAOMModalOpen}>
        <DialogContent className="sm:max-w-[580px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-bold text-slate-900">
                Supervised Area Managers (AOMs)
              </DialogTitle>
              {aomClusterInfo && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getZoneBadgeColor(aomClusterInfo.zone)}`}
                >
                  {aomClusterInfo.zone}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Cluster:{" "}
              <strong className="text-slate-800">
                {aomClusterInfo?.cluster}
              </strong>{" "}
              &bull; Total AOMs:{" "}
              <strong className="text-blue-600">
                {aomClusterInfo?.totalAOMs}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            {isLoadingAOMs ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                <span>Loading supervised AOMs...</span>
              </div>
            ) : !aomClusterInfo?.aoms || aomClusterInfo.aoms.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                No AOMs currently assigned to this cluster.
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                {aomClusterInfo.aoms.map((aom, idx) => {
                  const centresInCluster =
                    aom.centresInThisCluster || aom.managedCentres || [];
                  return (
                    <div
                      key={aom.id || aom._id || `aom-${idx}`}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center border border-blue-200">
                            {aom.name?.charAt(0) || "A"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {aom.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              @{aom.username}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/users?tab=aom&search=${encodeURIComponent(aom.username)}`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                        >
                          Profile <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                        {aom.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{aom.email}</span>
                          </div>
                        )}
                        {aom.phone && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{aom.phone}</span>
                          </div>
                        )}
                      </div>

                      {centresInCluster.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Centres Supervised in this Cluster (
                            {centresInCluster.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {centresInCluster.map((cn, cIdx) => (
                              <span
                                key={`c-${cIdx}`}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-700 border border-slate-200"
                              >
                                {cn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsAOMModalOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cluster Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {activeCluster && (
          <DialogContent className="sm:max-w-[540px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
            <DialogHeader className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0F2557] text-white font-mono text-xs font-semibold">
                  {activeCluster.code}
                </span>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {activeCluster.name}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs ${getZoneBadgeColor(activeCluster.zone)}`}
                >
                  {activeCluster.zone}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {activeCluster.description ||
                  "Operational cluster hierarchy and assigned leadership."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              {/* Business Manager Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Supervising Business Manager (BM)
                </p>
                {activeCluster.assignedBM ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {activeCluster.assignedBM.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Username: {activeCluster.assignedBM.username}
                      </p>
                      {activeCluster.assignedBM.email && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Email: {activeCluster.assignedBM.email}
                        </p>
                      )}
                      {activeCluster.assignedBM.phone && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Phone: {activeCluster.assignedBM.phone}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/users?tab=bm&search=${encodeURIComponent(
                        activeCluster.assignedBM.username,
                      )}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                      >
                        BM Profile{" "}
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 italic">
                    No Business Manager is currently assigned to this cluster.
                  </p>
                )}
              </div>

              {/* AOMs and Centres Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <p className="font-semibold text-slate-700 text-xs">
                    Supervised Area Managers
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {activeCluster.aomCount ??
                      activeCluster.supervisedAOMs?.length ??
                      0}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      AOMs
                    </span>
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenAOMModal(activeCluster);
                    }}
                    className="h-auto p-0 text-[11px] text-blue-600 font-semibold cursor-pointer"
                  >
                    View Supervised AOMs &rarr;
                  </Button>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <p className="font-semibold text-slate-700 text-xs">
                    Centres Allocation
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {activeCluster.centreCount ??
                      (Array.isArray(activeCluster.centres)
                        ? activeCluster.centres.length
                        : 0)}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      centres
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Pre-K operational facilities
                  </p>
                </div>
              </div>

              {/* Associated Centres List */}
              {Array.isArray(activeCluster.centres) &&
                activeCluster.centres.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <p className="font-semibold text-slate-700 text-xs">
                      Attached Centres
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {activeCluster.centres.map((item, idx) => (
                        <span
                          key={`c-${idx}`}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                        >
                          {getCentreName(item)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="h-9 text-xs font-semibold"
                >
                  Close
                </Button>
                {isCentral && (
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenEdit(activeCluster);
                    }}
                    className="h-9 text-xs font-semibold bg-[#0F2557] text-white"
                  >
                    Edit Cluster
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Cluster Modal (Central only) */}
      <Dialog open={isCreateOpen && isCentral} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create New Cluster
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Create a cluster linked to a Zone. Centre and BM assignments will
              automatically link to this cluster.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleCreateSubmit}
            className="space-y-4 pt-3 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">
                Cluster Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Mumbai Cluster"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">
                  Cluster Code <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. CL-MUM"
                  value={createForm.code}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">
                  Zone <span className="text-red-500">*</span>
                </label>
                <Combobox
                  items={createZoneItems}
                  value={createForm.zone}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, zone: val || "" })
                  }
                  onOpenChange={(isOpen) => {
                    if (isOpen) fetchZonesOnDemand();
                  }}
                  placeholder={
                    isLoadingZones ? "Loading zones..." : "Select Zone"
                  }
                  searchPlaceholder="Search zone..."
                  emptyMessage={
                    isLoadingZones ? "Loading zones..." : "No zones found."
                  }
                  width="w-full"
                  className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">
                Description
              </label>
              <Textarea
                placeholder="e.g. Mumbai Metropolitan Area Pre-K Cluster"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="h-9 text-xs font-semibold bg-[#0F2557] hover:bg-[#0F2557]/90 text-white"
              >
                {isCreating ? "Creating..." : "Create Cluster"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Cluster Modal (Central only) */}
      <Dialog open={isEditOpen && isCentral} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit Cluster
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Modifying cluster name automatically cascades and updates
              associated Centre and BM records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">
                Cluster Name
              </label>
              <Input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">
                  Cluster Code
                </label>
                <Input
                  type="text"
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Zone</label>
                <Combobox
                  items={editZoneItems}
                  value={editForm.zone}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, zone: val || "" })
                  }
                  onOpenChange={(isOpen) => {
                    if (isOpen) fetchZonesOnDemand();
                  }}
                  placeholder={
                    isLoadingZones ? "Loading zones..." : "Select Zone"
                  }
                  searchPlaceholder="Search zone..."
                  emptyMessage={
                    isLoadingZones ? "Loading zones..." : "No zones found."
                  }
                  width="w-full"
                  className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">
                Description
              </label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm({ ...editForm, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="editIsActive"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cluster is Active and Operational
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isUpdating}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="h-9 text-xs font-semibold bg-[#0F2557] hover:bg-[#0F2557]/90 text-white"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (Central only) */}
      <Dialog open={isDeleteOpen && isCentral} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[440px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Soft Delete Cluster
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete{" "}
              <strong className="text-slate-800">
                {clusterToDelete?.name} ({clusterToDelete?.code})
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <p className="font-semibold">Important Notes:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
              <li>Soft deletes the cluster record.</li>
              <li>
                Frees any currently assigned Business Manager (BM) leadership.
              </li>
            </ul>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={isDeleting}
              className="h-9 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Cluster Modal (PUT /api/clusters/:id/restore) */}
      <Dialog open={isRestoreOpen && isCentral} onOpenChange={setIsRestoreOpen}>
        <DialogContent className="sm:max-w-[460px] p-6 bg-white text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Restore Deleted Cluster?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Cluster already exists in the system but is currently in trash.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0F2557] text-white font-mono font-bold text-xs">
                  {restoreTarget?.code}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {restoreTarget?.name}
                </span>
              </div>
              {restoreTarget?.deletedAt && (
                <p className="text-[11px] text-slate-400">
                  Deleted on:{" "}
                  {new Date(restoreTarget.deletedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRestoreOpen(false);
                setRestoreTarget(null);
              }}
              disabled={isRestoring}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isRestoring}
              onClick={handleRestoreSubmit}
              className="h-9 text-xs bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold flex items-center gap-1.5"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`}
              />
              <span>{isRestoring ? "Restoring..." : "Restore Cluster"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClusterManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">Loading clusters...</div>
      }
    >
      <ClusterPageContent />
    </Suspense>
  );
}
