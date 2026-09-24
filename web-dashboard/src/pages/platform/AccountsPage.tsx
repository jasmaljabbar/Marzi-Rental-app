import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi } from "../../api/services";
import type { SubscriptionStatus } from "../../types/models";

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  trialing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  canceled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function AccountsPage() {
  const { data: accounts = [], isLoading } = useQuery({ queryKey: ["platform", "accounts"], queryFn: platformApi.listAccounts });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">App Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every business account signed up through the mobile app.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Remaining days</th>
              <th className="px-4 py-2 font-medium">Shops</th>
              <th className="px-4 py-2 font-medium">Signed up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No app users have signed up yet.
                </td>
              </tr>
            )}
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                  <Link to={`/platform/accounts/${account.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {account.company_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{account.owner_username ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{account.plan?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  {account.status && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[account.status]}`}>
                      {account.status.replace("_", " ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{account.remaining_days ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{account.shop_count}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{new Date(account.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
