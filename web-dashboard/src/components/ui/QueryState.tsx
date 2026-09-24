import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { apiErrorMessage } from "../../api/http";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  // Rendered instead of children when the data is "empty" per isEmpty.
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}

// One consistent loading / error / empty / data rendering for queries.
export function QueryState<T>({ query, children, loading, empty, isEmpty }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading ?? <Skeleton lines={3} />}</>;
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />;
  if (empty && isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { detail } = apiErrorMessage(error);
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
      <AlertTriangle className="h-7 w-7 text-amber-500" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Couldn't load this</p>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{detail}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}
