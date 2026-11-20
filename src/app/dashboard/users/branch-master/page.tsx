"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import axios from "axios";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/api/userService";
import { api } from "@/services/apiService";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Branch as branch } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { CustomFilter } from "@/components/ui/CustomFilter";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { ExpirationDatePicker } from "@/components/ui/ExpirationDatePicker";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { BranchNotificationCell } from "@/components/branch-master/BranchNotificationCell";
import authAxios from "@/lib/authAxios";
import { BranchImportModal } from "@/components/branch-import/BranchImportModal";
import { excelFileUploadForBranch } from "@/services/fileUploadService";
import { loginUser } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { zoneService, ZoneItem } from "@/services/api/zoneService";
import { clusterService, ClusterItem } from "@/services/api/clusterService";

type branchAccess = {
  _id: string;
  branchName: string;
  fullAccess: boolean;
};
interface SchoolMinimal {
  _id: string;
  schoolName: string;
}

// Interface for decoded token
interface DecodedToken {
  userId: string;
  role: string;
  schoolId?: string;
  branchId?: string;
  id?: string;
  schoolName?: string;
  AssignedBranch?: Array<{ _id: string; username: string }>;
  [key: string]: any;
}

const PasswordCell = ({ password }: { password?: string }) => {
  const [show, setShow] = React.useState(false);
  const { decodedToken } = useAuthStore();
  const isSuperSupport = decodedToken?.username === "supersupport";

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      <span className="font-mono">
        {show && !isSuperSupport ? password : "•".repeat(password?.length || 8)}
      </span>

      {!isSuperSupport && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShow((prev) => !prev);
          }}
          className="p-1 hover:bg-gray-200 rounded cursor-pointer shrink-0"
        >
          {show ? (
            <EyeOff className="h-4 w-4 text-gray-700" />
          ) : (
            <Eye className="h-4 w-4 text-gray-700" />
          )}
        </button>
      )}
    </div>
  );
};

// Helper function to decode JWT token
const getDecodedToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

// Helper function to get token from storage
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || null;
  }
  return null;
};

// Helper function to format user-friendly error messages from API errors
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

  // Format cluster allocation conflict:
  // e.g. "Cluster allocation conflict: A single cluster cannot have multiple Business Managers. Cluster 'Nagpur cluster' is already managed by shukla (@bm_north_nagpur)."
  if (
    /cluster allocation conflict/i.test(msg) ||
    /cannot have multiple business managers/i.test(msg)
  ) {
    const match = msg.match(
      /(?:Cluster allocation conflict:\s*)?(A single cluster cannot have multiple Business Managers\.)\s*(Cluster\s+'[^']+'\s+is already managed by\s+[^.]+\.)/i,
    );
    if (match) {
      // Put the specific conflict information first, followed by the rule
      return `${match[2]} ${match[1]}`;
    }
    return msg.replace(/^Cluster allocation conflict:\s*/i, "").trim();
  }

  return msg;
};

// Custom Branch Edit Dialog Component
const BranchEditDialog = ({
  data,
  isOpen,
  onClose,
  onSave,
  schoolOptions,
  isVerified,
  onVerificationRequired,
  isSuperAdmin,
  isSchoolRole,
  updatebranchMutation,
  isBranchGroup,
  availableZones = [],
  availableClusters = [],
  onFetchZones,
  onFetchClusters,
  isLoadingZones,
  isLoadingClusters,
}: {
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  schoolOptions: { label: string; value: string }[];
  isVerified: boolean;
  onVerificationRequired: (field: string) => void;
  isSuperAdmin: boolean;
  isSchoolRole: boolean;
  updatebranchMutation: any;
  isBranchGroup: boolean;
  availableZones?: ZoneItem[];
  availableClusters?: { _id?: string; name: string; code?: string; zone?: string }[];
  onFetchZones?: () => void;
  onFetchClusters?: () => void;
  isLoadingZones?: boolean;
  isLoadingClusters?: boolean;
}) => {
  const [formData, setFormData] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);

  const editErrorMessage = useMemo(() => {
    if (!updatebranchMutation?.isError || !updatebranchMutation?.error)
      return null;
    return getProperErrorMessage(
      updatebranchMutation.error,
      "Failed to update Business Manager",
    );
  }, [updatebranchMutation?.isError, updatebranchMutation?.error]);

  const filteredClustersForEdit = useMemo(() => {
    if (formData.zone) {
      const matched = availableClusters.filter(
        (c) => c.zone?.toLowerCase() === formData.zone.toLowerCase(),
      );
      if (matched.length > 0) return matched;
    }
    return availableClusters;
  }, [availableClusters, formData.zone]);

  const zoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      formData.zone &&
      !list.some((i) => i.value.toLowerCase() === formData.zone.toLowerCase())
    ) {
      list.unshift({ value: formData.zone, label: formData.zone });
    }
    return list;
  }, [availableZones, formData.zone]);

  const clusterItems = useMemo(() => {
    const list = filteredClustersForEdit.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      formData.cluster &&
      !list.some(
        (i) => i.value.toLowerCase() === formData.cluster.toLowerCase(),
      )
    ) {
      list.unshift({ value: formData.cluster, label: formData.cluster });
    }
    return list;
  }, [filteredClustersForEdit, formData.cluster]);

  useEffect(() => {
    if (updatebranchMutation?.isError) {
      updatebranchMutation.reset();
    }
    if (data) {
      setFormData({
        name: data.name || data.branchName || "",
        cluster: data.cluster || "",
        zone: data.zone || "",
        email: data.email || "",
        mobileNo: data.mobileNo || data.phone || "",
        username: data.username || "",
        password: data.password || "",
      });
    }
  }, [data]);

  const handleSave = () => {
    const updatedData = {
      ...formData,
      centres: data?.centres || [],
    };
    onSave(updatedData);
  };

  const handleFieldChange = (key: string, value: any) => {
    if (updatebranchMutation?.isError) {
      updatebranchMutation.reset();
    }
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Business Manager Info</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Manager Name */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="edit-name">Business Manager Name *</Label>
              <Input
                id="edit-name"
                value={formData.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g. Pooja Verma (BM Delhi)"
                required
              />
            </div>

            {/* Zone */}
            <div className="grid gap-2">
              <Label htmlFor="edit-zone">Zone *</Label>
              <Combobox
                items={zoneItems}
                value={formData.zone || ""}
                onValueChange={(val) => handleFieldChange("zone", val || "")}
                onOpenChange={(isOpen) => {
                  if (isOpen && onFetchZones) onFetchZones();
                }}
                placeholder={isLoadingZones ? "Loading zones..." : "Select Zone"}
                searchPlaceholder="Search zone..."
                emptyMessage={isLoadingZones ? "Loading zones..." : "No zones found."}
                width="w-full"
                className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
              />
            </div>

            {/* Cluster */}
            <div className="grid gap-2">
              <Label htmlFor="edit-cluster">Cluster *</Label>
              <Combobox
                items={clusterItems}
                value={formData.cluster || ""}
                onValueChange={(val) => {
                  const newCluster = val || "";
                  handleFieldChange("cluster", newCluster);
                  const matched = availableClusters.find(
                    (c) => c.name.toLowerCase() === newCluster.toLowerCase(),
                  );
                  if (matched?.zone && !formData.zone) {
                    handleFieldChange("zone", matched.zone);
                  }
                }}
                onOpenChange={(isOpen) => {
                  if (isOpen && onFetchClusters) onFetchClusters();
                }}
                placeholder={
                  isLoadingClusters ? "Loading clusters..." : "Select Cluster"
                }
                searchPlaceholder="Search cluster..."
                emptyMessage={
                  isLoadingClusters
                    ? "Loading clusters..."
                    : "No clusters available."
                }
                width="w-full"
                className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                placeholder="bm@lighthouse.com"
              />
            </div>

            {/* Mobile Number */}
            <div className="grid gap-2">
              <Label htmlFor="edit-mobileNo">Mobile Number</Label>
              <Input
                id="edit-mobileNo"
                value={formData.mobileNo || ""}
                onChange={(e) => handleFieldChange("mobileNo", e.target.value)}
                placeholder="10-digit mobile"
              />
            </div>

            {/* Username */}
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username *</Label>
              <Input
                id="edit-username"
                value={formData.username || ""}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password *</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ""}
                  onChange={(e) =>
                    handleFieldChange("password", e.target.value)
                  }
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {editErrorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {editErrorMessage}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatebranchMutation.isPending}
            className="text-white"
          >
            {updatebranchMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function BranchMaster() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: authLogin, decodedToken: authUser } = useAuthStore();
  const { setAccess } = useAccessStore();
  const [filteredData, setFilteredData] = useState<branch[]>([]);
  const [filterResults, setFilterResults] = useState<branch[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<branch | null>(null);
  const [editTarget, setEditTarget] = useState<branch | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const [school, setSchool] = useState<string>("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] =
    useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [currentProtectedField, setCurrentProtectedField] = useState<
    string | null
  >(null);
  const [isImporting, setIsImporting] = useState(false);
  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [availableClusters, setAvailableClusters] = useState<ClusterItem[]>([]);
  const [addSelectedZone, setAddSelectedZone] = useState("");
  const [addSelectedCluster, setAddSelectedCluster] = useState("");
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const zonesLoadedRef = useRef(false);
  const clustersLoadedRef = useRef(false);

  // Lazy-load zones only when the user interacts with / clicks the Zone dropdown
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
      console.warn("Could not load zones for BM:", err);
    } finally {
      setIsLoadingZones(false);
    }
  }, [isLoadingZones]);

  // Lazy-load clusters only when the user interacts with / clicks the Cluster dropdown
  const fetchClustersOnDemand = useCallback(async () => {
    if (clustersLoadedRef.current || isLoadingClusters) return;
    setIsLoadingClusters(true);
    try {
      const cRes = await clusterService.getClusters({ isActive: true });
      if (cRes?.data && Array.isArray(cRes.data)) {
        setAvailableClusters(cRes.data);
        clustersLoadedRef.current = true;
      }
    } catch (err) {
      console.warn("Could not load clusters for BM:", err);
    } finally {
      setIsLoadingClusters(false);
    }
  }, [isLoadingClusters]);

  // Handle "Login As" - superAdmin logs in as a branch user
  const handleLoginAs = async (
    username: string,
    password: string,
    id: string,
  ) => {
    if (!isCentral) {
      toast.error("Only Central administrators have authority to Login As.");
      return;
    }
    setLoginAsLoading(id);
    try {
      // Clear existing session
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
        const decoded = getDecodedToken(authToken);
        const normRole = normalizePrekRole(decoded?.role);
        let targetUrl = "/dashboard/users?tab=aom";
        if (normRole === PREK_ROLES.AOM) {
          targetUrl = "/dashboard/incident";
        } else if (normRole === PREK_ROLES.BM) {
          targetUrl = "/dashboard/users?tab=aom";
        } else if (normRole === PREK_ROLES.RSO || normRole === PREK_ROLES.NATIONAL_HEAD) {
          targetUrl = "/dashboard/users?tab=bm";
        } else if (normRole === PREK_ROLES.CENTRAL) {
          targetUrl = "/dashboard/users?tab=national-head";
        }
        window.location.replace(targetUrl);
      } else {
        toast.error("Login failed: Invalid server response");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoginAsLoading(null);
    }
  };

  // FIXED: Combine all user info into a single state to avoid synchronization issues
  const [userInfo, setUserInfo] = useState<{
    role: string | null;
    userSchoolId: string | null;
    userBranchId: string | null;
    userSchoolName: string | null;
    assignedBranches: string[];
  }>({
    role: null,
    userSchoolId: null,
    userBranchId: null,
    userSchoolName: null,
    assignedBranches: [],
  });

  // Get user info from token - FIXED: Single useEffect to set all user info
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = getDecodedToken(token);
      // console.log("[Branch Master - Decoded Token]: ", decoded);

      const role = (decoded?.role || "").toLowerCase();

      // Handle schoolId based on role
      let schoolIdToUse = null;

      if (role === "school" || role === "schooladmin") {
        schoolIdToUse = decoded?.id || null;
      } else if (
        role === "branchgroup" ||
        role === "branch" ||
        role === "branchadmin"
      ) {
        schoolIdToUse = decoded?.schoolId || null;
      } else {
        schoolIdToUse = decoded?.schoolId || null;
      }

      // Handle branchId
      let branchIdToUse = null;
      if (role === "branch" || role === "branchadmin") {
        branchIdToUse = decoded?.id || null;
      } else {
        branchIdToUse = decoded?.branchId || null;
      }

      // Handle assigned branches for branchGroup role
      let assignedBranchIds: string[] = [];
      if (role === "branchgroup" && decoded?.AssignedBranch) {
        assignedBranchIds = decoded.AssignedBranch.map(
          (branch: any) => branch?._id,
        );
        // console.log("[BranchGroup Role] Assigned Branches extracted:", {
        //   assignedBranchIds,
        //   rawAssignedBranches: decoded.AssignedBranch,
        // });
      }

      // FIXED: Set all user info in one state update
      setUserInfo({
        role,
        userSchoolId: schoolIdToUse,
        userBranchId: branchIdToUse,
        userSchoolName: decoded?.schoolName || null,
        assignedBranches: assignedBranchIds,
      });

      // console.log("[Branch Master - Final User Info SET]:", {
      //   role,
      //   userSchoolId: schoolIdToUse,
      //   userBranchId: branchIdToUse,
      //   userSchoolName: decoded?.schoolName,
      //   assignedBranches: assignedBranchIds,
      //   assignedBranchesCount: assignedBranchIds.length,
      // });
    }
  }, []);

  // Destructure userInfo for easier access
  const { role, userSchoolId, userBranchId, userSchoolName, assignedBranches } =
    userInfo;

  const prekRole = normalizePrekRole(authUser?.role || role);
  const normalizedRole = useMemo(() => {
    const r = (authUser?.role || role || "").toLowerCase();
    if (
      ["superadmin", "super_admin", "admin", "root", "central"].includes(r) ||
      prekRole === PREK_ROLES.CENTRAL
    )
      return "superAdmin";
    if (
      ["school", "schooladmin", "national head", "nationalhead"].includes(r) ||
      prekRole === PREK_ROLES.NATIONAL_HEAD
    )
      return "school";
    if (
      ["branch", "branchadmin", "bm", "business manager"].includes(r) ||
      prekRole === PREK_ROLES.BM
    )
      return "branch";
    if (
      ["branchgroup", "rso", "regional safety officer"].includes(r) ||
      prekRole === PREK_ROLES.RSO
    )
      return "branchGroup";
    return "superAdmin";
  }, [role, authUser?.role, prekRole]);

  const isCentral =
    prekRole === PREK_ROLES.CENTRAL ||
    authUser?.role === "superAdmin" ||
    normalizedRole === "superAdmin" ||
    authUser?.role === "central" ||
    authUser?.role === "Central";
  const isSuperAdmin = isCentral;
  const isSchoolRole = normalizedRole === "school";
  const isBranchRole = normalizedRole === "branch";
  const isBranchGroup = normalizedRole === "branchGroup";

  // FIXED: Fetch branch data with proper dependency tracking
  const {
    data: branches,
    isLoading,
    isError,
    error,
  } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      try {
        const uRes: any = await userService.getUsers({ role: "BM" });
        const list =
          uRes?.data || uRes?.users || (Array.isArray(uRes) ? uRes : []);
        if (Array.isArray(list)) {
          return list.map((u: any) => ({
            ...u,
            _id: u._id || u.id,
            name: u.name || u.branchName || u.username,
            branchName: u.name || u.branchName || u.username,
            safetyHeadName: u.name || u.safetyHeadName || "N/A",
            cluster: u.cluster || u.branchName || "N/A",
            zone:
              u.zone ||
              (typeof u.schoolId === "object"
                ? u.schoolId?.schoolName
                : u.schoolId) ||
              "N/A",
            centres: Array.isArray(u.centres) ? u.centres : [],
            email: u.email || "N/A",
            username: u.username || "N/A",
            password: u.password || "N/A",
            mobileNo: u.mobileNo || u.phone || "N/A",
            isActive:
              u.isActive !== undefined ? u.isActive : (u.Active ?? true),
            Active: u.isActive !== undefined ? u.isActive : (u.Active ?? true),
            createdAt: u.createdAt || "",
          }));
        }
      } catch (e) {
        console.error("Failed to fetch BM users:", e);
      }
      return [];
    },
    enabled: true,
  });

  // Filter branches based on user role
  const filteredBranches = useMemo(() => {
    if (!branches) {
      return [];
    }

    if (isBranchRole && userBranchId) {
      return branches.filter(
        (branch) =>
          branch?._id === userBranchId ||
          branch?.username === authUser?.username,
      );
    } else if (
      isBranchGroup &&
      (assignedBranches.length > 0 || (authUser as any)?.zone)
    ) {
      return branches.filter((branch) => {
        const matchesAssigned = assignedBranches.includes(branch?._id);
        const userZone = (authUser as any)?.zone;
        const matchesZone =
          userZone &&
          branch?.zone &&
          branch.zone.toLowerCase() === userZone.toLowerCase();
        return matchesAssigned || matchesZone;
      });
    }

    // For Central, National Head, and standard access, return all branches
    return branches;
  }, [
    branches,
    isBranchRole,
    isBranchGroup,
    userBranchId,
    authUser?.username,
    (authUser as any)?.zone,
    assignedBranches,
  ]);

  // School data - Convert to Combobox format with role-based filtering
  const schoolOptions = useMemo(() => {
    if (!schoolData) return [];

    let filteredSchools = schoolData;

    // Filter schools based on role
    if ((isSchoolRole || isBranchGroup) && userSchoolId) {
      filteredSchools = schoolData.filter((s) => s?._id === userSchoolId);
    } else if (isBranchRole && userSchoolId) {
      filteredSchools = schoolData.filter((s) => s?._id === userSchoolId);
    }

    return filteredSchools
      .filter((s) => s?._id && s?.schoolName)
      .map((s) => ({
        label: s?.schoolName,
        value: s?._id,
      }));
  }, [schoolData, isSchoolRole, isBranchRole, isBranchGroup, userSchoolId]);

  // Set default school for school, branch, and branch group roles
  useEffect(() => {
    if (
      (isSchoolRole || isBranchRole || isBranchGroup) &&
      userSchoolId &&
      !school
    ) {
      setSchool(userSchoolId);
    }
  }, [
    isSchoolRole,
    isBranchRole,
    isBranchGroup,
    userSchoolId,
    school,
    normalizedRole,
  ]);

  useEffect(() => {
    if (filteredBranches && filteredBranches.length > 0) {
      setFilteredData(filteredBranches);
      setFilterResults(filteredBranches);
    } else {
      setFilteredData([]);
      setFilterResults([]);
    }
  }, [filteredBranches]);

  // Combined unique clusters from API and existing branches
  const allUniqueClusters = useMemo(() => {
    const map = new Map<
      string,
      { _id?: string; name: string; code?: string; zone?: string }
    >();
    availableClusters.forEach((c) => {
      if (c.name) map.set(c.name.toLowerCase(), c);
    });
    if (branches && Array.isArray(branches)) {
      branches.forEach((b) => {
        const cName = b.cluster;
        if (cName && cName !== "N/A" && !map.has(cName.toLowerCase())) {
          map.set(cName.toLowerCase(), {
            _id: b._id || cName,
            name: cName,
            zone: b.zone && b.zone !== "N/A" ? b.zone : undefined,
          });
        }
      });
    }
    return Array.from(map.values());
  }, [availableClusters, branches]);

  const filteredClustersForAdd = useMemo(() => {
    if (addSelectedZone) {
      const matched = allUniqueClusters.filter(
        (c) => c.zone?.toLowerCase() === addSelectedZone.toLowerCase(),
      );
      if (matched.length > 0) return matched;
    }
    return allUniqueClusters;
  }, [allUniqueClusters, addSelectedZone]);

  const addZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      addSelectedZone &&
      !list.some((i) => i.value.toLowerCase() === addSelectedZone.toLowerCase())
    ) {
      list.unshift({ value: addSelectedZone, label: addSelectedZone });
    }
    return list;
  }, [availableZones, addSelectedZone]);

  const addClusterItems = useMemo(() => {
    const list = filteredClustersForAdd.map((c) => ({
      value: c.name,
      label: `${c.name} ${c.code ? `(${c.code})` : ""}`.trim(),
    }));
    if (
      addSelectedCluster &&
      !list.some(
        (i) => i.value.toLowerCase() === addSelectedCluster.toLowerCase(),
      )
    ) {
      list.unshift({ value: addSelectedCluster, label: addSelectedCluster });
    }
    return list;
  }, [filteredClustersForAdd, addSelectedCluster]);

  // Columns for export
  const columnsForExport = [
    { key: "name", header: "Business Manager" },
    { key: "cluster", header: "Cluster" },
    { key: "zone", header: "Zone" },
    ...(isCentral ? [{ key: "username", header: "Username" }] : []),
    { key: "email", header: "Email" },
    { key: "mobileNo", header: "Mobile" },
    {
      key: "isActive",
      header: "Status",
      formatter: (val: unknown) => ((val as boolean) ? "Active" : "Inactive"),
    },
    { key: "createdAt", header: "Registration Date" },
  ];

  const handleExportPDF = () => {
    const dataToExport =
      filteredData.length > 0 ? filteredData : branches || [];
    exportToPDF(dataToExport, columnsForExport, {
      title: "Branch Master Report",
      filename: "branch_master_report",
    });
  };

  const handleExportExcel = () => {
    const dataToExport =
      filteredData.length > 0 ? filteredData : branches || [];
    exportToExcel(dataToExport, columnsForExport, {
      filename: "Branch_Master_Report",
    });
  };

  const handleImport = async (file: File, cxoId?: string) => {
    setIsImporting(true);
    try {
      await excelFileUploadForBranch(file, cxoId);
      toast.success("Branches imported successfully");
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import branches");
    } finally {
      setIsImporting(false);
    }
  };

  // Mutation to add a new branch
  const addbranchMutation = useMutation({
    mutationFn: async (newbranch: any) => {
      try {
        const res = await userService.createUser({
          name: newbranch.name || newbranch.branchName,
          username: newbranch.username,
          password: newbranch.password,
          email: newbranch.email,
          phone: newbranch.mobileNo,
          role: "BM",
          zone: newbranch.zone,
          cluster: newbranch.cluster,
          centres: newbranch.centres || [],
          ...newbranch,
        });
        return res?.data || res?.user || res?.branch || newbranch;
      } catch (err: any) {
        if (err.response?.data?.message || err.response?.data?.error) {
          throw err;
        }
        if (err.response?.status === 404) {
          const response = (await api.post("branch", newbranch)) as {
            branch: branch;
          };
          return response.branch;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setAddDialogOpen(false);
      setAddSelectedZone("");
      setAddSelectedCluster("");
      toast.success("Business Manager added successfully.");
    },
    onError: (err: any) => {
      const msg = getProperErrorMessage(
        err,
        "Failed to add Business Manager",
      );
      toast.error(msg);
    },
  });

  const updatebranchMutation = useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: any }) => {
      try {
        return await userService.updateUser(branchId, data);
      } catch (err: any) {
        if (err.response?.data?.message || err.response?.data?.error) {
          throw err;
        }
        if (err.response?.status === 404) {
          return await api.put(`branch/${branchId}`, data);
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      setIsVerified(false);
      toast.success("Business Manager updated successfully.");
    },
    onError: (err: any) => {
      const msg = getProperErrorMessage(
        err,
        "Failed to update Business Manager",
      );
      toast.error(msg);
    },
  });

  // Mutation to delete a branch
  const deletebranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      try {
        return await userService.deleteUser(branchId);
      } catch {
        return await api.delete(`branch/${branchId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setDeleteTarget(null);
      toast.success("Business Manager deleted successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to delete Business Manager: ${err.response?.data?.message || err.message}`,
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (branch: any) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators can activate or deactivate users.");
      }
      const token = localStorage.getItem("token");
      try {
        const currentActive =
          branch.isActive !== undefined
            ? branch.isActive
            : (branch.Active ?? true);
        return await userService.updateUserStatus(branch._id, !currentActive);
      } catch {
        return await authAxios.put(
          `/user/deactivate/${branch._id}`,
          {
            Active: !branch.Active,
            userRole: branch.role || "BM",
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("User status updated successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update user status: ${err.response?.data?.message || err.message}`,
      );
    },
  });

  // Handle search
  const handleSearchResults = useCallback((results: branch[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit branch
  const handleSave = (updatedData: any) => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    if (!editTarget) return;

    updatebranchMutation.mutate({
      branchId: editTarget._id,
      data: updatedData,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    const form = e.currentTarget;

    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement)?.value || "",
      cluster:
        (form.elements.namedItem("cluster") as HTMLInputElement)?.value ||
        addSelectedCluster ||
        "",
      zone:
        (form.elements.namedItem("zone") as HTMLInputElement)?.value ||
        addSelectedZone ||
        "",
      centres: [],
      email:
        (form.elements.namedItem("email") as HTMLInputElement)?.value || "",
      mobileNo:
        (form.elements.namedItem("mobileNo") as HTMLInputElement)?.value || "",
      username:
        (form.elements.namedItem("username") as HTMLInputElement)?.value || "",
      password:
        (form.elements.namedItem("password") as HTMLInputElement)?.value || "",
      role: "BM",
    };

    if (!data.zone) {
      toast.error("Please select a Zone");
      return;
    }
    if (!data.cluster) {
      toast.error("Please select a Cluster");
      return;
    }

    try {
      await addbranchMutation.mutateAsync(data);
      form.reset();
      setAddSelectedZone("");
      setAddSelectedCluster("");
    } catch {
      // Error is handled in mutation's onError
    }
  };

  const handleCustomFilter = useCallback((filtered: branch[]) => {
    setFilteredData(filtered);
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Business Manager",
        accessorFn: (row: any) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center gap-2 w-full">
              <span className="font-semibold text-slate-900 break-words whitespace-normal flex-1">
                {row.name || row.branchName || row.username || "N/A"}
              </span>
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoginAs(row.username, row.password, row._id);
                      }}
                      disabled={loginAsLoading === row._id}
                      className="shrink-0 w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-gray-600/60 dark:hover:bg-gray-500 flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {loginAsLoading === row._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                      ) : (
                        <LogIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Login as {row.name || row.username}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ),
        }),
        meta: { flex: 1.2, minWidth: 200, maxWidth: 300 },
        enableHiding: true,
      },
      {
        header: "Cluster",
        accessorFn: (row: any) => ({
          type: "text",
          value: row.cluster || "N/A",
          render: () => row.cluster || "N/A",
        }),
        meta: { flex: 1, minWidth: 150, maxWidth: 220 },
        enableHiding: true,
      },
      {
        header: "Zone",
        accessorFn: (row: any) => ({
          type: "text",
          value: row.zone || "N/A",
          render: () => row.zone || "N/A",
        }),
        meta: { flex: 0.8, minWidth: 110, maxWidth: 160 },
        enableHiding: true,
      },
      {
        header: "Email",
        accessorFn: (row: any) => ({
          type: "text",
          value: row.email ?? "N/A",
          render: () => row.email ?? "N/A",
        }),
        meta: { flex: 1.1, minWidth: 180, maxWidth: 260 },
        enableHiding: true,
      },
      ...(isCentral
        ? [
            {
              header: "Username",
              accessorFn: (row: any) => ({
                type: "text",
                value: row.username ?? "",
                render: () => row.username ?? "",
              }),
              meta: { flex: 0.9, minWidth: 130, maxWidth: 200 },
              enableHiding: true,
            },
            {
              header: "Password",
              accessorFn: (row: any) => ({
                type: "custom",
                render: () => <PasswordCell password={row.password} />,
              }),
              meta: { flex: 0.9, minWidth: 140, maxWidth: 200 },
              enableHiding: true,
            },
          ]
        : []),
      {
        header: "Status",
        accessorFn: (row: any) => {
          const isAct =
            row.isActive !== undefined ? row.isActive : (row.Active ?? true);
          const isLck = !!row.isLocked;
          return {
            type: "custom",
            render: () => (
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
            ),
          };
        },
        meta: { flex: 0.8, minWidth: 100, maxWidth: 140 },
        enableHiding: true,
      },
      {
        header: "Registration Date",
        accessorFn: (row: any) => ({
          type: "text",
          value: formatDate(row.createdAt) ?? "",
          render: () => formatDate(row.createdAt) ?? "",
        }),
        meta: { flex: 0.9, minWidth: 140, maxWidth: 200 },
        enableHiding: true,
      },
      ...(isSuperAdmin
        ? [
            {
              header: "Action",
              accessorFn: (row: any) => {
                const isAct =
                  row.isActive !== undefined
                    ? row.isActive
                    : (row.Active ?? true);
                return {
                  type: "group",
                  items: [
                    {
                      type: "button",
                      label: "Edit",
                      className:
                        "bg-blue-500 hover:bg-blue-600 text-white font-semibold cursor-pointer text-xs py-1.5 px-2.5 rounded-md whitespace-nowrap",
                      onClick: () => {
                        setEditTarget(row);
                        setEditDialogOpen(true);
                      },
                    },
                    {
                      type: "button",
                      label: "Delete",
                      className:
                        "bg-red-500 hover:bg-red-600 text-white font-semibold cursor-pointer text-xs py-1.5 px-2.5 rounded-md whitespace-nowrap",
                      onClick: () => setDeleteTarget(row),
                      disabled: deletebranchMutation.isPending,
                    },
                    {
                      type: "button",
                      label: isAct ? "Deactivate" : "Activate",
                      className: `text-center text-xs font-semibold rounded-full py-1.5 px-3 whitespace-nowrap cursor-pointer ${
                        isAct
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      }`,
                      onClick: () => deactivateMutation.mutate(row),
                      disabled: deactivateMutation.isPending,
                    },
                  ],
                };
              },
              meta: {
                minWidth: 260,
                maxWidth: 320,
                width: 280,
              },
              enableSorting: false,
              enableHiding: true,
            },
          ]
        : []),
    ],
    [
      isSuperAdmin,
      deletebranchMutation.isPending,
      deactivateMutation.isPending,
      loginAsLoading,
    ],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const addErrorMessage = useMemo(() => {
    if (!addbranchMutation?.isError || !addbranchMutation?.error) return null;
    return getProperErrorMessage(
      addbranchMutation.error,
      "Failed to add Business Manager",
    );
  }, [addbranchMutation?.isError, addbranchMutation?.error]);

  return (
    <main className="p-4 sm:p-6 flex flex-col space-y-4 animate-in fade-in duration-300">
      <ResponseLoader isLoading={isLoading} />

      <header className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <section className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchComponent
            data={filterResults as any}
            displayKey={[
              "name",
              "cluster",
              "zone",
              "centres",
              "username",
              "email",
              "mobileNo",
              "branchName",
            ]}
            onResults={handleSearchResults as any}
            className="w-full sm:w-[220px] md:w-[250px]"
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="gap-2"
          >
            Export Excel
          </Button>
          {isCentral && (
            <>
              <BranchImportModal
                onImport={handleImport}
                isLoading={isImporting}
                cxoOptions={schoolOptions}
              />
              <Dialog
                open={addDialogOpen}
                onOpenChange={(open) => {
                  setAddDialogOpen(open);
                  if (addbranchMutation?.isError) {
                    addbranchMutation.reset();
                  }
                  if (!open) {
                    setAddSelectedZone("");
                    setAddSelectedCluster("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="default" className="text-white">
                    Add Business Manager
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Add Business Manager</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Business Manager Name */}
                      <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="name">Business Manager Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g. Pooja Verma (BM Delhi)"
                          required
                        />
                      </div>

                      {/* Zone */}
                      <div className="grid gap-2">
                        <Label htmlFor="zone">Zone *</Label>
                        <input type="hidden" name="zone" value={addSelectedZone} />
                        <Combobox
                          items={addZoneItems}
                          value={addSelectedZone}
                          onValueChange={(val) => {
                            if (addbranchMutation?.isError) {
                              addbranchMutation.reset();
                            }
                            setAddSelectedZone(val || "");
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

                      {/* Cluster */}
                      <div className="grid gap-2">
                        <Label htmlFor="cluster">Cluster *</Label>
                        <input type="hidden" name="cluster" value={addSelectedCluster} />
                        <Combobox
                          items={addClusterItems}
                          value={addSelectedCluster}
                          onValueChange={(val) => {
                            if (addbranchMutation?.isError) {
                              addbranchMutation.reset();
                            }
                            const newCluster = val || "";
                            setAddSelectedCluster(newCluster);
                            const matched = allUniqueClusters.find(
                              (c) =>
                                c.name.toLowerCase() === newCluster.toLowerCase(),
                            );
                            if (matched?.zone && !addSelectedZone) {
                              setAddSelectedZone(matched.zone);
                            }
                          }}
                          onOpenChange={(isOpen) => {
                            if (isOpen) fetchClustersOnDemand();
                          }}
                          placeholder={
                            isLoadingClusters
                              ? "Loading clusters..."
                              : "Select Cluster"
                          }
                          searchPlaceholder="Search cluster..."
                          emptyMessage={
                            isLoadingClusters
                              ? "Loading clusters..."
                              : addSelectedZone
                              ? `No clusters found in ${addSelectedZone}`
                              : "No clusters available"
                          }
                          width="w-full"
                          className="h-9 text-xs bg-white text-slate-800 font-normal border-slate-200 hover:bg-slate-50"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="bm@lighthouse.com"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mobileNo">Mobile No</Label>
                        <Input
                          id="mobileNo"
                          name="mobileNo"
                          type="tel"
                          placeholder="10-digit mobile number"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          autoComplete="tel"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="e.g. bm_delhi"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showAddPassword ? "text" : "password"}
                            placeholder="Enter password"
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddPassword(!showAddPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showAddPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                      {addErrorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1 font-medium leading-relaxed">
                            {addErrorMessage}
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddDialogOpen(false)}
                          disabled={addbranchMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="text-white"
                          disabled={addbranchMutation.isPending}
                        >
                          {addbranchMutation.isPending
                            ? "Saving..."
                            : "Save user"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
            </>
          )}
        </section>
      </header>

      <section className="flex-1 min-h-0 pt-2">
        <CustomTable
          data={filteredData || []}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          pageSizeArray={[20, 50, "All"]}
          maxHeight="calc(100vh - 240px)"
          minHeight={200}
          showSerialNumber={true}
          noDataMessage="No users found"
          isLoading={isLoading}
        />
      </section>

      <section>
        <div>
          {deleteTarget && (
            <Alert<branch>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${deleteTarget?.branchName} and all associated data.`}
              actionButton={(target) => {
                deletebranchMutation.mutate(target?._id);
                setDeleteTarget(null);
              }}
              target={deleteTarget}
              setTarget={setDeleteTarget}
              butttonText="Delete"
              dialogClassName="w-80" // Fixed width of 320px
            />
          )}
        </div>
      </section>

      <section>
        {editTarget && (
          <BranchEditDialog
            data={{
              ...editTarget,
              schoolId: editTarget?.schoolId?._id,
            }}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              setIsVerified(false);
            }}
            onSave={handleSave}
            schoolOptions={schoolOptions}
            isVerified={isVerified}
            onVerificationRequired={(field) => {
              setCurrentProtectedField(field);
              setIsVerificationDialogOpen(true);
            }}
            isSuperAdmin={isSuperAdmin}
            isSchoolRole={isSchoolRole}
            isBranchGroup={isBranchGroup}
            updatebranchMutation={updatebranchMutation}
            availableZones={availableZones}
            availableClusters={allUniqueClusters}
            onFetchZones={fetchZonesOnDemand}
            onFetchClusters={fetchClustersOnDemand}
            isLoadingZones={isLoadingZones}
            isLoadingClusters={isLoadingClusters}
          />
        )}
      </section>
    </main>
  );
}
