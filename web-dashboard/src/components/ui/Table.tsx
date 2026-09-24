import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import clsx from "clsx";
import { LoadingRow } from "./Spinner";
import { EmptyRow } from "./EmptyState";
import { ErrorPanel } from "./QueryState";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  // When set, the table body shows an error with a retry button instead of rows.
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedKeys?: Set<string>;
  onToggleSelect?: (key: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  sortKey,
  sortDir,
  onSort,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
}: TableProps<T>) {
  const selectable = Boolean(selectedKeys && onToggleSelect);
  const colSpan = columns.length + (selectable ? 1 : 0);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedKeys!.has(rowKey(r)));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleSelectAll?.()}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} scope="col" className={clsx("px-4 py-2 font-medium", col.className)}>
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {isLoading && <LoadingRow colSpan={colSpan} />}
            {!isLoading && Boolean(error) && (
              <tr>
                <td colSpan={colSpan}>
                  <ErrorPanel error={error} onRetry={onRetry} />
                </td>
              </tr>
            )}
            {!isLoading && !error && rows.length === 0 && <EmptyRow colSpan={colSpan} title={emptyTitle} description={emptyDescription} />}
            {!isLoading &&
              !error &&
              rows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={clsx(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedKeys!.has(key)}
                          onChange={() => onToggleSelect!(key)}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={clsx("px-4 py-2 text-slate-700 dark:text-slate-300", col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
