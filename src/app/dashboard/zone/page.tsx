"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Globe,
  Layers,
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
  MapPin,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  X,
  Shield,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
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
  zoneService,
  ZoneItem,
  CreateZonePayload,
  UpdateZonePayload,
} from "@/services/api/zoneService";
import { LocationSelector } from "@/components/common/LocationSelector";
import { findStateForCity } from "@/services/api/countryStateCityService";

// Preset state suggestions for the Create Zone state tag picker
const PRESET_INDIAN_STATES = [
  "Maharashtra",
  "Goa",
  "Gujarat",
  "Delhi NCR",
  "Punjab",
  "Haryana",
  "Rajasthan",
  "Uttar Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Andhra Pradesh",
  "Kerala",
  "West Bengal",
  "Odisha",
  "Bihar",
  "Madhya Pradesh",
  "Chhattisgarh",
  "Assam",
];

export default function ZoneManagementPage() {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role permissions & access restriction
  const router = useRouter();
  const authUser = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(authUser?.role);
  const isRSO =
    normalizedRole === PREK_ROLES.RSO ||
    authUser?.role === "branchGroup" ||
    authUser?.role === "RSO" ||
    authUser?.role === "rso";
  const isBM =
    normalizedRole === PREK_ROLES.BM ||
    authUser?.role === "branch" ||
    authUser?.role === "BM" ||
    authUser?.role === "bm";
  const isAOM =
    normalizedRole === PREK_ROLES.AOM ||
    authUser?.role === "parent" ||
    authUser?.role === "AOM" ||
    authUser?.role === "aom";

  useEffect(() => {
    if (isRSO || isBM || isAOM) {
      toast.error(
        "Access Denied: You do not have permission to access Zone Master.",
      );
      router.replace("/dashboard/incident");
    }
  }, [isRSO, isBM, isAOM, router]);

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
  const [currentUsername, setCurrentUsername] = useState("");

  // Inspect Modal State (GET /api/zones/:idOrCode)
  const [selectedZone, setSelectedZone] = useState<ZoneItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Create Modal State (POST /api/zones)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    code: string;
    description: string;
    states: string[];
    cities: string[];
  }>({
    name: "",
    code: "",
    description: "",
    states: [],
    cities: [],
  });

  // Edit Modal State (PUT /api/zones/:id)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string>("");
  const [editForm, setEditForm] = useState<{
    name: string;
    code: string;
    description: string;
    states: string[];
    cities: string[];
    isActive: boolean;
  }>({
    name: "",
    code: "",
    description: "",
    states: [],
    cities: [],
    isActive: true,
  });

  // Track parent states for added cities to auto-send when only cities are selected
  const [cityToStateMap, setCityToStateMap] = useState<Record<string, string>>({});
  const [editCityToStateMap, setEditCityToStateMap] = useState<Record<string, string>>({});

  // Delete Modal State (DELETE /api/zones/:id)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<ZoneItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Restore Modal State (when zone already exists in trash)
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

  // Fetch zones from GET /api/zones with optional search and isActive
  const fetchZones = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      setIsRefreshing(true);
      try {
        const params: { search?: string; isActive?: boolean } = {};
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (statusFilter === "active") {
          params.isActive = true;
        } else if (statusFilter === "inactive") {
          params.isActive = false;
        }

        const res = await zoneService.getZones(params);

        if (res?.data && Array.isArray(res.data)) {
          setZones(res.data);
        } else {
          setZones([]);
        }
      } catch (err: any) {
        console.warn("Zone fetch error from /api/zones:", err?.message || err);
        setZones([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Open Details Modal and fetch GET /api/zones/:idOrCode
  const handleOpenDetails = async (zone: ZoneItem) => {
    setSelectedZone(zone);
    setIsDetailOpen(true);
    setIsLoadingDetail(true);

    try {
      const identifier = zone._id || zone.code;
      const res = await zoneService.getZoneByIdOrCode(identifier);
      if (res?.data) {
        setSelectedZone(res.data);
      }
    } catch (err) {
      console.warn("Detail fetch error from /api/zones/:id:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      code: "",
      description: "",
      states: [],
      cities: [],
    });
    setCityToStateMap({});
    setIsCreateOpen(true);
  };

  // Submit Create (POST /api/zones)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for zone management.");
      return;
    }
    if (!createForm.name.trim()) {
      toast.error("Zone name is required.");
      return;
    }
    if (!createForm.code.trim()) {
      toast.error("Zone code (e.g. ZN-WEST, ZN-NNGP) is required.");
      return;
    }

    setIsCreating(true);
    try {
      let finalStates = [...createForm.states];

      // If user only selected cities without selecting any state,
      // automatically send the parent state(s) which the cities belong to
      if (finalStates.length === 0 && createForm.cities.length > 0) {
        const autoStates = new Set<string>();
        for (const city of createForm.cities) {
          const parentState = cityToStateMap[city] || findStateForCity(city);
          if (parentState) {
            autoStates.add(parentState);
          }
        }
        finalStates = Array.from(autoStates);
      }

      const payload: CreateZonePayload = {
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        description: createForm.description?.trim(),
      };

      if (finalStates.length > 0) {
        payload.states = finalStates;
      }
      if (createForm.cities.length > 0) {
        payload.cities = createForm.cities;
      }

      const res = await zoneService.createZone(payload);

      toast.success(res?.message || `Zone '${createForm.name}' created successfully.`);
      setIsCreateOpen(false);
      await fetchZones(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (
        data &&
        (data.canRestore === true ||
          data.conflictType === "ALREADY_EXISTS_DELETED" ||
          (data.existingId && typeof data.message === "string" && data.message.includes("restore")))
      ) {
        const existingId =
          data.existingId || data.deletedZone?.id || data.deletedZone?._id;
        if (existingId) {
          setRestoreTarget({
            id: existingId,
            name: data.deletedZone?.name || createForm.name,
            code: data.deletedZone?.code || createForm.code,
            deletedAt: data.deletedZone?.deletedAt,
            message: data.message,
          });
          setIsCreateOpen(false);
          setIsRestoreOpen(true);
          return;
        }
      }

      const msg = data?.message || err?.message || "Failed to create zone.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Submit Restore (PUT /api/zones/:id/restore)
  const handleRestoreSubmit = async () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for zone management.");
      return;
    }
    if (!restoreTarget?.id) return;

    setIsRestoring(true);
    try {
      const res = await zoneService.restoreZone(restoreTarget.id);
      toast.success(res?.message || `Zone '${restoreTarget.name}' restored successfully from trash.`);
      setIsRestoreOpen(false);
      setRestoreTarget(null);
      await fetchZones(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to restore zone.";
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (zone: ZoneItem) => {
    setEditingZoneId(zone._id);
    const existingStates = zone.states ? [...zone.states] : [];
    const existingCities = zone.cities ? [...zone.cities] : [];
    setEditForm({
      name: zone.name,
      code: zone.code,
      description: zone.description || "",
      states: existingStates,
      cities: existingCities,
      isActive: zone.isActive !== false,
    });
    const initialMap: Record<string, string> = {};
    existingCities.forEach((c) => {
      const found =
        existingStates.length === 1 ? existingStates[0] : findStateForCity(c);
      if (found) initialMap[c] = found;
    });
    setEditCityToStateMap(initialMap);
    setIsEditOpen(true);
  };

  // Submit Edit (PUT /api/zones/:id)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for zone management.");
      return;
    }
    if (!editingZoneId) return;

    setIsUpdating(true);
    try {
      let finalStates = [...editForm.states];

      // If user only selected cities without selecting any state,
      // automatically send the parent state(s) which the cities belong to
      if (finalStates.length === 0 && editForm.cities.length > 0) {
        const autoStates = new Set<string>();
        for (const city of editForm.cities) {
          const parentState = editCityToStateMap[city] || findStateForCity(city);
          if (parentState) {
            autoStates.add(parentState);
          }
        }
        finalStates = Array.from(autoStates);
      }

      const payload: UpdateZonePayload = {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        description: editForm.description.trim(),
        states: finalStates,
        cities: editForm.cities,
        isActive: editForm.isActive,
      };

      const res = await zoneService.updateZone(editingZoneId, payload);
      toast.success(res?.message || `Zone '${editForm.name}' updated successfully.`);
      setIsEditOpen(false);
      await fetchZones(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update zone.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (zone: ZoneItem) => {
    setZoneToDelete(zone);
    setDeleteError(null);
    setIsDeleteOpen(true);
  };

  // Submit Delete (DELETE /api/zones/:id)
  const handleDeleteSubmit = async () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for zone management.");
      return;
    }
    if (!zoneToDelete?._id) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await zoneService.deleteZone(zoneToDelete._id);
      toast.success(res?.message || `Zone '${zoneToDelete.name}' soft deleted successfully.`);
      setIsDeleteOpen(false);
      setZoneToDelete(null);
      await fetchZones(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 400
          ? `Cannot delete zone '${zoneToDelete.name}': Active centres are still attached. Reassign attached centres before deletion.`
          : err?.message || "Failed to soft delete zone.");
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // State & City tag helpers for Create
  const handleAddStateToCreate = (stateName: string) => {
    const trimmed = stateName.trim();
    if (!trimmed) return;
    if (!createForm.states.includes(trimmed)) {
      setCreateForm((prev) => ({ ...prev, states: [...prev.states, trimmed] }));
    }
  };

  const handleRemoveStateFromCreate = (stateName: string) => {
    setCreateForm((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s !== stateName),
    }));
  };

  const handleAddCityToCreate = (cityName: string, stateName?: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;
    if (!createForm.cities.includes(trimmed)) {
      setCreateForm((prev) => ({ ...prev, cities: [...prev.cities, trimmed] }));
    }
    if (stateName && stateName.trim()) {
      setCityToStateMap((prev) => ({ ...prev, [trimmed]: stateName.trim() }));
    }
  };

  const handleRemoveCityFromCreate = (cityName: string) => {
    setCreateForm((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== cityName),
    }));
  };

  // State & City tag helpers for Edit
  const handleAddStateToEdit = (stateName: string) => {
    const trimmed = stateName.trim();
    if (!trimmed) return;
    if (!editForm.states.includes(trimmed)) {
      setEditForm((prev) => ({ ...prev, states: [...prev.states, trimmed] }));
    }
  };

  const handleRemoveStateFromEdit = (stateName: string) => {
    setEditForm((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s !== stateName),
    }));
  };

  const handleAddCityToEdit = (cityName: string, stateName?: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;
    if (!editForm.cities.includes(trimmed)) {
      setEditForm((prev) => ({ ...prev, cities: [...prev.cities, trimmed] }));
    }
    if (stateName && stateName.trim()) {
      setEditCityToStateMap((prev) => ({ ...prev, [trimmed]: stateName.trim() }));
    }
  };

  const handleRemoveCityFromEdit = (cityName: string) => {
    setEditForm((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== cityName),
    }));
  };

  // Jurisdiction Dropdown component for table cell
  const TableJurisdictionDropdown: React.FC<{
    states?: string[];
    cities?: string[];
  }> = ({ states, cities }) => {
    const numStates = states?.length || 0;
    const numCities = cities?.length || 0;
    const total = numStates + numCities;

    if (total === 0) {
      return <span className="text-slate-400 italic text-xs">Custom territory</span>;
    }

    let label = "";
    let isCityOnly = false;
    let isStateOnly = false;

    if (numStates > 0 && numCities === 0) {
      isStateOnly = true;
      label = numStates === 1 ? states![0] : `${numStates} States`;
    } else if (numCities > 0 && numStates === 0) {
      isCityOnly = true;
      label = numCities === 1 ? cities![0] : `${numCities} Cities`;
    } else {
      label = `${numStates} States, ${numCities} Cities`;
    }

    const headerTitle =
      isStateOnly
        ? `States (${numStates})`
        : isCityOnly
          ? `Cities / Metro Regions (${numCities})`
          : `Jurisdiction (${total})`;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-blue-600 transition-colors cursor-pointer max-w-[210px]"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0 shadow-lg border border-slate-200 bg-white rounded-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              {headerTitle}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {numStates > 0 && (
              <div>
                {!isStateOnly && (
                  <div className="px-3 py-1 bg-slate-50/50 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    States ({numStates})
                  </div>
                )}
                {states!.map((st, idx) => (
                  <div
                    key={`st-${idx}`}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate font-medium">{st}</span>
                  </div>
                ))}
              </div>
            )}

            {numCities > 0 && (
              <div>
                {!isCityOnly && (
                  <div className="px-3 py-1 bg-slate-50/50 text-[10px] font-bold text-emerald-600 uppercase tracking-wider border-t border-slate-100">
                    Cities / Regions ({numCities})
                  </div>
                )}
                {cities!.map((ct, idx) => (
                  <div
                    key={`ct-${idx}`}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-medium">{ct}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Define Table Columns for CustomTable
  const columns = useMemo<ColumnDef<ZoneItem>[]>(
    () => [
      {
        id: "code",
        header: () => <span className="whitespace-nowrap">Zone Code</span>,
        accessorFn: (row: ZoneItem) => ({
          type: "custom",
          render: () => (
            <span className="font-mono text-xs font-semibold text-slate-800 tracking-tight">
              {row.code}
            </span>
          ),
        }),
        meta: { flex: 0.7, minWidth: 110, maxWidth: 140, align: "left" },
      },
      {
        id: "name",
        header: () => <span className="whitespace-nowrap">Zone</span>,
        accessorFn: (row: ZoneItem) => ({
          type: "custom",
          render: () => (
            <div className="min-w-0 flex-1">
              <p
                className="font-bold text-slate-900 text-sm tracking-tight truncate"
                title={row.name}
              >
                {row.name}
              </p>
            </div>
          ),
        }),
        meta: { flex: 1.1, minWidth: 150, maxWidth: 220, align: "left" },
      },
      {
        id: "description",
        header: () => <span className="whitespace-nowrap">Description</span>,
        accessorFn: (row: ZoneItem) => ({
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
        meta: { flex: 1.3, minWidth: 160, maxWidth: 280, align: "left" },
      },
      {
        id: "jurisdiction",
        header: () => (
          <span className="whitespace-nowrap">
            Jurisdiction (States / Cities)
          </span>
        ),
        accessorFn: (row: ZoneItem) => ({
          type: "custom",
          render: () => (
            <TableJurisdictionDropdown
              states={row.states}
              cities={row.cities}
            />
          ),
        }),
        meta: { flex: 1.2, minWidth: 180, maxWidth: 260, align: "left" },
        enableSorting: false,
      },
      {
        id: "centreCount",
        header: () => <span className="whitespace-nowrap">Centres</span>,
        accessorFn: (row: ZoneItem) => {
          const count = row.centreCount ?? row.centres?.length ?? 0;
          return {
            type: "custom",
            render: () => (
              <span className="text-xs font-medium text-slate-800">
                {count} Centres
              </span>
            ),
          };
        },
        meta: { flex: 0.7, minWidth: 100, maxWidth: 130, align: "left" },
      },
      {
        id: "status",
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorFn: (row: ZoneItem) => {
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
        meta: { flex: 0.7, minWidth: 100, maxWidth: 140, align: "left" },
      },
      {
        id: "actions",
        header: () => <span className="whitespace-nowrap">Actions</span>,
        accessorFn: (row: ZoneItem) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center justify-center gap-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDetails(row)}
                className="h-8 px-2 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 gap-1 cursor-pointer"
                title="View Zone Details"
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
                    title="Edit Zone"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDelete(row)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ),
        }),
        meta: { minWidth: isCentral ? 140 : 90, maxWidth: 180, align: "center" },
        enableSorting: false,
      },
    ],
    [isCentral]
  );

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Filter, Search & Actions Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by zone (e.g. 'west'), code, state, or RSO..."
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
                  ? "bg-white text-rose-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactive
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchZones()}
            disabled={isRefreshing}
            className="h-9 px-2 text-slate-500 hover:text-slate-900"
            title="Refresh zones"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </Button>

          <span className="text-xs font-medium text-slate-500 hidden md:inline">
            Showing <span className="font-semibold text-slate-800">{zones.length}</span> zones
          </span>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Action Buttons */}
          {isCentral && (
            <Button
              onClick={handleOpenCreate}
              className="text-xs font-semibold gap-1.5 h-9 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Zone</span>
            </Button>
          )}

          <Link href="/dashboard/analytics">
            <Button variant="outline" className="text-xs font-semibold gap-1.5 h-9 bg-white">
              <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Zone Analytics</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Zones Table View */}
      <CustomTable
        data={zones}
        columns={columns}
        isLoading={isLoading}
        showSerialNumber
        maxHeight={"calc(100vh - 240px)"}
        pageSizeArray={[10, 20, 50, "All"]}
        noDataMessage="No zones match your search"
      />

      {/* ─────────────────────────────────────────────────────────────
          1. Zone Details Dialog (GET /api/zones/:idOrCode)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded bg-[#0F2557] text-white font-mono font-bold text-xs">
                {selectedZone?.code}
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedZone?.name} Zone Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Overview of jurisdiction scope, assigned RSO, and attached centres.
            </DialogDescription>
          </DialogHeader>

          {selectedZone && (
            <div className="space-y-4 pt-2 text-xs">
              {isLoadingDetail && (
                <div className="p-2 bg-blue-50 text-blue-700 rounded text-center text-xs">
                  Refreshing live details from server...
                </div>
              )}

              {/* Description */}
              {selectedZone.description && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Description</p>
                  <p className="text-slate-800 text-xs">{selectedZone.description}</p>
                </div>
              )}

              {/* Active RSO Section */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Active Regional Safety Officer (RSO)
                  </p>
                  {selectedZone.activeRSO?.username && (
                    <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                      @{selectedZone.activeRSO.username}
                    </Badge>
                  )}
                </div>

                {selectedZone.activeRSO ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Full Name</span>
                      <span className="font-semibold text-slate-900">
                        {selectedZone.activeRSO.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Email Address</span>
                      {selectedZone.activeRSO.email ? (
                        <a
                          href={`mailto:${selectedZone.activeRSO.email}`}
                          className="text-blue-600 hover:underline font-mono"
                        >
                          {selectedZone.activeRSO.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </div>
                    {selectedZone.activeRSO.phone && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                        <a
                          href={`tel:${selectedZone.activeRSO.phone}`}
                          className="text-slate-800 font-mono"
                        >
                          {selectedZone.activeRSO.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">No active RSO assigned.</p>
                )}
              </div>

              {/* Covered States */}
              {selectedZone.states && selectedZone.states.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Covered States / Territories ({selectedZone.states.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedZone.states.map((st) => (
                      <Badge
                        key={st}
                        variant="secondary"
                        className="bg-blue-50 text-blue-850 border-blue-200 text-xs font-medium"
                      >
                        <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                        {st}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Covered Cities */}
              {selectedZone.cities && selectedZone.cities.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Covered Cities / Metro Regions ({selectedZone.cities.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedZone.cities.map((ct) => (
                      <Badge
                        key={ct}
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-850 border-emerald-200 text-xs font-medium"
                      >
                        <Building2 className="w-3 h-3 mr-1 text-emerald-500" />
                        {ct}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Centres */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-xs">
                    Attached Centres ({selectedZone.centres?.length ?? selectedZone.centreCount ?? 0})
                  </p>
                </div>

                {selectedZone.centres && selectedZone.centres.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                    {selectedZone.centres.map((c, idx) => (
                      <div
                        key={c.code || idx}
                        className="p-2 flex items-center justify-between hover:bg-slate-50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {c.city ? `${c.city}, ` : ""}
                            {c.state || selectedZone.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.code && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {c.code}
                            </span>
                          )}
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            {c.status || "Active"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs p-3 bg-slate-50 rounded border border-slate-100 text-center">
                    {selectedZone.centreCount || 0} centres associated with this zone.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            {isCentral && selectedZone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedZone);
                }}
                className="text-xs gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Zone</span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
              className="text-xs bg-[#0F2557] hover:bg-[#0F2557]/90 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          2. Create Zone Dialog (POST /api/zones)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen && isCentral} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Create New Zone
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a new operational administrative zone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              {/* Zone Name */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. West, North, Central"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Zone Code */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Zone Code <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. ZN-WEST, ZN-NORTH"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <Textarea
                  placeholder="e.g. Western Administrative Zone"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="text-xs min-h-[60px]"
                />
              </div>

              {/* Jurisdiction Scope (States & Cities) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 block text-xs">
                    Jurisdiction Scope (States & Cities)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  A zone can cover whole states (e.g. West: Maharashtra, Goa, Gujarat), specific cities / metro regions (e.g. North-Nagpur: Nagpur, Kamptee), or a custom territory.
                </p>

                {/* Covered States Chips */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>States ({createForm.states.length})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[38px]">
                    {createForm.states.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px] self-center">
                        No states added yet
                      </span>
                    ) : (
                      createForm.states.map((st) => (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {st}
                          <button
                            type="button"
                            onClick={() => handleRemoveStateFromCreate(st)}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Covered Cities Chips */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span>Cities / Metro Regions ({createForm.cities.length})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[38px]">
                    {createForm.cities.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px] self-center">
                        No cities added yet (e.g. for city/regional zone)
                      </span>
                    ) : (
                      createForm.cities.map((ct) => (
                        <span
                          key={ct}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"
                        >
                          {ct}
                          <button
                            type="button"
                            onClick={() => handleRemoveCityFromCreate(ct)}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Dynamic Country, State, City Selector */}
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Search & Select Country, State & City
                    </span>
                  </div>
                  <LocationSelector
                    initialCountry="IN"
                    showAddButton={true}
                    onAddState={(stateName) => handleAddStateToCreate(stateName)}
                    onAddCity={(cityName, stateName) => handleAddCityToCreate(cityName, stateName)}
                  />
                  <p className="text-[10px] text-slate-400">
                    Select a state or city above, then click <strong className="text-slate-600">+ Add State</strong> or <strong className="text-slate-600">+ Add City</strong>. You can select any state and any city independently.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="text-xs bg-[#0F2557] hover:bg-[#0F2557]/90 text-white"
              >
                {isCreating ? "Creating Zone..." : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          3. Edit Zone Dialog (PUT /api/zones/:id)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen && isCentral} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Edit Zone: {editForm.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update zone configuration, assigned territory, or status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zone Name</label>
                  <Input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zone Code</label>
                  <Input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-xs min-h-[60px]"
                />
              </div>

              {/* Jurisdiction Scope (States & Cities) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 block text-xs">
                    Jurisdiction Scope (States & Cities)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  A zone can cover whole states (e.g. West: Maharashtra, Goa, Gujarat), specific cities / metro regions (e.g. North-Nagpur: Nagpur, Kamptee), or a custom territory.
                </p>

                {/* Covered States Chips */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>States ({editForm.states.length})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[38px]">
                    {editForm.states.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px] self-center">
                        No states attached
                      </span>
                    ) : (
                      editForm.states.map((st) => (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {st}
                          <button
                            type="button"
                            onClick={() => handleRemoveStateFromEdit(st)}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Covered Cities Chips */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span>Cities / Metro Regions ({editForm.cities.length})</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[38px]">
                    {editForm.cities.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px] self-center">
                        No cities attached (optional)
                      </span>
                    ) : (
                      editForm.cities.map((ct) => (
                        <span
                          key={ct}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"
                        >
                          {ct}
                          <button
                            type="button"
                            onClick={() => handleRemoveCityFromEdit(ct)}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Dynamic Country, State, City Selector */}
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Search & Select Country, State & City
                    </span>
                  </div>
                  <LocationSelector
                    initialCountry="IN"
                    showAddButton={true}
                    onAddState={(stateName) => handleAddStateToEdit(stateName)}
                    onAddCity={(cityName, stateName) => handleAddCityToEdit(cityName, stateName)}
                  />
                  <p className="text-[10px] text-slate-400">
                    Select a state or city above, then click <strong className="text-slate-600">+ Add State</strong> or <strong className="text-slate-600">+ Add City</strong>. You can select any state and any city independently.
                  </p>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div>
                  <label className="font-semibold text-slate-800 block text-xs">Operational Status</label>
                  <p className="text-[11px] text-slate-400">Controls active operational visibility of this zone</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {editForm.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="text-xs bg-[#0F2557] hover:bg-[#0F2557]/90 text-white"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          4. Delete Zone Dialog (DELETE /api/zones/:id)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isDeleteOpen && isCentral} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Soft Delete Zone '{zoneToDelete?.name}'?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This action will soft delete the zone record from the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <p>
              Are you sure you want to soft delete zone <strong className="text-slate-900">{zoneToDelete?.name}</strong> ({zoneToDelete?.code})?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                Attached Centres Protection Policy:
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Deletion is blocked with <strong>HTTP 400</strong> by the API if active centres are still attached to this zone.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
                <p className="font-bold mb-0.5">Operation Blocked:</p>
                <p className="text-[11px] leading-relaxed">{deleteError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteSubmit}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Confirm Soft Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          5. Restore Zone Dialog (PUT /api/zones/:id/restore)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isRestoreOpen && isCentral} onOpenChange={setIsRestoreOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-xl shadow-xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <RotateCcw className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Restore Deleted Zone?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Zone already exists in the system but is currently deleted (in trash).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1.5">
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
                  Deleted on: {new Date(restoreTarget.deletedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRestoreOpen(false);
                setRestoreTarget(null);
              }}
              disabled={isRestoring}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isRestoring}
              onClick={handleRestoreSubmit}
              className="text-xs bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`} />
              <span>{isRestoring ? "Restoring..." : "Restore Zone"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
