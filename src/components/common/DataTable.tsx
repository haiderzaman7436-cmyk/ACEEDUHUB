import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  cell?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchField?: keyof T;
  filterComponent?: React.ReactNode;
  paginationKey?: string;
  defaultPageSize?: number;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchField,
  filterComponent,
  paginationKey,
  defaultPageSize,
  isLoading = false,
}: DataTableProps<T>) {
  const storageKey = paginationKey ? `ace_dt_${paginationKey}` : 'ace_dt_default';

  // Persist Page Size across reloads/renders so user choice (e.g. 100 rows) is never lost
  const [pageSize, setPageSizeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_pageSize`) || localStorage.getItem('ace_dt_pageSize');
      if (saved) {
        const parsed = Number(saved);
        if ([10, 20, 25, 50, 55, 100, 200].includes(parsed)) return parsed;
      }
    } catch {}
    return defaultPageSize || 10;
  });

  // Persist Current Page in sessionStorage so paying a fee doesn't kick user back to page 1
  const [currentPage, setCurrentPageState] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(`${storageKey}_page`);
      if (saved) {
        const parsed = Number(saved);
        if (parsed >= 1) return parsed;
      }
    } catch {}
    return 1;
  });

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    try {
      localStorage.setItem(`${storageKey}_pageSize`, String(size));
      localStorage.setItem('ace_dt_pageSize', String(size));
    } catch {}
  };

  const setCurrentPage = (page: number | ((prev: number) => number)) => {
    setCurrentPageState((prev) => {
      const next = typeof page === 'function' ? page(prev) : page;
      try {
        sessionStorage.setItem(`${storageKey}_page`, String(next));
      } catch {}
      return next;
    });
  };

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Handle Sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter Data based on Search
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchField) return data;
    return data.filter((item) => {
      const val = item[searchField as string];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchField]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // Pagination Details
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Adjust page if filter results contract page limit
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Reset to page 1 only when user enters a new search term
  useEffect(() => {
    if (searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const startIdx = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      {(searchField || filterComponent) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[hsl(var(--card))] border border-[hsl(var(--border))]/50 p-4 rounded-2xl shadow-xs">
          <div className="flex-1 max-w-md">
            {searchField && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            )}
          </div>
          {filterComponent && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4.5 w-4.5 text-[hsl(var(--muted-foreground))]" />
              {filterComponent}
            </div>
          )}
        </div>
      )}

      {/* Main Table Card */}
      <div className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-md border border-slate-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">Updating records...</span>
            </div>
          </div>
        )}

        {isLoading && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-400">Loading records...</span>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                    onClick={() => column.sortable && handleSort(column.key)}
                    className={cn(
                      'px-4 py-3.5 font-semibold text-[hsl(var(--muted-foreground))] select-none text-xs sm:text-sm',
                      column.sortable && 'cursor-pointer hover:text-[hsl(var(--foreground))] transition-colors',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end'
                      )}
                    >
                      {column.header}
                      {column.sortable && (
                        <ArrowUpDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/50">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-[hsl(var(--accent))]/30 transition-colors"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                        className={cn(
                          'px-4 py-3 text-[hsl(var(--foreground))] font-medium whitespace-nowrap text-xs sm:text-sm',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {column.cell ? column.cell(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <div className="py-12 border-0 bg-transparent">
                      <EmptyState
                        title="No entries found"
                        description={
                          searchTerm
                            ? `We couldn't find any results matching "${searchTerm}".`
                            : 'There are no active data logs to display.'
                        }
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalItems > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4.5 sm:flex-row">
            {/* Range info */}
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Showing <span className="font-semibold text-[hsl(var(--foreground))]">{startIdx}</span> to{' '}
              <span className="font-semibold text-[hsl(var(--foreground))]">{endIdx}</span> of{' '}
              <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span> results
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-6">
              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                  Rows per page
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                >
                  {[10, 20, 25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-[hsl(var(--muted-foreground))] px-2 select-none">
                  Page <span className="font-semibold text-[hsl(var(--foreground))]/90">{currentPage}</span> of{' '}
                  <span className="font-semibold text-[hsl(var(--foreground))]/90">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
