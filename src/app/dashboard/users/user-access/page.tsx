"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { FloatingMenu } from "@/components/floatingMenu";
import ResponseLoader from "@/components/ResponseLoader";
import { Alert } from "@/components/Alert";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useExport } from "@/hooks/useExport";
import { api } from "@/services/apiService";
import { userService } from "@/services/api/userService";
import { zoneService, ZoneItem } from "@/services/api/zoneService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  VisibilityState,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { ChevronDown, X, Edit, Trash2, EyeOff, Eye, LogIn, AlertCircle, Plus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Combobox } from "@/components/ui/combobox";
import { createPortal } from "react-dom";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { loginUser } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useRouter } from "next/navigation";
import { getDecodedToken } from "@/lib/jwt";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";

interface BranchGroupAccess {
  _id: string;
  username: string;
  password: string;
  mobileNo: string;
  email?: string;
  branchGroupName: string;
  regionHeadName?: string;
  schoolId?: { _id: string; schoolName: string };
  AssignedBranch?: { _id: string; branchName: string }[];
  createdAt?: string;
  [key: string]: any;
}



interface SelectOption {
  label: string;
  value: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

const TableBranchDropdown: React.FC<{
  assignedBranches: { _id: string; branchName: string }[];
  branchOptions: SelectOption[];
  onBranchesUpdate: (branchIds: string[]) => void;
  userId: string;
}> = ({ assignedBranches, branchOptions, onBranchesUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedBranches, setLocalSelectedBranches] = useState<string[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Sync assignedBranches → local state
  useEffect(() => {
    setLocalSelectedBranches(assignedBranches.map((b) => b._id));
  }, [assignedBranches]);

  const filteredBranchOptions = branchOptions.filter((b) =>
    b.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected =
    localSelectedBranches.length === branchOptions.length &&
    branchOptions.length > 0;

  const selectedCount = localSelectedBranches.length;

  // Close on outside click
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle branch
  const handleBranchToggle = (branchId: string) => {
    setLocalSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  // Select all
  const handleSelectAll = () => {
    setLocalSelectedBranches(
      allSelected ? [] : branchOptions.map((b) => b.value)
    );
  };

  // Save
  const handleSave = () => {
    onBranchesUpdate(localSelectedBranches);
    setIsOpen(false);
  };

  // Dropdown positioning
  const getDropdownPosition = () => {
    if (!dropdownRef.current) return { top: 0, left: 0 };

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + window.scrollY;
    let maxHeight = 240;

    if (spaceBelow < 200 && spaceAbove > 200) {
      top = rect.top + window.scrollY - Math.min(240, spaceAbove - 20);
      maxHeight = Math.min(240, spaceAbove - 20);
    } else if (spaceBelow < 240) {
      maxHeight = Math.min(240, spaceBelow - 20);
    }

    return {
      top,
      left: rect.left + window.scrollX,
      width: rect.width,
      maxHeight,
    };
  };

  const dropdownPosition = getDropdownPosition();

  return (
    <div className="relative w-full min-w-[250px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[38px] flex items-center justify-between"
      >
        <span className="text-gray-700 truncate">
          {assignedBranches.length > 0
            ? `${assignedBranches.length} Business Manager${assignedBranches.length > 1 ? "s" : ""}`
            : "Assign Business Manager"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Assign Business Managers
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* 🔍 Search bar */}
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: dropdownPosition.maxHeight - 110 }}
            >
              {filteredBranchOptions.length > 0 ? (
                filteredBranchOptions.map((branch) => (
                  <label
                    key={branch.value}
                    className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={localSelectedBranches.includes(branch.value)}
                      onChange={() => handleBranchToggle(branch.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <span className="ml-3 text-sm text-gray-700 truncate flex-1">
                      {branch.label}
                    </span>
                  </label>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-sm text-gray-500">
                  No users found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-200 bg-blue-50 flex justify-between items-center text-xs text-gray-600">
              <span>{selectedCount} users selected</span>

              <button
                type="button"
                onClick={handleSave}
                className="text-blue-700 hover:text-blue-900 font-medium"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// Form Branch Dropdown Component
const BranchDropdown: React.FC<{
  selectedBranches: string[];
  branchOptions: SelectOption[];
  onBranchToggle: (branchId: string) => void;
  onSelectAll: () => void;
}> = ({ selectedBranches, branchOptions, onBranchToggle, onSelectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allSelected =
    selectedBranches.length === branchOptions.length &&
    branchOptions.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const removeBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBranchToggle(branchId);
  };

  // 🔍 Filter branches based on search
  const filteredBranches = useMemo(() => {
    return branchOptions.filter((b) =>
      b.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, branchOptions]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[42px] flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedBranches.length > 0 ? (
            selectedBranches.slice(0, 3).map((branchId) => {
              const branch = branchOptions.find((b) => b.value === branchId);
              return branch ? (
                <span
                  key={branchId}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {branch.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-900 transition-colors"
                    onClick={(e) => removeBranch(branchId, e)}
                  />
                </span>
              ) : null;
            })
          ) : (
            <span className="text-gray-500">Select Business Manager</span>
          )}
          {selectedBranches.length > 3 && (
            <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              +{selectedBranches.length - 3} more
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Business Managers
              </span>
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* 🔍 Search box */}
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filteredBranches.length > 0 ? (
              filteredBranches.map((branch) => (
                <label
                  key={branch.value}
                  className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.value)}
                    onChange={() => onBranchToggle(branch.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {branch.label}
                  </span>
                </label>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                No matching Business Manager
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UserAccessPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: authLogin } = useAuthStore();
  const user = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(user?.role);
  const isCentral =
    normalizedRole === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "central" ||
    user?.role === "Central";
  const { setAccess } = useAccessStore();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [branchGroupsData, setBranchGroupsData] = useState<BranchGroupAccess[]>(
    []
  );
  const [filteredData, setFilteredData] = useState<BranchGroupAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<BranchGroupAccess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchGroupAccess | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editSelectedBranches, setEditSelectedBranches] = useState<string[]>(
    []
  );
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [editSelectedSchool, setEditSelectedSchool] = useState<string | null>(
    null
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const { data: schoolData } = useSchoolData();
  const { data: branchDataFromHook } = useBranchData();



  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [editZone, setEditZone] = useState("");
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const zonesLoadedRef = useRef(false);

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

  // Form state for adding new RSO
  const initialAddForm = {
    branchGroupName: "",
    regionHeadName: "",
    username: "",
    email: "",
    password: "",
    mobileNo: "",
  };
  const [addForm, setAddForm] = useState(initialAddForm);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addFormServerError, setAddFormServerError] = useState<string | null>(null);

  const rsoAddZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      addForm.branchGroupName &&
      !list.some((i) => i.value.toLowerCase() === addForm.branchGroupName.toLowerCase())
    ) {
      list.unshift({
        value: addForm.branchGroupName,
        label: addForm.branchGroupName,
      });
    }
    return list;
  }, [availableZones, addForm.branchGroupName]);

  const rsoEditZoneItems = useMemo(() => {
    const list = availableZones.map((z) => ({
      value: z.name,
      label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
    }));
    if (
      editZone &&
      !list.some((i) => i.value.toLowerCase() === editZone.toLowerCase())
    ) {
      list.unshift({
        value: editZone,
        label: editZone,
      });
    }
    return list;
  }, [availableZones, editZone]);

  const handleAddInputChange = (field: keyof typeof initialAddForm, value: string) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
    if (addFormErrors[field]) {
      setAddFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (addFormServerError) {
      setAddFormServerError(null);
    }
  };

  // Handle "Login" - superAdmin logs in as a group user
  const handleLoginAs = async (username: string, password: string, id: string) => {
    if (!isCentral) {
      toast.error("Only Central administrators have authority to Login As.");
      return;
    }
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
        const decoded = getDecodedToken(authToken);
        const normRole = normalizePrekRole(decoded?.role);
        let targetUrl = "/dashboard/users?tab=bm";
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

  const schoolOptions: SelectOption[] =
    schoolData?.map((s) => ({ label: s.schoolName, value: s._id })) || [];
  const branchOptions: SelectOption[] =
    branchDataFromHook?.map((b) => ({ label: b.branchName, value: b._id })) ||
    [];

  // Fetch all data
  const fetchBranchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const uRes: any = await userService.getUsers({ role: "RSO" });
      const list = uRes?.data || uRes?.users || (Array.isArray(uRes) ? uRes : []);
      if (Array.isArray(list)) {
        const mapped = list.map((u: any) => ({
          ...u,
          _id: u._id || u.id,
          name: u.name || u.username,
          branchGroupName: u.zone || u.branchGroupName || "N/A",
          regionHeadName: u.name || u.regionHeadName || "N/A",
          zone: u.zone || u.branchGroupName || "N/A",
          mobileNo: u.mobileNo || u.phone || "N/A",
          email: u.email || "N/A",
          isActive: u.isActive !== undefined ? u.isActive : (u.Active ?? true),
          Active: u.isActive !== undefined ? u.isActive : (u.Active ?? true),
          branches: u.centres || u.branches || [],
        }));
        setBranchGroupsData(mapped);
        setFilteredData(mapped);
        return;
      }
    } catch (err) {
      console.error("Failed to load RSO user data:", err);
      setBranchGroupsData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranchGroups();
  }, [fetchBranchGroups]);

  // Apply filters
  useEffect(() => {
    let filtered = [...branchGroupsData];

    // Apply search filter
    if (globalFilter.trim()) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.username?.toLowerCase().includes(searchTerm) ||
          item.name?.toLowerCase().includes(searchTerm) ||
          item.zone?.toLowerCase().includes(searchTerm) ||
          item.email?.toLowerCase().includes(searchTerm) ||
          item.branchGroupName?.toLowerCase().includes(searchTerm) ||
          item.regionHeadName?.toLowerCase().includes(searchTerm) ||
          item.mobileNo?.toLowerCase().includes(searchTerm) ||
          item.schoolId?.schoolName?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredData(filtered);
  }, [branchGroupsData, globalFilter]);

  // Handle search
  const handleSearchResults = useCallback((results: BranchGroupAccess[]) => {
    setFilteredData(results);
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newBranchGroup: any) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.createUser({
        name: newBranchGroup.name || newBranchGroup.regionHeadName || newBranchGroup.username,
        username: newBranchGroup.username,
        password: newBranchGroup.password,
        email: newBranchGroup.email,
        phone: newBranchGroup.mobileNo,
        role: "RSO",
        zone: newBranchGroup.zone || newBranchGroup.branchGroupName,
        centres: newBranchGroup.branches || [],
        ...newBranchGroup,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsAddDialogOpen(false);
      setAddForm(initialAddForm);
      setAddFormErrors({});
      setAddFormServerError(null);
      setSelectedBranches([]);
      setSelectedSchool(null);
      toast.success("Regional Safety Officer added successfully");
      fetchBranchGroups();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to add user group";
      setAddFormServerError(msg);
      setError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.updateUser(id, {
        name: data.name || data.regionHeadName || data.username,
        username: data.username,
        password: data.password,
        email: data.email,
        phone: data.mobileNo,
        zone: data.branchGroupName,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setIsEditDialogOpen(false);
      setEditTarget(null);
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      toast.success("Regional Safety Officer updated successfully");
      fetchBranchGroups();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to update user group"),
  });

  const updateBranchesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators have authority for user administration.");
      }
      return await userService.updateUser(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      fetchBranchGroups();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to update users");
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
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      setDeleteTarget(null);
      fetchBranchGroups();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to delete user group"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (branchGroup: any) => {
      if (!isCentral) {
        throw new Error("Access Restricted: Only Central administrators can activate or deactivate users.");
      }
      const token = localStorage.getItem("token");
      const currentActive = branchGroup.isActive !== undefined ? branchGroup.isActive : (branchGroup.Active ?? true);
      try {
        return await userService.updateUserStatus(branchGroup._id, !currentActive);
      } catch {
        return await authAxios.put(
          `/user/deactivate/${branchGroup._id}`,
          {
            Active: !currentActive,
            userRole: branchGroup.role || "RSO",
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchGroups"] });
      toast.success("User group status updated successfully.");
      fetchBranchGroups();
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update user group status: ${err.response?.data?.message || err.message
        }`
      );
    },
  });

  // Handlers
  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleEditBranchToggle = (branchId: string) => {
    setEditSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSelectAll = () => {
    setSelectedBranches(
      selectedBranches.length === branchOptions.length
        ? []
        : branchOptions.map((b) => b.value)
    );
  };

  const handleEditSelectAll = () => {
    setEditSelectedBranches(
      editSelectedBranches.length === branchOptions.length
        ? []
        : branchOptions.map((b) => b.value)
    );
  };

  const handleTableBranchesUpdate = useCallback(
    (userId: string, branchIds: string[]) => {
      updateBranchesMutation.mutate({
        id: userId,
        data: { AssignedBranch: branchIds },
      });
    },
    [updateBranchesMutation]
  );

  const handleSchoolChange = (schoolId: string | undefined) => {
    setSelectedSchool(schoolId || null);
    setSelectedBranches([]);
  };

  const handleEditSchoolChange = (schoolId: string | undefined) => {
    setEditSelectedSchool(schoolId || null);
    setEditSelectedBranches([]);
  };

  const validateAddForm = () => {
    const errors: Record<string, string> = {};

    // Zone
    if (!addForm.branchGroupName.trim()) {
      errors.branchGroupName = "Zone is required";
    }

    // Regional Safety Officer Name
    if (!addForm.regionHeadName.trim()) {
      errors.regionHeadName = "Regional Safety Officer (RSO) name is required";
    }

    // Username
    const username = addForm.username.trim();
    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (/\s/.test(username)) {
      errors.username = "Username cannot contain spaces";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errors.username =
        "Username can only contain letters, numbers, underscores, dots, or hyphens";
    }

    // Email ID
    const email = addForm.email.trim();
    if (!email) {
      errors.email = "Email ID is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      errors.email = "Please enter a valid email address (e.g. name@domain.com)";
    }

    // Password
    if (!addForm.password) {
      errors.password = "Password is required";
    } else if (addForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    // Mobile Number
    const mobileNo = addForm.mobileNo.trim();
    if (!mobileNo) {
      errors.mobileNo = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(mobileNo)) {
      errors.mobileNo = "Mobile number must be a valid 10-digit number";
    }

    return errors;
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    setAddFormServerError(null);

    const validationErrors = validateAddForm();
    if (Object.keys(validationErrors).length > 0) {
      setAddFormErrors(validationErrors);
      return;
    }

    setAddFormErrors({});

    const newBranchGroup = {
      username: addForm.username.trim(),
      password: addForm.password,
      mobileNo: addForm.mobileNo.trim(),
      email: addForm.email.trim().toLowerCase(),
      schoolId: selectedSchool,
      branchGroupName: addForm.branchGroupName.trim(),
      regionHeadName: addForm.regionHeadName.trim(),
      name: addForm.regionHeadName.trim(),
      zone: addForm.branchGroupName.trim(),
      AssignedBranch: selectedBranches,
      branches: selectedBranches,
    };

    try {
      await createMutation.mutateAsync(newBranchGroup);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to add Regional Safety Officer";
      setAddFormServerError(msg);
    }
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    if (!editTarget) return;
    const formData = new FormData(e.currentTarget);
    const selectedRegion = editZone.trim() || ((formData.get("branchGroupName") as string)?.trim());
    if (!selectedRegion) {
      toast.error("Please select a Zone");
      return;
    }
    const updatedBranchGroup = {
      username: (formData.get("username") as string)?.trim(),
      password: formData.get("password") as string,
      mobileNo: (formData.get("mobileNo") as string)?.trim(),
      email: (formData.get("email") as string)?.trim().toLowerCase(),
      schoolId: editSelectedSchool || editTarget.schoolId?._id,
      branchGroupName: selectedRegion,
      regionHeadName: (formData.get("regionHeadName") as string)?.trim(),
      name: (formData.get("regionHeadName") as string)?.trim(),
      zone: selectedRegion,
      AssignedBranch: editSelectedBranches,
      branches: editSelectedBranches,
    };
    await updateMutation.mutateAsync({
      id: editTarget._id,
      data: updatedBranchGroup,
    });
  };

  const handleDelete = () => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority for user administration.");
      return;
    }
    deleteTarget && deleteMutation.mutate(deleteTarget._id);
  };

  // Reset forms
  useEffect(() => {
    if (!isAddDialogOpen) {
      setAddForm(initialAddForm);
      setAddFormErrors({});
      setAddFormServerError(null);
      setSelectedBranches([]);
      setSelectedSchool(null);
      setShowAddPassword(false);
    } else {
      fetchZonesOnDemand();
    }
  }, [isAddDialogOpen, fetchZonesOnDemand]);

  useEffect(() => {
    if (editTarget && isEditDialogOpen) {
      setEditSelectedBranches(
        editTarget.AssignedBranch
          ? editTarget.AssignedBranch.map((b) => b._id)
          : []
      );
      setEditSelectedSchool(editTarget.schoolId?._id || null);
      setEditZone(editTarget.branchGroupName || editTarget.zone || "");
      fetchZonesOnDemand();
    }
  }, [editTarget, isEditDialogOpen, fetchZonesOnDemand]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditSelectedBranches([]);
      setEditSelectedSchool(null);
      setEditTarget(null);
      setEditZone("");
    }
  }, [isEditDialogOpen]);

  const handleDeleteClick = (row: BranchGroupAccess) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${row.branchGroupName}"?`
    );

    if (confirmed) {
      deleteMutation.mutate(row._id);
    }
  };

  // Main columns for CustomTable
  const columns: ColumnDef<BranchGroupAccess, CellContent>[] = useMemo(
    () => [
      {
        header: "Zone",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "custom",
          render: () => (
            <div className="flex items-center gap-2 w-full">
              <span className="font-semibold text-slate-900 whitespace-normal break-words flex-1 leading-snug">
                {row.zone || row.branchGroupName || "N/A"}
              </span>
              {isCentral && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoginAs(row.username, row.password, row._id);
                      }}
                      disabled={loginAsLoading === row._id}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-gray-600/60 dark:hover:bg-gray-500 flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {loginAsLoading === row._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                      ) : (
                        <LogIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Login as {row.name || row.zone || row.username}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ),
        }),
        meta: { flex: 1.2, minWidth: 180, maxWidth: 280 },
      },
      {
        header: "Regional Safety Officer (RSO)",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.name || row.regionHeadName || "N/A",
          render: () => row.name || row.regionHeadName || "N/A",
        }),
        meta: { flex: 1.3, minWidth: 260, maxWidth: 360 },
      },
      {
        header: "Email",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.email || "N/A",
          render: () => row.email || "N/A",
        }),
        meta: { flex: 1.1, minWidth: 180, maxWidth: 260 },
      },
      ...(isCentral
        ? [
            {
              header: "Username",
              accessorFn: (row: BranchGroupAccess) => ({
                type: "text",
                value: row.username || "N/A",
                render: () => row.username || "N/A",
              }),
              meta: { flex: 1, minWidth: 140, maxWidth: 200 },
            },
            {
              header: "Password",
              accessorFn: (row: BranchGroupAccess) => ({
                type: "custom",
                render: () => {
                  const PasswordView = () => {
                    const [show, setShow] = React.useState(false);
                    const { decodedToken } = useAuthStore();
                    const isSuperSupport = decodedToken?.username === "supersupport";
                    const password = row.password || "N/A";

                    return (
                      <div className="flex items-center justify-center gap-2">
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
                            className="p-1 hover:bg-gray-200 rounded cursor-pointer"
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

                  return <PasswordView />;
                },
              }),
              meta: { flex: 1, minWidth: 150, maxWidth: 200 },
            },
          ]
        : []),
      {
        header: "Mobile No",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.mobileNo || row.phone || "N/A",
          render: () => row.mobileNo || row.phone || "N/A",
        }),
        meta: { flex: 0.9, minWidth: 130, maxWidth: 180 },
      },
      {
        header: "Status",
        accessorFn: (row: BranchGroupAccess) => {
          const isAct = row.isActive !== undefined ? row.isActive : (row.Active ?? true);
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
      },
      {
        header: "Registration Date",
        accessorFn: (row: BranchGroupAccess) => ({
          type: "text",
          value: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-GB")
            : "N/A",
          render: () =>
            row.createdAt
              ? new Date(row.createdAt).toLocaleDateString("en-GB")
              : "N/A",
        }),
        meta: { flex: 0.9, minWidth: 140, maxWidth: 200 },
      },
      ...(isCentral
        ? [
            {
              header: "Action",
              accessorFn: (row: BranchGroupAccess) => {
                const isAct = row.isActive !== undefined ? row.isActive : (row.Active ?? true);
                return {
                  type: "group",
                  items: [
                    {
                      type: "button",
                      label: "Edit",
                      onClick: () => {
                        setEditTarget(row);
                        setEditZone(row.branchGroupName || row.zone || "");
                        fetchZonesOnDemand();
                        setIsEditDialogOpen(true);
                      },
                      className:
                        "cursor-pointer flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-xs transition-colors",
                    },
                    {
                      type: "button",
                      label: "Delete",
                      onClick: () => handleDeleteClick(row),
                      className:
                        "bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md cursor-pointer text-xs transition-colors duration-200",
                    },
                    {
                      type: "button",
                      label: isAct ? "Deactivate" : "Activate",
                      onClick: () => deactivateMutation.mutate(row),
                      className: `text-xs font-semibold py-1 px-3 rounded-md cursor-pointer transition-colors ${
                        isAct
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      }`,
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
            },
          ]
        : []),
    ],
    [loginAsLoading, deactivateMutation.isPending, isCentral]
  );

  // Create table instance for column visibility
  const table = useReactTable({
    data: filteredData.slice(0, 1), // Just for column structure
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const filteredBranches = useMemo(() => {
    if (selectedSchool) {
      return (
        branchDataFromHook
          ?.filter((b) => b.schoolId?._id === selectedSchool)
          .map((b) => ({ label: b.branchName, value: b._id })) || []
      );
    }
    return (
      branchDataFromHook?.map((b) => ({ label: b.branchName, value: b._id })) || []
    );
  }, [selectedSchool, branchDataFromHook]);

  const filteredEditBranches = useMemo(() => {
    if (editSelectedSchool) {
      return (
        branchDataFromHook
          ?.filter((b) => b.schoolId?._id === editSelectedSchool)
          .map((b) => ({ label: b.branchName, value: b._id })) || []
      );
    }
    return (
      branchDataFromHook?.map((b) => ({ label: b.branchName, value: b._id })) || []
    );
  }, [editSelectedSchool, branchDataFromHook]);

  return (
    <main className="p-4 sm:p-6 flex flex-col space-y-4 animate-in fade-in duration-300">
      <ResponseLoader
        isLoading={
          isLoading ||
          createMutation.isPending ||
          updateMutation.isPending ||
          deleteMutation.isPending ||
          updateBranchesMutation.isPending
        }
      />
      {error && (
        <div className="text-red-600 p-2 border border-red-300 bg-red-50 mb-4 rounded">
          {error}
        </div>
      )}

      <header className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <section className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchComponent
            data={branchGroupsData}
            displayKey={[
              "name",
              "username",
              "zone",
              "email",
              "branchGroupName",
              "regionHeadName",
              "mobileNo",
            ]}
            onResults={handleSearchResults}
            className="w-full sm:w-[240px] md:w-[300px]"
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        {isCentral && (
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (open) fetchZonesOnDemand();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="default" className="text-white cursor-pointer gap-2">
                <Plus className="h-4 w-4" /> Add Regional Safety Officer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddUser} className="space-y-4" noValidate>
                <DialogHeader>
                  <DialogTitle>Add Regional Safety Officer (RSO)</DialogTitle>
                </DialogHeader>

                {/* Direct In-Form Server / Submission Error */}
                {addFormServerError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs text-red-800">Error</p>
                      <p className="text-xs text-red-600 mt-0.5">{addFormServerError}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  {/* Zone */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="branchGroupName" className="text-xs font-semibold text-slate-700">
                      Zone <span className="text-red-500">*</span>
                    </Label>
                    <Combobox
                      items={rsoAddZoneItems}
                      value={addForm.branchGroupName}
                      onValueChange={(val) => handleAddInputChange("branchGroupName", val || "")}
                      placeholder={isLoadingZones ? "Loading zones..." : "Select zone"}
                      searchPlaceholder="Search zone..."
                      emptyMessage={isLoadingZones ? "Loading zones..." : "No zones found."}
                      onOpenChange={(open) => {
                        if (open) fetchZonesOnDemand();
                      }}
                      className={addFormErrors.branchGroupName ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20 w-full" : "w-full"}
                    />
                    {addFormErrors.branchGroupName && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {addFormErrors.branchGroupName}
                      </p>
                    )}
                  </div>

                  {/* Regional Safety Officer (RSO) Name */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="regionHeadName" className="text-xs font-semibold text-slate-700">
                      Regional Safety Officer (RSO) Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="regionHeadName"
                      name="regionHeadName"
                      value={addForm.regionHeadName}
                      onChange={(e) => handleAddInputChange("regionHeadName", e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className={addFormErrors.regionHeadName ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20" : ""}
                    />
                    {addFormErrors.regionHeadName && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {addFormErrors.regionHeadName}
                      </p>
                    )}
                  </div>

                  {/* Username & Email ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                        Username <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        value={addForm.username}
                        onChange={(e) => handleAddInputChange("username", e.target.value)}
                        placeholder="e.g. rso_north"
                        className={addFormErrors.username ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20" : ""}
                      />
                      {addFormErrors.username && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {addFormErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                        Email ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={addForm.email}
                        onChange={(e) => handleAddInputChange("email", e.target.value)}
                        placeholder="e.g. rso.north@lighthouse.com"
                        className={addFormErrors.email ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20" : ""}
                      />
                      {addFormErrors.email && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {addFormErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password & Mobile No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showAddPassword ? "text" : "password"}
                          value={addForm.password}
                          onChange={(e) => handleAddInputChange("password", e.target.value)}
                          placeholder="Min. 6 characters"
                          className={`pr-10 ${addFormErrors.password ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddPassword(!showAddPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        >
                          {showAddPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {addFormErrors.password && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {addFormErrors.password}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="mobileNo" className="text-xs font-semibold text-slate-700">
                        Mobile No <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="mobileNo"
                        name="mobileNo"
                        type="tel"
                        value={addForm.mobileNo}
                        onChange={(e) => handleAddInputChange("mobileNo", e.target.value)}
                        placeholder="10-digit number"
                        maxLength={10}
                        className={addFormErrors.mobileNo ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20" : ""}
                      />
                      {addFormErrors.mobileNo && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5 animate-in fade-in duration-150">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {addFormErrors.mobileNo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    className="text-white cursor-pointer bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Saving..." : "Save RSO"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Table Wrapper - Remove overflow constraints that might cut off dropdowns */}
      <section className="flex-1 min-h-0 pt-2 relative">
        <div className="custom-table-container">
          <CustomTable
            data={filteredData || []}
            columns={columns}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            pageSizeArray={[20, 50, "All"]}
            maxHeight="calc(100vh - 240px)"
            minHeight={200}
            showSerialNumber={true}
            noDataMessage={error || "No user groups found"}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (open) fetchZonesOnDemand();
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Edit Regional Safety Officer (RSO)</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="edit-username">UserName</Label>
                <Input
                  id="edit-username"
                  name="username"
                  defaultValue={editTarget.username}
                  required
                />

                <Label htmlFor="edit-email">Email ID</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editTarget.email && editTarget.email !== "N/A" ? editTarget.email : ""}
                  placeholder="Enter email ID"
                />

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-branchGroupName">Zone <span className="text-red-500">*</span></Label>
                  <input
                    type="hidden"
                    id="edit-branchGroupName"
                    name="branchGroupName"
                    value={editZone}
                  />
                  <Combobox
                    items={rsoEditZoneItems}
                    value={editZone}
                    onValueChange={(val) => setEditZone(val || "")}
                    placeholder={isLoadingZones ? "Loading zones..." : "Select zone"}
                    searchPlaceholder="Search zone..."
                    emptyMessage={isLoadingZones ? "Loading zones..." : "No zones found."}
                    onOpenChange={(open) => {
                      if (open) fetchZonesOnDemand();
                    }}
                    className="w-full"
                  />
                </div>

                <Label htmlFor="edit-regionHeadName">Regional Safety Officer (RSO) Name</Label>
                <Input
                  id="edit-regionHeadName"
                  name="regionHeadName"
                  defaultValue={editTarget.regionHeadName || ""}
                  placeholder="Enter regional head name"
                  required
                />

                <Label htmlFor="edit-password">Password</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    name="password"
                    type={showEditPassword ? "text" : "password"}
                    defaultValue={editTarget.password}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <Label htmlFor="edit-mobileNo">Mobile No</Label>
                <Input
                  id="edit-mobileNo"
                  name="mobileNo"
                  defaultValue={editTarget.mobileNo || ""}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-white" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
