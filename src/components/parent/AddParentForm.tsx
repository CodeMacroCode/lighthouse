"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Parent } from "@/interface/modal";
import { useBranchGroupDropdown } from "@/hooks/useDropdown";

interface Props {
  onSubmit: (data: {
    parentName: string;
    mobileNo: string;
    email: string;
    username: string;
    password?: string;
    schoolId?: string;
    branchId?: string;
  }) => void;

  onClose: () => void;
  initialData?: Parent | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;

  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
  isCreating?: boolean;
  isUpdating?: boolean;
}

export default function AddParentForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  selectedSchoolId,
  selectedBranchId,
  onSchoolChange,
  onBranchChange,
  decodedToken,
  isCreating,
  isUpdating,
}: Props) {
  const [parentName, setParentName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedTokenRole === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.id;

  // Fetch branch groups for Regional Head dropdown (https://lighthouse.run.place/api/api/branchGroup)
  const { data: branchGroups = [] } = useBranchGroupDropdown(
    decodedTokenRole === "superAdmin" || !decodedTokenRole
  );

  const [selectedRegionalHeadId, setSelectedRegionalHeadId] = useState<string | undefined>(
    selectedSchoolId
  );

  /* ✅ Token based auto selection */
  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      onSchoolChange?.(tokenSchoolId);
    }

    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }
  }, []);

  /* ✅ Edit Prefill */
  useEffect(() => {
    if (initialData) {
      setParentName(initialData.parentName || "");
      setMobileNo(initialData.mobileNo || "");
      setEmail(initialData.email || "");
      setUsername(initialData.username || "");

      const initBranchId =
        typeof initialData.branchId === "object"
          ? initialData.branchId?._id
          : initialData.branchId;
      const initSchoolId =
        typeof initialData.schoolId === "object"
          ? initialData.schoolId?._id
          : initialData.schoolId;

      // Find matching branch group by assigned branch or school
      const matchingBg = branchGroups.find(
        (bg: any) =>
          (initBranchId &&
            bg.AssignedBranch?.some((b: any) => b._id === initBranchId)) ||
          (initSchoolId &&
            (bg._id === initSchoolId ||
              bg.schoolId?._id === initSchoolId ||
              bg.schoolId === initSchoolId))
      );

      if (matchingBg) {
        setSelectedRegionalHeadId(matchingBg._id);
        const effectiveSchoolId =
          typeof matchingBg.schoolId === "object"
            ? matchingBg.schoolId?._id
            : matchingBg.schoolId || matchingBg._id;
        onSchoolChange?.(effectiveSchoolId);
      } else if (initSchoolId) {
        setSelectedRegionalHeadId(initSchoolId);
        onSchoolChange?.(initSchoolId);
      }

      if (initBranchId) {
        onBranchChange?.(initBranchId);
      }
    }
  }, [initialData, branchGroups]);

  // Keep selectedRegionalHeadId in sync if selectedSchoolId is set externally
  useEffect(() => {
    if (selectedSchoolId && !selectedRegionalHeadId && branchGroups.length > 0) {
      const match = branchGroups.find(
        (bg: any) =>
          bg._id === selectedSchoolId ||
          bg.schoolId?._id === selectedSchoolId ||
          bg.schoolId === selectedSchoolId
      );
      if (match) {
        setSelectedRegionalHeadId(match._id);
      }
    }
  }, [selectedSchoolId, selectedRegionalHeadId, branchGroups]);

  const selectedRegionalHead = useMemo(() => {
    return branchGroups.find(
      (bg: any) =>
        bg._id === selectedRegionalHeadId ||
        (selectedSchoolId &&
          (bg._id === selectedSchoolId ||
            bg.schoolId?._id === selectedSchoolId ||
            bg.schoolId === selectedSchoolId))
    );
  }, [branchGroups, selectedRegionalHeadId, selectedSchoolId]);

  const availableBranches = useMemo(() => {
    if (selectedRegionalHead?.AssignedBranch && selectedRegionalHead.AssignedBranch.length > 0) {
      return selectedRegionalHead.AssignedBranch.map((b: any) => ({
        _id: b._id,
        branchName: b.branchName || b.name,
      }));
    }
    return branches || [];
  }, [selectedRegionalHead, branches]);

  const getRegionalHeadLabel = (bg: any) => {
    if (bg.branchGroupName && bg.regionHeadName) {
      return `${bg.branchGroupName} - ${bg.regionHeadName}`;
    }
    return bg.branchGroupName || bg.regionHeadName || "Unnamed Regional Head";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!parentName.trim()) newErrors.parentName = "Area Operations Manager name is required";
    
    if (!mobileNo.trim()) {
      newErrors.mobileNo = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobileNo.trim())) {
      newErrors.mobileNo = "Mobile number must be exactly 10 digits";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }

    if (!username.trim()) newErrors.username = "Username is required";
    
    if (!initialData) {
      if (!password) {
        newErrors.password = "Password is required";
      } else if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (
      decodedTokenRole === "superAdmin" &&
      !selectedRegionalHeadId &&
      !selectedSchoolId
    ) {
      newErrors.schoolId = "Regional Head selection is required";
    }

    if (decodedTokenRole !== "branch" && !selectedBranchId) {
      newErrors.branchId = "Business Manager selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      const effectiveSchoolId =
        (typeof selectedRegionalHead?.schoolId === "object"
          ? selectedRegionalHead?.schoolId?._id
          : selectedRegionalHead?.schoolId) ||
        selectedSchoolId ||
        selectedRegionalHeadId;

      onSubmit({
        parentName: parentName.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim(),
        username: username.trim(),
        ...(initialData ? {} : { password }),
        schoolId: effectiveSchoolId,
        branchId: selectedBranchId,
      });
    }
  };

  return (
    <Card className="w-full max-w-[440px] mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Area Operations Manager" : "Add Area Operations Manager"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* NAME */}
        <div>
          <label className="text-sm font-medium">Area Operations Manager Name *</label>
          <Input
            placeholder="Enter area operations manager name"
            value={parentName}
            onChange={(e) => {
              setParentName(e.target.value);
              if (errors.parentName) setErrors({ ...errors, parentName: "" });
            }}
            className={errors.parentName ? "border-red-500" : ""}
          />
          {errors.parentName && (
            <p className="text-xs text-red-500 mt-1">{errors.parentName}</p>
          )}
        </div>

        {/* MOBILE */}
        <div>
          <label className="text-sm font-medium">Mobile No *</label>
          <Input
            placeholder="Enter mobile number"
            value={mobileNo}
            maxLength={10}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              setMobileNo(val);
              if (errors.mobileNo) setErrors({ ...errors, mobileNo: "" });
            }}
            className={errors.mobileNo ? "border-red-500" : ""}
          />
          {errors.mobileNo && (
            <p className="text-xs text-red-500 mt-1">{errors.mobileNo}</p>
          )}
        </div>

        {/* EMAIL */}
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            placeholder="Enter email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        {/* USERNAME */}
        <div>
          <label className="text-sm font-medium">Username *</label>
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors.username) setErrors({ ...errors, username: "" });
            }}
            className={errors.username ? "border-red-500" : ""}
          />
          {errors.username && (
            <p className="text-xs text-red-500 mt-1">{errors.username}</p>
          )}
        </div>

        {/* PASSWORD */}
        {!initialData && (
          <div>
            <label className="text-sm font-medium">Password *</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                className={cn("pr-10", errors.password ? "border-red-500" : "")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
        )}

        {/* REGIONAL HEAD (from /branchGroup) */}
        {decodedTokenRole === "superAdmin" && (
          <div>
            <label className="text-sm font-medium">Regional Head *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn("w-full justify-between", errors.schoolId && "border-red-500")}
                >
                  {selectedRegionalHead
                    ? getRegionalHeadLabel(selectedRegionalHead)
                    : (schools?.find((s) => s._id === selectedSchoolId)?.schoolName || "Select Regional Head")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(360px,calc(100vw-3rem))] p-0">
                <Command>
                  <CommandInput placeholder="Search regional head..." />
                  <CommandEmpty>No regional heads found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {branchGroups.map((bg: any) => (
                      <CommandItem
                        key={bg._id}
                        value={`${bg.branchGroupName || ""} ${bg.regionHeadName || ""}`}
                        onSelect={() => {
                          setSelectedRegionalHeadId(bg._id);
                          const effectiveSchoolId =
                            typeof bg.schoolId === "object"
                              ? bg.schoolId?._id
                              : (bg.schoolId || bg._id);
                          onSchoolChange?.(effectiveSchoolId);
                          if (
                            selectedBranchId &&
                            bg.AssignedBranch &&
                            !bg.AssignedBranch.some((b: any) => b._id === selectedBranchId)
                          ) {
                            onBranchChange?.(undefined);
                          }
                          if (errors.schoolId) setErrors({ ...errors, schoolId: "" });
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            (selectedRegionalHeadId === bg._id || selectedRegionalHead?._id === bg._id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {getRegionalHeadLabel(bg)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.schoolId && (
              <p className="text-xs text-red-500 mt-1">{errors.schoolId}</p>
            )}
          </div>
        )}

        {/* BUSINESS MANAGER (BRANCH) */}
        {decodedTokenRole !== "branch" && (
          <div>
            <label className="text-sm font-medium">Business Manager *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-between", errors.branchId && "border-red-500")}
                  disabled={
                    decodedTokenRole === "superAdmin" && !selectedRegionalHeadId && !selectedSchoolId
                  }
                >
                  {availableBranches.find((b: any) => b._id === selectedBranchId)
                    ?.branchName ||
                    (selectedRegionalHeadId || selectedSchoolId
                      ? "Select Business Manager"
                      : "Select regional head first")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(360px,calc(100vw-3rem))] p-0">
                <Command>
                  <CommandInput placeholder="Search business manager..." />
                  <CommandEmpty>No business managers found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {availableBranches.map((b: any) => (
                      <CommandItem
                        key={b._id}
                        value={b.branchName}
                        onSelect={() => {
                          onBranchChange?.(b._id);
                          if (errors.branchId) setErrors({ ...errors, branchId: "" });
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            b._id === selectedBranchId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {b.branchName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.branchId && (
              <p className="text-xs text-red-500 mt-1">{errors.branchId}</p>
            )}
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" className="cursor-pointer" onClick={onClose} disabled={isCreating || isUpdating}>
            Cancel
          </Button>
          <Button 
            className="bg-primary cursor-pointer" 
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update" : "Create")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
