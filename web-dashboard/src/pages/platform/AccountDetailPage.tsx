import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { UsageMeter } from "../../components/UsageMeter";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import type { ChangePlanInput } from "../../api/services/platform";

function toDateInputValue(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);

  const { data: account, isLoading } = useQuery({
    queryKey: ["platform", "accounts", id],
    queryFn: () => platformApi.getAccount(id!),
    enabled: Boolean(id),
  });

  const { data: plans = [] } = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.listPlans });

  useEffect(() => {
    if (!account) return;
    setPlanId(account.plan?.id ?? "");
    setStartDate(toDateInputValue(account.subscription?.current_period_start));
    setExpiryDate(toDateInputValue(account.subscription?.current_period_end));
    setAutoRenew(account.subscription?.auto_renew ?? true);
  }, [account]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["platform", "accounts"] });
  }

  const planMutation = useMutation({
    mutationFn: (input: ChangePlanInput) => platformApi.changePlan(id!, input),
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  const suspendMutation = useMutation({
    mutationFn: () => platformApi.suspend(id!),
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => platformApi.reactivate(id!),
    onSuccess: invalidate,
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: () => platformApi.remove(id!),
    onSuccess: () => {
      invalidate();
      navigate("/platform");
    },
    onError: (err) => setError(apiErrorMessage(err).detail),
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!account) return <p className="text-sm text-red-600">Account not found.</p>;

  const isSuspended = account.subscription?.status === "suspended";
  const deleteConfirmed = confirmDeleteText.trim() === account.company_name;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/platform/accounts" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← All app users
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{account.company_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Status: <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{account.subscription?.status ?? "—"}</span> · Plan:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">{account.plan?.name ?? "—"}</span>
          {account.subscription?.remaining_days != null && (
            <>
              {" "}
              · <span className="font-medium text-slate-700 dark:text-slate-200">{account.subscription.remaining_days}</span> days left
            </>
          )}
          {" "}· Auto-renew: <span className="font-medium text-slate-700 dark:text-slate-200">{account.subscription?.auto_renew ? "Yes" : "No"}</span>
          {" "}· Signed up {new Date(account.created_at).toLocaleDateString()}
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manage subscription</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="" disabled>
              Choose a plan…
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Expiry date (optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
            Auto-renew
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              planMutation.mutate({
                plan_id: planId,
                start_date: startDate || undefined,
                expiry_date: expiryDate || null,
                auto_renew: autoRenew,
              })
            }
            disabled={!planId || planMutation.isPending}
            isLoading={planMutation.isPending}
          >
            Save assignment
          </Button>

          {isSuspended ? (
            <button
              type="button"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Reactivate account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => confirm(`Suspend ${account.company_name}? They'll lose access immediately.`) && suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="rounded-md border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              Suspend account
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UsageMeter label="Shops" metric={account.usage.shops} />
          <UsageMeter label="Equipment" metric={account.usage.equipment} />
          <UsageMeter label="Customers" metric={account.usage.customers} />
          <UsageMeter label="Team members" metric={account.usage.staff_users} />
          <UsageMeter label="Rentals this month" metric={account.usage.active_rentals_this_month} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shops ({account.shops.length})</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {account.shops.map((shop) => (
              <li key={shop.id} className="flex items-center justify-between">
                <span>{shop.name}</span>
                <span className={`text-xs ${shop.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                  {shop.is_active ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Users ({account.users.length})</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {account.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span>{u.username}</span>
                <span className="text-xs capitalize text-slate-400">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40">
        <h2 className="text-sm font-semibold text-red-800 dark:text-red-300">Danger zone</h2>
        <p className="mt-1 text-sm text-red-700 dark:text-red-400">Permanently deletes this account, its shops, users, and all business data. Cannot be undone.</p>

        {!isConfirmingDelete ? (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-sm text-red-800 dark:text-red-300">
              Type <span className="font-semibold">{account.company_name}</span> to confirm:
            </label>
            <input
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              className="w-full max-w-sm rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none dark:border-red-800 dark:bg-slate-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={!deleteConfirmed || deleteMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setConfirmDeleteText("");
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
