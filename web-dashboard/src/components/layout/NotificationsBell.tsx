import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, Clock, PackageX, CreditCard, Wallet } from "lucide-react";
import { reportsApi, accountApi } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { differenceInCalendarDays } from "date-fns";

// Computed alerts (overdue returns and payments, low stock, trial/suspension),
// all from the server-side dashboard summary so they cover the whole shop.
export function NotificationsBell() {
  const { user } = useAuth();
  const isTenant = Boolean(user?.accountId);
  const [open, setOpen] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: reportsApi.dashboard,
    enabled: isTenant,
    refetchInterval: 60_000,
  });
  const { data: account } = useQuery({ queryKey: ["account", "me"], queryFn: accountApi.getMe, enabled: isTenant });

  const alerts = useMemo(() => {
    const now = new Date();
    const paymentOverdue = dashboard?.outstanding_due.overdue_rentals ?? 0;
    const subscriptionAlert = (() => {
      if (!account?.subscription) return null;
      if (account.subscription.status === "suspended") return "Your account is suspended — contact support.";
      if (account.subscription.status === "past_due") return "Your last payment failed — update billing to avoid suspension.";
      if (account.subscription.status === "trialing" && account.subscription.trial_ends_at) {
        const daysLeft = differenceInCalendarDays(new Date(account.subscription.trial_ends_at), now);
        if (daysLeft < 0) return "Your trial has ended. You can view your data but not make changes.";
        if (daysLeft <= 3) return daysLeft === 0 ? "Your trial ends today." : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;
      }
      return null;
    })();
    return {
      overdue: { length: dashboard?.overdue_count ?? 0 },
      dueSoon: { length: dashboard?.due_soon_count ?? 0 },
      lowStock: { length: dashboard?.inventory.low_stock_count ?? 0 },
      paymentOverdue: { length: paymentOverdue },
      paymentPending: { length: Math.max((dashboard?.outstanding_due.rentals ?? 0) - paymentOverdue, 0) },
      subscriptionAlert,
    };
  }, [dashboard, account]);

  if (!isTenant) return null;
  // Badge count: urgent/actionable items only. dueSoon/paymentPending are shown
  // in the dropdown for visibility but don't inflate the badge with non-urgent items.
  const total = alerts.overdue.length + alerts.lowStock.length + alerts.paymentOverdue.length + (alerts.subscriptionAlert ? 1 : 0);
  const hasAnyAlert = total > 0 || alerts.dueSoon.length > 0 || alerts.paymentPending.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label={total > 0 ? `Notifications, ${total} need attention` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Alerts</p>
            {!hasAnyAlert ? (
              <p className="py-4 text-center text-sm text-slate-400">You're all caught up.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {alerts.subscriptionAlert && (
                  <li>
                    <Link to="/billing" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300">{alerts.subscriptionAlert}</span>
                    </Link>
                  </li>
                )}
                {alerts.overdue.length > 0 && (
                  <li>
                    <Link to="/rentals" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {alerts.overdue.length} rental{alerts.overdue.length === 1 ? "" : "s"} overdue for return
                      </span>
                    </Link>
                  </li>
                )}
                {alerts.dueSoon.length > 0 && (
                  <li>
                    <Link to="/rentals" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {alerts.dueSoon.length} rental{alerts.dueSoon.length === 1 ? "" : "s"} due back within 2 days
                      </span>
                    </Link>
                  </li>
                )}
                {alerts.paymentOverdue.length > 0 && (
                  <li>
                    <Link to="/rentals" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {alerts.paymentOverdue.length} payment{alerts.paymentOverdue.length === 1 ? "" : "s"} overdue
                      </span>
                    </Link>
                  </li>
                )}
                {alerts.paymentPending.length > 0 && (
                  <li>
                    <Link to="/rentals" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {alerts.paymentPending.length} payment{alerts.paymentPending.length === 1 ? "" : "s"} still pending
                      </span>
                    </Link>
                  </li>
                )}
                {alerts.lowStock.length > 0 && (
                  <li>
                    <Link to="/equipment" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <PackageX className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {alerts.lowStock.length} item{alerts.lowStock.length === 1 ? "" : "s"} low on stock
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
