import clsx from "clsx";

// Placeholder shimmer shown while data loads (instead of a blank page).
export function Skeleton({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("space-y-2", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={clsx("h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton lines={2} />
    </div>
  );
}
