"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
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

export default function IncidentPage() {
    const queryClient = useQueryClient();
    const { decodedToken: user } = useAuthStore();
    const userRole = user?.role?.toLowerCase();
    const canAddOrEdit = userRole === "parent" || userRole === "branch" || userRole === "superadmin";

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["incidents", pagination.pageIndex, pagination.pageSize],
        queryFn: () => incidentService.getIncidents({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
        }),
    });

    const handleEdit = (incident: Incident) => {
        setSelectedIncident(incident);
        setIsEditDialogOpen(true);
    };

    const columns = useMemo(() => getIncidentColumns(canAddOrEdit ? handleEdit : undefined), [canAddOrEdit]);

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

    const handleUpdateSave = (formData: any) => {
        // Extract only the fields we want to update as requested by the user
        const payload = {
            status: formData.status,
            remarks: formData.remarks,
            pendingAction: formData.pendingAction,
        };
        updateMutation.mutate(payload);
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

    const { tableElement } = CustomTableServerSidePagination({
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
            <ResponseLoader isLoading={isLoading || updateMutation.isPending} />

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
                    {canAddOrEdit && (
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
                title="Update Incident Status"
                description="Update the status, remarks, and pending actions for this incident."
            />
        </div>
    );
}