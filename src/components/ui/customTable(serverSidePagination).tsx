import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Checkbox } from "./checkbox";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Skeleton } from "./skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./button";

export type { ColumnDef, SortingState, PaginationState };

export type TextWrapOption =
  | "wrap"
  | "nowrap"
  | "ellipsis"
  | "break-word"
  | "break-all";

export interface ColumnWrapConfig {
  wrap?: TextWrapOption;
  maxWidth?: string;
  minWidth?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination: PaginationState;
  totalCount: number;
  loading?: boolean;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  sorting?: SortingState;
  emptyMessage?: string;
  pageSizeOptions?: (number | string)[];
  enableSorting?: boolean;
  manualSorting?: boolean;
  manualPagination?: boolean;
  showSerialNumber?: boolean;
  serialNumberHeader?: string;
  maxHeight?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  onRowClick?: (row: T) => void;
  enableRowClick?: boolean;

  defaultTextWrap?: TextWrapOption;
  enableColumnWrapping?: boolean;

  selectedRowId?: number | string | null;
  getRowId?: (row: T) => number | string;
  getRowClassName?: (row: T, isSelected: boolean) => string;
  selectedRowClassName?: string;

  enableMultiSelect?: boolean;

  enableVirtualization?: boolean;
  estimatedRowHeight?: number;
  overscan?: number;
}

export const CustomTableServerSidePagination = useCustomTable;

const defaultGetRowId = (row: any) =>
  row?._id ||
  row?.id ||
  row?.caseId ||
  row?.deviceId ||
  row?.key;

export function useCustomTable<
  T extends Record<string, unknown>
>({
  data,
  columns,
  pagination,
  totalCount,
  loading = false,
  onPaginationChange,
  onSortingChange,
  sorting = [],
  emptyMessage = "No data available",
  pageSizeOptions = [10, 20, 30, 40, 50, "All"],
  enableSorting = true,
  manualSorting = true,
  manualPagination = true,
  showSerialNumber = true,
  serialNumberHeader = "SN",
  maxHeight = "h-[full]",
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  enableRowClick = true,
  defaultTextWrap = "nowrap",
  enableColumnWrapping = true,
  selectedRowId = null,
  getRowId = defaultGetRowId,
  enableMultiSelect = false,
  enableVirtualization = false,
  estimatedRowHeight = 50,
  overscan = 5,
  getRowClassName,
}: DataTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;

  const getWrapClasses = useCallback((wrapOption: TextWrapOption): string => {
    const baseClasses = "leading-relaxed";

    switch (wrapOption) {
      case "wrap":
        return `${baseClasses} whitespace-normal break-words`;
      case "nowrap":
        return `${baseClasses} whitespace-nowrap`;
      case "ellipsis":
        return `${baseClasses} whitespace-nowrap overflow-hidden text-ellipsis`;
      case "break-word":
        return `${baseClasses} whitespace-normal break-words overflow-wrap-anywhere`;
      case "break-all":
        return `${baseClasses} whitespace-normal break-all`;
      default:
        return `${baseClasses} whitespace-nowrap`;
    }
  }, []);

  const getWrapStyles = useCallback(
    (wrapConfig?: ColumnWrapConfig): React.CSSProperties => {
      if (!wrapConfig) return {};

      return {
        maxWidth: wrapConfig.maxWidth,
        minWidth: wrapConfig.minWidth,
        width: wrapConfig.maxWidth || wrapConfig.minWidth,
      };
    },
    []
  );

  const selectionColumn: ColumnDef<T> | null = enableMultiSelect
    ? {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(val) => row.toggleSelected(!!val)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
    }
    : null;

  const serialNumberColumn: ColumnDef<T> = {
    id: "serialNumber",
    header: serialNumberHeader,
    cell: ({ row }) =>
      pagination.pageIndex * pagination.pageSize + row.index + 1,
    enableSorting: false,
    enableHiding: false,
    size: 60,
    meta: {
      wrapConfig: { wrap: "nowrap" },
    },
  };

  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  const tableColumns: ColumnDef<T>[] = enableMultiSelect
    ? showSerialNumber
      ? [selectionColumn!, serialNumberColumn, ...columns]
      : [selectionColumn!, ...columns]
    : showSerialNumber
      ? [serialNumberColumn, ...columns]
      : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: (row: any, relativeIndex: number) => {
      const custom = getRowIdRef.current ? getRowIdRef.current(row) : undefined;
      return custom != null && custom !== ""
        ? String(custom)
        : `row-p${pagination.pageIndex}-${relativeIndex}`;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    manualPagination,
    enableSorting,
    enableRowSelection: enableMultiSelect,
    state: {
      sorting,
      pagination,
      columnVisibility: currentColumnVisibility,
      ...(enableMultiSelect ? { rowSelection } : {}),
    },
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: enableMultiSelect ? setRowSelection : undefined,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  });

  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const hasNextPage = pagination.pageIndex < totalPages - 1;
  const hasPrevPage = pagination.pageIndex > 0;

  const goToPage = (pageIndex: number) => {
    onPaginationChange({
      ...pagination,
      pageIndex: Math.max(0, Math.min(pageIndex, totalPages - 1)),
    });
  };

  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  const changePageSize = (value: string) => {
    const isAll = value === "All";

    onPaginationChange({
      pageIndex: 0,
      pageSize: isAll
        ? totalCount || data.length || pagination.pageSize
        : parseInt(value, 10),
    });
  };

  const isExpandedRow = (rowData: any) => {
    return rowData?.isLoading || rowData?.isDetailTable || rowData?.isEmpty;
  };

  const handleRowClick = (row: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.closest(
      'button, a, input, select, [role="button"]'
    );

    if (isInteractiveElement) return;

    if (enableRowClick && onRowClick && !isExpandedRow(row.original)) {
      onRowClick(row.original as T);
    }
  };

  const selectedRows = enableMultiSelect
    ? table.getSelectedRowModel().rows.map((row: any) => (getRowIdRef.current ? getRowIdRef.current(row.original as T) : (row.original as any)?.id))
    : [];

  const rows = table.getRowModel().rows;

  // Mobile Infinite Scrolling state:
  // Maintain accumulated rows in state so that newly fetched pages trigger React re-renders,
  // while ensuring page 0 displays immediately and resets cleanly on filter/search/sort change.
  const [accumulatedRows, setAccumulatedRows] = useState<typeof rows>([]);
  const lastLoadedPageRef = useRef<number>(0);
  const isFetchingNextPageRef = useRef<boolean>(false);
  const page0RowsRef = useRef<typeof rows>([]);

  // Keep a reference to the latest page 0 rows whenever on page 0
  if (pagination.pageIndex === 0) {
    page0RowsRef.current = rows;
  }

  // When reset to page 0 (e.g., search/filter/sort changed), clear accumulated rows
  useEffect(() => {
    if (pagination.pageIndex === 0) {
      if (accumulatedRows.length > 0) {
        setAccumulatedRows([]);
      }
      lastLoadedPageRef.current = 0;
      isFetchingNextPageRef.current = false;
    }
  }, [pagination.pageIndex, accumulatedRows.length]);

  // Synchronize accumulated rows when subsequent pages load
  useEffect(() => {
    if (loading) return;

    if (
      pagination.pageIndex > 0 &&
      pagination.pageIndex > lastLoadedPageRef.current &&
      data.length > 0
    ) {
      const currentRows = table.getRowModel().rows;
      setAccumulatedRows((prevRows: any[]) => {
        const baseRows = prevRows.length > 0 ? prevRows : page0RowsRef.current;
        const seen = new Set(
          baseRows.map((r: any, idx: number) => {
            const id = getRowIdRef.current ? getRowIdRef.current(r.original as T) : undefined;
            return id != null && id !== "" ? String(id) : r.id || String(idx);
          })
        );
        const newRows = currentRows.filter((r: any, idx: number) => {
          const id = getRowIdRef.current ? getRowIdRef.current(r.original as T) : undefined;
          const key = id != null && id !== "" ? String(id) : r.id || String(idx);
          return !seen.has(key);
        });

        // Only commit if we actually received fresh, non-duplicate rows
        if (newRows.length > 0) {
          lastLoadedPageRef.current = pagination.pageIndex;
          isFetchingNextPageRef.current = false;
          return [...baseRows, ...newRows];
        }

        return prevRows.length > 0 ? prevRows : baseRows;
      });
      lastLoadedPageRef.current = pagination.pageIndex;
      isFetchingNextPageRef.current = false;
    } else if (pagination.pageIndex === lastLoadedPageRef.current) {
      isFetchingNextPageRef.current = false;
    }
  }, [loading, pagination.pageIndex, data]);

  useEffect(() => {
    if (!loading) {
      isFetchingNextPageRef.current = false;
    }
  }, [loading]);

  const mobileDisplayRows = useMemo(() => {
    if (pagination.pageIndex === 0) {
      return rows;
    }
    if (accumulatedRows.length > 0) {
      return accumulatedRows;
    }
    return page0RowsRef.current.length > 0 ? page0RowsRef.current : rows;
  }, [pagination.pageIndex, rows, accumulatedRows]);

  const hasMoreMobileRecords =
    totalCount > 0 ? mobileDisplayRows.length < totalCount : hasNextPage;

  useEffect(() => {
    const sentinel = mobileSentinelRef.current;
    if (!sentinel) return;

    // Find the nearest scrollable ancestor container (e.g., <main className="overflow-y-auto">)
    let scrollParent: HTMLElement | null = null;
    let current = sentinel.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflow === "auto" ||
        style.overflow === "scroll"
      ) {
        scrollParent = current;
        break;
      }
      current = current.parentElement;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          hasMoreMobileRecords &&
          !loading &&
          !isFetchingNextPageRef.current
        ) {
          isFetchingNextPageRef.current = true;
          goToPage(pagination.pageIndex + 1);
        }
      },
      {
        root: scrollParent,
        rootMargin: "250px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMobileRecords, loading, pagination.pageIndex, totalPages]);

  // Adaptive overscan: increase for larger datasets for smoother scrolling
  const adaptiveOverscan = useMemo(() => {
    if (data.length > 5000) return 25;
    if (data.length > 1000) return 15;
    return overscan;
  }, [data.length, overscan]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: adaptiveOverscan,
    enabled: enableVirtualization,
  });

  const virtualRows = enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : [];

  const totalSize = enableVirtualization
    ? rowVirtualizer.getTotalSize()
    : undefined;

  const paddingTop =
    enableVirtualization && virtualRows.length > 0
      ? virtualRows[0]?.start || 0
      : 0;

  const paddingBottom =
    enableVirtualization && virtualRows.length > 0
      ? totalSize! - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const isAllSelected = pagination.pageSize >= totalCount && totalCount > 0;

  return {
    table,
    selectedRows,
    tableElement: (
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto relative w-full max-w-full"
            style={{ 
              WebkitOverflowScrolling: "touch",
              maxHeight: maxHeight === "none" ? "calc(100vh - 240px)" : maxHeight
            }}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-primary z-20 shadow-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-white/10">
                    {headerGroup.headers.map((header) => {
                      const headerMeta = header.column.columnDef.meta as any;
                      const headerWrapConfig = enableColumnWrapping
                        ? headerMeta?.wrapConfig
                        : undefined;
                      const headerWrapStyles = getWrapStyles(headerWrapConfig);
                      const headMinWidth =
                        header.id === "serialNumber"
                          ? "60px"
                          : headerMeta?.minWidth ||
                            headerWrapStyles?.minWidth ||
                            "auto";
                      const headWidth =
                        header.id === "serialNumber"
                          ? "60px"
                          : headerMeta?.width ||
                            headerWrapStyles?.width ||
                            headMinWidth;

                      return (
                        <TableHead
                          key={header.id}
                          className="bg-primary text-white px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-semibold border-r border-white/10 last:border-r-0 overflow-hidden"
                          style={{
                            width: headWidth,
                            minWidth: headMinWidth,
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center justify-center gap-1.5 w-full min-w-0 ${header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                                }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                            <span className="text-center break-words whitespace-normal leading-tight">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            {header.column.getCanSort() && (
                              <span className="ml-1 shrink-0">
                                {header.column.getIsSorted() === "desc" ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : header.column.getIsSorted() === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
                ))}
              </TableHeader>
              {loading ? (
                <TableBody>
                  {Array.from({ length: Math.min(pagination.pageSize, 20) }).map(
                    (_, index) => (
                      <TableRow key={index}>
                        {tableColumns.map((_, colIndex) => (
                          <TableCell key={colIndex}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  )}
                </TableBody>
              ) : (
                <TableBody>
                  {enableVirtualization && paddingTop > 0 && (
                    <TableRow style={{ height: paddingTop }} aria-hidden="true">
                      <TableCell colSpan={tableColumns.length} className="p-0 border-0" />
                    </TableRow>
                  )}
                  {rows?.length
                    ? (enableVirtualization
                      ? virtualRows
                      : rows.map((_, index) => ({ index }))
                    ).map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      const rowData = row.original as T;
                      const isExpanded = isExpandedRow(rowData);

                      if (isExpanded) {
                        return (
                          <TableRow
                            key={row.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <TableCell
                              colSpan={tableColumns.length}
                              className="p-0 border-r-0"
                            >
                              <div className="w-full">
                                {(() => {
                                  const vehicleNumberCell = row
                                    .getVisibleCells()
                                    .find(
                                      (cell) =>
                                        cell.column.id === "vehicleNumber"
                                    );
                                  if (vehicleNumberCell) {
                                    return flexRender(
                                      vehicleNumberCell.column.columnDef.cell,
                                      vehicleNumberCell.getContext()
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const rowId = getRowIdRef.current ? getRowIdRef.current(rowData) : undefined;
                      const isSelected =
                        selectedRowId !== null && rowId === selectedRowId;

                      return (
                        <TableRow
                          key={row.id}
                          ref={
                            enableVirtualization
                              ? rowVirtualizer.measureElement
                              : undefined
                          }
                          data-index={enableVirtualization ? virtualRow.index : undefined}
                          className={`border-b hover:bg-muted/50 ${enableRowClick && onRowClick
                            ? "cursor-pointer"
                            : ""
                            } ${getRowClassName ? getRowClassName(rowData, isSelected) : ""}`}
                          onClick={(event) => handleRowClick(row, event)}
                          data-selected={isSelected}
                          data-row-id={rowId}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const wrapConfig = enableColumnWrapping
                              ? (cell.column.columnDef.meta as any)
                                ?.wrapConfig
                              : undefined;

                            const wrapOption =
                              wrapConfig?.wrap || defaultTextWrap;
                            const wrapClasses = getWrapClasses(wrapOption);
                            const wrapStyles = getWrapStyles(wrapConfig);

                            const meta = cell.column.columnDef.meta as any;
                            const cellMinWidth =
                              cell.column.id === "serialNumber"
                                ? "60px"
                                : meta?.minWidth ||
                                  wrapStyles?.minWidth ||
                                  "auto";
                            const cellWidth =
                              cell.column.id === "serialNumber"
                                ? "60px"
                                : meta?.width ||
                                  wrapStyles?.width ||
                                  cellMinWidth;

                            return (
                              <TableCell
                                key={cell.id}
                                className="px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0 text-center overflow-hidden min-w-0"
                                style={{
                                  width: cellWidth,
                                  minWidth: cellMinWidth,
                                  ...wrapStyles,
                                }}
                              >
                                <div className={`w-full ${wrapClasses}`}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                    : null}
                  {enableVirtualization && paddingBottom > 0 && (
                    <TableRow style={{ height: paddingBottom }} aria-hidden="true">
                      <TableCell colSpan={tableColumns.length} className="p-0 border-0" />
                    </TableRow>
                  )}
                  {!rows?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={tableColumns.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              )}
            </Table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-3">
          {loading && pagination.pageIndex === 0 && mobileDisplayRows.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: Math.min(pagination.pageSize, 5) }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !mobileDisplayRows?.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <>
              {mobileDisplayRows.map((row, index) => {
                const rowData = row.original as T;
                const rowId = getRowIdRef.current ? getRowIdRef.current(rowData) : undefined;
                const isSelected = selectedRowId !== null && rowId === selectedRowId;
                const cells = row.getVisibleCells();

                const serialCell = cells.find((c) => c.column.id === "serialNumber");
                const actionCell = cells.find(
                  (c) => c.column.id === "actions" || c.column.id === "action"
                );
                const statusCell = cells.find((c) => {
                  const id = c.column.id.toLowerCase();
                  const header =
                    typeof c.column.columnDef.header === "string"
                      ? c.column.columnDef.header.toLowerCase()
                      : "";
                  return (
                    id.includes("status") ||
                    id.includes("isactive") ||
                    id.includes("active") ||
                    id.includes("result") ||
                    id.includes("severity") ||
                    id.includes("access") ||
                    header === "status"
                  );
                });

                const candidateCells = cells.filter(
                  (c) =>
                    c.column.id !== "serialNumber" &&
                    c.column.id !== "actions" &&
                    c.column.id !== "action" &&
                    c !== statusCell
                );

                const primaryCell = candidateCells[0];
                const detailCells = candidateCells.slice(1);
                const uniqueCardKey =
                  rowId != null && rowId !== ""
                    ? String(rowId)
                    : (row.id || `mobile-card-${index}`);

                return (
                  <div
                    key={uniqueCardKey}
                    className={cn(
                      "bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 transition-colors",
                      enableRowClick && onRowClick
                        ? "cursor-pointer active:scale-[0.99] hover:border-slate-300"
                        : "",
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-slate-50"
                        : "",
                      getRowClassName ? getRowClassName(rowData, isSelected) : ""
                    )}
                    onClick={(event) => handleRowClick(row, event)}
                    data-selected={isSelected}
                    data-row-id={rowId}
                    data-mobile-card="true"
                  >
                    {/* Card Header: SN + Primary Field + Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {serialCell && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
                            #{index + 1}
                          </span>
                        )}
                        {primaryCell && (
                          <div className="font-bold text-sm text-slate-900 min-w-0 flex-1">
                            {flexRender(primaryCell.column.columnDef.cell as any, primaryCell.getContext())}
                          </div>
                        )}
                      </div>

                      {statusCell && (
                        <div className="shrink-0 text-xs">
                          {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                        </div>
                      )}
                    </div>

                    {/* Card Details: Key-Value List */}
                    {detailCells.length > 0 && (
                      <div className="space-y-2 text-xs">
                        {detailCells.map((cell) => {
                          const headerContent = cell.column.columnDef.header;
                          const headerLabel =
                            typeof headerContent === "string"
                              ? headerContent
                              : typeof headerContent === "function"
                              ? flexRender(headerContent, cell.getContext() as any)
                              : cell.column.id;

                          const isDescriptionOrLongField =
                            [
                              "briefDescription",
                              "description",
                              "immediateActionTaken",
                              "pendingAction",
                              "remarks",
                            ].includes(cell.column.id) ||
                            (typeof headerLabel === "string" &&
                              headerLabel.toLowerCase().includes("description"));

                          const cellRawValue =
                            (rowData as any)?.[cell.column.id] ||
                            (cell.column.id === "briefDescription"
                              ? (rowData as any)?.description
                              : undefined);

                          const hasMultiLineContent =
                            isDescriptionOrLongField &&
                            cellRawValue &&
                            cellRawValue !== "N/A" &&
                            String(cellRawValue).trim().length > 0;

                          if (hasMultiLineContent) {
                            return (
                              <div
                                key={cell.id}
                                className="py-2 border-b border-slate-50 last:border-0 space-y-1.5"
                              >
                                <span className="text-slate-500 font-medium text-[11px] block">
                                  {headerLabel}
                                </span>
                                <div className="text-left font-normal text-slate-800 break-words bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs leading-relaxed whitespace-normal">
                                  {flexRender(cell.column.columnDef.cell as any, cell.getContext())}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={cell.id}
                              className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0"
                            >
                              <span className="text-slate-500 font-medium text-[11px] shrink-0 pt-0.5 min-w-[70px]">
                                {headerLabel}
                              </span>
                              <div className="text-right font-medium text-slate-800 break-all sm:break-words max-w-[70%] [overflow-wrap:anywhere]">
                                {flexRender(cell.column.columnDef.cell as any, cell.getContext())}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    {actionCell && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                        {flexRender(actionCell.column.columnDef.cell as any, actionCell.getContext())}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Sentinel & Infinite Scroll Status */}
              {hasMoreMobileRecords && (
                <div ref={mobileSentinelRef} className="py-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {loading || isFetchingNextPageRef.current
                      ? "Loading more records..."
                      : "Scroll for more"}
                  </div>
                </div>
              )}

              {!hasMoreMobileRecords && mobileDisplayRows.length > 0 && (
                <div className="py-4 text-center text-xs text-slate-400 font-medium">
                  Showing all {totalCount || mobileDisplayRows.length} records
                </div>
              )}
            </>
          )}
        </div>

        <div className="hidden md:flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            <span className="hidden sm:inline">
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                totalCount
              )}{" "}
              of {totalCount} results
            </span>
            <span className="sm:hidden">
              {pagination.pageIndex * pagination.pageSize + 1}-
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                totalCount
              )}{" "}
              of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 order-1 sm:order-2">
            <div className="flex items-center space-x-2">
              <p className="text-xs sm:text-sm font-medium hidden sm:block">Rows per page</p>
              <p className="text-xs font-medium sm:hidden">Rows</p>
              <div className="relative inline-flex items-center">
                <select
                  value={isAllSelected ? "All" : pagination.pageSize.toString()}
                  onChange={(e) => changePageSize(e.target.value)}
                  className="h-8 appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-xs font-medium cursor-pointer hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
                >
                  {pageSizeOptions.map((pageSize) => (
                    <option key={pageSize} value={pageSize.toString()}>
                      {pageSize === "All" ? (totalCount > 0 ? `All (${totalCount})` : "All") : pageSize}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="hidden sm:flex w-[100px] items-center justify-center text-sm font-medium">
                Page {pagination.pageIndex + 1} of {Math.max(1, totalPages)}
              </div>
              <div className="sm:hidden text-xs font-medium">
                {pagination.pageIndex + 1}/{Math.max(1, totalPages)}
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(0)}
                  disabled={!hasPrevPage}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.pageIndex - 1)}
                  disabled={!hasPrevPage}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.pageIndex + 1)}
                  disabled={!hasNextPage}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages - 1)}
                  disabled={!hasNextPage}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  };
}
