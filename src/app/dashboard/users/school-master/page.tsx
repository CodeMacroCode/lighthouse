"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import {
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { School } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { formatDate } from "@/util/formatDate";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { AdminImportModal } from "@/components/school-import/SchoolImportModal";
import { excelFileUploadForSchool } from "@/services/fileUploadService";
import { loginUser } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useRouter } from "next/navigation";
import { auditService } from "@/services/api/auditService";
import { getAuditColumns } from "@/components/columns/columns";
import { useCustomTable } from "@/components/ui/customTable(serverSidePagination)";
import { ViewAuditDetails } from "@/components/audit/ViewAuditDetails";
import { PaginationState } from "@tanstack/react-table";
import { Audit } from "@/interface/modal";
import { History, RefreshCcw, ScrollText } from "lucide-react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    flex?: number;
    minWidth?: number;
    maxWidth?: number;
  }
}

const PasswordCell = ({ password }: { password?: string }) => {
  const [show, setShow] = React.useState(false);
  const { decodedToken } = useAuthStore();
  const isSuperSupport = decodedToken?.username === "supersupport";

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="font-mono">
        {show && !isSuperSupport ? password : "•".repeat(password?.length || 8)}
      </span>

      {!isSuperSupport && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShow((prev) => !prev);
          }}
          className="p-1 hover:bg-gray-200 rounded cursor-pointer shrink-0"
        >
          {show ? (
            <EyeOff className="h-4 w-4 text-gray-700" />
          ) : (
            <Eye className="h-4 w-4 text-gray-700" />
          )}
        </button>
      )}
    </div>
  );
};

export default function SchoolMaster() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: authLogin, decodedToken: user } = useAuthStore();
  const { setAccess } = useAccessStore();

  const isSchoolRole = user?.role === "school";

  // Audit state
  const [paginationAudit, setPaginationAudit] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isAuditViewOpen, setIsAuditViewOpen] = useState(false);
  const [selectedAuditForView, setSelectedAuditForView] = useState<Audit | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filteredData, setFilteredData] = useState<School[]>([]);
  const [filterResults, setFilterResults] = useState<School[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const { exportToPDF, exportToExcel } = useExport();
  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Handle "Login As" - superAdmin logs in as a school admin
  const handleLoginAs = async (username: string, password: string, id: string) => {
    setLoginAsLoading(id);
    try {
      // Clear existing session
      Cookies.remove("token");
      localStorage.clear();

      const data = await loginUser(username, password);
      if (data?.token) {
        authLogin(data.token);
        if (data.access) {
          setAccess(data.access);
        }
        toast.success(`Logged in as ${username}`);
        window.location.replace("/dashboard/users/user-access");
      } else {
        toast.error("Login failed: Invalid server response");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoginAsLoading(null);
    }
  };





  const {
    data: schools,
    isLoading,
    isError,
    error,
  } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await api.get<School[]>("/school");
      return res;
    },
    enabled: !isSchoolRole,
  });

  // Audit Audit logic
  const { data: auditListData, isLoading: isAuditListLoading, refetch: refetchAudits } = useQuery({
    queryKey: ["audits", paginationAudit.pageIndex, paginationAudit.pageSize],
    queryFn: () => auditService.getAudits({
      page: paginationAudit.pageIndex + 1,
      limit: paginationAudit.pageSize,
    }),
    enabled: isSchoolRole,
  });

  const auditColumns = React.useMemo(() => getAuditColumns((audit) => {
    setSelectedAuditForView(audit);
    setIsAuditViewOpen(true);
  }), []);

  const { tableElement: auditTable } = useCustomTable({
    data: auditListData?.data || [],
    columns: auditColumns,
    pagination: paginationAudit,
    totalCount: auditListData?.total || 0,
    loading: isAuditListLoading,
    onPaginationChange: setPaginationAudit,
    pageSizeOptions: [10, 20, 50],
    showSerialNumber: true,
    maxHeight: "calc(100vh - 240px)",
  });

  useEffect(() => {
    if (schools && schools.length > 0) {
      setFilteredData(schools);
      setFilterResults(schools); // For search base
    } else {
      setFilteredData([]);
      setFilterResults([]);
    }
  }, [schools]);

  // Define the columns for the table
  const columns: ColumnDef<School, CellContent>[] = [
    {
      header: "CXO / Leaders",
      accessorFn: (row: any) => ({
        type: "custom",
        render: () => (
          <div className="flex items-center gap-2 w-full">
            <span className="truncate flex-1">{row.schoolName ?? ""}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoginAs(row.username, row.password, row._id);
                  }}
                  disabled={loginAsLoading === row._id}
                  className="shrink-0 w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 dark:bg-gray-600/60 dark:hover:bg-gray-500 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                >
                  {loginAsLoading === row._id ? (
                    <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Login as {row.schoolName}
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      }),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Mobile",
      accessorFn: (row: any) => ({
        type: "text",
        value: row.mobileNo ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Username",
      accessorFn: (row: any) => ({
        type: "text",
        value: row.username ?? "",
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
      enableHiding: true,
    },
    {
      header: "Password",
      accessorFn: (row: any) => ({
        type: "custom",
        render: () => <PasswordCell password={row.password} />,
      }),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },

    {
      header: "Registration Date",
      accessorFn: (row: any) => ({
        type: "text",
        value: formatDate(row.createdAt) ?? "",
      }),
      meta: { flex: 1, minWidth: 200 },
      enableHiding: true,
    },
    {
      header: "Action",
      accessorFn: (row: any) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            onClick: () => {
              setEditTarget(row);
              setEditDialogOpen(true);
            },
            className: "cursor-pointer text-white",
            // note: original used updateSchoolMutation.isPending; keep as-is if desired
            disabled: false,
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setDeleteTarget(row),
            className: "text-white cursor-pointer",
            disabled: false,
          },
          {
            type: "button",
            label: (row as any).Active ? "Deactivate" : "Activate",
            onClick: () => deactivateMutation.mutate(row),
            className: `${(row as any).Active
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
              } w-24 cursor-pointer`,
            disabled: deactivateMutation.isPending,
          },
        ],
      }),
      meta: {
        minWidth: 280,
        maxWidth: 320,
        width: 300,
      },
      enableSorting: false,
      enableHiding: true,
    },
  ];



  // Mutation to add a new school
  const addSchoolMutation = useMutation({
    mutationFn: async (newSchool: any) => {
      const school = await api.post("/school", newSchool);
      return school.school;
    },
    onSuccess: (createdSchool) => {
      queryClient.setQueryData<School[]>(["schools"], (oldSchools = []) => {
        return [...oldSchools, createdSchool];
      });
    },
  });

  // Mutation for edit school data
  const updateSchoolMutation = useMutation({
    mutationFn: async ({
      schoolId,
      data,
    }: {
      schoolId: string;
      data: Partial<School>;
    }) => {
      return await api.put(`/school/${schoolId}`, data);
    },
    onSuccess: (_, { schoolId, data }) => {
      queryClient.setQueryData<School[]>(["schools"], (oldData) => {
        if (!oldData) return [];
        return oldData.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        );
      });

      // Update filteredData manually
      setFilteredData((prev) =>
        prev.map((school) =>
          school._id === schoolId ? { ...school, ...data } : school
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      alert("Admin updated successfully.");
    },
    onError: (err) => {
      alert("Failed to update admin.\nerror: " + err);
    },
  });

  // Mutation to delete a school
  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return await api.delete(`/school/${schoolId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<School[]>(["schools"], (oldData) =>
        oldData?.filter((school) => school._id !== deletedId)
      );
      alert("Admin deleted successfully.");
    },
    onError: (err) => {
      alert("Failed to delete admin.\nerror: " + err);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (school: any) => {
      const token = localStorage.getItem("token");
      return await authAxios.put(
        `/user/deactivate/${school._id}`,
        {
          Active: !school.Active,
          userRole: school.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("Admin status updated successfully.");
    },
    onError: (err: any) => {
      toast.error(
        `Failed to update admin status: ${err.response?.data?.message || err.message
        }`
      );
    },
  });

  useEffect(() => {
    if (deleteTarget) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${deleteTarget.schoolName}"? This action cannot be undone.`
      );

      if (confirmed) {
        deleteSchoolMutation.mutate(deleteTarget._id);
      }

      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteSchoolMutation]);

  // Handle search
  const handleSearchResults = useCallback((results: School[]) => {
    setFilteredData(results);
  }, []);

  // Handle save action for edit school
  const handleSave = (updatedData: Partial<School>) => {
    if (!editTarget) return;

    const changedFields: Partial<Record<keyof School, unknown>> = {};

    for (const key in updatedData) {
      const newValue = updatedData[key as keyof School];
      const oldValue = editTarget[key as keyof School];

      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof School] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      console.log("No changes detected.");
      return;
    }

    updateSchoolMutation.mutate({
      schoolId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const data = {
      schoolName: (form.elements.namedItem("schoolName") as HTMLInputElement)?.value,
      username: (form.elements.namedItem("username") as HTMLInputElement)?.value,
      password: (form.elements.namedItem("password") as HTMLInputElement)?.value,
      email: (form.elements.namedItem("email") as HTMLInputElement)?.value,
      mobileNo: (form.elements.namedItem("mobileNo") as HTMLInputElement)?.value,
    };

    try {
      await addSchoolMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      toast.success("Admin added successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add admin");
    }
  };

  const handleDateFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!schools || (!start && !end)) {
        setFilteredData(schools || []);
        return;
      }

      const filtered = schools.filter((school) => {
        if (!school.createdAt) return false;

        const createdDate = new Date(school.createdAt);
        return (!start || createdDate >= start) && (!end || createdDate <= end);
      });

      setFilteredData(filtered);
    },
    [schools]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  // Bulk Import Handler
  const handleBulkImport = async (file: File) => {
    try {
      const result = await excelFileUploadForSchool(file);
      toast.success(result.message || "Import successful");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Import failed");
      console.error("Import error:", err);
    }
  };

  return (
    <main className="h-full overflow-hidden flex flex-col">
      <ResponseLoader isLoading={isLoading || isAuditListLoading} />

      {isSchoolRole ? (
        <div className="flex flex-col h-full animate-in fade-in duration-500 p-4">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <ScrollText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0c235c]">Audit History</h1>
                <p className="text-xs text-gray-500 font-medium">
                  {auditListData?.total || 0} inspections found
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAudits()}
              className="rounded-xl gap-2 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-bold h-10 px-4"
            >
              <RefreshCcw
                className={`h-4 w-4 ${isAuditListLoading ? "animate-spin" : ""}`}
              />
              Sync Records
            </Button>
          </header>

          <section className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mb-4">
            {auditTable}
          </section>

          <ViewAuditDetails
            isOpen={isAuditViewOpen}
            onClose={() => setIsAuditViewOpen(false)}
            audit={selectedAuditForView}
          />
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between mb-4">
            <section className="flex space-x-4">
              <SearchComponent
                data={filterResults}
                displayKey={["schoolName", "username", "email", "mobileNo"]}
                onResults={handleSearchResults}
                className="w-[300px] mb-4"
              />
              <div>
                <DateRangeFilter
                  onDateRangeChange={handleDateFilter}
                  title="Search by Registration Date"
                />
              </div>

              <ColumnVisibilitySelector
                columns={table.getAllColumns()}
                buttonVariant="outline"
                buttonSize="default"
              />
            </section>

            <section className="flex gap-2">
              <AdminImportModal
                onImport={handleBulkImport}
                isLoading={addSchoolMutation.isPending}
              />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="text-white">
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Add CXO</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="schoolName">CXO</Label>
                        <Input
                          id="schoolName"
                          name="schoolName"
                          placeholder="Enter regional head name"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter email address"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mobileNo">Mobile No</Label>
                        <Input
                          id="mobileNo"
                          name="mobileNo"
                          type="tel"
                          placeholder="Enter admin mobile number"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          autoComplete="tel"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="Enter username"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showAddPassword ? "text" : "password"}
                            placeholder="Enter password"
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowAddPassword(!showAddPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showAddPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button ref={closeButtonRef} variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        className="text-white"
                        disabled={addSchoolMutation.isPending}
                      >
                        {addSchoolMutation.isPending ? "Saving..." : "Save Admin"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </section>
          </header>

          <section className="mb-4">
            <CustomTable
              data={filteredData || []}
              columns={columns}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              pageSizeArray={[20, 50, "All"]}
              maxHeight="calc(100vh - 240px)"
              minHeight={200}
              showSerialNumber={true}
              noDataMessage="No admin found"
              isLoading={isLoading}
            />
          </section>

          <section>
            {editTarget && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const updatedData = {
                        schoolName: (
                          form.elements.namedItem(
                            "editSchoolName"
                          ) as HTMLInputElement
                        )?.value,
                        mobileNo: (
                          form.elements.namedItem(
                            "editMobileNo"
                          ) as HTMLInputElement
                        )?.value,
                        username: (
                          form.elements.namedItem(
                            "editUsername"
                          ) as HTMLInputElement
                        )?.value,
                        password: (
                          form.elements.namedItem(
                            "editPassword"
                          ) as HTMLInputElement
                        )?.value,
                      };

                      updateSchoolMutation.mutate({
                        schoolId: editTarget._id,
                        data: updatedData,
                      });
                    }}
                    className="space-y-4"
                  >
                    <DialogHeader>
                      <DialogTitle>Edit Admin</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="editSchoolName">Admin *</Label>
                        <Input
                          id="editSchoolName"
                          name="editSchoolName"
                          defaultValue={editTarget.schoolName}
                          placeholder="Enter admin name"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="editMobileNo">Mobile No *</Label>
                        <Input
                          id="editMobileNo"
                          name="editMobileNo"
                          type="tel"
                          defaultValue={editTarget.mobileNo}
                          placeholder="Enter mobile number"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="editUsername">Username *</Label>
                        <Input
                          id="editUsername"
                          name="editUsername"
                          defaultValue={editTarget.username}
                          placeholder="Enter username"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="editPassword">Password *</Label>
                        <div className="relative">
                          <Input
                            id="editPassword"
                            name="editPassword"
                            type={showEditPassword ? "text" : "password"}
                            defaultValue={editTarget.password}
                            placeholder="Enter password"
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowEditPassword(!showEditPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showEditPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditDialogOpen(false);
                          setEditTarget(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="text-white"
                        disabled={updateSchoolMutation.isPending}
                      >
                        {updateSchoolMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </section>
        </>
      )}
    </main>
  );

      {/* <section>
        <FloatingMenu
          onExportPdf={() => {
            console.log("Export PDF triggered");
            exportToPDF(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Credence Tracker",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
          onExportExcel={() => {
            console.log("Export Excel triggered");
            exportToExcel(filteredData, columnsForExport, {
              title: "School Master Report",
              companyName: "Credence Tracker",
              metadata: {
                Total: `${filteredData.length} schools`,
              },
            });
          }}
        />
      </section> */}
}
