"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { auditService } from "@/services/api/auditService";
import { useAuthStore } from "@/store/authStore";
import { useAuditStore } from "@/store/auditStore";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface ConductAuditModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConductAuditModal({
  trigger,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
}: ConductAuditModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const user = useAuthStore((state) => state.decodedToken);
  const normalizedRole = normalizePrekRole(user?.role);
  const isSuperAdmin =
    normalizedRole === PREK_ROLES.CENTRAL || user?.role === "superAdmin";
  const isBranchGroup =
    normalizedRole === PREK_ROLES.RSO || user?.role === "branchGroup";
  const isSchool =
    normalizedRole === PREK_ROLES.BM || user?.role === "branch";

  const { auditId, setAuditData } = useAuditStore();

  const { data: schoolsData, isLoading: isSchoolsLoading } =
    useSchoolDropdown(isSuperAdmin);

  const { data: branchesData, isLoading: isBranchesLoading } =
    useBranchDropdown(
      isSuperAdmin ? selectedSchoolId : undefined,
      isSuperAdmin ? !!selectedSchoolId : isBranchGroup,
      isBranchGroup
    );

  const schoolItems = useMemo(
    () =>
      schoolsData?.map((school) => ({
        label: school.schoolName || school.name || "Unnamed Region",
        value: school._id,
      })) || [],
    [schoolsData]
  );

  const branchItems = useMemo(
    () =>
      branchesData?.map((branch) => ({
        label: branch.branchName || branch.name || "Unnamed Centre",
        value: branch._id,
      })) || [],
    [branchesData]
  );

  const createAuditMutation = useMutation({
    mutationFn: () => {
      const payload: any = {};
      if (isSuperAdmin) {
        payload.schoolId = selectedSchoolId;
        payload.branchId = selectedBranchId;
      } else if (isBranchGroup) {
        payload.schoolId = user?.schoolId;
        payload.branchId = selectedBranchId;
      } else {
        payload.branchId = user?.schoolId;
      }
      return auditService.createAudit(payload);
    },
    onSuccess: (response: any) => {
      if (response?.success && response?.data) {
        setAuditData(response.data);
        toast.success("Inspection protocol session initialized!");
        setOpen(false);
        router.push("/dashboard/safety-and-audit");
      } else {
        toast.error(response?.message || "Failed to start inspection session");
      }
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to initiate audit inspection."
      );
    },
  });

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    createAuditMutation.mutate();
  };

  const handleResumeOngoing = () => {
    setOpen(false);
    router.push("/dashboard/safety-and-audit");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleStart} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Conduct Safety Audit
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Initialize an official safety & audit inspection protocol.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Ongoing audit banner if one already exists */}
          {auditId && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-xs flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
                  Audit in Progress
                </span>
                <p className="text-amber-700 text-[11px]">
                  ID: <span className="font-mono font-medium">{auditId}</span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-white hover:bg-amber-100 border-amber-300 text-amber-800 cursor-pointer font-medium"
                onClick={handleResumeOngoing}
              >
                Resume Protocol
                <ArrowRight className="h-3.5 w-3.5 ml-1 text-amber-600" />
              </Button>
            </div>
          )}

          {/* Inspector Details Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Auditor / Inspector:
              </span>
              <span className="font-semibold text-slate-900">
                {user?.username || "Authenticated Inspector"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                Role:
              </span>
              <span className="font-semibold text-blue-700 uppercase">
                {normalizedRole || user?.role || "Inspector"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Session Date:
              </span>
              <span className="font-mono text-slate-800">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Location Selectors */}
          <div className="grid gap-3 pt-1">
            {isSuperAdmin ? (
              <>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="school-select"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Target Region *
                  </Label>
                  <Combobox
                    items={schoolItems}
                    value={selectedSchoolId}
                    onValueChange={(val) => {
                      setSelectedSchoolId(val || "");
                      setSelectedBranchId("");
                    }}
                    placeholder="Select region..."
                    searchPlaceholder="Search regions..."
                    emptyMessage={
                      isSchoolsLoading
                        ? "Synchronizing…"
                        : "No regions found."
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="branch-select"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Target Centre / School *
                  </Label>
                  <Combobox
                    items={branchItems}
                    value={selectedBranchId}
                    onValueChange={(val) => setSelectedBranchId(val || "")}
                    placeholder="Select centre..."
                    searchPlaceholder="Search centres..."
                    emptyMessage={
                      !selectedSchoolId
                        ? "Select a region first"
                        : isBranchesLoading
                          ? "Syncing centres…"
                          : "No centres found."
                    }
                    disabled={!selectedSchoolId || isBranchesLoading}
                  />
                </div>
              </>
            ) : isBranchGroup ? (
              <div className="space-y-1.5">
                <Label
                  htmlFor="branch-select"
                  className="text-xs font-semibold text-slate-700"
                >
                  Target Centre / School *
                </Label>
                <Combobox
                  items={branchItems}
                  value={selectedBranchId}
                  onValueChange={(val) => setSelectedBranchId(val || "")}
                  placeholder="Select centre..."
                  searchPlaceholder="Search centres..."
                  emptyMessage={
                    isBranchesLoading
                      ? "Synchronizing…"
                      : "No centres found."
                  }
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="cursor-pointer">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="text-white bg-slate-900 hover:bg-slate-800 cursor-pointer font-semibold"
              disabled={
                createAuditMutation.isPending ||
                (isSuperAdmin && (!selectedSchoolId || !selectedBranchId)) ||
                (isBranchGroup && !selectedBranchId)
              }
            >
              {createAuditMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                  Initializing Protocol...
                </>
              ) : (
                <>
                  <ClipboardCheck className="mr-2 h-4 w-4 text-amber-400" />
                  Commence Inspection
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
