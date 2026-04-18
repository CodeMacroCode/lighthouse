"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { auditService } from "@/services/api/auditService";
import { useAuthStore } from "@/store/authStore";
import { useAuditStore } from "@/store/auditStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
    Loader2, ClipboardCheck, ChevronRight, Info, ShieldCheck, XCircle,
    AlertTriangle, School, Flame, Settings, Building2, Zap, Heart,
    ShieldAlert, Truck, Soup, UserCheck, ScrollText, MoreHorizontal,
    RefreshCcw, History
} from "lucide-react";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { getAuditColumns } from "@/components/columns/columns";
import { PaginationState } from "@tanstack/react-table";
import { Audit } from "@/interface/modal";
import { ViewAuditDetails } from "@/components/audit/ViewAuditDetails";

interface ParameterState {
    name: string;
    score: number | null;
    isCritical: boolean;
    remark: string;
}

const SECTION_A_PARAMETERS = [
    { name: "School Child Protection and Zero Tolerance Policy available and displayed at prominent location", isCritical: false },
    { name: "Mandatory safety committees are formed", isCritical: false },
    { name: "Mandatory Safety & Transport Committee meetings conducted as per prescribed frequency (minutes available)", isCritical: true },
    { name: "Emergency Response Team is formed and roles defined", isCritical: false },
    { name: "Annual safety audit conducted", isCritical: false },
    { name: "Legal Register available, updated & reviewed periodically", isCritical: true },
];

const SECTION_B_PARAMETERS = [
    { name: "Valid Fire NOC available", isCritical: true },
    { name: "Fire extinguishers available & tagged", isCritical: true },
    { name: "Fire alarm / detection system functional", isCritical: true },
    { name: "Emergency exits clearly marked & unlocked", isCritical: true },
    { name: "Evacuation plan displayed on each floor", isCritical: false },
    { name: "Fire drills conducted (min twice/year)", isCritical: false },
    { name: "Uninterrupted power supply for Fire Pumps available", isCritical: true },
];

const SECTION_C_PARAMETERS = [
    { name: "Structural safety certificate", isCritical: false },
    { name: "Staircases with handrails & anti-skid", isCritical: false },
    { name: "Boundary wall secure & intact", isCritical: false },
    { name: "Rooftop access restricted", isCritical: true },
    { name: "No exposed electrical wiring", isCritical: true },
    { name: "ELCB / MCB installed & tested", isCritical: true },
    { name: "Earthing pits marked, accessible & annual resistance test conducted with records", isCritical: true },
    { name: "All infrastructure safety checklists updated & maintained", isCritical: false },
];

const SECTION_D_PARAMETERS = [
    { name: "Electrical panels locked & labeled", isCritical: false },
    { name: "Generator / DG AMC and stack emission record (if applicable) maintained", isCritical: false },
    { name: "PPEs are available and used in Laboratories by students", isCritical: false },
    { name: "Gas cylinders secured & leak‑tested", isCritical: true },
    { name: "Chemical stored and secured as per compatibility given in MSDS", isCritical: false },
];

const SECTION_E_PARAMETERS = [
    { name: "POSCO compliance & staff sensitization", isCritical: true },
    { name: "Background verification completed for all staff (teaching/non-teaching/contract/third party)", isCritical: true },
    { name: "Anti‑bullying policy & reporting available", isCritical: false },
    { name: "CCTV monitoring & data retention", isCritical: false },
    { name: "Risk assessment conducted prior to events, excursions, field trips (records available)", isCritical: true },
];

const SECTION_F_PARAMETERS = [
    { name: "Single controlled entry / exit points", isCritical: true },
    { name: "Visitor are verified and visitors log is maintained", isCritical: true },
    { name: "Security guards trained as per training calendar", isCritical: false },
    { name: "Staff ID cards enforced", isCritical: false },
    { name: "Perimeter lighting is available", isCritical: false },
    { name: "Uninterrupted power supply for CCTV system available", isCritical: true },
];

const SECTION_G_PARAMETERS = [
    { name: "First aid boxes are available and checked monthly", isCritical: true },
    { name: "Nurse and trained first aiders available", isCritical: true },
    { name: "Emergency contacts displayed", isCritical: false },
    { name: "Tie-up with nearby hospital done", isCritical: true },
    { name: "Student medical records maintained", isCritical: false },
    { name: "Annual health check-up conducted for students", isCritical: false },
    { name: "Drinking water testing conducted as per frequency & reports maintained", isCritical: true },
    { name: "Bio-medical waste bins available, identified & disposed as per norms with records", isCritical: true },
    { name: "E-waste disposed as per norms and records maintained", isCritical: true },
];

// const SECTION_H_PARAMETERS = [
//   { name: "Vehicle fitness & permits valid", isCritical: true },
//   { name: "Driver police verification", isCritical: true },
//   { name: "Driver medical fitness & eye test records available", isCritical: true },
//   { name: "Female attendant Police Verification ", isCritical: false },
//   { name: "Speed governors and GPS installed", isCritical: true },
//   { name: "Bus safety drills conducted (once a year)", isCritical: false },
//   { name: "Minimum 30‑day CCTV backup available for school buses", isCritical: true },
// ];

const SECTION_I_PARAMETERS = [
    { name: "Cleaning schedules maintained & supervisor sign‑off available", isCritical: false },
    { name: "Pest control conducted at defined frequency", isCritical: false },
    { name: "Safe storage of cleaning chemicals", isCritical: true },
    { name: "Valid FSSAI license available (where kitchen / canteen exists)", isCritical: true },
];

const SECTIONS_CONFIG: Record<string, { title: string, weight: string, icon: React.ElementType, params: any[], isOptional?: boolean }> = {
    "A": { title: "Governance & Safety Management", weight: "10%", icon: Settings, params: SECTION_A_PARAMETERS },
    "B": { title: "Fire & Life Safety", weight: "20%", icon: Flame, params: SECTION_B_PARAMETERS },
    "C": { title: "Infrastructure & Building Safety", weight: "15%", icon: Building2, params: SECTION_C_PARAMETERS },
    "D": { title: "Electrical, Lab & Utility Safety", weight: "10%", icon: Zap, params: SECTION_D_PARAMETERS },
    "E": { title: "Student Safeguarding & Child Protection", weight: "20%", icon: UserCheck, params: SECTION_E_PARAMETERS },
    "F": { title: "Access Control & Security", weight: "10%", icon: ShieldCheck, params: SECTION_F_PARAMETERS },
    "G": { title: "Health, First Aid & Medical Emergency", weight: "10%", icon: Heart, params: SECTION_G_PARAMETERS },
    //   "H": { title: "Transport Safety", weight: "15%", icon: Truck, params: SECTION_H_PARAMETERS, isOptional: true },
    "I": { title: "Hygiene, Housekeeping & Food Safety", weight: "5%", icon: Soup, params: SECTION_I_PARAMETERS },
};

const SECTION_KEYS = ["A", "B", "C", "D", "E", "F", "G", "I"];


export default function SafetyAndAuditPage() {
    const { decodedToken: user } = useAuthStore();
    const { auditId, createdBy, schoolId: storedSchoolId, setAuditData, clearAuditData } = useAuditStore();

    const [view, setView] = useState<"conduct" | "history">("conduct");
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedAuditForView, setSelectedAuditForView] = useState<Audit | null>(null);

    const isSuperAdmin = user?.role === "superAdmin";
    const isBranchGroup = user?.role === "branchGroup";
    const canSelectLocation = isSuperAdmin || isBranchGroup;

    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [activeSection, setActiveSection] = useState<string>("A");

    // Fetch audits history
    const { data: auditListData, isLoading: isAuditListLoading, refetch: refetchAudits } = useQuery({
        queryKey: ["audits", pagination.pageIndex, pagination.pageSize],
        queryFn: () => auditService.getAudits({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
        }),
        enabled: view === "history",
    });

    const auditColumns = React.useMemo(() => getAuditColumns((audit) => {
        setSelectedAuditForView(audit);
        setIsViewOpen(true);
    }), []);

    const { tableElement: auditTable } = CustomTableServerSidePagination({
        data: auditListData?.data || [],
        columns: auditColumns,
        pagination,
        totalCount: auditListData?.total || 0,
        loading: isAuditListLoading,
        onPaginationChange: setPagination,
        pageSizeOptions: [10, 20, 50],
        showSerialNumber: true,
        maxHeight: "calc(100vh - 350px)",
    });

    // Fetch schools for superAdmin
    const { data: schools, isLoading: isSchoolsLoading } = useSchoolDropdown(isSuperAdmin);

    // Fetch branches for branchGroup
    const { data: branches, isLoading: isBranchesLoading } = useBranchDropdown(user?.schoolId, isBranchGroup);

    // Consolidate items based on role
    const locationItems = isSuperAdmin
        ? schools?.map((s: any) => ({ label: s.schoolName || s.name, value: s._id })) || []
        : branches?.map((b: any) => ({ label: b.branchName || b.name, value: b._id })) || [];

    const isLocationLoading = isSuperAdmin ? isSchoolsLoading : isBranchesLoading;

    // Comprehensive multi-section state management
    const [allSectionsData, setAllSectionsData] = useState<Record<string, ParameterState[]>>(() => {
        const initialState: Record<string, ParameterState[]> = {};
        Object.keys(SECTIONS_CONFIG).forEach(key => {
            initialState[key] = SECTIONS_CONFIG[key].params.map(p => ({
                name: p.name,
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
                payload.schoolId = selectedBranchId;
            } else if (isBranchGroup) {
                payload.branchId = selectedBranchId;
            } else {
                payload.branchId = user?.schoolId;
            }
            return auditService.createAudit(payload);
        },
        onSuccess: (response: any) => {
            if (response.success && response.data) {
                setAuditData(response.data);
                toast.success("Audit started successfully!");
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to start audit. Please try again.");
        },
    });
    

    const handleNextSection = (current: string) => {
        const currentIndex = SECTION_KEYS.indexOf(current);
        if (currentIndex < SECTION_KEYS.length - 1) {
            const nextSection = SECTION_KEYS[currentIndex + 1];
            setActiveSection(nextSection);
            toast.info(`Next up: Section ${nextSection} - ${SECTIONS_CONFIG[nextSection].title}`);
        } else {
            toast.success("Full audit inspection completed!", {
                style: { background: "#10b981", color: "#fff" }
            });

            // Return to main page after a brief delay
            setTimeout(() => {
                clearAuditData();
                setActiveSection("A");
            }, 1000);
        }
    };

    // Mutation to save section data
    const saveSectionMutation = useMutation({
        mutationFn: (payload: any) => auditService.sectionSave(payload),
        onSuccess: () => {
            toast.success(`Section ${activeSection} saved successfully!`);
            handleNextSection(activeSection);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to save section. Please try again.");
        },
    });

    const handleParameterChange = (index: number, field: keyof ParameterState, value: any) => {
        setAllSectionsData(prev => ({
            ...prev,
            [activeSection]: prev[activeSection].map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleSectionSubmit = () => {
        // Validation: Check if all parameters have a score and a remark
        const isSectionComplete = formData.every(item =>
            item.score !== null && item.remark.trim().length > 0
        );

        if (!isSectionComplete) {
            toast.error("Incomplete Section", {
                description: "Please provide a score and observation for every parameter before saving.",
            });
            return;
        }

        const payload = {
            auditId: auditId,
            branchId: createdBy,
            schoolId: storedSchoolId,
            sectionName: SECTIONS_CONFIG[activeSection].title,
            parameters: formData,
        };

        saveSectionMutation.mutate(payload);
    };

    const handleCancelAudit = () => {
        if (window.confirm("Are you sure you want to cancel the current audit? All unsaved progress will be lost.")) {
            clearAuditData();
            toast.info("Audit session cleared.");
        }
    };

    // If no audit is in progress, show the selection view
    if (!auditId) {
        return (
            <main className="flex flex-col p-6 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-[#0c235c]">Safety & Audit</h1>
                        <p className="text-muted-foreground text-sm font-medium">Compliance monitoring & safety inspections</p>
                    </div>
                    <div className="flex bg-gray-100/80 p-1.5 rounded-2xl backdrop-blur-sm border border-gray-200/50">
                        <Button
                            variant={view === "conduct" ? "default" : "ghost"}
                            className={view === "conduct" 
                                ? "bg-[#0c235c] text-white rounded-xl shadow-md hover:bg-[#0c235c]/90 transition-all px-6" 
                                : "rounded-xl text-gray-500 hover:text-[#0c235c] hover:bg-white/50 px-6"}
                            onClick={() => setView("conduct")}
                        >
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Conduct Audit
                        </Button>
                        <Button
                            variant={view === "history" ? "default" : "ghost"}
                            className={view === "history" 
                                ? "bg-[#0c235c] text-white rounded-xl shadow-md hover:bg-[#0c235c]/90 transition-all px-6" 
                                : "rounded-xl text-gray-500 hover:text-[#0c235c] hover:bg-white/50 px-6"}
                            onClick={() => setView("history")}
                        >
                            <History className="mr-2 h-4 w-4" />
                            Audit History
                        </Button>
                    </div>
                </div>

                {view === "conduct" ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-3xl overflow-hidden ring-1 ring-black/5">
                            <CardHeader className="text-center space-y-2 pt-8">
                                <div className="mx-auto bg-blue-50 p-4 rounded-2xl w-fit shadow-inner">
                                    <ClipboardCheck className="h-10 w-10 text-[#0c235c]" />
                                </div>
                                <CardTitle className="text-2xl font-black text-[#0c235c]">
                                    New Inspection
                                </CardTitle>
                                <CardDescription className="text-gray-500 max-w-xs mx-auto font-medium">
                                    Initialize a new safety audit protocol for your assigned location.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center pb-10 pt-4 px-8 space-y-6">
                                {canSelectLocation && (
                                    <div className="w-full space-y-2.5">
                                        <Label htmlFor="location-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                            Inspection Target
                                        </Label>
                                        <Combobox
                                            items={locationItems}
                                            value={selectedBranchId}
                                            onValueChange={(val) => setSelectedBranchId(val || "")}
                                            placeholder={`Select ${isSuperAdmin ? "school" : "branch"}...`}
                                            searchPlaceholder={`Search locations...`}
                                            emptyMessage={isLocationLoading ? "Synchronizing..." : "No targets found."}
                                            className="w-full border-gray-100 shadow-sm rounded-xl h-12"
                                        />
                                    </div>
                                )}

                                <Button
                                    size="lg"
                                    className="w-full bg-[#0c235c] hover:bg-[#0c235c]/90 text-white font-black py-7 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                    onClick={() => createAuditMutation.mutate()}
                                    disabled={createAuditMutation.isPending || (canSelectLocation && !selectedBranchId)}
                                >
                                    {createAuditMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            INITIALIZING SESSION...
                                        </>
                                    ) : (
                                        "BEGIN INSPECTION"
                                    )}
                                </Button>
                                <div className="mt-8 px-4 py-2 bg-blue-50/50 rounded-full flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest">
                                        Logged: <span className="text-blue-800">{user?.role || "Inspector"}</span>
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-lg">
                                    <ScrollText className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Audit Records</p>
                                    <p className="text-xs text-gray-500 font-medium">{auditListData?.total || 0} inspections found</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => refetchAudits()} 
                                className="rounded-xl gap-2 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-bold h-10 px-4"
                            >
                                <RefreshCcw className={`h-4 w-4 ${isAuditListLoading ? 'animate-spin' : ''}`} />
                                Sync Records
                            </Button>
                        </div>
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                             {auditTable}
                        </div>
                    </div>
                )}
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
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                        <ShieldCheck className="h-4 w-4" />
                        Active Session
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0c235c]">
                        Audit Inspection
                    </h1>
                    <p className="text-[9px] md:text-[10px] font-mono text-muted-foreground bg-gray-100 px-2 py-0.5 rounded w-fit">
                        ID: {auditId}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 transition-colors text-xs"
                    onClick={handleCancelAudit}
                >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Cancel Audit
                </Button>
            </header>

            <div className="sticky top-0 z-20 bg-[#f9fafb]/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 border-b border-gray-100 mb-6 md:mb-8">
                <ScrollArea className="w-full whitespace-nowrap">
                    <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
                        <TabsList className="inline-flex h-12 md:h-14 items-center justify-start rounded-2xl bg-gray-100/50 p-1 w-auto min-w-full">
                            {SECTION_KEYS.map((key) => {
                                const Icon = SECTIONS_CONFIG[key].icon;
                                return (
                                    <TabsTrigger
                                        key={key}
                                        value={key}
                                        className="rounded-xl px-4 md:px-6 h-10 md:h-12 font-black text-[10px] md:text-xs uppercase tracking-tighter data-[state=active]:bg-[#0c235c] data-[state=active]:text-white transition-all gap-2"
                                    >
                                        <Icon className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                        SEC {key}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </div>

            <section className="space-y-6 md:space-y-8 pb-32">
                <div className="flex items-center gap-3 md:gap-4 pb-4 border-b-2 border-blue-600/10">
                    <div className="bg-[#0c235c] text-white h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-xl md:rounded-2xl text-base md:text-lg font-black shadow-lg animate-in zoom-in-50 duration-500">
                        {activeSection}
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-[#0c235c] leading-tight">
                            {currentConfig.title}
                        </h2>
                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Weighted Impact: {currentConfig.weight}</p>
                    </div>
                </div>

                <div className="grid gap-6 md:gap-8">
                    {activeParams.map((param, index) => (
                        <Card key={param.name} className="overflow-hidden border-none shadow-xl bg-white/60 backdrop-blur-md rounded-2xl md:rounded-3xl transition-all duration-300 hover:shadow-2xl hover:bg-white">
                            <CardHeader className="pb-3 md:pb-4 pt-5 md:pt-6 px-4 md:px-6 bg-linear-to-r from-blue-50/50 to-transparent">
                                <div className="space-y-1.5 cursor-default">
                                    <div className="flex items-start md:items-center justify-between gap-3">
                                        <CardTitle className="text-sm md:text-base font-bold text-[#0c235c] leading-snug">{param.name}</CardTitle>
                                        {param.isCritical && (
                                            <span className="flex items-center gap-1 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-red-700 uppercase tracking-tighter shadow-sm animate-pulse h-fit">
                                                <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                                Critical
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 md:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-12 items-stretch">
                                    {/* Parameter Score Side */}
                                    <div className="space-y-3 md:space-y-4 flex flex-col">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block pb-0.5 md:pb-1">
                                            Scoring Methodology
                                        </Label>
                                        <RadioGroup
                                            value={formData[index]?.score?.toString() || ""}
                                            onValueChange={(val) => handleParameterChange(index, "score", parseInt(val))}
                                            className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 flex-1"
                                        >
                                            {[0, 1, 2].map((s) => (
                                                <div key={s} className="flex">
                                                    <RadioGroupItem value={s.toString()} id={`score-${index}-${s}`} className="peer sr-only" />
                                                    <Label
                                                        htmlFor={`score-${index}-${s}`}
                                                        className="flex flex-row sm:flex-col items-center justify-start sm:justify-center flex-1 rounded-xl md:rounded-2xl border-2 border-gray-100 bg-white p-3 sm:p-4 hover:bg-blue-50 peer-data-[state=checked]:border-[#0c235c] peer-data-[state=checked]:bg-[#0c235c] peer-data-[state=checked]:text-white transition-all cursor-pointer shadow-sm text-left sm:text-center min-h-[56px] sm:min-h-[110px] gap-3 sm:gap-0"
                                                    >
                                                        <span className="text-xl sm:text-2xl font-black sm:mb-1.5 w-8 sm:w-auto text-center">{s}</span>
                                                        <span className={(s === 0 ? "text-red-400" : s === 1 ? "text-amber-400" : "text-emerald-400") + " text-[9px] font-black uppercase tracking-[0.05em] leading-tight peer-data-[state=checked]:text-white/90"}>
                                                            {s === 0 ? "Not available" : s === 1 ? "Needs improvement" : "Fully complied & implemented"}
                                                        </span>
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>

                                    {/* Observations Side */}
                                    <div className="space-y-3 md:space-y-4 flex flex-col">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block pb-0.5 md:pb-1">
                                            Inspector Observations
                                        </Label>
                                        <div className="flex-1">
                                            <Textarea
                                                placeholder="Detail observations..."
                                                className="h-full min-h-[100px] md:min-h-[110px] rounded-xl md:rounded-2xl bg-white border-gray-100 focus:ring-[#0c235c] transition-all resize-none text-xs md:text-[13px] p-4 md:p-5 shadow-inner leading-relaxed"
                                                value={formData[index]?.remark || ""}
                                                onChange={(e) => handleParameterChange(index, "remark", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 md:left-auto md:w-[calc(100%-256px)] bg-white/10 backdrop-blur-xl border-t border-white/20 p-4 md:p-6 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <div className="max-w-4xl mx-auto flex justify-between items-center bg-white/40 p-1.5 md:p-2 rounded-[2rem] md:rounded-[2.5rem] border border-white/50 shadow-inner">
                    <div className="hidden sm:flex text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 pl-8 items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Audit Protocol {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                        {currentConfig.isOptional && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 sm:flex-none rounded-4xl px-4 md:px-8 bg-white/50 hover:bg-white text-gray-500 font-bold h-12 md:h-14 border-gray-100 transition-all text-[10px] md:text-xs tracking-widest shadow-sm"
                                onClick={() => handleNextSection(activeSection)}
                            >
                                SKIP
                            </Button>
                        )}
                        <Button
                            size="lg"
                            className="flex-1 sm:flex-none rounded-4xl px-8 md:px-16 bg-[#0c235c] hover:bg-[#0c235c]/90 text-white font-black h-12 md:h-14 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs md:text-sm tracking-widest"
                            disabled={saveSectionMutation.isPending}
                            onClick={handleSectionSubmit}
                        >
                            {saveSectionMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                                    RECORDING...
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    SAVE SECTION
                                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
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