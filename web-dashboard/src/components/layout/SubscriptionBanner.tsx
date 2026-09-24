import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { accountApi } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { isOwnerOrAdmin } from "../../utils/permissions";

// While a trial has ended or the account is suspended, the API only allows
// reads. Say so up front instead of letting every save fail.
export function SubscriptionBanner() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["account", "me"], queryFn: accountApi.getMe, enabled: Boolean(user?.accountId) });
  const sub = data?.subscription;
  if (!sub) return null;
  const trialOver = sub.status === "trialing" && sub.trial_ends_at !== null && new Date(sub.trial_ends_at) < new Date();
  const blocked = trialOver || ["suspended", "canceled", "expired"].includes(sub.status);
  if (!blocked) return null;
  const message =
    sub.status === "suspended"
      ? "This account is suspended. You can view your data, but changes are disabled."
      : "Your plan has ended. You can view and export your data, but changes are disabled until it's renewed.";
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {isOwnerOrAdmin(user?.role) && (
        <Link to="/billing" className="font-semibold underline">
          Billing
        </Link>
      )}
    </div>
  );
}
