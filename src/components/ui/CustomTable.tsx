"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  RowData,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CustomArrowUpDown } from "@/components/ui/customarrowupdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TablePagination from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";

export type CellContent =
  | { type: "text"; value: string }
  | { type: "icon"; icon: React.ReactNode }
  | { type: "button"; label: string; onClick: () => void; className?: string }
  | { type: "custom"; render: () => React.ReactNode }
  | { type: "group"; items: CellContent[] };

interface CustomTableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  pageSizeArray?: any[];
  maxHeight?: number | string;
  minHeight?: number | string;
  rowHeight?: number;
  showSerialNumber?: boolean;
  noDataMessage?: string;
  isLoading?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

const renderCellContent = (content: unknown): React.ReactNode => {
  if (content === null || content === undefined) return "";
  if (
    typeof content === "string" ||
    typeof content === "number" ||
    typeof content === "boolean"
  ) {
    return content.toString();
  }
  if (React.isValidElement(content)) return content;

  if (typeof content === "object" && content.type) {
    switch (content.type) {
      case "text":
        return content.value;
      case "icon":
        return content.icon;
      case "button":
        return (
          <div className="flex justify-center items-center w-full">
            <Button
              size="sm"
              onClick={content.onClick}
              className={content.className || ""}
            >
              {content.label}
            </Button>
          </div>
        );
      case "custom":
        return content.render();
      case "group":
        return (
          <div className="flex flex-row justify-center items-center gap-1 w-full">
            {content.items.map((item: unknown, idx: number) => (
              <div key={idx} className="flex-shrink-0">
                {renderCellContent(item)}
              </div>
            ))}
          </div>
        );
      default:
        return content.toString();
    }
  }

  if (typeof content === "object") return JSON.stringify(content);
  return content.toString();
};

export function CustomTable<TData extends RowData>({
  data,
  columns,
  pageSizeArray = [20, 50, "All"],
  maxHeight = 480,
  minHeight = 100,
  rowHeight = 48,
  showSerialNumber = true,
  noDataMessage = "No data available",
  isLoading = false,
  columnVisibility,
  onColumnVisibilityChange,
}: CustomTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize:
      typeof pageSizeArray[0] === "number"
        ? pageSizeArray[0]
        : pageSizeArray[0] === "All"
        ? 999999
        : 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});
  const [isMobile, setIsMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Use controlled visibility if provided, otherwise use internal state
  const currentColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const handleColumnVisibilityChange =
    onColumnVisibilityChange ?? setInternalColumnVisibility;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    const observer = new ResizeObserver(([entry]) => {
      setIsMobile(entry.contentRect.width < 768);
      setContainerWidth(entry.contentRect.width);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
      updateWidth();
    }

    return () => observer.disconnect();
  }, []);

  const finalData = Array.isArray(data) ? data : [];
  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  // }, [data]);

  // Handle "All" option - when pageSize equals 999999 (or >= 999999), show all rows
  const isShowingAll = pagination.pageSize >= 999999;
  const pageCount = isShowingAll
    ? 1
    : Math.max(1, Math.ceil(finalData.length / pagination.pageSize));
  const paginatedData = isShowingAll
    ? finalData
    : finalData.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );

  const serialNumberColumn: ColumnDef<TData, unknown> = {
    id: "serialNumber",
    header: () => <div className="text-center w-full">S.No.</div>,
    cell: ({ row }) => {
      const serialNumber =
        (isShowingAll ? 0 : pagination.pageIndex * pagination.pageSize) + row.index + 1;
      return (
        <div className="text-center w-full font-medium">{serialNumber}</div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { minWidth: 70, maxWidth: 80, flex: 0 },
  };

  const finalColumns = useMemo(() => {
    return showSerialNumber ? [serialNumberColumn, ...columns] : columns;
  }, [showSerialNumber, columns, pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data: paginatedData,
    columns: finalColumns,
    state: {
      pagination,
      sorting,
      columnVisibility: currentColumnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  // Mobile Infinite Scrolling state (no second useReactTable instance to prevent re-render loops)
  const MOBILE_PAGE_SIZE = 15;
  const [mobileDisplayCount, setMobileDisplayCount] = useState(MOBILE_PAGE_SIZE);
  const [prevDataLength, setPrevDataLength] = useState(finalData.length);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  if (finalData.length !== prevDataLength) {
    setPrevDataLength(finalData.length);
    setMobileDisplayCount(MOBILE_PAGE_SIZE);
  }

  const mobileItems = useMemo(() => {
    return finalData.slice(0, mobileDisplayCount);
  }, [finalData, mobileDisplayCount]);

  const hasMoreMobile = mobileDisplayCount < finalData.length;

  useEffect(() => {
    const sentinel = mobileSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMobile) {
          setMobileDisplayCount((prev) => Math.min(prev + MOBILE_PAGE_SIZE, finalData.length));
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMobile, finalData.length]);

  // Mobile column categorization
  const visibleMobileColumns = useMemo(() => {
    return columns.filter((col) => {
      const colId = (col.id || (col as any).accessorKey || "");
      if (colId === "serialNumber") return false;
      if (currentColumnVisibility[colId] === false) return false;
      return true;
    });
  }, [columns, currentColumnVisibility]);

  const actionColumn = useMemo(() => {
    return visibleMobileColumns.find((col) => {
      const id = (col.id || (col as any).accessorKey || "").toLowerCase();
      const h = typeof col.header === "string" ? col.header.toLowerCase() : "";
      return id.includes("action") || h.includes("action");
    });
  }, [visibleMobileColumns]);

  const statusColumn = useMemo(() => {
    return visibleMobileColumns.find((col) => {
      if (col === actionColumn) return false;
      const id = (col.id || (col as any).accessorKey || "").toLowerCase();
      return (
        id.includes("status") ||
        id.includes("result") ||
        id.includes("severity") ||
        id.includes("access")
      );
    });
  }, [visibleMobileColumns, actionColumn]);

  const contentColumns = useMemo(() => {
    return visibleMobileColumns.filter((col) => col !== actionColumn && col !== statusColumn);
  }, [visibleMobileColumns, actionColumn, statusColumn]);

  const primaryColumn = contentColumns[0];
  const detailColumns = contentColumns.slice(1);

  const getColValue = (col: ColumnDef<TData, unknown>, item: TData) => {
    if (typeof col.accessorFn === "function") {
      return col.accessorFn(item, 0);
    }
    const key = (col as any).accessorKey;
    if (key && item) {
      return (item as any)[key];
    }
    return undefined;
  };

  const getColHeaderLabel = (col: ColumnDef<TData, unknown>) => {
    if (typeof col.header === "string") return col.header;
    if (typeof col.header === "function") {
      try {
        const rendered = (col.header as any)({} as any);
        if (typeof rendered === "string") return rendered;
      } catch {
        // fallback
      }
    }
    return col.id || (col as any).accessorKey || "";
  };

  const adaptiveHeight = useMemo(() => {
    if (typeof maxHeight === "string") return maxHeight;
    const maxH = maxHeight;
    const minH = typeof minHeight === "number" ? minHeight : 100;

    if (finalData.length === 0) return Math.max(minH, 150);

    const actualRowHeight = isMobile
      ? Math.max(rowHeight, 80)
      : Math.max(rowHeight, 60);
    const calculatedHeight = rows.length * actualRowHeight;
    const headerHeight = 48;
    const totalContentHeight = calculatedHeight + headerHeight;
    return Math.max(minH, Math.min(maxH, totalContentHeight));
  }, [
    rows.length,
    rowHeight,
    isMobile,
    minHeight,
    maxHeight,
    finalData.length,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () =>
      isMobile ? Math.max(rowHeight, 80) : Math.max(rowHeight, 60),
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start || 0;
  const paddingBottom = totalSize - (virtualRows.at(-1)?.end || 0);

  const getColumnStyle = (col: any) => {
    const meta = col?.columnDef?.meta || {};
    const baseWidth = meta.minWidth || (isMobile ? 80 : 100);
    const maxWidth = meta.maxWidth || 2000;
    return {
      width: baseWidth + "px",
      minWidth: baseWidth + "px",
      maxWidth: maxWidth + "px",
      flexGrow: meta.flex || 1,
      flexShrink: 0,
    };
  };

  // Calculate if table should expand to fill container
  const headers = table.getHeaderGroups()[0]?.headers || [];
  const totalMinWidth = useMemo(() => {
    return headers.reduce((sum, header) => {
      const meta = header.column.columnDef?.meta || {};
      const width = meta.minWidth || (isMobile ? 80 : 100);
      return sum + width;
    }, 0);
  }, [headers, isMobile]);

  const shouldExpand = containerWidth > totalMinWidth;
  const tableWidth = shouldExpand ? "100%" : totalMinWidth + "px";

  const renderCustomTableCell = (cell: any) => {
    if (cell.column.id === "serialNumber") {
      return flexRender(cell.column.columnDef.cell, cell.getContext());
    }
    const val = cell.getValue();
    if (val !== undefined && val !== null) {
      return renderCellContent(val);
    }
    return flexRender(cell.column.columnDef.cell, cell.getContext());
  };

  return (
    <div ref={containerRef} className="w-full space-y-4 overflow-hidden">
      <div className="rounded-md border bg-background w-full flex flex-col overflow-hidden">
        {/* Desktop Table View */}
        <div
          ref={tableScrollRef}
          className="hidden md:block overflow-x-auto overflow-y-auto relative w-full"
          style={{
            maxHeight: typeof adaptiveHeight === "number" ? `${adaptiveHeight}px` : adaptiveHeight,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ width: tableWidth, minWidth: totalMinWidth + "px" }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-primary border-b border-white/10">
              {table.getHeaderGroups().map((hg) => (
                <div key={hg.id} className="flex">
                  {hg.headers.map((header) => {
                    const headerMeta = (header.column.columnDef.meta || {}) as any;
                    const headerAlign = headerMeta.headerAlign || "center";
                    const justifyClass =
                      headerAlign === "left"
                        ? "justify-start text-left"
                        : headerAlign === "right"
                          ? "justify-end text-right"
                          : "justify-center text-center";
                    const textClass =
                      headerAlign === "left"
                        ? "text-left"
                        : headerAlign === "right"
                          ? "text-right"
                          : "text-center";

                    return (
                      <div
                        key={header.id}
                        className="flex items-center px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-semibold border-r border-white/10 last:border-r-0 text-white overflow-hidden"
                        style={getColumnStyle(header.column)}
                      >
                        <div
                          className={`flex items-center ${justifyClass} gap-1.5 w-full min-w-0 ${header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : ""
                            }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className={`${textClass} break-words whitespace-normal leading-tight`}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="shrink-0">
                              <CustomArrowUpDown
                                direction={header.column.getIsSorted()}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="flex flex-col gap-2 px-4 py-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton key={i} className="h-6 w-16 flex-shrink-0" />
                    {columns.map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            ) : finalData.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <div className="text-center text-muted-foreground">
                  <div className="text-lg font-medium mb-2">
                    {noDataMessage}
                  </div>
                  <div className="text-sm">No records found to display</div>
                </div>
              </div>
            ) : (
              <>
                {paddingTop > 0 && (
                  <div style={{ height: paddingTop + "px" }} />
                )}
                {virtualRows.map((vr) => {
                  const row = rows[vr.index];
                  return (
                    <div
                      key={row.id}
                      className="flex border-b hover:bg-muted/50 min-h-[48px]"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const cellMeta = (cell.column.columnDef.meta || {}) as any;
                        const cellAlign = cellMeta.align || "center";
                        const alignClass =
                          cellAlign === "left"
                            ? "text-left"
                            : cellAlign === "right"
                              ? "text-right"
                              : "text-center";

                        return (
                          <div
                            key={cell.id}
                            className={`flex items-center px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-r last:border-r-0 overflow-hidden min-w-0 ${
                              cellAlign === "left"
                                ? "justify-start"
                                : cellAlign === "right"
                                  ? "justify-end"
                                  : "justify-center"
                            }`}
                            style={getColumnStyle(cell.column)}
                          >
                            <div className={`w-full ${alignClass}`}>
                              <div className="break-words whitespace-normal leading-relaxed">
                                {cell.column.id === "serialNumber"
                                  ? flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )
                                  : renderCellContent(cell.getValue())}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {paddingBottom > 0 && (
                  <div style={{ height: paddingBottom + "px" }} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 animate-pulse motion-reduce:animate-none">
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
          ) : finalData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
              <div className="font-medium text-slate-800 mb-1">{noDataMessage}</div>
              <div>No records found to display</div>
            </div>
          ) : (
            <>
              {mobileItems.map((item, index) => {
                const itemId = (item as any)?._id || (item as any)?.id || (item as any)?.key || index;
                const primaryVal = primaryColumn ? getColValue(primaryColumn, item) : null;
                const statusVal = statusColumn ? getColValue(statusColumn, item) : null;
                const actionVal = actionColumn ? getColValue(actionColumn, item) : null;

                return (
                  <div
                    key={itemId}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 transition-colors"
                  >
                    {/* Card Header: SN + Primary Field + Status */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {showSerialNumber && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
                            #{index + 1}
                          </span>
                        )}
                        {primaryColumn && (
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {renderCellContent(primaryVal)}
                          </div>
                        )}
                      </div>

                      {statusColumn && statusVal !== undefined && statusVal !== null && (
                        <div className="shrink-0 text-xs">
                          {renderCellContent(statusVal)}
                        </div>
                      )}
                    </div>

                    {/* Card Details: Key-Value List */}
                    {detailColumns.length > 0 && (
                      <div className="space-y-2 text-xs">
                        {detailColumns.map((col) => {
                          const val = getColValue(col, item);
                          if (val === undefined || val === null || val === "") return null;
                          const headerLabel = getColHeaderLabel(col);

                          return (
                            <div
                              key={col.id || (col as any).accessorKey || headerLabel}
                              className="flex items-center justify-between gap-3 py-1 border-b border-slate-50 last:border-0"
                            >
                              <span className="text-slate-500 font-medium text-[11px] shrink-0">
                                {headerLabel}
                              </span>
                              <div className="text-right font-medium text-slate-800 break-words max-w-[65%]">
                                {renderCellContent(val)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    {actionColumn && actionVal !== undefined && actionVal !== null && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                        {renderCellContent(actionVal)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Infinite Scroll Sentinel & Indicator */}
              {hasMoreMobile && (
                <div ref={mobileSentinelRef} className="py-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Loading more…
                  </div>
                </div>
              )}

              {!hasMoreMobile && finalData.length > 0 && (
                <div className="py-3 text-center text-xs text-slate-400 font-medium">
                  Showing all {finalData.length} records
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop Pagination */}
        <div className="hidden md:block">
          <TablePagination
            table={table}
            pageSizeArray={pageSizeArray}
            totalRecords={finalData.length}
          />
        </div>
      </div>
    </div>
  );
}
