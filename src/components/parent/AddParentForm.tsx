"use client";

import { useEffect, useState } from "react";
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
      setParentName(initialData.parentName);
      setMobileNo(initialData.mobileNo);
      setEmail(initialData.email);
      setUsername(initialData.username);
      onSchoolChange?.(initialData.schoolId?._id);
      onBranchChange?.(initialData.branchId?._id);
    }
  }, [initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!parentName.trim()) newErrors.parentName = "Coordinator name is required";
    
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

    if (decodedTokenRole === "superAdmin" && !selectedSchoolId) {
      newErrors.schoolId = "School selection is required";
    }

    if (decodedTokenRole !== "branch" && !selectedBranchId) {
      newErrors.branchId = "Branch selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSubmit({
        parentName: parentName.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim(),
        username: username.trim(),
        ...(initialData ? {} : { password }),
        schoolId: selectedSchoolId,
        branchId: selectedBranchId,
      });
    }
  };

  return (
    <Card className="w-[420px] shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Coordinator" : "Add Coordinator"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* NAME */}
        <div>
          <label className="text-sm font-medium">Coordinator Name *</label>
          <Input
            placeholder="Enter coordinator name"
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

        {/* SCHOOL */}
        {decodedTokenRole === "superAdmin" && (
          <div>
            <label className="text-sm font-medium">School *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn("w-full justify-between", errors.schoolId && "border-red-500")}
                >
                  {schools.find((s) => s._id === selectedSchoolId)
                    ?.schoolName || "Select School"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search school..." />
                  <CommandEmpty>No schools found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {schools.map((s) => (
                      <CommandItem
                        key={s._id}
                        onSelect={() => {
                          onSchoolChange?.(s._id);
                          if (errors.schoolId) setErrors({ ...errors, schoolId: "" });
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            s._id === selectedSchoolId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {s.schoolName}
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

        {/* BRANCH */}
        {decodedTokenRole !== "branch" && (
          <div>
            <label className="text-sm font-medium">Branch *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-between", errors.branchId && "border-red-500")}
                  disabled={
                    decodedTokenRole === "superAdmin" && !selectedSchoolId
                  }
                >
                  {branches.find((b) => b._id === selectedBranchId)
                    ?.branchName ||
                    (selectedSchoolId
                      ? "Select Branch"
                      : "Select school first")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search branch..." />
                  <CommandEmpty>No branches found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {branches.map((b) => (
                      <CommandItem
                        key={b._id}
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
