import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, ExternalLink, FileText, TrendingUp } from "lucide-react";
import { accountApi, plansApi, subscriptionApi, catalogApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { currency, formatDate } from "../../utils/format";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { UsageMeter } from "../../components/UsageMeter";
import { PlanFeatureList } from "../../components/PlanFeatureList";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { BadgeTone } from "../../components/ui/Badge";
import type { AccountUsage, SubscriptionStatus } from "../../types/models";

const INVOICE_STATUS_TONE: Record<string, BadgeTone> = {
  paid: "emerald",
  open: "amber",
  void: "neutral",
  uncollectible: "red",
  draft: "neutral",
};

// Catalog limit definitions key their `resource` field in the same camelCase
// used internally by usageService.js (e.g. "staffUsers"); the account/usage
// JSON response uses snake_case field names instead — this bridges the two
// so the usage meters can be rendered generically from the catalog.
function usageMetricFor(usage: AccountUsage, resource: string) {
  const snakeCased = resource.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`) as keyof AccountUsage;
  return usage[snakeCased];
}

const STATUS_COPY: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
  trialing: { label: "Free trial", tone: "indigo" },
  active: { label: "Active", tone: "emerald" },
  past_due: { label: "Payment failed", tone: "amber" },
  suspended: { label: "Suspended", tone: "red" },
  canceled: { label: "Canceled", tone: "neutral" },
  expired: { label: "Expired", tone: "red" },
};

export function BillingPage() {
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: account, isLoading } = useQuery({ queryKey: ["account", "me"], queryFn: accountApi.getMe });
  const { data: usage } = useQuery({ queryKey: ["account", "usage"], queryFn: accountApi.getUsage });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: plansApi.list });
  const { data: catalog } = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.get, staleTime: Infinity });
  const { data: invoices } = useQuery({ queryKey: ["subscription", "invoices"], queryFn: subscriptionApi.invoices, enabled: canManage });

  const checkoutMutation = useMutation({
    mutationFn: (planKey: string) => subscriptionApi.checkout(planKey),
    onSuccess: (res) => {
      window.location.href = res.checkout_url;
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const portalMutation = useMutation({
    mutationFn: () => subscriptionApi.portal(),
    onSuccess: (res) => {
      window.location.href = res.portal_url;
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: () => {
      toast.success("Your subscription will not renew at the end of the current period.");
      setCancelOpen(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (isLoading) return null;
  if (!account) return <p className="text-sm text-red-600 dark:text-red-400">No billing account found for this login.</p>;

  const status = account.subscription?.status;
  const statusCopy = status ? STATUS_COPY[status] : null;
  const trialDaysLeft = account.subscription?.trial_ends_at
    ? Math.max(Math.ceil((new Date(account.subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
    : null;

  // `plans` only contains public, active tiers (sorted by sortOrder), so an
  // account on the hidden "trial" plan won't match any entry here — treat
  // that as "suggest the cheapest public plan" rather than "no next plan."
  const currentPlanIndex = plans.findIndex((p) => p.key === account.plan?.key);
  const nextPlan = currentPlanIndex === -1 ? plans[0] : plans[currentPlanIndex + 1];
  const nearLimitDefs = usage && catalog ? catalog.limits.filter((def) => (usageMetricFor(usage, def.resource)?.percent ?? 0) >= 80) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Billing & subscription</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{account.company_name}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">Current plan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{account.plan?.name ?? "No plan"}</p>
            {account.plan && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currency(account.plan.price)} / {account.plan.billing_cycle === "yearly" ? "year" : "month"}
              </p>
            )}
          </div>
          {statusCopy && <Badge tone={statusCopy.tone}>{statusCopy.label}</Badge>}
        </div>

        {status === "trialing" && trialDaysLeft !== null && (
          <p className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
            {trialDaysLeft <= 0 ? "Your trial ends today." : `Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}.`}
          </p>
        )}
        {status === "suspended" && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Your account is suspended. Contact support to restore access.
          </p>
        )}
        {status === "past_due" && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Your last payment failed. Update your payment method to avoid suspension.
          </p>
        )}

        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => portalMutation.mutate()} isLoading={portalMutation.isPending} variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Manage billing
            </Button>
            {status && status !== "canceled" && (
              <Button variant="danger-outline" onClick={() => setCancelOpen(true)}>
                Cancel subscription
              </Button>
            )}
          </div>
        )}
      </Card>

      {usage && catalog && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Plan usage</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.limits.map((def) => (
              <UsageMeter key={def.key} label={def.label} metric={usageMetricFor(usage, def.resource)} />
            ))}
          </div>
          {nearLimitDefs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  You're approaching your {nearLimitDefs.map((d) => d.label.toLowerCase()).join(", ")} limit
                  {nearLimitDefs.length > 1 ? "s" : ""}
                  {nextPlan ? ` — upgrade to ${nextPlan.name} for more headroom.` : "."}
                </span>
              </div>
              {canManage && nextPlan && (
                <Button size="sm" onClick={() => checkoutMutation.mutate(nextPlan.key)} isLoading={checkoutMutation.isPending}>
                  Upgrade to {nextPlan.name}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {account.plan && catalog && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Plan features</h2>
          <PlanFeatureList features={account.plan.features} catalog={catalog} />
        </Card>
      )}

      {canManage && plans.length > 0 && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <CreditCard className="h-4 w-4" />
            Available plans
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.key === account.plan?.key;
              return (
                <div key={plan.key} className={`rounded-lg border p-4 ${isCurrent ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-200 dark:border-slate-800"}`}>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {currency(plan.price)} / {plan.billing_cycle === "yearly" ? "year" : "month"}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {(catalog?.limits ?? []).map((def) => {
                      const value = plan.limits[def.key];
                      return (
                        <li key={def.key}>
                          {value === -1 || value === undefined ? "Unlimited" : value} {def.label.toLowerCase()}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <PlanFeatureList features={plan.features} catalog={catalog} />
                  </div>
                  <Button
                    className="mt-3 w-full"
                    variant={isCurrent ? "secondary" : "primary"}
                    disabled={isCurrent}
                    onClick={() => checkoutMutation.mutate(plan.key)}
                    isLoading={checkoutMutation.isPending}
                  >
                    {isCurrent ? "Current plan" : "Switch to this plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {canManage && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <FileText className="h-4 w-4" />
            Invoice history
          </h2>
          {!invoices || invoices.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No invoices yet — invoices appear here after your first payment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2">{formatDate(inv.created_at)}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">{inv.number ?? "—"}</td>
                      <td className="py-2">{currency(inv.amount_paid)}</td>
                      <td className="py-2">
                        <Badge tone={INVOICE_STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-3">
                          {inv.hosted_invoice_url && (
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                              View
                            </a>
                          )}
                          {inv.invoice_pdf && (
                            <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                              PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel subscription"
        description="Your plan will remain active until the end of the current billing period, then it will not renew."
        confirmLabel="Cancel subscription"
        danger
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
