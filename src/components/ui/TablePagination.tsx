// components/TablePagination.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";

interface TablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeArray: (number | "All")[];
  totalRecords: number;
}

function TablePagination<TData>({ table, pageSizeArray, totalRecords }: TablePaginationProps<TData>) {
  const pagination = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-4 text-xs sm:text-sm border-t bg-background gap-2 sm:gap-0">
      <div className="flex items-center gap-2 order-2 sm:order-1">
        <span>
          Showing {pagination.pageIndex * pagination.pageSize + 1} to {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords)} of {totalRecords} results
        </span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-1 sm:order-2">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pagination.pageSize >= totalRecords ? "All" : pagination.pageSize.toString()}
            onChange={(e) => {
              const v = e.target.value;
              table.setPageSize(v === "All" ? totalRecords : Number(v));
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            {pageSizeArray.map((size) => (
              <option key={size} value={size.toString()}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-2 py-1 font-medium whitespace-nowrap">Page {pagination.pageIndex + 1} of {pageCount}</div>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
