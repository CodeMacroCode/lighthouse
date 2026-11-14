"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { api } from "@/services/apiService";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Plus, Download, FileSpreadsheet, FileText } from "lucide-react";
import { PaginationState } from "@tanstack/react-table";
import { getIncidentColumns } from "@/components/columns/columns";
import ResponseLoader from "@/components/ResponseLoader";
import Link from "next/link";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { toast } from "sonner";
import { Incident } from "@/interface/modal";
import { useAuthStore } from "@/store/authStore";
import { useBranchDropdown, useBranchGroupDropdown } from "@/hooks/useDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExport } from "@/hooks/useExport";
import { FloatingMenu } from "@/components/floatingMenu";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";

export default function IncidentPage() {
    const queryClient = useQueryClient();
    const { exportToPDF, exportToExcel } = useExport();
    const { decodedToken: user } = useAuthStore();
    const prekRole = normalizePrekRole(user?.role);
    const userRole = prekRole || user?.role?.toLowerCase();
    const canReport = true;
    const canEdit = true;

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [selectedEditRegion, setSelectedEditRegion] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [isExporting, setIsExporting] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["incidents", pagination.pageIndex, pagination.pageSize, selectedStatus, selectedRegion],
        queryFn: () => incidentService.getIncidents({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            status: selectedStatus === "all" ? undefined : selectedStatus,
            region: selectedRegion === "all" ? undefined : selectedRegion,
        }),
    });

    const exportColumns = [
        { key: "sn", header: "S.No." },
        { key: "caseId", header: "Case ID" },
        { key: "region", header: "Region" },
        { key: "branchName", header: "Centre / School" },
        { key: "subCategory", header: "Incident Type" },
        { key: "severity", header: "Severity" },
        { key: "escalationOwner", header: "Escalation Owner" },
        { key: "sla", header: "SLA Window" },
        { key: "status", header: "Status" },
        { key: "actions", header: "Actions" },
        { key: "date", header: "Date" },
        { key: "briefDescription", header: "Brief Description" },
        { key: "immediateActionTaken", header: "Immediate Action Taken" },
        { key: "pendingAction", header: "Pending Action" },
        { key: "remarks", header: "Remarks" },
    ];

    const handleExportAll = async (type: "pdf" | "excel") => {
        try {
            setIsExporting(true);
            toast.info(`Preparing ${type.toUpperCase()} export...`);

            const res = await incidentService.getIncidents({
                page: 1,
                limit: "all",
                status: selectedStatus === "all" ? undefined : selectedStatus,
                region: selectedRegion === "all" ? undefined : selectedRegion,
            });

            let allRecords = res?.data || [];
            if (!allRecords.length && data?.data?.length) {
                allRecords = data.data;
            }

            if (!allRecords.length) {
                toast.warning("No incident records found to export");
                return;
            }

            const formattedExportData = allRecords.map((item: any, idx: number) => {
                const sev = item.severity || "Low";
                const owner = item.escalationOwner || (
                    sev === "Critical" ? "Central" :
                    sev === "High" ? "RSO" :
                    sev === "Medium" ? "BM" : "AOM"
                );
                const sla = item.sla || (
                    sev === "Critical" ? "2 hrs (immediate)" :
                    sev === "High" ? "24 hrs" :
                    sev === "Medium" ? "48 hrs" : "3 days (72 hrs)"
                );
                const caseId = item.caseId || (item._id ? `INC-${item._id.slice(-6).toUpperCase()}` : "N/A");

                return {
                    sn: idx + 1,
                    caseId,
                    region: item.region || "N/A",
                    branchName: item.branchName || item.centre || "N/A",
                    category: item.category || "N/A",
                    subCategory: item.subCategory || item.type || item.category || "N/A",
                    severity: sev,
                    escalationOwner: owner,
                    sla,
                    status: item.status || "N/A",
                    actions: item.status === "Open" ? "Edit / Update Status" : "No action needed",
                    date: item.date
                        ? new Date(item.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "UTC",
                            hour12: true,
                        })
                        : "N/A",
                    briefDescription: item.briefDescription || "N/A",
                    immediateActionTaken: item.immediateActionTaken || "N/A",
                    pendingAction: item.pendingAction || "N/A",
                    remarks: item.remarks || "N/A",
                };
            });

            const config = {
                title: "Incident Management Report",
                companyName: "Lighthouse",
                metadata: {
                    Total: `${allRecords.length} records`,
                    Region: selectedRegion === "all" ? "All Regions" : selectedRegion,
                    Status: selectedStatus === "all" ? "All Statuses" : selectedStatus,
                },
            };

            if (type === "pdf") {
                exportToPDF(formattedExportData, exportColumns, config);
            } else {
                exportToExcel(formattedExportData, exportColumns, config);
            }
        } catch (err: any) {
            console.error("Export error:", err);
            toast.error("Failed to export incident data");
        } finally {
            setIsExporting(false);
        }
    };

    const { data: branchGroups = [] } = useBranchGroupDropdown();

    const isBranchGroup = userRole === "branchgroup" || userRole === "rso";

    // Directly trigger Branch/Business Manager API
    const { data: apiBranches } = useBranchDropdown(
        undefined,
        true,
        true
    );

    const branchGroupOptions = useMemo(() => {
        const list = Array.isArray(branchGroups) ? branchGroups : [];
        if (list.length > 0) {
            return list.map((bg: any) => ({
                label: bg.branchGroupName || bg.name || bg.username || "Unknown",
                value: bg.branchGroupName || bg.name || bg.username || "",
                branches: bg.AssignedBranch || [],
            }));
        }
        return [
            { label: "North", value: "North", branches: [] },
            { label: "South", value: "South", branches: [] },
            { label: "East", value: "East", branches: [] },
            { label: "West", value: "West", branches: [] },
            { label: "Central", value: "Central", branches: [] },
        ];
    }, [branchGroups]);

    const safetyHeadOptions = useMemo(() => {
        if (apiBranches && apiBranches.length > 0) {
            return apiBranches.map((b: any) => ({
                label: b.branchName || b.name,
                value: b._id,
            }));
        }
        const region = branchGroupOptions.find(o => o.value === selectedEditRegion);
        if (!region || !region.branches || region.branches.length === 0) {
            return (apiBranches || []).map((b: any) => ({
                label: b.branchName || b.name,
                value: b._id,
            }));
        }
        return region.branches.map((b: any) => ({
            label: b.branchName,
            value: b._id,
        }));
    }, [selectedEditRegion, branchGroupOptions, apiBranches]);

    const handleEdit = (incident: Incident) => {
        setSelectedIncident(incident);
        setSelectedEditRegion(incident.region || "");
        setIsEditDialogOpen(true);
    };

    const handleUpdateStatus = (incident: Incident) => {
        setSelectedIncident(incident);
        setIsStatusDialogOpen(true);
    };

    const columns = useMemo(() => {
        return getIncidentColumns(
            canEdit ? handleEdit : undefined,
            canEdit ? handleUpdateStatus : undefined
        );
    }, [canEdit]);

    const handlePaginationChange = (updater: any) => {
        setPagination(prev => {
            const newValues = typeof updater === "function" ? updater(prev) : updater;
            return newValues;
        });
    };

    const updateMutation = useMutation({
        mutationFn: (payload: any) => incidentService.updateIncident(selectedIncident?._id as string, payload),
        onSuccess: () => {
            toast.success("Incident updated successfully");
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            setIsEditDialogOpen(false);
            setSelectedIncident(null);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update incident");
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: (payload: any) => incidentService.updateIncidentStatus(selectedIncident?._id as string, payload),
        onSuccess: () => {
            toast.success("Incident status updated successfully");
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            setIsStatusDialogOpen(false);
            setSelectedIncident(null);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update incident status");
        }
    });

    const checkClosurePermission = (newStatus: string, severity?: string) => {
        if (newStatus !== "Closed" && newStatus !== "Resolved") return true;

        const sev = (severity || "Low").toLowerCase();
        const role = normalizePrekRole(user?.role);

        // FR-7.2: Role Permission Enforcement Closure Authority Rules
        if (sev === "critical") {
            if (role !== PREK_ROLES.CENTRAL && role !== PREK_ROLES.NATIONAL_HEAD) {
                toast.error("Permission Denied (FR-7.2): Only Central (All-Activity Admin) holds sole authority to close Critical incidents.");
                return false;
            }
        } else if (sev === "high") {
            if (role === PREK_ROLES.AOM || role === PREK_ROLES.BM) {
                toast.error("Permission Denied (FR-7.2): Business Managers and AOMs cannot close High-severity cases. Only RSO, National Head, or Central can close High incidents.");
                return false;
            }
        } else if (sev === "medium") {
            if (role === PREK_ROLES.AOM) {
                toast.error("Permission Denied (FR-7.2): Frontline Area Operations Managers (AOM) can only resolve and close Low-severity cases.");
                return false;
            }
        }
        return true;
    };

    const handleUpdateSave = (formData: any) => {
        if (!checkClosurePermission(formData.status, selectedIncident?.severity)) {
            return;
        }

        // Extract names from options to ensure they are sent to the API
        const selectedSchool = safetyHeadOptions.find((o: any) => o.value === formData.branchId);

        const payload = {
            status: formData.status,
            remarks: formData.remarks,
            pendingAction: formData.pendingAction,
            region: formData.region,
            branchId: formData.branchId,
            branchName: selectedSchool?.label || selectedIncident?.branchName,
        };
        updateMutation.mutate(payload);
    };

    const handleUpdateStatusSave = (formData: any) => {
        if (!checkClosurePermission(formData.status, selectedIncident?.severity)) {
            return;
        }

        const payload = {
            status: formData.status,
            remarks: formData.remarks,
            escalationStatus: formData.escalationStatus,
            escalatedTo: formData.escalatedTo,
        };
        updateStatusMutation.mutate(payload);
    };

    const handleFieldChange = (key: string, value: any) => {
        if (key === "region") {
            setSelectedEditRegion(value);
        }
    };


    const editFields: FieldConfig[] = [
        {
            key: "status",
            label: "Status",
            type: "select",
            options: ["Open", "Closed"],
            required: true,
        },
        {
            key: "region",
            label: "Region",
            type: "select",
            options: branchGroupOptions,
            required: !isBranchGroup,
            hidden: isBranchGroup,
        },
        {
            key: "branchId",
            label: "Business Manager (School)",
            type: "select",
            options: safetyHeadOptions,
            required: true,
            placeholder: (selectedEditRegion || isBranchGroup) ? "Select school" : "Select region first",
            disabled: !isBranchGroup && !selectedEditRegion,
        },
        {
            key: "remarks",
            label: "Remarks",
            type: "textarea",
            placeholder: "Enter resolution remarks...",
        },
        {
            key: "pendingAction",
            label: "Pending Action",
            type: "textarea",
            placeholder: "Specify any remaining actions...",
        }
    ];

    const statusUpdateFields: FieldConfig[] = [
        {
            key: "status",
            label: "Status",
            type: "select",
            options: ["Open", "In-Progress", "Resolved", "Closed"],
            required: true,
        },
        {
            key: "remarks",
            label: "Remarks",
            type: "textarea",
            placeholder: "Enter resolution remarks...",
            required: true,
        },
        {
            key: "escalationStatus",
            label: "Escalation Status",
            type: "select",
            options: ["Yes", "No"],
            required: true,
        },
        {
            key: "escalatedTo",
            label: "Escalated To",
            type: "select",
            options: ["Operations HO", "Regional Head", "Safety Committee", "Other"],
            placeholder: "Select who it was escalated to",
            required: false,
        }
    ];

    const { tableElement } = useCustomTable({
        data: data?.data || [],
        columns,
        pagination,
        totalCount: data?.total || 0,
        loading: isLoading,
        onPaginationChange: handlePaginationChange,
        pageSizeOptions: [10, 20, 30, 50, 100, 'All'],
        showSerialNumber: true,
        enableSorting: false,
        maxHeight: "calc(100vh - 300px)",
        enableColumnWrapping: false,
        defaultTextWrap: "nowrap",
    });

    return (
        <div className="h-full flex flex-col space-y-4 p-2 sm:p-4 bg-gray-50/50 overflow-x-clip overflow-y-auto min-h-[calc(100vh-64px)]">
            <ResponseLoader isLoading={isLoading || isExporting || updateMutation.isPending || updateStatusMutation.isPending} />

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0c235c]">Incident Management</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">View and manage reported incidents</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Select
                        value={selectedRegion}
                        onValueChange={(value) => {
                            setSelectedRegion(value);
                            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[150px] bg-white h-9">
                            <SelectValue placeholder="All Regions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            {branchGroupOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedStatus}
                        onValueChange={(value) => {
                            setSelectedStatus(value);
                            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[150px] bg-white h-9">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In-Progress">In-Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 bg-white cursor-pointer h-9">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExportAll("excel")} className="cursor-pointer gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                Export Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportAll("pdf")} className="cursor-pointer gap-2">
                                <FileText className="h-4 w-4 text-red-600" />
                                Export PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 bg-white cursor-pointer h-9">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                    {canReport && (
                        <Link href="/dashboard/incident/new">
                            <Button size="sm" className="gap-2 bg-[#0c235c] hover:bg-[#0c235c]/90 cursor-pointer h-9">
                                <Plus className="h-4 w-4" />
                                Report Incident
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
            {tableElement}

            <DynamicEditDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                data={selectedIncident}
                fields={editFields}
                onSave={handleUpdateSave}
                onFieldChange={handleFieldChange}
                title="Edit Incident"
                description="Modify incident details, region, and assignments."
            />

            <DynamicEditDialog
                isOpen={isStatusDialogOpen}
                onClose={() => setIsStatusDialogOpen(false)}
                data={selectedIncident}
                fields={statusUpdateFields}
                onSave={handleUpdateStatusSave}
                title="Update Incident Status"
                description="Update the current status and escalation details for this incident."
            />

            <FloatingMenu
                onExportPdf={() => handleExportAll("pdf")}
                onExportExcel={() => handleExportAll("excel")}
            />
        </div>
    );
}