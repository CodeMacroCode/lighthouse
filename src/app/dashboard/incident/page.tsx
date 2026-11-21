"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { api } from "@/services/apiService";
import { useCustomTable, PaginationState } from "@/components/ui/customTable(serverSidePagination)";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Plus,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { getIncidentColumns } from "@/components/columns/columns";
import ResponseLoader from "@/components/ResponseLoader";
import Link from "next/link";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { toast } from "sonner";
import { Incident } from "@/interface/modal";
import { useAuthStore } from "@/store/authStore";
import { useBranchDropdown, useBranchGroupDropdown } from "@/hooks/useDropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExport } from "@/hooks/useExport";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { zoneService, ZoneItem } from "@/services/api/zoneService";
import { userService } from "@/services/api/userService";

export default function IncidentPage() {
  const queryClient = useQueryClient();
  const { exportToPDF, exportToExcel } = useExport();
  const { decodedToken: user } = useAuthStore();
  const prekRole = normalizePrekRole(user?.role);
  const userRole = prekRole || user?.role?.toLowerCase();

  const isCentral =
    prekRole === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "superadmin" ||
    user?.role === "central" ||
    user?.role === "Central" ||
    userRole === "central" ||
    userRole === "superadmin";

  const isNationalHead =
    prekRole === PREK_ROLES.NATIONAL_HEAD ||
    user?.role === "school" ||
    user?.role === "national_head" ||
    user?.role === "National Head" ||
    user?.role === "NationalHead";

  const isAOM =
    prekRole === PREK_ROLES.AOM ||
    user?.role === "aom" ||
    user?.role === "AOM" ||
    userRole === "aom" ||
    userRole === "area_operations_manager" ||
    userRole === "areaoperationsmanager" ||
    userRole === "coordinator" ||
    userRole === "parent";

  const isBM =
    prekRole === PREK_ROLES.BM ||
    user?.role === "bm" ||
    user?.role === "BM" ||
    userRole === "bm" ||
    userRole === "business_manager" ||
    userRole === "businessmanager" ||
    userRole === "branch";

  const isRSO =
    prekRole === PREK_ROLES.RSO ||
    user?.role === "rso" ||
    user?.role === "RSO" ||
    userRole === "rso" ||
    userRole === "regional_safety_officer" ||
    userRole === "regionalsafetyofficer" ||
    user?.role === "branchGroup";

  const canAccessZoneDropdown = isCentral || isNationalHead;

  // Dynamically fetch active zones from Zone Master API
  const { data: zonesData } = useQuery({
    queryKey: ["activeZones"],
    queryFn: async () => {
      try {
        const res = await zoneService.getZones({ isActive: true });
        return res?.data || [];
      } catch (err) {
        console.warn("Could not fetch zones:", err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const zoneList: ZoneItem[] = useMemo(() => {
    return Array.isArray(zonesData) ? zonesData : [];
  }, [zonesData]);

  const canReport = true;
  const canEdit = true;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [currentUpdateStatus, setCurrentUpdateStatus] = useState<string>("Open");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [selectedEditRegion, setSelectedEditRegion] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: userListData } = useQuery({
    queryKey: ["allUsersForIncidentReassign"],
    queryFn: async () => {
      try {
        const res: any = await userService.getUsers({ limit: "all" });
        const list = res?.data || res?.users || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          return list;
        }
      } catch (err) {
        console.warn("Failed to load users for reassign:", err);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "incidents",
      pagination.pageIndex,
      pagination.pageSize,
      selectedStatus,
      selectedRegion,
    ],
    queryFn: () =>
      incidentService.getIncidents({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        region:
          canAccessZoneDropdown && selectedRegion !== "all"
            ? selectedRegion
            : (isRSO && (user?.zone || user?.region) ? (user.zone || user.region) : undefined),
      }),
    placeholderData: keepPreviousData,
  });

  const exportColumns = [
    { key: "sn", header: "S.No." },
    { key: "caseId", header: "Case ID" },
    { key: "date", header: "Date & Time" },
    { key: "region", header: "Region" },
    { key: "branchName", header: "Centre / School" },
    { key: "subCategory", header: "Incident Type" },
    { key: "reporterName", header: "Reported By" },
    { key: "userRole", header: "Role" },
    { key: "severity", header: "Severity" },
    { key: "reassign", header: "Assigned To" },
    { key: "sla", header: "SLA" },
    { key: "status", header: "Status" },
    { key: "briefDescription", header: "Brief Description" },
    { key: "immediateActionTaken", header: "Immediate Action Taken" },
    { key: "pendingAction", header: "Pending Action" },
  ];

  const handleExportAll = async (type: "pdf" | "excel") => {
    try {
      setIsExporting(true);
      toast.info(`Preparing ${type.toUpperCase()} export...`);

      const res = await incidentService.getIncidents({
        page: 1,
        limit: "all",
        status: selectedStatus === "all" ? undefined : selectedStatus,
        region:
          canAccessZoneDropdown && selectedRegion !== "all"
            ? selectedRegion
            : (isRSO && (user?.zone || user?.region) ? (user.zone || user.region) : undefined),
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
        const owner =
          item.escalationOwner ||
          (sev === "Critical"
            ? "Central"
            : sev === "High"
              ? "RSO"
              : sev === "Medium"
                ? "BM"
                : "AOM");
        const sla =
          item.sla ||
          (sev === "Critical"
            ? "2 hrs (immediate)"
            : sev === "High"
              ? "24 hrs"
              : sev === "Medium"
                ? "48 hrs"
                : "3 days (72 hrs)");
        const caseId =
          item.caseId ||
          (item._id ? `INC-${item._id.slice(-6).toUpperCase()}` : "N/A");
        const status = item.status || "N/A";

        return {
          sn: idx + 1,
          caseId,
          date: item.date
            ? `${new Date(item.date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}\n${new Date(item.date).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}`
            : "N/A",
          region: item.region || item.zone || "N/A",
          branchName:
            item.centreName ||
            item.schoolName ||
            item.branchName ||
            item.centre ||
            "N/A",
          category: item.category || "N/A",
          subCategory:
            item.incidentType ||
            item.subCategory ||
            item.type ||
            item.category ||
            "N/A",
          reporterName: item.reporterName || item.reportedBy || "N/A",
          userRole:
            normalizePrekRole(
              item.reporterRole ||
                item.reportedByRole ||
                item.userRole ||
                item.role ||
                item.reporter?.role ||
                item.stakeholders,
            ) ||
            item.reporterRole ||
            item.reportedByRole ||
            item.userRole ||
            item.role ||
            "N/A",
          severity: sev,
          reassign: item.escalatedTo || item.escalationOwner || owner,
          sla,
          status,
          briefDescription: item.briefDescription || item.description || "N/A",
          immediateActionTaken: item.immediateActionTaken || "N/A",
          pendingAction: item.pendingAction || "N/A",
          remarks: item.remarks || "N/A",
        };
      });

      const config: any = {
        title: "Incident Management Report",
        compunknownName: "Lighthouse",
        metadata: {
          Total: `${allRecords.length} records`,
          Zone: selectedRegion === "all" ? "All Zones" : selectedRegion,
          Status: selectedStatus === "all" ? "All Statuses" : selectedStatus,
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.2,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fontSize: 6.8,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          fillColor: [12, 35, 92],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },   // S.No
          1: { cellWidth: 26, halign: "center" },  // Case ID
          2: { cellWidth: 18, halign: "center" },  // Date & Time
          3: { cellWidth: 14, halign: "center" },  // Region
          4: { cellWidth: 24, halign: "left" },    // Centre / School
          5: { cellWidth: 20, halign: "center" },  // Incident Type
          6: { cellWidth: 18, halign: "center" },  // Reported By
          7: { cellWidth: 12, halign: "center" },  // Role
          8: { cellWidth: 14, halign: "center" },  // Severity
          9: { cellWidth: 24, halign: "center" },  // Assigned To
          10: { cellWidth: 16, halign: "center" }, // SLA
          11: { cellWidth: 12, halign: "center" }, // Status
          12: { cellWidth: 33, halign: "left" },   // Brief Description
          13: { cellWidth: 28, halign: "left" },   // Immediate Action Taken
          14: { cellWidth: 10, halign: "left" },   // Pending Action
        },
        margin: { left: 10, right: 10 },
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
  const { data: apiBranches } = useBranchDropdown(undefined, true, true);

  const branchGroupOptions = useMemo(() => {
    if (zoneList && zoneList.length > 0) {
      return zoneList.map((z) => ({
        label: `${z.name} ${z.code ? `(${z.code})` : ""}`.trim(),
        value: z.name,
        branches: [],
      }));
    }
    const list = Array.isArray(branchGroups) ? branchGroups : [];
    if (list.length > 0) {
      return list.map((bg: any) => ({
        label: bg.branchGroupName || bg.name || bg.username || "Unknown",
        value: bg.branchGroupName || bg.name || bg.username || "",
        branches: bg.AssignedBranch || [],
      }));
    }
    return [];
  }, [zoneList, branchGroups]);

  const safetyHeadOptions = useMemo(() => {
    if (apiBranches && apiBranches.length > 0) {
      return apiBranches.map((b: any) => ({
        label: b.branchName || b.name,
        value: b._id,
      }));
    }
    const region = branchGroupOptions.find(
      (o) => o.value === selectedEditRegion,
    );
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

  const canEditRow = useCallback(
    (incident: Incident) => {
      if (isCentral) return true;
      const sev = (incident.severity || "Low").toLowerCase();
      if (isAOM) {
        return sev === "low";
      }
      if (isBM) {
        return sev === "low" || sev === "medium";
      }
      if (isRSO || isNationalHead) {
        return sev !== "critical";
      }
      return true;
    },
    [isCentral, isAOM, isBM, isRSO, isNationalHead],
  );

  const canUpdateStatusRow = useCallback(
    (incident: Incident) => {
      if (isCentral) return true;
      const sev = (incident.severity || "Low").toLowerCase();
      if (isAOM) {
        return sev === "low";
      }
      if (isBM) {
        return sev === "low" || sev === "medium";
      }
      if (isRSO || isNationalHead) {
        return sev !== "critical";
      }
      return false;
    },
    [isCentral, isAOM, isBM, isRSO, isNationalHead],
  );

  const handleEdit = (incident: Incident) => {
    const sev = (incident.severity || "Low").toLowerCase();
    if (isAOM && sev !== "low") {
      toast.error(
        "Permission Denied: Area Operations Managers (AOM) can only update low-severity cases.",
      );
      return;
    }
    if (isBM && sev !== "low" && sev !== "medium") {
      toast.error(
        "Permission Denied: Business Managers (BM) can only update Low and Medium severity cases.",
      );
      return;
    }
    if (isRSO && sev === "critical") {
      toast.error(
        "Permission Denied: Regional Safety Officers (RSO) cannot modify Critical incidents. Sole authority: Central.",
      );
      return;
    }
    const normalized = {
      ...incident,
      briefDescription: incident.briefDescription || incident.description || "",
      description: incident.briefDescription || incident.description || "",
      immediateActionTaken: incident.immediateActionTaken || "",
      pendingAction: incident.pendingAction || "",
      escalatedTo: incident.escalatedTo || incident.escalationOwner || "",
    };
    setSelectedIncident(normalized);
    setSelectedEditRegion(incident.region || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateStatus = (incident: Incident) => {
    const sev = (incident.severity || "Low").toLowerCase();
    if (isAOM && sev !== "low") {
      toast.error(
        "Permission Denied: Area Operations Managers (AOM) can only update low-severity cases.",
      );
      return;
    }
    if (isBM && sev !== "low" && sev !== "medium") {
      toast.error(
        "Permission Denied: Business Managers (BM) can only update status for Low and Medium severity cases.",
      );
      return;
    }
    if ((isRSO || isNationalHead) && sev === "critical") {
      toast.error(
        "Permission Denied (FR-7.2): National Head and Regional Safety Officers (RSO) cannot update or close Critical incidents. Sole closure authority: Central.",
      );
      return;
    }
    setSelectedIncident(incident);
    const initialStatus = incident.status === "Closed" ? "Closed" : "Open";
    setCurrentUpdateStatus(initialStatus);
    setIsStatusDialogOpen(true);
  };

  const handleEscalate = async (incident: Incident, escalatedTo: string) => {
    const status = incident.status || "";
    const isClosed =
      status.toLowerCase() === "closed" ||
      status.toLowerCase() === "close" ||
      status.toLowerCase() === "resolved";
    if (isClosed) {
      toast.error("Reassignment is disabled for closed cases.");
      return;
    }
    try {
      const desc =
        incident.briefDescription ||
        incident.description ||
        "Reassigned";
      const payload: any = {
        status: incident.status || "Open",
        briefDescription: desc,
        description: desc,
        immediateActionTaken: incident.immediateActionTaken || "",
        pendingAction: incident.pendingAction || "",
        escalatedTo,
        escalationOwner: escalatedTo,
        escalationStatus: "Yes",
      };
      if (incident.region) payload.region = incident.region;
      const branchId = incident.branchId || (incident as any).centreId;
      if (branchId) payload.branchId = branchId;
      const branchName =
        incident.branchName ||
        (incident as any).centre ||
        (incident as any).centreName ||
        (incident as any).schoolName;
      if (branchName) payload.branchName = branchName;

      await incidentService.updateIncident(incident._id, payload);
      toast.success(
        `Incident ${incident.caseId || incident._id} reassigned to ${escalatedTo}`,
      );
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to reassign incident",
      );
    }
  };

  const columns = useMemo(() => {
    return getIncidentColumns(
      handleEdit,
      isCentral || isNationalHead || isRSO || isAOM || isBM ? handleUpdateStatus : undefined,
      canEditRow,
      canUpdateStatusRow,
      undefined,
      isCentral || isNationalHead ? handleEscalate : undefined,
      userListData || [],
    );
  }, [isCentral, isNationalHead, isRSO, isAOM, isBM, canEditRow, canUpdateStatusRow, userListData]);

  const handlePaginationChange = (updater: any) => {
    setPagination((prev: PaginationState) => {
      const newValues = typeof updater === "function" ? updater(prev) : updater;
      return newValues;
    });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      incidentService.updateIncident(selectedIncident?._id as string, payload),
    onSuccess: () => {
      toast.success("Incident updated successfully");
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setIsEditDialogOpen(false);
      setSelectedIncident(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update incident",
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: any) =>
      incidentService.updateIncidentStatus(
        selectedIncident?._id as string,
        payload,
      ),
    onSuccess: (res: any) => {
      const msg = res?.message || "Incident status updated successfully";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setIsStatusDialogOpen(false);
      setSelectedIncident(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update incident status",
      );
    },
  });

  const checkClosurePermission = (newStatus: string, severity?: string) => {
    if (newStatus !== "Closed" && newStatus !== "Resolved") return true;

    const sev = (severity || "Low").toLowerCase();
    const role = normalizePrekRole(user?.role);

    // Frontline Area Operations Managers (AOM) can only resolve and close Low-severity cases
    if (isAOM && sev !== "low") {
      toast.error(
        "Permission Denied (FR-7.2): Area Operations Managers (AOM) can only update and close low-severity cases.",
      );
      return false;
    }

    // Business Managers (BM) can only resolve and close Low and Medium severity cases
    if (isBM && sev !== "low" && sev !== "medium") {
      toast.error(
        "Permission Denied (FR-7.2): Business Managers (BM) cannot close High or Critical incidents. Mandatory closure authority: RSO/Central.",
      );
      return false;
    }

    // Regional Safety Officers (RSO) and National Head can resolve and close Low, Medium, and High cases. Critical is Central only.
    if ((isRSO || isNationalHead) && sev === "critical") {
      toast.error(
        "Permission Denied (FR-7.2): National Head and Regional Safety Officers (RSO) cannot close Critical incidents. Mandatory closure authority: Central.",
      );
      return false;
    }

    // FR-7.2: Role Permission Enforcement Closure Authority Rules
    if (sev === "critical") {
      if (role !== PREK_ROLES.CENTRAL && !isCentral) {
        toast.error(
          "Permission Denied (FR-7.2): Only Central (All-Activity Admin) holds sole authority to close Critical incidents.",
        );
        return false;
      }
    } else if (sev === "high") {
      if (role === PREK_ROLES.AOM || role === PREK_ROLES.BM || isAOM || isBM) {
        toast.error(
          "Permission Denied (FR-7.2): Business Managers and AOMs cannot close High-severity cases. Only RSO, National Head, or Central can close High incidents.",
        );
        return false;
      }
    } else if (sev === "medium") {
      if (role === PREK_ROLES.AOM || isAOM) {
        toast.error(
          "Permission Denied (FR-7.2): Frontline Area Operations Managers (AOM) can only resolve and close Low-severity cases.",
        );
        return false;
      }
    }
    return true;
  };

  const handleUpdateSave = (formData: any) => {
    const sev = (selectedIncident?.severity || "Low").toLowerCase();
    if (isAOM && sev !== "low") {
      toast.error(
        "Permission Denied: Area Operations Managers (AOM) can only update low-severity cases.",
      );
      return;
    }
    if (isBM && sev !== "low" && sev !== "medium") {
      toast.error(
        "Permission Denied: Business Managers (BM) can only update Low and Medium severity cases.",
      );
      return;
    }
    if (isRSO && sev === "critical") {
      toast.error(
        "Permission Denied: Regional Safety Officers (RSO) cannot modify Critical incidents. Sole authority: Central.",
      );
      return;
    }

    const desc =
      formData.briefDescription ??
      formData.description ??
      selectedIncident?.briefDescription ??
      selectedIncident?.description ??
      "";

    const payload: any = {
      status: selectedIncident?.status || "Open",
      briefDescription: desc,
      description: desc,
      immediateActionTaken:
        formData.immediateActionTaken ??
        selectedIncident?.immediateActionTaken ??
        "",
      pendingAction:
        formData.pendingAction ?? selectedIncident?.pendingAction ?? "",
      escalatedTo:
        formData.escalatedTo ?? selectedIncident?.escalatedTo ?? "",
      escalationOwner:
        formData.escalatedTo ?? selectedIncident?.escalationOwner ?? "",
      escalationStatus: formData.escalatedTo
        ? "Yes"
        : (selectedIncident?.escalationStatus || "No"),
    };

    if (selectedIncident?.region) {
      payload.region = selectedIncident.region;
    }
    const branchId =
      selectedIncident?.branchId || (selectedIncident as any)?.centreId;
    if (branchId) {
      payload.branchId = branchId;
    }
    const branchName =
      selectedIncident?.branchName ||
      selectedIncident?.centreName ||
      selectedIncident?.schoolName;
    if (branchName) {
      payload.branchName = branchName;
    }

    updateMutation.mutate(payload);
  };

  const handleUpdateStatusSave = (formData: any) => {
    const sev = (selectedIncident?.severity || "Low").toLowerCase();
    if (isAOM && sev !== "low") {
      toast.error(
        "Permission Denied: Area Operations Managers (AOM) can only update low-severity cases.",
      );
      return;
    }
    if (isBM && sev !== "low" && sev !== "medium") {
      toast.error(
        "Permission Denied: Business Managers (BM) can only update status for Low and Medium severity cases.",
      );
      return;
    }
    if ((isRSO || isNationalHead) && sev === "critical") {
      toast.error(
        "Permission Denied (FR-7.2): National Head and Regional Safety Officers (RSO) cannot update or close Critical incidents. Sole closure authority: Central.",
      );
      return;
    }

    if (!checkClosurePermission(formData.status, selectedIncident?.severity)) {
      return;
    }

    const payload: { status: string; remarks?: string } = {
      status: formData.status,
    };

    if (formData.status === "Closed") {
      payload.remarks = formData.remarks || "";
    }

    updateStatusMutation.mutate(payload);
  };

  const handleStatusFieldChange = (key: string, value: any) => {
    if (key === "status") {
      setCurrentUpdateStatus(value as string);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    if (key === "region") {
      setSelectedEditRegion(value);
    }
  };

  const editFields: FieldConfig[] = useMemo(() => {
    const fields: FieldConfig[] = [
      {
        key: "briefDescription",
        label: "Description",
        type: "textarea",
        placeholder: "Enter incident description...",
        required: true,
        gridCols: 1,
      },
      {
        key: "immediateActionTaken",
        label: "Immediate Action Taken",
        type: "textarea",
        placeholder: "Specify immediate actions taken...",
        gridCols: 1,
      },
      {
        key: "pendingAction",
        label: "Pending Action",
        type: "textarea",
        placeholder: "Specify any remaining/pending actions...",
        gridCols: 1,
      },
    ];

    return fields;
  }, []);

  const statusUpdateFields: FieldConfig[] = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Open", "Closed"],
      required: true,
    },
    {
      key: "remarks",
      label: "Closing Remarks",
      type: "textarea",
      placeholder: "Enter closing remarks (e.g., Investigation complete, child safe in school...)",
      required: currentUpdateStatus === "Closed",
      hidden: currentUpdateStatus !== "Closed",
      validation: currentUpdateStatus === "Closed"
        ? {
            minLength: 5,
            message: "Closing remarks must be at least 5 characters",
          }
        : undefined,
    },
  ], [currentUpdateStatus]);

  const { tableElement } = useCustomTable({
    data: data?.data || [],
    columns,
    pagination,
    totalCount: data?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: handlePaginationChange,
    pageSizeOptions: [10, 20, 30, 50, 100, "All"],
    showSerialNumber: true,
    enableSorting: false,
    maxHeight: "calc(100vh - 300px)",
    enableColumnWrapping: false,
    defaultTextWrap: "nowrap",
  });

  return (
    <div className="h-full flex flex-col space-y-4 p-2 sm:p-4 bg-gray-50/50 overflow-x-clip overflow-y-auto min-h-[calc(100vh-64px)]">
      <ResponseLoader
        isLoading={
          isLoading ||
          isExporting ||
          updateMutation.isPending ||
          updateStatusMutation.isPending
        }
      />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Incident Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            View and manage reported incidents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canAccessZoneDropdown && (
            <Select
              value={selectedRegion}
              onValueChange={(value) => {
                setSelectedRegion(value);
                setPagination((prev: PaginationState) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px] bg-white h-9">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zoneList.map((z) => (
                  <SelectItem key={z._id || z.name} value={z.name}>
                    {z.name} {z.code ? `(${z.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setPagination((prev: PaginationState) => ({ ...prev, pageIndex: 0 }));
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white cursor-pointer h-9"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExportAll("excel")}
                className="cursor-pointer gap-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportAll("pdf")}
                className="cursor-pointer gap-2"
              >
                <FileText className="h-4 w-4 text-red-600" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 bg-white cursor-pointer h-9"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {canReport && (
            <Link href="/dashboard/incident/new">
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-white cursor-pointer h-9 shadow-xs"
              >
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
        description="Modify incident description and action details."
      />

      <DynamicEditDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        data={selectedIncident}
        fields={statusUpdateFields}
        onSave={handleUpdateStatusSave}
        onFieldChange={handleStatusFieldChange}
        title="Update Incident Status"
        description="Update the current incident status and case closure details."
      />
    </div>
  );
}
