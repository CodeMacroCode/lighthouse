// components/TablePagination.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";

interface TablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeArray: (number | "All")[];
  totalRecords: number;
}

function TablePagination<TData>({
  table,
  pageSizeArray,
  totalRecords,
}: TablePaginationProps<TData>) {
  const pagination = table.getState().pagination;
  const isAll = pagination.pageSize >= 999999;
  const pageCount = table.getPageCount();

  const startRecord =
    totalRecords === 0
      ? 0
      : isAll
      ? 1
      : pagination.pageIndex * pagination.pageSize + 1;

  const endRecord =
    totalRecords === 0
      ? 0
      : isAll
      ? totalRecords
      : Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 text-xs border-t border-slate-200/80 bg-white gap-3 sm:gap-4">
      {/* Result Count Info */}
      <div className="flex items-center text-slate-500 font-medium order-2 sm:order-1">
        <span>
          Showing {startRecord} to {endRecord} of {totalRecords} results
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-end order-1 sm:order-2">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Rows per page:
          </span>
          <div className="relative inline-flex items-center">
            <select
              value={isAll ? "All" : pagination.pageSize.toString()}
              onChange={(e) => {
                const v = e.target.value;
                table.setPageSize(v === "All" ? 999999 : Number(v));
                table.setPageIndex(0);
              }}
              className="h-8 appearance-none rounded-md border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-slate-400 transition-colors"
            >
              {pageSizeArray.map((size) => (
                <option key={size} value={size.toString()}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Page counter & Navigation buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xs font-medium text-slate-600 whitespace-nowrap min-w-[75px] text-center">
            Page {pagination.pageIndex + 1} of {Math.max(1, pageCount)}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
