"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { auditService } from "@/services/api/auditService";
import { useAuthStore } from "@/store/authStore";
import { useAuditStore } from "@/store/auditStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Loader2,
  ClipboardCheck,
  ChevronRight,
  Info,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  School,
  Flame,
  Settings,
  Building2,
  Zap,
  Heart,
  ShieldAlert,
  Truck,
  Soup,
  UserCheck,
  ScrollText,
  MoreHorizontal,
  RefreshCcw,
  History,
} from "lucide-react";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import SearchComponent from "@/components/ui/SearchOnlydata";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import ResponseLoader from "@/components/ResponseLoader";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { getAuditColumns } from "@/components/columns/columns";
import { PaginationState } from "@tanstack/react-table";
import { Audit } from "@/interface/modal";
import { ViewAuditDetails } from "@/components/audit/ViewAuditDetails";

interface ParameterState {
  name: string;
  key?: string;
  score: number | null;
  isCritical: boolean;
  remark: string;
}

const SECTION_A_PARAMETERS = [
  {
    name: "School Child Protection and Zero Tolerance Policy available and displayed at prominent location",
    isCritical: false,
    key: "child_protection_policy",
  },
  {
    name: "Mandatory safety committees are formed",
    isCritical: false,
    key: "safety_committees_formed",
  },
  {
    name: "Mandatory Safety & Transport Committee meetings conducted as per prescribed frequency (minutes available)",
    isCritical: true,
    key: "safety_committee_meetings",
  },
  {
    name: "Emergency Response Team is formed and roles defined",
    isCritical: false,
    key: "emergency_response_team",
  },
  {
    name: "Annual safety audit conducted",
    isCritical: false,
    key: "annual_safety_audit",
  },
  {
    name: "Legal Register available, updated & reviewed periodically",
    isCritical: true,
    key: "legal_register",
  },
];

const SECTION_B_PARAMETERS = [
  { name: "Valid Fire NOC available", isCritical: true, key: "fire_noc" },
  {
    name: "Fire extinguishers available & tagged",
    isCritical: true,
    key: "fire_extinguishers",
  },
  {
    name: "Fire alarm / detection system functional",
    isCritical: true,
    key: "fire_alarm_system",
  },
  {
    name: "Emergency exits clearly marked & unlocked",
    isCritical: true,
    key: "emergency_exits",
  },
  {
    name: "Evacuation plan displayed on each floor",
    isCritical: false,
    key: "evacuation_plan",
  },
  {
    name: "Fire drills conducted (min twice/year)",
    isCritical: false,
    key: "fire_drills",
  },
  {
    name: "Uninterrupted power supply for Fire Pumps available",
    isCritical: true,
    key: "fire_pump_power",
  },
];

const SECTION_C_PARAMETERS = [
  {
    name: "Structural safety certificate",
    isCritical: false,
    key: "structural_safety_cert",
  },
  {
    name: "Staircases with handrails & anti-skid",
    isCritical: false,
    key: "staircase_safety",
  },
  {
    name: "Boundary wall secure & intact",
    isCritical: false,
    key: "boundary_wall",
  },
  {
    name: "Rooftop access restricted",
    isCritical: true,
    key: "rooftop_access",
  },
  {
    name: "No exposed electrical wiring",
    isCritical: true,
    key: "no_exposed_wiring",
  },
  { name: "ELCB / MCB installed & tested", isCritical: true, key: "elcb_mcb" },
  {
    name: "Earthing pits marked, accessible & annual resistance test conducted with records",
    isCritical: true,
    key: "earthing_test",
  },
  {
    name: "All infrastructure safety checklists updated & maintained",
    isCritical: false,
    key: "infra_checklists",
  },
];

const SECTION_D_PARAMETERS = [
  {
    name: "Electrical panels locked & labeled",
    isCritical: false,
    key: "electrical_panels_locked",
  },
  {
    name: "Generator / DG AMC and stack emission record (if applicable) maintained",
    isCritical: false,
    key: "dg_set_amc",
  },
  {
    name: "PPEs are available and used in Laboratories by students",
    isCritical: false,
    key: "lab_ppe_usage",
  },
  {
    name: "Gas cylinders secured & leak-tested",
    isCritical: true,
    key: "gas_cylinder_safety",
  },
  {
    name: "Chemical stored and secured as per compatibility given in MSDS",
    isCritical: false,
    key: "chemical_storage_safety",
  },
];

const SECTION_E_PARAMETERS = [
  {
    name: "POSCO compliance & staff sensitization",
    isCritical: true,
    key: "posco_compliance",
  },
  {
    name: "Background verification completed for all staff (teaching/non-teaching/contract/third party)",
    isCritical: true,
    key: "background_verification",
  },
  {
    name: "Anti‑bullying policy & reporting available",
    isCritical: false,
    key: "anti_bullying_policy",
  },
  {
    name: "CCTV monitoring & data retention",
    isCritical: false,
    key: "cctv_monitoring",
  },
  {
    name: "Risk assessment conducted prior to events, excursions, field trips (records available)",
    isCritical: true,
    key: "risk_assessment",
  },
];

const SECTION_F_PARAMETERS = [
  {
    name: "Single controlled entry / exit points",
    isCritical: true,
    key: "single_entry_exit",
  },
  {
    name: "Visitor are verified and visitors log is maintained",
    isCritical: true,
    key: "visitor_log",
  },
  {
    name: "Security guards trained as per training calendar",
    isCritical: false,
    key: "security_guard_training",
  },
  { name: "Staff ID cards enforced", isCritical: false, key: "staff_id_cards" },
  {
    name: "Perimeter lighting is available",
    isCritical: false,
    key: "perimeter_lighting",
  },
  {
    name: "Uninterrupted power supply for CCTV system available",
    isCritical: true,
    key: "cctv_power_backup",
  },
];

const SECTION_G_PARAMETERS = [
  {
    name: "First aid boxes are available and checked monthly",
    isCritical: true,
    key: "first_aid",
  },
  {
    name: "Nurse and trained first aiders available",
    isCritical: true,
    key: "nurse_available",
  },
  {
    name: "Emergency contacts displayed",
    isCritical: false,
    key: "emergency_contacts_display",
  },
  {
    name: "Tie-up with nearby hospital done",
    isCritical: true,
    key: "hospital_tieup",
  },
  {
    name: "Student medical records maintained",
    isCritical: false,
    key: "student_medical_records",
  },
  {
    name: "Annual health check-up conducted for students",
    isCritical: false,
    key: "annual_health_checkup",
  },
  {
    name: "Drinking water testing conducted as per frequency & reports maintained",
    isCritical: true,
    key: "water_testing",
  },
  {
    name: "Bio-medical waste bins available, identified & disposed as per norms with records",
    isCritical: true,
    key: "bio_medical_waste",
  },
  {
    name: "E-waste disposed as per norms and records maintained",
    isCritical: true,
    key: "e_waste",
  },
];

const SECTION_H_PARAMETERS = [
  {
    name: "Vehicle fitness & permits valid",
    isCritical: true,
    key: "vehicle_fitness",
  },
  {
    name: "Driver police verification",
    isCritical: true,
    key: "driver_police_verification",
  },
  {
    name: "Driver medical fitness & eye test records available",
    isCritical: true,
    key: "driver_medical",
  },
  {
    name: "Female attendant Police Verification ",
    isCritical: false,
    key: "female_attendant_verification",
  },
  {
    name: "Speed governors and GPS installed",
    isCritical: true,
    key: "gps_tracking",
  },
  {
    name: "Bus safety drills conducted (once a year)",
    isCritical: false,
    key: "bus_safety_drills",
  },
  {
    name: "Minimum 30‑day CCTV backup available for school buses",
    isCritical: true,
    key: "bus_cctv_backup",
  },
];

const SECTION_I_PARAMETERS = [
  {
    name: "Cleaning schedules maintained & supervisor sign-off available",
    isCritical: false,
    key: "cleaning_schedules",
  },
  {
    name: "Pest control conducted at defined frequency",
    isCritical: false,
    key: "pest_control",
  },
  {
    name: "Safe storage of cleaning chemicals",
    isCritical: false,
    key: "cleaning_chemical_storage",
  },
  {
    name: "Valid FSSAI license available (where kitchen / canteen exists)",
    isCritical: true,
    key: "fssai_license",
  },
];

const SECTIONS_CONFIG: Record<
  string,
  {
    title: string;
    weight: string;
    icon: React.ElementType;
    params: any[];
    isOptional?: boolean;
  }
> = {
  A: {
    title: "Governance & Safety Management",
    weight: "10%",
    icon: Settings,
    params: SECTION_A_PARAMETERS,
  },
  B: {
    title: "Fire & Life Safety",
    weight: "20%",
    icon: Flame,
    params: SECTION_B_PARAMETERS,
  },
  C: {
    title: "Infrastructure & Building Safety",
    weight: "15%",
    icon: Building2,
    params: SECTION_C_PARAMETERS,
  },
  D: {
    title: "Electrical, Lab & Utility Safety",
    weight: "10%",
    icon: Zap,
    params: SECTION_D_PARAMETERS,
  },
  E: {
    title: "Student Safeguarding & Child Protection",
    weight: "20%",
    icon: UserCheck,
    params: SECTION_E_PARAMETERS,
  },
  F: {
    title: "Access Control & Security",
    weight: "10%",
    icon: ShieldCheck,
    params: SECTION_F_PARAMETERS,
  },
  G: {
    title: "Health, First Aid & Medical Emergency",
    weight: "10%",
    icon: Heart,
    params: SECTION_G_PARAMETERS,
  },
  // "H": { title: "Transport Safety", weight: "15%", icon: Truck, params: SECTION_H_PARAMETERS, isOptional: true },
  I: {
    title: "Hygiene, Housekeeping & Food Safety",
    weight: "5%",
    icon: Soup,
    params: SECTION_I_PARAMETERS,
  },
};

const SECTION_KEYS = ["A", "B", "C", "D", "E", "F", "G", "I"];

export default function SafetyAndAuditPage() {
  const { decodedToken: user } = useAuthStore();
  const {
    auditId,
    createdBy,
    schoolId: storedSchoolId,
    setAuditData,
    clearAuditData,
  } = useAuditStore();

  const prekRole = normalizePrekRole(user?.role);
  const isSuperAdmin = prekRole === PREK_ROLES.CENTRAL || user?.role === "superAdmin";
  const isSchool = prekRole === PREK_ROLES.NATIONAL_HEAD || user?.role === "school";
  const isBranchGroup = prekRole === PREK_ROLES.RSO || user?.role === "branchGroup";
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedAuditForView, setSelectedAuditForView] =
    useState<Audit | null>(null);

  const canSelectLocation = isSuperAdmin || isBranchGroup || isSchool;

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("A");

  // Fetch audits history
  const {
    data: auditListData,
    isLoading: isAuditListLoading,
    refetch: refetchAudits,
  } = useQuery({
    queryKey: ["audits", pagination.pageIndex, pagination.pageSize],
    queryFn: () =>
      auditService.getAudits({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
  });

  const [filteredAudits, setFilteredAudits] = useState<Audit[]>([]);

  useEffect(() => {
    if (auditListData?.data) {
      setFilteredAudits(auditListData.data);
    }
  }, [auditListData?.data]);

  const handleSearchResults = useCallback((results: any[]) => {
    setFilteredAudits(results);
  }, []);

  const auditColumns = React.useMemo(
    () =>
      getAuditColumns(
        (audit) => {
          setSelectedAuditForView(audit);
          setIsViewOpen(true);
        },
        (audit) => handleEditAudit(audit),
      ),
    [],
  );

  const { table, tableElement: auditTable } = useCustomTable({
    data: filteredAudits,
    columns: auditColumns,
    pagination,
    totalCount: auditListData?.total || filteredAudits.length,
    loading: isAuditListLoading,
    onPaginationChange: setPagination,
    pageSizeOptions: [10, 20, 50, "All"],
    showSerialNumber: true,
    maxHeight: "calc(100vh - 240px)",
  });

  // Fetch schools for superAdmin
  const { data: schools, isLoading: isSchoolsLoading } =
    useSchoolDropdown(isSuperAdmin);

  // Fetch branches:
  // - For branchGroup: fetch based on their fixed schoolId
  // - For superAdmin: fetch based on the selectedSchoolId
  const branchFetchEnabled =
    isBranchGroup || (isSuperAdmin && !!selectedSchoolId);
  const branchSchoolId = isBranchGroup ? user?.schoolId : selectedSchoolId;

  const { data: branches, isLoading: isBranchesLoading } = useBranchDropdown(
    branchSchoolId,
    branchFetchEnabled,
  );

  // Consolidate items based on role
  const schoolItems =
    schools?.map((s: any) => ({
      label: s.schoolName || s.name,
      value: s._id,
    })) || [];
  const branchItems =
    branches?.map((b: any) => ({
      label: b.branchName || b.name,
      value: b._id,
    })) || [];

  const isLocationLoading = isSuperAdmin ? isSchoolsLoading : isBranchesLoading;

  // Comprehensive multi-section state management
  const [allSectionsData, setAllSectionsData] = useState<
    Record<string, ParameterState[]>
  >(() => {
    const initialState: Record<string, ParameterState[]> = {};
    Object.keys(SECTIONS_CONFIG).forEach((key) => {
      initialState[key] = SECTIONS_CONFIG[key].params.map((p) => ({
        name: p.name,
        key: p.key, // Explicitly assign the key
        score: null,
        isCritical: p.isCritical,
        remark: "",
      }));
    });
    return initialState;
  });

  const formData = allSectionsData[activeSection] || [];
  const currentConfig = SECTIONS_CONFIG[activeSection];
  const activeParams = currentConfig.params;

  // Mutation to create a new audit
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
        // If branch level user, they probably only have their own branchId
        payload.branchId = user?.schoolId;
      }
      return auditService.createAudit(payload);
    },
    onSuccess: (response: any) => {
      if (response.success && response.data) {
        setIsConductModalOpen(false);
        setAuditData(response.data);
        toast.success("Audit started successfully!");
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to start audit. Please try again.",
      );
    },
  });

  const handleNextSection = (current: string) => {
    const currentIndex = SECTION_KEYS.indexOf(current);
    if (currentIndex < SECTION_KEYS.length - 1) {
      const nextSection = SECTION_KEYS[currentIndex + 1];
      setActiveSection(nextSection);
      toast.info(
        `Next up: Section ${nextSection} - ${SECTIONS_CONFIG[nextSection].title}`,
      );
    } else {
      toast.success("All sections saved!", {
        icon: <ClipboardCheck className="h-5 w-5 text-emerald-500" />,
      });
    }
  };

  // Mutation to save section data
  const saveSectionMutation = useMutation({
    mutationFn: (payload: any) => auditService.sectionSave(payload),
    onSuccess: () => {
      toast.success(`Section ${activeSection} saved successfully!`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save section. Please try again.",
      );
    },
  });

  const finalizeAuditMutation = useMutation({
    mutationFn: (id: string) => auditService.finalizeAudit(id),
    onSuccess: () => {
      toast.success("Audit finalized successfully!", {
        description: "Inspection report has been generated.",
        style: { background: "#0f233a", color: "#fff" },
      });
      setTimeout(() => {
        clearAuditData();
        setActiveSection("A");
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to finalize audit.",
      );
    },
  });

  const handleEditAudit = (audit: Audit) => {
    setAuditData({
      schoolId: audit.schoolId,
      createdBy: audit.branchId || audit.createdBy,
      _id: audit._id,
    });

    const newSectionsData: Record<string, ParameterState[]> = {};

    // Initialize with core templates first to ensure all required fields are present
    Object.keys(SECTIONS_CONFIG).forEach((key) => {
      newSectionsData[key] = SECTIONS_CONFIG[key].params.map((p) => ({
        name: p.name,
        key: p.key,
        score: null,
        isCritical: p.isCritical,
        remark: "",
      }));
    });

    // Overlay existing section data from the audit object
    if (audit.sections && audit.sections.length > 0) {
      audit.sections.forEach((section) => {
        const sectionKey = Object.keys(SECTIONS_CONFIG).find(
          (key) => SECTIONS_CONFIG[key].title === section.sectionName,
        );

        if (sectionKey) {
          const localParams = SECTIONS_CONFIG[sectionKey].params;

          // Map existing parameters, restoring keys from local config if missing
          newSectionsData[sectionKey] = section.parameters.map((p, index) => ({
            name: p.name,
            key: localParams[index]?.key || p.key, // Restore key from config
            score: p.score,
            isCritical: p.isCritical,
            remark: p.remark || "",
          }));
        }
      });
    }

    setAllSectionsData(newSectionsData);
    setActiveSection("A");
    toast.info(
      `Resuming draft audit for ${audit.branchName || audit.schoolName}`,
    );
  };

  const handleParameterChange = (
    index: number,
    field: keyof ParameterState,
    value: any,
  ) => {
    setAllSectionsData((prev) => ({
      ...prev,
      [activeSection]: prev[activeSection].map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleSectionSubmit = () => {
    // Validation: Check if all parameters have a score and a remark
    const isSectionComplete = formData.every(
      (item) => item.score !== null && item.remark.trim().length > 0,
    );

    if (!isSectionComplete) {
      toast.error("Incomplete Section", {
        description:
          "Please provide a score and observation for every parameter before saving.",
      });
      return;
    }

    const isLastSection =
      activeSection === SECTION_KEYS[SECTION_KEYS.length - 1];

    const payload = {
      auditId: auditId,
      branchId: createdBy,
      schoolId: storedSchoolId,
      sectionName: SECTIONS_CONFIG[activeSection].title,
      parameters: formData,
    };

    saveSectionMutation.mutate(payload, {
      onSuccess: () => {
        if (isLastSection && auditId) {
          finalizeAuditMutation.mutate(auditId);
        } else {
          handleNextSection(activeSection);
        }
      },
    });
  };

  const handleCancelAudit = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel the current audit? All unsaved progress will be lost.",
      )
    ) {
      clearAuditData();
      toast.info("Audit session cleared.");
    }
  };

  const handleStartAudit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createAuditMutation.mutate();
  };

  // If no audit is in progress, show the selection view
  if (!auditId) {
    return (
      <main className="p-4 animate-in fade-in duration-300">
        <ResponseLoader
          isLoading={isAuditListLoading || createAuditMutation.isPending}
        />

        <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <section className="flex flex-wrap items-center gap-3">
            <SearchComponent
              data={auditListData?.data || []}
              displayKey={["schoolName", "branchName", "status", "result"]}
              onResults={handleSearchResults}
              placeholder="Search audits..."
              className="w-full sm:w-[280px] md:w-[320px]"
            />
            <ColumnVisibilitySelector
              columns={table?.getAllColumns?.() || []}
              buttonVariant="outline"
              buttonSize="default"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAudits()}
              className="h-9 px-3 gap-2 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs cursor-pointer"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${isAuditListLoading ? "animate-spin" : ""}`}
              />
              Sync Records
            </Button>
          </section>

          {!isSchool && (
            <Dialog open={isConductModalOpen} onOpenChange={setIsConductModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  className="text-white cursor-pointer bg-slate-900 hover:bg-slate-800 h-9 px-4 text-xs font-semibold shadow-xs"
                >
                  <ClipboardCheck className="mr-2 h-4 w-4 text-amber-400" />
                  Conduct Audit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleStartAudit} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>New Inspection Session</DialogTitle>
                    <DialogDescription>
                      Initialize an official safety audit protocol for your assigned inspection location.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3 pt-2">
                    {isSuperAdmin ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="school-select" className="text-xs font-semibold text-slate-700">
                            Target Region
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
                            emptyMessage={isSchoolsLoading ? "Synchronizing…" : "No regions found."}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="branch-select" className="text-xs font-semibold text-slate-700">
                            Target School
                          </Label>
                          <Combobox
                            items={branchItems}
                            value={selectedBranchId}
                            onValueChange={(val) => setSelectedBranchId(val || "")}
                            placeholder="Select school..."
                            searchPlaceholder="Search schools..."
                            emptyMessage={
                              !selectedSchoolId
                                ? "Select a region first"
                                : isBranchesLoading
                                  ? "Syncing…"
                                  : "No schools found."
                            }
                            disabled={!selectedSchoolId || isBranchesLoading}
                          />
                        </div>
                      </>
                    ) : isBranchGroup ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="branch-select" className="text-xs font-semibold text-slate-700">
                          Target School / Branch
                        </Label>
                        <Combobox
                          items={branchItems}
                          value={selectedBranchId}
                          onValueChange={(val) => setSelectedBranchId(val || "")}
                          placeholder="Select branch..."
                          searchPlaceholder="Search branches..."
                          emptyMessage={isBranchesLoading ? "Synchronizing…" : "No branches found."}
                        />
                      </div>
                    ) : null}
                  </div>

                  <DialogFooter className="pt-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      className="text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
                      disabled={
                        createAuditMutation.isPending ||
                        (isSuperAdmin && (!selectedSchoolId || !selectedBranchId)) ||
                        (isBranchGroup && !selectedBranchId)
                      }
                    >
                      {createAuditMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                          Initializing...
                        </>
                      ) : (
                        "Commence Inspection Protocol"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </header>

        {/* Table Wrapper */}
        <div className="mb-4 relative">
          <div className="custom-table-container">
            {auditTable}
          </div>
        </div>

        <ViewAuditDetails
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          audit={selectedAuditForView}
        />
      </main>
    );
  }

  // Otherwise, show the Audit Form view
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Audit Inspection
            </h1>
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full font-semibold text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              Active inspection protocol
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-md w-fit">
            Audit ID: <span className="font-mono tabular-nums">{auditId}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-9 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors text-xs font-medium cursor-pointer"
          onClick={handleCancelAudit}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Cancel Audit
        </Button>
      </header>

      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pb-3 pt-2 -mx-4 px-4 border-b border-slate-200/80 mb-6 md:mb-8 shadow-2xs">
        <ScrollArea className="w-full whitespace-nowrap">
          <Tabs
            value={activeSection}
            onValueChange={setActiveSection}
            className="w-full"
          >
            <TabsList className="inline-flex h-12 md:h-13 items-center justify-start rounded-2xl bg-slate-100/90 border border-slate-200/60 p-1 w-auto min-w-full gap-1">
              {SECTION_KEYS.map((key) => {
                const Icon = SECTIONS_CONFIG[key].icon;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="rounded-xl px-4 md:px-5 h-10 md:h-11 font-semibold text-[11px] md:text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white shadow-xs transition-colors gap-2 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Icon className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Section {key}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <section className="space-y-6 md:space-y-8 pb-32">
        <div className="flex items-center gap-3 md:gap-4 pb-4 border-b border-slate-200/80">
          <div className="bg-slate-900 text-white h-9 w-9 md:h-11 md:w-11 flex items-center justify-center rounded-xl md:rounded-2xl text-base md:text-lg font-bold shadow-xs animate-in zoom-in-50 duration-400 motion-reduce:animate-none">
            {activeSection}
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight tracking-tight">
              {currentConfig.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Weighted Impact: {currentConfig.weight}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:gap-8">
          {activeParams.map((param, index) => (
            <Card
              key={param.name}
              className="overflow-hidden border border-slate-200/80 shadow-sm bg-white rounded-2xl md:rounded-3xl transition-colors duration-200 hover:border-slate-300 hover:shadow-md"
            >
              <CardHeader className="pb-3 md:pb-4 pt-4 md:pt-5 px-5 md:px-6 bg-slate-50/70 border-b border-slate-100">
                <div className="space-y-1.5 cursor-default">
                  <div className="flex items-start md:items-center justify-between gap-3">
                    <CardTitle className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                      {param.name}
                    </CardTitle>
                    {param.isCritical && (
                      <span className="flex items-center gap-1 shrink-0 rounded-full bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 shadow-2xs h-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Critical
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 md:p-7">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-10 items-stretch">
                  {/* Parameter Score Side */}
                  <div className="space-y-3 md:space-y-4 flex flex-col">
                    <Label className="text-xs font-semibold text-slate-600 block pb-0.5">
                      Scoring Methodology
                    </Label>
                    <RadioGroup
                      value={formData[index]?.score?.toString() || ""}
                      onValueChange={(val) =>
                        handleParameterChange(index, "score", parseInt(val))
                      }
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3 flex-1"
                    >
                      {[0, 1, 2].map((s) => (
                        <div key={s} className="flex">
                          <RadioGroupItem
                            value={s.toString()}
                            id={`score-${index}-${s}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`score-${index}-${s}`}
                            className={`flex flex-row sm:flex-col items-center justify-start sm:justify-center flex-1 rounded-xl md:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs text-left sm:text-center min-h-[56px] sm:min-h-[105px] gap-3 sm:gap-1.5
                              ${s === 0
                                ? "peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-rose-500 peer-data-[state=checked]:text-white"
                                : s === 1
                                  ? "peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500 peer-data-[state=checked]:text-slate-950"
                                  : "peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-600 peer-data-[state=checked]:text-white"
                              }
                            `}
                          >
                            <span className="text-xl sm:text-2xl font-black sm:mb-1 w-8 sm:w-auto text-center font-sans">
                              {s}
                            </span>
                            <span
                              className={`text-[10px] font-bold leading-tight text-center
                                ${s === 0
                                  ? "text-rose-600 peer-data-[state=checked]:text-white"
                                  : s === 1
                                    ? "text-amber-700 peer-data-[state=checked]:text-slate-950"
                                    : "text-emerald-700 peer-data-[state=checked]:text-white"
                                }
                              `}
                            >
                              {s === 0
                                ? "Not available"
                                : s === 1
                                  ? "Needs work"
                                  : "Fully complied"}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Observations Side */}
                  <div className="space-y-3 md:space-y-4 flex flex-col">
                    <Label className="text-xs font-semibold text-slate-600 block pb-0.5">
                      Inspector Observations
                    </Label>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Detail observations and specific evidence..."
                        className="h-full min-h-[100px] md:min-h-[105px] rounded-xl md:rounded-2xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 transition-colors resize-none text-xs md:text-sm p-4 leading-relaxed shadow-2xs"
                        value={formData[index]?.remark || ""}
                        onChange={(e) =>
                          handleParameterChange(index, "remark", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Floating Bottom Progress & Action Dock */}
      <div className="fixed bottom-4 left-4 right-4 md:left-64 md:right-8 z-30 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-lg p-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="hidden sm:flex text-xs font-semibold text-slate-600 items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Inspection Protocol Live
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentConfig.isOptional && (
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl px-5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold h-11 border border-slate-200/60 transition-colors text-xs tracking-wide shadow-2xs cursor-pointer"
                onClick={() => handleNextSection(activeSection)}
              >
                Skip
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1 sm:flex-none rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 shadow-xs transition-colors active:scale-[0.99] text-xs sm:text-sm cursor-pointer"
              disabled={
                saveSectionMutation.isPending || finalizeAuditMutation.isPending
              }
              onClick={handleSectionSubmit}
            >
              {saveSectionMutation.isPending ||
              finalizeAuditMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                  {finalizeAuditMutation.isPending
                    ? "Finalizing..."
                    : "Recording..."}
                </>
              ) : (
                <span className="flex items-center gap-2">
                  {activeSection === SECTION_KEYS[SECTION_KEYS.length - 1]
                    ? "Save & Finalize"
                    : "Save Section"}
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
      <ViewAuditDetails
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        audit={selectedAuditForView}
      />
    </div>
  );
}
