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
import { useSearchParams } from "next/navigation";
import {
  School,
  Globe,
  Layers,
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
  RotateCcw,
  Loader2,
  MapPin,
  Building,
  Archive,
  ShieldAlert,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { CustomTable } from "@/components/ui/CustomTable";
import type { ColumnDef } from "@/components/ui/customTable(serverSidePagination)";
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
import { normalizePrekRole, PREK_ROLES } from "@/constants/roles";
import { useAuthStore } from "@/store/authStore";
import Cookies from "js-cookie";
import { useDebounce } from "@/hooks/useDebounce";
import {
  centreService,
  CentreItem,
  CreateCentrePayload,
  UpdateCentrePayload,
} from "@/services/api/centreService";
import { zoneService, ZoneItem } from "@/services/api/zoneService";
import { clusterService, ClusterItem } from "@/services/api/clusterService";
import { getCitiesForState } from "@/services/api/countryStateCityService";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function SchoolMasterPageContent() {
  const searchParams = useSearchParams();
  const initialZone = searchParams.get("zone") || "all";
  const initialCluster = searchParams.get("cluster") || "all";

  // Data states
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [availableClusters, setAvailableClusters] = useState<ClusterItem[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const zonesLoadedRef = useRef(false);
  const clustersLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedZone, setSelectedZone] = useState<string>(initialZone);
  const [selectedCluster, setSelectedCluster] = useState<string>(initialCluster);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [aomFilter, setAomFilter] = useState<"all" | "assigned" | "unassigned">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Role permissions
  const authUser = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(authUser?.role);
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
      isCentral ||
      normalizedRole === PREK_ROLES.NATIONAL_HEAD ||
      authUser?.role === "school"
    );
  }, [isCentral, normalizedRole, authUser]);
  const [currentUsername, setCurrentUsername] = useState("");

  // Inspect / Details Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<CentreItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Create Modal State (POST /api/centres)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCentrePayload>({
    name: "",
    code: "",
    zone: "",
    cluster: "",
    state: "",
    city: "",
    address: "",
    pincode: "",
    contactPhone: "",
    contactEmail: "",
  });

  // Edit Modal State (PUT /api/centres/:id)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingCentreId, setEditingCentreId] = useState<string>("");
  const [editForm, setEditForm] = useState<UpdateCentrePayload>({
    name: "",
    code: "",
    zone: "",
    cluster: "",
    state: "",
    city: "",
    address: "",
    pincode: "",
    contactPhone: "",
    contactEmail: "",
    isActive: true,
  });

  // Delete Modal State (DELETE /api/centres/:id)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [centreToDelete, setCentreToDelete] = useState<CentreItem | null>(null);

  // Trash / Deleted Centres Modal State (GET /api/centres/deleted)
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [deletedCentres, setDeletedCentres] = useState<CentreItem[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

  // Lazy-load zones
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
      console.warn("Could not load zones:", err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [isLoadingZones]);

  // Lazy-load clusters
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
      console.warn("Could not load clusters:", err);
    } finally {
      setIsLoadingClusters(false);
    }
  }, [isLoadingClusters]);

  // Memoized Zone dropdown items
  const zoneFilterItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    return [{ value: "all", label: "All Zones" }, ...list];
  }, [availableZones]);

  // Memoized Cluster dropdown items for filter
  const clusterFilterItems = useMemo(() => {
    let list = availableClusters;
    if (selectedZone && selectedZone !== "all") {
      list = list.filter(
        (c) => c.zone.toLowerCase() === selectedZone.toLowerCase()
      );
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    return [{ value: "all", label: "All Clusters" }, ...mapped];
  }, [availableClusters, selectedZone]);

  // Memoized State dropdown items for filter
  const stateFilterItems = useMemo(() => {
    const fromCentres = Array.from(
      new Set(centres.map((c) => c.state).filter(Boolean))
    );
    const combined = Array.from(new Set([...fromCentres, ...INDIAN_STATES])).sort();
    return [
      { value: "all", label: "All States" },
      ...combined.map((s) => ({ value: s, label: s })),
    ];
  }, [centres]);

  // Dropdown items for Create Modal
  const createZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      createForm.zone &&
      !list.some((i) => i.value.toLowerCase() === createForm.zone.toLowerCase())
    ) {
      list.unshift({ value: createForm.zone, label: createForm.zone });
    }
    return list;
  }, [availableZones, createForm.zone]);

  const createClusterItems = useMemo(() => {
    let list = availableClusters;
    if (createForm.zone) {
      list = list.filter(
        (c) => c.zone.toLowerCase() === createForm.zone.toLowerCase()
      );
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      createForm.cluster &&
      !mapped.some(
        (i) => i.value.toLowerCase() === createForm.cluster.toLowerCase()
      )
    ) {
      mapped.unshift({ value: createForm.cluster, label: createForm.cluster });
    }
    return mapped;
  }, [availableClusters, createForm.zone, createForm.cluster]);

  // Dropdown items for Edit Modal
  const editZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    const currentZone = editForm.zone;
    if (
      currentZone &&
      !list.some((i) => i.value.toLowerCase() === currentZone.toLowerCase())
    ) {
      list.unshift({ value: currentZone, label: currentZone });
    }
    return list;
  }, [availableZones, editForm.zone]);

  const editClusterItems = useMemo(() => {
    let list = availableClusters;
    const currentZone = editForm.zone;
    if (currentZone) {
      list = list.filter(
        (c) => c.zone.toLowerCase() === currentZone.toLowerCase()
      );
    }
    const mapped = list.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    const currentCluster = editForm.cluster;
    if (
      currentCluster &&
      !mapped.some(
        (i) => i.value.toLowerCase() === currentCluster.toLowerCase()
      )
    ) {
      mapped.unshift({ value: currentCluster, label: currentCluster });
    }
    return mapped;
  }, [availableClusters, editForm.zone, editForm.cluster]);

  // Selected zone objects for Create & Edit modals
  const createSelectedZoneObj = useMemo(() => {
    if (!createForm.zone) return null;
    return (
      availableZones.find(
        (z) =>
          z.name.toLowerCase() === createForm.zone.toLowerCase() ||
          (z.code && z.code.toLowerCase() === createForm.zone.toLowerCase())
      ) || null
    );
  }, [availableZones, createForm.zone]);

  const editSelectedZoneObj = useMemo(() => {
    const currentZone = editForm.zone;
    if (!currentZone) return null;
    return (
      availableZones.find(
        (z) =>
          z.name.toLowerCase() === currentZone.toLowerCase() ||
          (z.code && z.code.toLowerCase() === currentZone.toLowerCase())
      ) || null
    );
  }, [availableZones, editForm.zone]);

  // State dropdown items: If zone has states, show only those; otherwise fallback to all Indian states
  const createStateItems = useMemo(() => {
    const zoneStates = createSelectedZoneObj?.states || [];
    if (zoneStates.length > 0) {
      return zoneStates.map((s) => ({ value: s, label: s }));
    }
    return INDIAN_STATES.map((s) => ({ value: s, label: s }));
  }, [createSelectedZoneObj]);

  const editStateItems = useMemo(() => {
    const zoneStates = editSelectedZoneObj?.states || [];
    if (zoneStates.length > 0) {
      const items = zoneStates.map((s) => ({ value: s, label: s }));
      if (
        editForm.state &&
        !items.some(
          (i) => i.value.toLowerCase() === editForm.state?.toLowerCase()
        )
      ) {
        items.unshift({ value: editForm.state, label: editForm.state });
      }
      return items;
    }
    return INDIAN_STATES.map((s) => ({ value: s, label: s }));
  }, [editSelectedZoneObj, editForm.state]);

  // Third-party API cities when zone has no cities
  const [createApiCities, setCreateApiCities] = useState<string[]>([]);
  const [isLoadingCreateCities, setIsLoadingCreateCities] = useState(false);

  const [editApiCities, setEditApiCities] = useState<string[]>([]);
  const [isLoadingEditCities, setIsLoadingEditCities] = useState(false);

  // Fetch third-party cities for Create modal when zone has no cities and state is selected
  useEffect(() => {
    const zoneCities = createSelectedZoneObj?.cities || [];
    if (zoneCities.length > 0) {
      setCreateApiCities([]);
      return;
    }

    if (!createForm.state) {
      setCreateApiCities([]);
      return;
    }

    let isMounted = true;
    setIsLoadingCreateCities(true);
    getCitiesForState(createForm.state)
      .then((cities) => {
        if (isMounted) setCreateApiCities(cities);
      })
      .catch((err) => {
        console.warn("Failed to load cities for create:", err);
        if (isMounted) setCreateApiCities([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCreateCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [createSelectedZoneObj, createForm.state]);

  // Fetch third-party cities for Edit modal when zone has no cities and state is selected
  useEffect(() => {
    const zoneCities = editSelectedZoneObj?.cities || [];
    if (zoneCities.length > 0) {
      setEditApiCities([]);
      return;
    }

    if (!editForm.state) {
      setEditApiCities([]);
      return;
    }

    let isMounted = true;
    setIsLoadingEditCities(true);
    getCitiesForState(editForm.state)
      .then((cities) => {
        if (isMounted) setEditApiCities(cities);
      })
      .catch((err) => {
        console.warn("Failed to load cities for edit:", err);
        if (isMounted) setEditApiCities([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingEditCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editSelectedZoneObj, editForm.state]);

  // City dropdown items for Create modal
  const createCityItems = useMemo(() => {
    const zoneCities = createSelectedZoneObj?.cities || [];
    if (zoneCities.length > 0) {
      const items = zoneCities.map((c) => ({ value: c, label: c }));
      if (
        createForm.city &&
        !items.some(
          (i) => i.value.toLowerCase() === createForm.city.toLowerCase()
        )
      ) {
        items.unshift({ value: createForm.city, label: createForm.city });
      }
      return items;
    }

    const items = createApiCities.map((c) => ({ value: c, label: c }));
    if (
      createForm.city &&
      !items.some(
        (i) => i.value.toLowerCase() === createForm.city.toLowerCase()
      )
    ) {
      items.unshift({ value: createForm.city, label: createForm.city });
    }
    return items;
  }, [createSelectedZoneObj, createApiCities, createForm.city]);

  // City dropdown items for Edit modal
  const editCityItems = useMemo(() => {
    const zoneCities = editSelectedZoneObj?.cities || [];
    if (zoneCities.length > 0) {
      const items = zoneCities.map((c) => ({ value: c, label: c }));
      if (
        editForm.city &&
        !items.some(
          (i) => i.value.toLowerCase() === editForm.city?.toLowerCase()
        )
      ) {
        items.unshift({ value: editForm.city, label: editForm.city });
      }
      return items;
    }

    const items = editApiCities.map((c) => ({ value: c, label: c }));
    if (
      editForm.city &&
      !items.some(
        (i) => i.value.toLowerCase() === editForm.city?.toLowerCase()
      )
    ) {
      items.unshift({ value: editForm.city, label: editForm.city });
    }
    return items;
  }, [editSelectedZoneObj, editApiCities, editForm.city]);

  // Handlers for Zone & State changes with auto-prefill logic
  const handleCreateZoneChange = (zoneName?: string) => {
    const zName = zoneName || "";
    const selectedZoneObj = availableZones.find(
      (z) =>
        z.name.toLowerCase() === zName.toLowerCase() ||
        (z.code && z.code.toLowerCase() === zName.toLowerCase())
    );

    const zoneStates = selectedZoneObj?.states || [];
    const zoneCities = selectedZoneObj?.cities || [];

    let nextState = "";
    if (zoneStates.length === 1) {
      nextState = zoneStates[0];
    } else if (zoneStates.length > 1) {
      nextState = zoneStates.includes(createForm.state) ? createForm.state : "";
    }

    let nextCity = "";
    if (zoneCities.length === 1) {
      nextCity = zoneCities[0];
    } else if (zoneCities.length > 1) {
      nextCity = zoneCities.includes(createForm.city) ? createForm.city : "";
    }

    setCreateForm((prev) => ({
      ...prev,
      zone: zName,
      cluster: "",
      state: nextState,
      city: nextCity,
    }));
  };

  const handleCreateStateChange = (stateName?: string) => {
    const sName = stateName || "";
    const zoneCities = createSelectedZoneObj?.cities || [];
    let nextCity = createForm.city;
    if (zoneCities.length === 0) {
      nextCity = "";
    }
    setCreateForm((prev) => ({
      ...prev,
      state: sName,
      city: nextCity,
    }));
  };

  const handleEditZoneChange = (zoneName?: string) => {
    const zName = zoneName || "";
    const selectedZoneObj = availableZones.find(
      (z) =>
        z.name.toLowerCase() === zName.toLowerCase() ||
        (z.code && z.code.toLowerCase() === zName.toLowerCase())
    );

    const zoneStates = selectedZoneObj?.states || [];
    const zoneCities = selectedZoneObj?.cities || [];

    let nextState = editForm.state || "";
    if (zoneStates.length === 1) {
      nextState = zoneStates[0];
    } else if (zoneStates.length > 1) {
      nextState = zoneStates.includes(editForm.state || "")
        ? editForm.state || ""
        : "";
    }

    let nextCity = editForm.city || "";
    if (zoneCities.length === 1) {
      nextCity = zoneCities[0];
    } else if (zoneCities.length > 1) {
      nextCity = zoneCities.includes(editForm.city || "")
        ? editForm.city || ""
        : "";
    }

    setEditForm((prev) => ({
      ...prev,
      zone: zName,
      cluster: "",
      state: nextState,
      city: nextCity,
    }));
  };

  const handleEditStateChange = (stateName?: string) => {
    const sName = stateName || "";
    const zoneCities = editSelectedZoneObj?.cities || [];
    let nextCity = editForm.city || "";
    if (zoneCities.length === 0) {
      nextCity = "";
    }
    setEditForm((prev) => ({
      ...prev,
      state: sName,
      city: nextCity,
    }));
  };

  // Fetch centres from GET /api/centres
  const fetchCentres = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params: {
          zone?: string;
          state?: string;
          cluster?: string;
          search?: string;
          unassigned?: boolean;
          isActive?: boolean;
        } = {};

        if (selectedZone && selectedZone !== "all") {
          params.zone = selectedZone;
        }
        if (selectedCluster && selectedCluster !== "all") {
          params.cluster = selectedCluster;
        }
        if (selectedState && selectedState !== "all") {
          params.state = selectedState;
        }
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (aomFilter === "unassigned") {
          params.unassigned = true;
        }
        if (statusFilter === "active") params.isActive = true;
        if (statusFilter === "inactive") params.isActive = false;

        const res = await centreService.getCentres(params);
        if (res?.data && Array.isArray(res.data)) {
          setCentres(res.data);
        } else {
          setCentres([]);
        }
      } catch (err: any) {
        console.error("Error loading centres:", err);
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch schools/centres."
        );
        setCentres([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      selectedZone,
      selectedCluster,
      selectedState,
      debouncedSearch,
      aomFilter,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  // Open Details Modal and fetch GET /api/centres/:id
  const handleOpenDetails = async (centre: CentreItem) => {
    setSelectedCentre(centre);
    setIsDetailOpen(true);
    setIsLoadingDetail(true);

    try {
      const res = await centreService.getCentreByIdOrCode(
        centre._id || centre.id || centre.code
      );
      if (res?.data) {
        setSelectedCentre(res.data);
      }
    } catch (err: any) {
      console.warn("Could not fetch detailed centre view:", err?.message || err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (centre: CentreItem) => {
    setEditingCentreId(centre._id || centre.id || "");
    setEditForm({
      name: centre.name || "",
      code: centre.code || "",
      zone: centre.zone || "",
      cluster: centre.cluster || "",
      state: centre.state || "",
      city: centre.city || "",
      address: centre.address || "",
      pincode: centre.pincode || "",
      contactPhone: centre.contactPhone || "",
      contactEmail: centre.contactEmail || "",
      isActive: centre.isActive ?? true,
    });
    fetchZonesOnDemand();
    fetchClustersOnDemand();
    setIsEditOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (centre: CentreItem) => {
    setCentreToDelete(centre);
    setIsDeleteOpen(true);
  };

  // Open Trash / Deleted Modal
  const handleOpenTrash = async () => {
    setIsTrashOpen(true);
    setIsLoadingDeleted(true);
    try {
      const res = await centreService.getDeletedCentres();
      if (res?.data && Array.isArray(res.data)) {
        setDeletedCentres(res.data);
      } else {
        setDeletedCentres([]);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load deleted centres."
      );
      setDeletedCentres([]);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  // Submit Create (POST /api/centres)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for school / centre management.");
      return;
    }
    if (!createForm.name.trim()) {
      toast.error("Please provide a School / Centre Name.");
      return;
    }
    if (!createForm.code.trim()) {
      toast.error("Please provide a Centre Code (e.g. C-BND-01).");
      return;
    }
    if (!createForm.zone.trim()) {
      toast.error("Please select a Zone.");
      return;
    }
    if (!createForm.cluster.trim()) {
      toast.error("Please select a Cluster.");
      return;
    }
    if (!createForm.state.trim()) {
      toast.error("Please select a State.");
      return;
    }
    if (!createForm.city.trim()) {
      toast.error("Please provide a City.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await centreService.createCentre({
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        zone: createForm.zone.trim(),
        cluster: createForm.cluster.trim(),
        state: createForm.state.trim(),
        city: createForm.city.trim(),
        address: createForm.address?.trim() || undefined,
        pincode: createForm.pincode?.trim() || undefined,
        contactPhone: createForm.contactPhone?.trim() || undefined,
        contactEmail: createForm.contactEmail?.trim() || undefined,
      });

      toast.success(
        res?.message || `Centre '${createForm.name}' created successfully.`
      );
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        code: "",
        zone: "",
        cluster: "",
        state: "",
        city: "",
        address: "",
        pincode: "",
        contactPhone: "",
        contactEmail: "",
      });
      await fetchCentres(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create School / Centre.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Submit Edit (PUT /api/centres/:id)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for school / centre management.");
      return;
    }
    if (!editingCentreId) return;

    if (!editForm.name?.trim()) {
      toast.error("Please provide a School / Centre Name.");
      return;
    }
    if (!editForm.zone?.trim()) {
      toast.error("Please select a Zone.");
      return;
    }
    if (!editForm.cluster?.trim()) {
      toast.error("Please select a Cluster.");
      return;
    }
    if (!editForm.state?.trim()) {
      toast.error("Please select a State.");
      return;
    }
    if (!editForm.city?.trim()) {
      toast.error("Please provide a City.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await centreService.updateCentre(editingCentreId, {
        name: editForm.name.trim(),
        code: editForm.code?.trim().toUpperCase(),
        zone: editForm.zone.trim(),
        cluster: editForm.cluster.trim(),
        state: editForm.state.trim(),
        city: editForm.city.trim(),
        address: editForm.address?.trim() || "",
        pincode: editForm.pincode?.trim() || "",
        contactPhone: editForm.contactPhone?.trim() || "",
        contactEmail: editForm.contactEmail?.trim() || "",
        isActive: editForm.isActive,
      });

      toast.success(
        res?.message || `Centre '${editForm.name}' updated successfully.`
      );
      setIsEditOpen(false);
      setEditingCentreId("");
      await fetchCentres(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update School / Centre.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Delete (DELETE /api/centres/:id)
  const handleDeleteSubmit = async () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for school / centre management.");
      return;
    }
    if (!centreToDelete) return;
    const targetId = centreToDelete._id || centreToDelete.id;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      const res = await centreService.deleteCentre(targetId);
      toast.success(
        res?.message ||
          `Centre '${centreToDelete.name}' has been soft deleted and removed from AOM allocation.`
      );
      setIsDeleteOpen(false);
      setCentreToDelete(null);
      await fetchCentres(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to soft delete centre.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Restore from Trash (PUT /api/centres/:id/restore)
  const handleRestore = async (id: string, name: string) => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for school / centre management.");
      return;
    }
    setRestoringId(id);
    try {
      const res = await centreService.restoreCentre(id);
      toast.success(
        res?.message || `Centre '${name}' has been restored successfully.`
      );
      setDeletedCentres((prev) =>
        prev.filter((c) => (c._id || c.id) !== id)
      );
      await fetchCentres(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to restore centre."
      );
    } finally {
      setRestoringId(null);
    }
  };

  // Filtered centres in-memory for instant responsive match
  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      // Zone filter
      if (
        selectedZone !== "all" &&
        c.zone?.toLowerCase() !== selectedZone.toLowerCase()
      ) {
        return false;
      }
      // Cluster filter
      if (
        selectedCluster !== "all" &&
        c.cluster?.toLowerCase() !== selectedCluster.toLowerCase()
      ) {
        return false;
      }
      // State filter
      if (
        selectedState !== "all" &&
        c.state?.toLowerCase() !== selectedState.toLowerCase()
      ) {
        return false;
      }
      // AOM filter
      if (aomFilter === "unassigned" && (c.assignedAOM || c.isAssigned)) {
        return false;
      }
      if (aomFilter === "assigned" && !c.assignedAOM && !c.isAssigned) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && c.isActive === false) return false;
      if (statusFilter === "inactive" && c.isActive !== false) return false;

      // Search filter
      const q = debouncedSearch.toLowerCase().trim();
      if (!q) return true;

      return (
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.zone?.toLowerCase().includes(q) ||
        c.cluster?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.contactPhone?.toLowerCase().includes(q) ||
        c.contactEmail?.toLowerCase().includes(q) ||
        (c.assignedAOM?.name && c.assignedAOM.name.toLowerCase().includes(q)) ||
        (c.assignedAOM?.username &&
          c.assignedAOM.username.toLowerCase().includes(q))
      );
    });
  }, [
    centres,
    selectedZone,
    selectedCluster,
    selectedState,
    aomFilter,
    statusFilter,
    debouncedSearch,
  ]);

  // Main columns definition
  const columns = useMemo<ColumnDef<CentreItem>[]>(
    () => [
      {
        id: "code",
        header: () => <span className="whitespace-nowrap">Code</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <span className="font-mono text-xs font-semibold text-slate-800 tracking-tight">
              {row.code}
            </span>
          ),
        }),
        meta: { flex: 0.6, minWidth: 95, maxWidth: 120, align: "left", headerAlign: "center" },
      },
      {
        id: "name",
        header: () => <span className="whitespace-nowrap">School / Centre</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleOpenDetails(row)}
                className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors text-left cursor-pointer break-words whitespace-normal leading-relaxed block"
                title={row.name}
              >
                {row.name}
              </button>
            </div>
          ),
        }),
        meta: { flex: 1.2, minWidth: 160, maxWidth: 260, align: "left", headerAlign: "center" },
      },
      {
        id: "address",
        header: () => <span className="whitespace-nowrap">Address</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => {
            const hasAddress = Boolean(row.address?.trim());
            const hasPincode = Boolean(row.pincode?.trim());

            if (!hasAddress && !hasPincode) {
              return <span className="text-slate-400 text-xs italic">No address</span>;
            }

            const fullAddr = [row.address, row.pincode ? `PIN: ${row.pincode}` : ""]
              .filter(Boolean)
              .join(" • ");

            return (
              <div className="min-w-0 flex-1 space-y-0.5">
                {hasAddress && (
                  <p
                    className="text-xs text-slate-700 line-clamp-2 leading-relaxed"
                    title={fullAddr}
                  >
                    {row.address}
                  </p>
                )}
                {hasPincode && (
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    PIN: {row.pincode}
                  </p>
                )}
              </div>
            );
          },
        }),
        meta: { flex: 1.3, minWidth: 150, maxWidth: 260, align: "left", headerAlign: "center" },
      },
      {
        id: "zone",
        header: () => <span className="whitespace-nowrap">Zone</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <span className="text-xs font-medium text-slate-800">
              {row.zone || "—"}
            </span>
          ),
        }),
        meta: { flex: 0.8, minWidth: 100, maxWidth: 140, align: "left", headerAlign: "center" },
      },
      {
        id: "cluster",
        header: () => <span className="whitespace-nowrap">Cluster</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <span className="text-xs font-medium text-slate-800">
              {row.cluster || "—"}
            </span>
          ),
        }),
        meta: { flex: 0.9, minWidth: 110, maxWidth: 160, align: "left", headerAlign: "center" },
      },
      {
        id: "location",
        header: () => <span className="whitespace-nowrap">State & City</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <div className="text-xs text-slate-700 flex flex-col min-w-0">
              <span className="font-semibold text-slate-800 truncate">
                {row.city || "—"}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {row.state || "—"}
              </span>
            </div>
          ),
        }),
        meta: { flex: 0.9, minWidth: 110, maxWidth: 160, align: "left", headerAlign: "center" },
      },
      {
        id: "assignedAOM",
        header: () => (
          <span className="whitespace-nowrap">Assigned AOM</span>
        ),
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => {
            const aom = row.assignedAOM;
            if (aom && aom.name) {
              return (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-purple-200">
                    {aom.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-slate-800 truncate">
                      {aom.name}
                    </p>
                    {aom.username && (
                      <Link
                        href={`/dashboard/users?tab=aom&search=${encodeURIComponent(
                          aom.username
                        )}`}
                        className="text-[10px] text-slate-400 hover:text-purple-600 font-mono flex items-center gap-0.5 truncate"
                        title="View AOM profile"
                      >
                        <span>@{aom.username}</span>
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                Unassigned AOM
              </span>
            );
          },
        }),
        meta: { flex: 1.1, minWidth: 140, maxWidth: 200, align: "left", headerAlign: "center" },
      },
      {
        id: "contact",
        header: () => <span className="whitespace-nowrap">Contact</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => {
            const hasPhone = Boolean(row.contactPhone?.trim());
            const hasEmail = Boolean(row.contactEmail?.trim());

            if (!hasPhone && !hasEmail) {
              return <span className="text-slate-400 text-xs">—</span>;
            }

            return (
              <div className="space-y-0.5 text-[11px] text-slate-600 min-w-0">
                {hasPhone && (
                  <div
                    className="flex items-center gap-1 truncate"
                    title={row.contactPhone}
                  >
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{row.contactPhone}</span>
                  </div>
                )}
                {hasEmail && (
                  <div
                    className="flex items-center gap-1 truncate text-slate-500"
                    title={row.contactEmail}
                  >
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{row.contactEmail}</span>
                  </div>
                )}
              </div>
            );
          },
        }),
        meta: { flex: 0.9, minWidth: 120, maxWidth: 180, align: "left", headerAlign: "center" },
      },
      {
        id: "status",
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => {
            const active = row.isActive !== false;
            return (
              <div className="flex items-center justify-center w-full">
                <Badge
                  variant="outline"
                  className={
                    active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
                      : "bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold"
                  }
                >
                  {active ? "Active" : "Inactive"}
                </Badge>
              </div>
            );
          },
        }),
        meta: { flex: 0.6, minWidth: 85, maxWidth: 110, align: "center", headerAlign: "center" },
      },
      {
        id: "actions",
        header: () => <span className="whitespace-nowrap">Actions</span>,
        accessorFn: (row: CentreItem) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center justify-center gap-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDetails(row)}
                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                title="Centre Details"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>

              {isCentral && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(row)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                    title="Edit Centre"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDelete(row)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    title="Delete Centre"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ),
        }),
        meta: {
          flex: isCentral ? 0.9 : 0.5,
          minWidth: isCentral ? 115 : 65,
          maxWidth: isCentral ? 140 : 80,
          align: "center",
        },
        enableSorting: false,
      },
    ],
    [isCentral]
  );

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Top Header / Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            School Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage centres and schools across zones and clusters
          </p>
        </div>

        {isCentral && (
          <Button
            onClick={() => {
              const initZone = selectedZone !== "all" ? selectedZone : "";
              const zoneObj = initZone
                ? availableZones.find(
                    (z) =>
                      z.name.toLowerCase() === initZone.toLowerCase() ||
                      (z.code && z.code.toLowerCase() === initZone.toLowerCase())
                  )
                : null;
              const zoneStates = zoneObj?.states || [];
              const zoneCities = zoneObj?.cities || [];

              setCreateForm({
                name: "",
                code: "",
                zone: initZone,
                cluster: selectedCluster !== "all" ? selectedCluster : "",
                state:
                  zoneStates.length === 1
                    ? zoneStates[0]
                    : selectedState !== "all"
                    ? selectedState
                    : "",
                city: zoneCities.length === 1 ? zoneCities[0] : "",
                address: "",
                pincode: "",
                contactPhone: "",
                contactEmail: "",
              });
              fetchZonesOnDemand();
              fetchClustersOnDemand();
              setIsCreateOpen(true);
            }}
            className="text-xs font-semibold gap-1.5 h-9 bg-[#0F2557] hover:bg-[#0F2557]/90 text-white shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create School / Centre</span>
          </Button>
        )}
      </div>

      {/* Filter, Search & Actions Toolbar (Hallmark Responsive Craft) */}
      <div className="flex flex-col gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Row 1: Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by centre name, code, zone, cluster, AOM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white w-full rounded-lg"
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

        {/* Row 2: Geographic Selectors (Zone, Cluster, State) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
          {/* Zone Selector */}
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest('button[role="combobox"]')) {
                const btn = e.currentTarget.querySelector('button[role="combobox"]') as HTMLButtonElement;
                btn?.click();
              }
            }}
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 px-3 h-9 focus-within:bg-white focus-within:border-slate-300 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none">
              Zone
            </span>
            <div className="h-3.5 w-px bg-slate-200 shrink-0 mx-2" />
            <div className="flex-1 min-w-0 h-full">
              <Combobox
                items={zoneFilterItems}
                value={selectedZone}
                onValueChange={(val) => {
                  setSelectedZone(val || "all");
                  setSelectedCluster("all");
                }}
                onOpenChange={(isOpen) => {
                  if (isOpen) fetchZonesOnDemand();
                }}
                placeholder={isLoadingZones ? "Loading..." : "All Zones"}
                searchPlaceholder="Search zone..."
                emptyMessage={
                  isLoadingZones ? "Loading zones..." : "No zones found."
                }
                width="w-full"
                className="h-full border-0 bg-transparent hover:bg-transparent shadow-none text-xs font-medium text-slate-800 p-0 justify-between focus-visible:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Cluster Selector */}
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest('button[role="combobox"]')) {
                const btn = e.currentTarget.querySelector('button[role="combobox"]') as HTMLButtonElement;
                btn?.click();
              }
            }}
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 px-3 h-9 focus-within:bg-white focus-within:border-slate-300 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none">
              Cluster
            </span>
            <div className="h-3.5 w-px bg-slate-200 shrink-0 mx-2" />
            <div className="flex-1 min-w-0 h-full">
              <Combobox
                items={clusterFilterItems}
                value={selectedCluster}
                onValueChange={(val) => setSelectedCluster(val || "all")}
                onOpenChange={(isOpen) => {
                  if (isOpen) fetchClustersOnDemand();
                }}
                placeholder={isLoadingClusters ? "Loading..." : "All Clusters"}
                searchPlaceholder="Search cluster..."
                emptyMessage={
                  isLoadingClusters ? "Loading clusters..." : "No clusters found."
                }
                width="w-full"
                className="h-full border-0 bg-transparent hover:bg-transparent shadow-none text-xs font-medium text-slate-800 p-0 justify-between focus-visible:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* State Selector */}
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest('button[role="combobox"]')) {
                const btn = e.currentTarget.querySelector('button[role="combobox"]') as HTMLButtonElement;
                btn?.click();
              }
            }}
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 px-3 h-9 focus-within:bg-white focus-within:border-slate-300 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none">
              State
            </span>
            <div className="h-3.5 w-px bg-slate-200 shrink-0 mx-2" />
            <div className="flex-1 min-w-0 h-full">
              <Combobox
                items={stateFilterItems}
                value={selectedState}
                onValueChange={(val) => setSelectedState(val || "all")}
                placeholder="All States"
                searchPlaceholder="Search state..."
                emptyMessage="No states found."
                width="w-full"
                className="h-full border-0 bg-transparent hover:bg-transparent shadow-none text-xs font-medium text-slate-800 p-0 justify-between focus-visible:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Status & Refinement Controls + Refresh */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* AOM Assignment Filter */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() =>
                  setAomFilter(aomFilter === "assigned" ? "all" : "assigned")
                }
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-xs ${
                  aomFilter === "assigned"
                    ? "bg-white text-purple-800 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck
                  className={`w-3.5 h-3.5 ${
                    aomFilter === "assigned" ? "text-purple-600" : "text-slate-500"
                  }`}
                />
                <span>Assigned AOM</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setAomFilter(aomFilter === "unassigned" ? "all" : "unassigned")
                }
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-xs ${
                  aomFilter === "unassigned"
                    ? "bg-white text-amber-800 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <AlertCircle
                  className={`w-3.5 h-3.5 ${
                    aomFilter === "unassigned" ? "text-amber-600" : "text-slate-500"
                  }`}
                />
                <span>Unassigned AOM</span>
              </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  statusFilter === "active"
                    ? "bg-white text-emerald-700 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                  statusFilter === "inactive"
                    ? "bg-white text-slate-700 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Action Buttons: Reset & Refresh */}
          <div className="flex items-center gap-2">
            {(Boolean(searchQuery) ||
              selectedZone !== "all" ||
              selectedCluster !== "all" ||
              selectedState !== "all" ||
              aomFilter !== "all" ||
              statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedZone("all");
                  setSelectedCluster("all");
                  setSelectedState("all");
                  setAomFilter("all");
                  setStatusFilter("all");
                }}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1.5"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Filters</span>
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCentres(true)}
              disabled={isRefreshing || isLoading}
              className="h-8 px-2.5 text-slate-600 bg-white hover:bg-slate-50 border-slate-200 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
              title="Refresh schools"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span className="text-xs font-medium hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Centre Table */}
      <CustomTable
        data={filteredCentres}
        columns={columns}
        isLoading={isLoading}
        showSerialNumber={true}
        maxHeight={"calc(100vh - 240px)"}
        pageSizeArray={[10, 20, 50, "All"]}
        noDataMessage={
          debouncedSearch ||
          selectedZone !== "all" ||
          selectedCluster !== "all" ||
          selectedState !== "all" ||
          aomFilter !== "all" ||
          statusFilter !== "all"
            ? "No schools/centres match your filters."
            : "No schools/centres found. Create a centre to get started."
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          1. Centre Details / Inspect Modal (GET /api/centres/:id)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#0F2557] text-white font-mono font-bold text-xs">
                {selectedCentre?.code}
              </span>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {selectedCentre?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Centre & School details, area allocation, and operational metrics.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                Loading centre details...
              </p>
            </div>
          ) : selectedCentre ? (
            <div className="space-y-4 pt-2">
              {/* Location & Hierarchy Badge Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Zone
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedCentre.zone || "—"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Cluster
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedCentre.cluster || "—"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    State / City
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedCentre.city}, {selectedCentre.state}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      selectedCentre.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
                        : "bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold"
                    }
                  >
                    {selectedCentre.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Assigned AOM Card */}
              <div className="border border-slate-200/80 rounded-xl p-4 bg-white">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Assigned Area Operations Manager (AOM)
                </h4>
                {selectedCentre.assignedAOM?.name ? (
                  <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedCentre.assignedAOM.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        @{selectedCentre.assignedAOM.username}
                      </p>
                      {selectedCentre.assignedAOM.email && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {selectedCentre.assignedAOM.email}
                        </p>
                      )}
                    </div>
                    {selectedCentre.assignedAOM.username && (
                      <Link
                        href={`/dashboard/users?tab=aom&search=${encodeURIComponent(
                          selectedCentre.assignedAOM.username
                        )}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold gap-1 bg-white"
                        >
                          AOM Profile
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      No Area Operations Manager (AOM) is currently allocated to
                      this centre.
                    </span>
                  </div>
                )}
              </div>

              {/* Address & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address &
                    Pincode
                  </span>
                  <p className="text-slate-600">
                    {selectedCentre.address || "No street address provided"}
                  </p>
                  {selectedCentre.pincode && (
                    <p className="text-slate-500 text-[11px] font-mono">
                      Pincode: {selectedCentre.pincode}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Direct
                    Contacts
                  </span>
                  <p className="text-slate-600">
                    Phone: {selectedCentre.contactPhone || "—"}
                  </p>
                  <p className="text-slate-600">
                    Email: {selectedCentre.contactEmail || "—"}
                  </p>
                </div>
              </div>

              {/* Incident Metric */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Incidents Logged
                  </span>
                </div>
                <span className="font-bold font-mono text-sm text-slate-900">
                  {selectedCentre.incidentCount ??
                    selectedCentre.totalIncidents ??
                    0}
                </span>
              </div>

              {/* Record Metadata Timestamps */}
              {(selectedCentre.createdAt || selectedCentre.updatedAt) && (
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-100">
                  {selectedCentre.createdAt && (
                    <span>
                      Created:{" "}
                      {new Date(selectedCentre.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {selectedCentre.updatedAt && (
                    <span>
                      Updated:{" "}
                      {new Date(selectedCentre.updatedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          2. Create Centre Modal (POST /api/centres)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen && isCentral} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create School / Centre
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Register a new school or centre node within a designated zone and
                cluster.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Centre / School Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Bandra Centre"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Centre Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. C-BND-01"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={createZoneItems}
                    value={createForm.zone}
                    onValueChange={handleCreateZoneChange}
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchZonesOnDemand();
                    }}
                    placeholder={
                      isLoadingZones ? "Loading zones..." : "Select Zone"
                    }
                    searchPlaceholder="Search zone..."
                    emptyMessage="No zones found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Cluster <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={createClusterItems}
                    value={createForm.cluster}
                    onValueChange={(val) =>
                      setCreateForm({ ...createForm, cluster: val || "" })
                    }
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchClustersOnDemand();
                    }}
                    placeholder={
                      isLoadingClusters ? "Loading clusters..." : "Select Cluster"
                    }
                    searchPlaceholder="Search cluster..."
                    emptyMessage="No clusters found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="min-h-[22px] flex items-center justify-between">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      State <span className="text-red-500">*</span>
                    </label>
                    {createSelectedZoneObj?.states &&
                      createSelectedZoneObj.states.length > 0 && (
                        <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap shrink-0">
                          {createSelectedZoneObj.states.length === 1
                            ? "Auto-filled from Zone"
                            : `${createSelectedZoneObj.states.length} Zone States`}
                        </span>
                      )}
                  </div>
                  <Combobox
                    items={createStateItems}
                    value={createForm.state}
                    onValueChange={handleCreateStateChange}
                    placeholder="Select State"
                    searchPlaceholder="Search state..."
                    emptyMessage="No states found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="min-h-[22px] flex items-center justify-between">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      City <span className="text-red-500">*</span>
                    </label>
                    {createSelectedZoneObj?.cities &&
                      createSelectedZoneObj.cities.length > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap shrink-0">
                          {createSelectedZoneObj.cities.length === 1
                            ? "Auto-filled from Zone"
                            : `${createSelectedZoneObj.cities.length} Zone Cities`}
                        </span>
                      )}
                  </div>
                  <Combobox
                    items={createCityItems}
                    value={createForm.city}
                    onValueChange={(val) =>
                      setCreateForm({ ...createForm, city: val || "" })
                    }
                    placeholder={
                      isLoadingCreateCities
                        ? "Loading cities..."
                        : createCityItems.length > 0
                        ? "Select City"
                        : "Select city"
                    }
                    searchPlaceholder="Search city..."
                    emptyMessage="No cities found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Address</label>
                <Input
                  placeholder="e.g. Hill Road, Bandra West"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Pincode</label>
                  <Input
                    placeholder="e.g. 400050"
                    maxLength={6}
                    value={createForm.pincode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, pincode: e.target.value })
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Contact Phone
                  </label>
                  <Input
                    placeholder="e.g. 022-26400111"
                    value={createForm.contactPhone}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contactPhone: e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. bandra@lighthouse.com"
                    value={createForm.contactEmail}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contactEmail: e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Save Centre"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          3. Edit Centre Modal (PUT /api/centres/:id)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen && isCentral} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit School / Centre
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update school location, cluster assignment, and contact details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Centre / School Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Bandra Centre"
                    value={editForm.name || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Centre Code
                  </label>
                  <Input
                    disabled
                    value={editForm.code || ""}
                    className="h-9 text-xs font-mono uppercase bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={editZoneItems}
                    value={editForm.zone || ""}
                    onValueChange={handleEditZoneChange}
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchZonesOnDemand();
                    }}
                    placeholder={
                      isLoadingZones ? "Loading zones..." : "Select Zone"
                    }
                    searchPlaceholder="Search zone..."
                    emptyMessage="No zones found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Cluster <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={editClusterItems}
                    value={editForm.cluster || ""}
                    onValueChange={(val) =>
                      setEditForm({ ...editForm, cluster: val || "" })
                    }
                    onOpenChange={(isOpen) => {
                      if (isOpen) fetchClustersOnDemand();
                    }}
                    placeholder={
                      isLoadingClusters ? "Loading clusters..." : "Select Cluster"
                    }
                    searchPlaceholder="Search cluster..."
                    emptyMessage="No clusters found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="min-h-[22px] flex items-center justify-between">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      State <span className="text-red-500">*</span>
                    </label>
                    {editSelectedZoneObj?.states &&
                      editSelectedZoneObj.states.length > 0 && (
                        <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap shrink-0">
                          {editSelectedZoneObj.states.length === 1
                            ? "Auto-filled from Zone"
                            : `${editSelectedZoneObj.states.length} Zone States`}
                        </span>
                      )}
                  </div>
                  <Combobox
                    items={editStateItems}
                    value={editForm.state || ""}
                    onValueChange={handleEditStateChange}
                    placeholder="Select State"
                    searchPlaceholder="Search state..."
                    emptyMessage="No states found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="min-h-[22px] flex items-center justify-between">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      City <span className="text-red-500">*</span>
                    </label>
                    {editSelectedZoneObj?.cities &&
                      editSelectedZoneObj.cities.length > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap shrink-0">
                          {editSelectedZoneObj.cities.length === 1
                            ? "Auto-filled from Zone"
                            : `${editSelectedZoneObj.cities.length} Zone Cities`}
                        </span>
                      )}
                  </div>
                  <Combobox
                    items={editCityItems}
                    value={editForm.city || ""}
                    onValueChange={(val) =>
                      setEditForm({ ...editForm, city: val || "" })
                    }
                    placeholder={
                      isLoadingEditCities
                        ? "Loading cities..."
                        : editCityItems.length > 0
                        ? "Select City"
                        : "Select city"
                    }
                    searchPlaceholder="Search city..."
                    emptyMessage="No cities found."
                    width="w-full"
                    className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Address</label>
                <Input
                  placeholder="e.g. Hill Road, Bandra West"
                  value={editForm.address || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Pincode</label>
                  <Input
                    placeholder="e.g. 400050"
                    maxLength={6}
                    value={editForm.pincode || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pincode: e.target.value })
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Contact Phone
                  </label>
                  <Input
                    placeholder="e.g. 022-26400999"
                    value={editForm.contactPhone || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        contactPhone: e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. bandra@lighthouse.com"
                    value={editForm.contactEmail || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        contactEmail: e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Operational Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="isActive"
                      checked={editForm.isActive === true}
                      onChange={() =>
                        setEditForm({ ...editForm, isActive: true })
                      }
                      className="accent-[#0F2557]"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="isActive"
                      checked={editForm.isActive === false}
                      onChange={() =>
                        setEditForm({ ...editForm, isActive: false })
                      }
                      className="accent-[#0F2557]"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="bg-[#0F2557] hover:bg-[#0F2557]/90 text-white font-semibold"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          4. Delete Centre Modal (DELETE /api/centres/:id)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isDeleteOpen && isCentral} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Soft Delete Centre / School
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Are you sure you want to soft delete{" "}
              <strong className="text-slate-800">
                {centreToDelete?.name} ({centreToDelete?.code})
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-xl space-y-1.5 text-xs text-red-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-red-600 shrink-0" />
              Automatic Allocation Sync:
            </p>
            <p className="text-[11px] text-red-700 leading-relaxed">
              This action will pull this centre from any active Area Operations
              Manager (AOM) allocation and archive it. You can restore it later
              from the Trash archive.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isDeleting}
              className="font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Centre"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          5. Trash / Deleted Centres Modal (GET /api/centres/deleted)
      ────────────────────────────────────────────────────────────── */}
      <Dialog open={isTrashOpen && isCentral} onOpenChange={setIsTrashOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-slate-700" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Deleted Schools / Centres Archive
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Recover previously soft-deleted centres and restore them to active
              status.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDeleted ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                Loading deleted centres...
              </p>
            </div>
          ) : deletedCentres.length > 0 ? (
            <div className="space-y-2 pt-2">
              {deletedCentres.map((c) => {
                const targetId = c._id || c.id || "";
                return (
                  <div
                    key={targetId}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold text-[11px]">
                          {c.code}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {c.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {c.zone} • {c.cluster} • {c.city}, {c.state}
                      </p>
                      {c.deletedAt && (
                        <p className="text-[10px] text-slate-400">
                          Deleted on: {new Date(c.deletedAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {isCentral && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringId === targetId}
                        onClick={() => handleRestore(targetId, c.name)}
                        className="h-8 text-xs font-semibold gap-1.5 shrink-0 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 cursor-pointer"
                      >
                        {restoringId === targetId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              No soft-deleted centres in the trash.
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTrashOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolMasterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <SchoolMasterPageContent />
    </Suspense>
  );
}
