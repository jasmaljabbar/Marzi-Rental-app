import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, Hourglass, AlertTriangle } from "lucide-react";
import { platformApi } from "../../api/services";
import { currency } from "../../utils/format";
import { StatCard } from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment failed",
  suspended: "Suspended",
  canceled: "Canceled",
  expired: "Expired",
};

// Matches the tone convention already used for status badges in AccountsPage.tsx.
const STATUS_BAR_COLOR: Record<string, string> = {
  trialing: "bg-indigo-500",
  active: "bg-emerald-500",
  past_due: "bg-amber-500",
  suspended: "bg-red-500",
  canceled: "bg-slate-400",
  expired: "bg-slate-400",
};

export function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform", "dashboard"], queryFn: platformApi.getDashboard });

  if (isLoading || !data) return <p className="text-sm text-slate-400">Loading…</p>;

  const statusEntries = Object.entries(data.status_counts).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, ...statusEntries.map(([, count]) => count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Subscription revenue and health across every account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={currency(data.mrr)} icon={DollarSign} tone="emerald" hint="Normalized to monthly" />
        <StatCard label="Active subscriptions" value={data.active_count} icon={Users} tone="indigo" />
        <StatCard label="On trial" value={data.trialing_count} icon={Hourglass} tone="neutral" />
        <StatCard
          label="Expiring soon"
          value={data.expiring_soon_count}
          icon={AlertTriangle}
          tone={data.expiring_soon_count > 0 ? "amber" : "neutral"}
          hint={`Within ${data.expiring_within_days} days`}
        />
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Accounts by subscription status</h2>
        {statusEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No subscriptions yet.</p>
        ) : (
          <div className="space-y-3">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-slate-600 dark:text-slate-300">{STATUS_LABELS[status] ?? status}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_COLOR[status] ?? "bg-slate-400"}`}
                    style={{ width: `${Math.max(4, Math.round((count / maxCount) * 100))}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium text-slate-700 dark:text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
