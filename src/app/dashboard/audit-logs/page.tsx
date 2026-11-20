"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { incidentService } from "@/services/api/incidentService";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  History,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PaginationState, ColumnDef } from "@tanstack/react-table";
import ResponseLoader from "@/components/ResponseLoader";
import { toast } from "sonner";
import { AuditLog } from "@/interface/modal";
import { useAuthStore } from "@/store/authStore";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useExport } from "@/hooks/useExport";
import { FloatingMenu } from "@/components/floatingMenu";

export default function AuditLogsPage() {
  const router = useRouter();
  const { exportToPDF, exportToExcel } = useExport();
  const authUser = useAuthStore((state) => state.decodedToken);
  const prekRole = normalizePrekRole(authUser?.role);

  const isCentral = useMemo(() => {
    if (
      prekRole === PREK_ROLES.CENTRAL ||
      authUser?.role === "superAdmin" ||
      authUser?.role === "Central" ||
      authUser?.role === "central" ||
      authUser?.username === "central_admin"
    ) {
      return true;
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || Cookies.get("token");
      if (token) {
        try {
          const decoded = getDecodedToken(token);
          const norm = decoded?.role ? normalizePrekRole(decoded.role) : "";
          if (
            norm === PREK_ROLES.CENTRAL ||
            decoded?.role === "superAdmin" ||
            decoded?.role === "Central" ||
            decoded?.role === "central" ||
            decoded?.username === "central_admin"
          ) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  }, [authUser, prekRole]);

  useEffect(() => {
    if (authUser && !isCentral) {
      toast.error("Access Restricted: Only Central administrators have authority to view the Audit Trail.");
      router.replace("/dashboard/incident");
    }
  }, [authUser, isCentral, router]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch paginated audit logs from backend /api/audit-logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "audit-logs",
      pagination.pageIndex,
      pagination.pageSize,
      selectedAction,
      debouncedSearch,
    ],
    queryFn: () =>
      incidentService.getAuditLogs({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        action: selectedAction === "all" ? undefined : selectedAction,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: isCentral,
  });

  const logsList: AuditLog[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.logs)) return data.logs;
    return [];
  }, [data]);

  const totalCount: number = useMemo(() => {
    if (typeof data?.total === "number") return data.total;
    if (typeof data?.totalCount === "number") return data.totalCount;
    return logsList.length;
  }, [data, logsList]);

  const handleExportAll = async (type: "pdf" | "excel") => {
    if (!isCentral) {
      toast.error("Access Restricted: Only Central administrators can export the Audit Trail.");
      return;
    }
    try {
      setIsExporting(true);
      toast.info(`Preparing ${type.toUpperCase()} export...`);

      const res = await incidentService.getAuditLogs({
        page: 1,
        limit: 1000,
        action: selectedAction === "all" ? undefined : selectedAction,
        search: debouncedSearch.trim() || undefined,
      });

      const records: AuditLog[] =
        res?.data || (Array.isArray(res) ? res : logsList);

      if (!records.length) {
        toast.warning("No audit records found to export.");
        return;
      }

      const formatted = records.map((item, idx) => ({
        sn: idx + 1,
        timestamp: item.createdAt
          ? new Date(item.createdAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : "N/A",
        action: item.action || "N/A",
        performedBy: item.username || item.userId || "System",
        role: item.role || item.userRole || "N/A",
        description:
          item.description ||
          (typeof item.details === "string"
            ? item.details
            : JSON.stringify(item.details || "")),
        ipAddress: item.ipAddress || "N/A",
      }));

      const config = {
        title: "Security & Operational Audit Trail",
        companyName: "Lighthouse — Pre-K Incident Portal",
        metadata: {
          Total: `${records.length} records`,
          Category: selectedAction === "all" ? "All Events" : selectedAction,
          GeneratedAt: new Date().toLocaleString(),
        },
      };

      const exportCols = [
        { header: "S.No", key: "sn" },
        { header: "Timestamp", key: "timestamp" },
        { header: "Action", key: "action" },
        { header: "Performed By", key: "performedBy" },
        { header: "Role", key: "role" },
        { header: "Description", key: "description" },
        { header: "IP Address", key: "ipAddress" },
      ];

      if (type === "pdf") {
        await exportToPDF(formatted, exportCols, config);
      } else {
        await exportToExcel(formatted, exportCols, config);
      }
      toast.success(`${type.toUpperCase()} exported successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export audit logs.");
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    const act = action?.toUpperCase() || "";
    if (act === "LOGIN_SUCCESS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          LOGIN SUCCESS
        </span>
      );
    }
    if (act === "LOGIN_FAILED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          LOGIN FAILED
        </span>
      );
    }
    if (act === "ACCOUNT_LOCKED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          ACCOUNT LOCKED
        </span>
      );
    }
    if (act === "INCIDENT_CREATED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
          INCIDENT CREATED
        </span>
      );
    }
    if (act === "INCIDENT_STATUS_CHANGED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <History className="w-3.5 h-3.5 text-indigo-600" />
          STATUS CHANGED
        </span>
      );
    }
    if (act === "INCIDENT_CLOSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          INCIDENT CLOSED
        </span>
      );
    }
    if (act === "USER_CREATED" || act === "USER_UPDATED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          {act.replace("_", " ")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {action || "SYSTEM"}
      </span>
    );
  };

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        header: "Timestamp",
        accessorKey: "createdAt",
        cell: ({ row }) => {
          const date = row.original.createdAt;
          if (!date) return <span className="text-slate-400">--</span>;
          return (
            <div className="flex flex-col text-xs leading-snug">
              <span className="font-semibold text-slate-900">
                {new Date(date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(date).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          );
        },
      },
      {
        header: "Event Action",
        accessorKey: "action",
        cell: ({ row }) => getActionBadge(row.original.action),
      },
      {
        header: "Actor (Performed By)",
        accessorKey: "username",
        cell: ({ row }) => {
          const name = row.original.username || row.original.userId || "System";
          const role = row.original.role || row.original.userRole;
          return (
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-slate-900">{name}</span>
              {role && (
                <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                  {role}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: "Event Details",
        accessorKey: "description",
        cell: ({ row }) => {
          const desc =
            row.original.description ||
            (typeof row.original.details === "string"
              ? row.original.details
              : JSON.stringify(row.original.details || ""));
          return (
            <p
              className="text-xs text-slate-600 max-w-[280px] sm:max-w-[340px] truncate"
              title={desc}
            >
              {desc || "Operation logged"}
            </p>
          );
        },
      },
      {
        header: "IP Address",
        accessorKey: "ipAddress",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500">
            {row.original.ipAddress || "--"}
          </span>
        ),
      },
      {
        header: "Action",
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer font-medium"
            onClick={() => {
              setSelectedLog(row.original);
              setIsDetailOpen(true);
            }}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            Inspect
          </Button>
        ),
      },
    ],
    []
  );

  const { tableElement } = useCustomTable({
    data: logsList as any,
    columns: columns as any,
    pagination,
    totalCount,
    loading: isLoading,
    onPaginationChange: (updater: any) => {
      setPagination((prev) =>
        typeof updater === "function" ? updater(prev) : updater
      );
    },
    pageSizeOptions: [10, 20, 50, 100],
    showSerialNumber: true,
    enableSorting: false,
    maxHeight: "calc(100vh - 330px)",
    enableColumnWrapping: false,
    defaultTextWrap: "nowrap",
  });

  if (!isCentral) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1.5">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          The Security & Operational Audit Trail is classified and can only be accessed by users with the Central administration role.
        </p>
        <Button
          onClick={() => router.replace("/dashboard/incident")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-2 sm:p-4 bg-gray-50/50 overflow-x-clip overflow-y-auto min-h-[calc(100vh-64px)]">
      <ResponseLoader isLoading={isLoading || isExporting} />

      {/* Action Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input with Debounce */}
          <div className="w-full sm:w-[260px]">
            <Input
              placeholder="Search keyword, actor, IP..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 bg-white text-xs"
            />
          </div>

          {/* Action Filter */}
          <Select
            value={selectedAction}
            onValueChange={(val) => {
              setSelectedAction(val);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-white h-9 text-xs">
              <SelectValue placeholder="All Event Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
              <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
              <SelectItem value="ACCOUNT_LOCKED">Account Locked</SelectItem>
              <SelectItem value="INCIDENT_CREATED">Incident Created</SelectItem>
              <SelectItem value="INCIDENT_STATUS_CHANGED">
                Status Changed
              </SelectItem>
              <SelectItem value="INCIDENT_CLOSED">Incident Closed</SelectItem>
              <SelectItem value="USER_CREATED">User Created</SelectItem>
              <SelectItem value="USER_UPDATED">User Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white cursor-pointer h-9 text-xs font-semibold"
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

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 bg-white cursor-pointer h-9 text-xs"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="relative">{tableElement}</div>

      {/* Detail Inspector Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Audit Log Event Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete payload and security fingerprint for audit ID:{" "}
              <span className="font-mono font-medium">{selectedLog?._id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <div>
                  <span className="text-slate-500 font-medium block">
                    Action Event
                  </span>
                  <div className="mt-1">
                    {getActionBadge(selectedLog.action)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">
                    Timestamp
                  </span>
                  <span className="font-semibold text-slate-800 block mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">
                    Actor
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedLog.username || selectedLog.userId || "System"} (
                    {selectedLog.role || selectedLog.userRole || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">
                    IP Address
                  </span>
                  <span className="font-mono text-slate-800">
                    {selectedLog.ipAddress || "Unknown"}
                  </span>
                </div>
                {selectedLog.caseId && (
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium block">
                      Target Case ID
                    </span>
                    <span className="font-mono font-bold text-blue-700">
                      {selectedLog.caseId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-700 font-semibold block mb-1">
                  Description / Activity Note
                </span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-md text-slate-700">
                  {selectedLog.description || "No description provided."}
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-slate-700 font-semibold block mb-1">
                    Raw Metadata & Event Payload
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto text-[11px] font-mono leading-relaxed max-h-[220px]">
                    {typeof selectedLog.details === "string"
                      ? selectedLog.details
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingMenu
        onExportPdf={() => handleExportAll("pdf")}
        onExportExcel={() => handleExportAll("excel")}
      />
    </div>
  );
}
