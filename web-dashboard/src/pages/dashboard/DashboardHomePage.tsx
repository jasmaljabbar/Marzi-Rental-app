import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, AlertTriangle, Clock, Boxes, PackageX, Users, Tags, Plus, MessageCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { reportsApi, accountApi } from "../../api/services";
import { formatDate, currency } from "../../utils/format";
import { waLink } from "../../utils/whatsapp";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorPanel } from "../../components/ui/QueryState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { Avatar } from "../../components/ui/Avatar";
import { UsageMeter } from "../../components/UsageMeter";
import { CreateRentalModal } from "../rentals/CreateRentalModal";
import { EquipmentFormModal } from "../equipment/EquipmentFormModal";

// Today's snapshot. Every figure comes from GET /reports/dashboard, computed
// over the whole shop on the server (not from capped lists in the browser).
export function DashboardHomePage() {
  const { user } = useAuth();
  const canOperate = usePermission("rentals.operate");
  const canManageCatalog = usePermission("catalog.manage");
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);

  const dashboard = useQuery({ queryKey: ["reports", "dashboard"], queryFn: reportsApi.dashboard, refetchInterval: 60_000 });
  const { data: usage } = useQuery({ queryKey: ["account", "usage"], queryFn: accountApi.getUsage, enabled: Boolean(user?.accountId) });

  const data = dashboard.data;
  const health = !data ? null : data.overdue_count > 0 ? "attention" : data.due_soon_count > 0 ? "watch" : "stable";
  const healthCopy = health
    ? {
        attention: { label: "Needs attention", tone: "red" as const },
        watch: { label: "Watchlist active", tone: "amber" as const },
        stable: { label: "All stable", tone: "emerald" as const },
      }[health]
    : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="Today's snapshot of your rental business." actions={healthCopy && <Badge tone={healthCopy.tone}>{healthCopy.label}</Badge>} />

      {dashboard.isError ? (
        <Card>
          <ErrorPanel error={dashboard.error} onRetry={() => dashboard.refetch()} />
        </Card>
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Link to="/rentals" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Active rentals" value={data.active_rentals} icon={ClipboardList} tone="indigo" />
            </Link>
            <Link to="/rentals" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Overdue" value={data.overdue_count} icon={AlertTriangle} tone={data.overdue_count > 0 ? "red" : "neutral"} />
            </Link>
            <Link to="/rentals" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Due soon" value={data.due_soon_count} icon={Clock} tone={data.due_soon_count > 0 ? "amber" : "neutral"} />
            </Link>
            <StatCard
              label="Cash in this month"
              value={currency(data.revenue.this_month)}
              icon={data.revenue.trend_percent !== null && data.revenue.trend_percent < 0 ? TrendingDown : TrendingUp}
              tone={data.revenue.trend_percent !== null && data.revenue.trend_percent < 0 ? "red" : "emerald"}
              hint={
                data.revenue.trend_percent !== null
                  ? `${data.revenue.trend_percent >= 0 ? "+" : ""}${data.revenue.trend_percent}% vs last month`
                  : "No data for last month yet"
              }
            />
            <Link to="/rentals" className="block rounded-lg transition hover:opacity-80">
              <StatCard
                label="Outstanding dues"
                value={currency(data.outstanding_due.amount)}
                icon={Wallet}
                tone={data.outstanding_due.amount > 0 ? "amber" : "neutral"}
                hint={`${data.outstanding_due.rentals} rental${data.outstanding_due.rentals === 1 ? "" : "s"}`}
              />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link to="/equipment" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Inventory items" value={data.inventory.items} icon={Boxes} />
            </Link>
            <Link to="/customers" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Customers" value={data.customers_count} icon={Users} />
            </Link>
            <Link to="/categories" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Categories" value={data.categories_count} icon={Tags} />
            </Link>
            <Link to="/equipment" className="block rounded-lg transition hover:opacity-80">
              <StatCard label="Damaged units" value={data.inventory.damaged_units} icon={PackageX} tone={data.inventory.damaged_units > 0 ? "amber" : "neutral"} />
            </Link>
          </div>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fleet utilization</h2>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{data.inventory.utilization_percent}% rented out</span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={data.inventory.utilization_percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fleet utilization"
            >
              <div
                className={`h-full rounded-full ${data.inventory.utilization_percent >= 85 ? "bg-red-500" : data.inventory.utilization_percent >= 60 ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${Math.min(data.inventory.utilization_percent, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {data.inventory.rented_out_units} of {data.inventory.fleet_size} units currently on rent
              {data.inventory.fleet_size > 0 && data.inventory.utilization_percent < 40 ? " — plenty of idle stock to promote." : "."}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rental alerts</h2>
                <Link to="/rentals" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  View all
                </Link>
              </div>
              {data.alerts.length === 0 ? (
                <EmptyState title="No overdue or due-soon rentals" description="Everything is on track." />
              ) : (
                <ul className="space-y-1">
                  {data.alerts.map(({ rental, days_until_due: days }) => {
                    const customer = rental.customer;
                    const item = rental.equipment?.name ?? "the item";
                    const overdue = days < 0;
                    const message = customer
                      ? overdue
                        ? `Hi ${customer.name}, your rental of ${item} was due on ${formatDate(rental.expected_return_date)} and is now ${Math.abs(days)} day(s) overdue. Please arrange the return at your earliest convenience. Thank you!`
                        : `Hi ${customer.name}, just a reminder that your rental of ${item} is due back on ${formatDate(rental.expected_return_date)}. Thank you!`
                      : "";
                    return (
                      <li key={rental.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Link to={`/customers/${rental.customer_id}`} className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                          <Avatar src={customer?.photo_thumb_url} name={customer?.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{customer?.name ?? "Unknown"}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {rental.equipment?.name ?? "Item"} × {rental.quantity} · due {formatDate(rental.expected_return_date)}
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={overdue ? "red" : "amber"}>{overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}</Badge>
                          {customer?.phone && (
                            <a
                              href={waLink(customer.phone, message)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Send WhatsApp reminder to ${customer.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick actions</h2>
              <div className="flex flex-col gap-2">
                {canOperate && (
                  <Button className="w-full justify-center" onClick={() => setNewRentalOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New rental
                  </Button>
                )}
                {canManageCatalog && (
                  <Button variant="secondary" className="w-full justify-center" onClick={() => setAddEquipmentOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add equipment
                  </Button>
                )}
              </div>

              {usage && (
                <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Plan usage</p>
                  <UsageMeter label="Equipment" metric={usage.equipment} />
                  <UsageMeter label="Rentals this month" metric={usage.active_rentals_this_month} />
                </div>
              )}
            </Card>
          </div>

          {data.inventory.low_stock_count > 0 && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <strong>{data.inventory.low_stock_count}</strong> item{data.inventory.low_stock_count === 1 ? "" : "s"} at or below the low-stock threshold (
                  {data.inventory.low_stock_threshold} available units) — consider restocking soon.
                </p>
                <Link to="/equipment" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Review inventory
                </Link>
              </div>
            </Card>
          )}
        </>
      )}

      <CreateRentalModal open={newRentalOpen} onClose={() => setNewRentalOpen(false)} />
      <EquipmentFormModal open={addEquipmentOpen} onClose={() => setAddEquipmentOpen(false)} />
    </div>
  );
}
