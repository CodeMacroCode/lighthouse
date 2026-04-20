"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { api } from "@/services/apiService";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Plus } from "lucide-react";
import { PaginationState } from "@tanstack/react-table";
import { getIncidentColumns } from "@/components/columns/columns";
import ResponseLoader from "@/components/ResponseLoader";
import Link from "next/link";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { toast } from "sonner";
import { Incident } from "@/interface/modal";
import { useAuthStore } from "@/store/authStore";
import { useBranchDropdown } from "@/hooks/useDropdown";

export default function IncidentPage() {
    const queryClient = useQueryClient();
    const { decodedToken: user } = useAuthStore();
    const userRole = user?.role?.toLowerCase();
    const canReport = ["parent", "branch", "superadmin", "branchgroup", "school"].includes(userRole || "");
    const canEdit = ["branch", "superadmin", "branchgroup", "school"].includes(userRole || "");

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
  
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [selectedEditRegion, setSelectedEditRegion] = useState<string>("");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["incidents", pagination.pageIndex, pagination.pageSize],
        queryFn: () => incidentService.getIncidents({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
        }),
    });

    const { data: branchGroups } = useQuery({
        queryKey: ["branchGroups"],
        queryFn: () => api.get<any[]>("/branchGroup"),
    });

    const isBranchGroup = userRole === "branchgroup";

    // Directly trigger Branch/Safety Head API for branchgroup role
    const { data: apiBranches } = useBranchDropdown(
        undefined, 
        isBranchGroup, 
        true
    );

    const branchGroupOptions = useMemo(() => {
        if (!branchGroups) return [];
        return branchGroups.map((bg) => ({
            label: bg.branchGroupName,
            value: bg.branchGroupName,
            branches: bg.AssignedBranch || [],
        }));
    }, [branchGroups]);

    const safetyHeadOptions = useMemo(() => {
        if (isBranchGroup && apiBranches) {
            return apiBranches.map((b: any) => ({
                label: b.branchName || b.name,
                value: b._id,
            }));
        }
        const region = branchGroupOptions.find(o => o.value === selectedEditRegion);
        if (!region || !region.branches) return [];
        return region.branches.map((b: any) => ({
            label: b.branchName,
            value: b._id,
        }));
    }, [selectedEditRegion, branchGroupOptions, isBranchGroup, apiBranches]);

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
        const baseColumns = getIncidentColumns(
            canEdit ? handleEdit : undefined,
            canEdit ? handleUpdateStatus : undefined
        );
        
        // Remove Action column for parents
        if (userRole === "parent") {
            return baseColumns.filter(col => col.id !== "actions");
        }
        
        return baseColumns;
    }, [canEdit, userRole]);

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

    const handleUpdateSave = (formData: any) => {
        // Extract names from options to ensure they are sent to the API
        const selectedSchool = safetyHeadOptions.find(o => o.value === formData.branchId);
        
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
            label: "Safety Head (School)",
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
    });

    return (
        <div className="h-full flex flex-col space-y-4 p-4 bg-gray-50/50 overflow-hidden min-h-[calc(100vh-64px)]">
            <ResponseLoader isLoading={isLoading || updateMutation.isPending || updateStatusMutation.isPending} />

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0c235c]">Incident Management</h1>
                    <p className="text-muted-foreground text-sm">View and manage reported incidents</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 bg-white cursor-pointer">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                    {canReport && (
                        <Link href="/dashboard/incident/new">
                            <Button size="sm" className="gap-2 bg-[#0c235c] hover:bg-[#0c235c]/90 cursor-pointer">
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
        </div>
    );
}