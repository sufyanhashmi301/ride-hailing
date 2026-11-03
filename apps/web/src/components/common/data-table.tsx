"use client";

import { cn } from "cn";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchValue?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

type SortDirection = "asc" | "desc";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchValue,
  searchPlaceholder = "Search…",
  pageSize = 10,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!searchValue || query.trim() === "") return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchValue(row).toLowerCase().includes(needle));
  }, [rows, query, searchValue]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    const sortValue = column.sortValue;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {searchValue && (
        <div className="relative max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setPage(0);
              setQuery(event.target.value);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-3 py-2 font-medium text-muted-foreground", column.className)}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUpIcon className="size-3.5" />
                        ) : (
                          <ArrowDownIcon className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDownIcon className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              !isError &&
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-3 py-2.5 align-middle", column.className)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>

        {!isLoading && isError && (
          <div className="p-6">
            <EmptyState
              title="Couldn't load this data"
              description="Something went wrong while fetching this list."
              action={
                onRetry && (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                )
              }
            />
          </div>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <div className="p-6">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        )}
      </div>

      {!isLoading && !isError && sorted.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRightIcon className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
