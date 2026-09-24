import type { UsageMetric } from "../types/models";

export function UsageMeter({ label, metric }: { label: string; metric: UsageMetric | undefined }) {
  if (!metric) return null;
  const unlimited = metric.limit === null;
  const nearLimit = !unlimited && metric.percent >= 80;
  const atLimit = !unlimited && metric.percent >= 100;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {metric.used}
          {unlimited ? "" : ` / ${metric.limit}`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-indigo-600"}`}
          style={{ width: unlimited ? "100%" : `${Math.max(4, metric.percent)}%`, backgroundColor: unlimited ? "#a3a3a3" : undefined }}
        />
      </div>
      {atLimit && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Limit reached — upgrade to add more</p>}
    </div>
  );
}
