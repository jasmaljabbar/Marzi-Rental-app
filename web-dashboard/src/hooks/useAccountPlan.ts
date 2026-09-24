import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { accountApi, catalogApi } from "../api/services";

// Single reusable primitive for "does this account's plan allow X" — wraps
// the same account/me + account/usage queries every other screen already
// uses (same query keys, so no duplicate fetching) plus the feature/limit
// catalog, so a plan's feature flags can be looked up by key generically.
export function useAccountPlan() {
  const { user } = useAuth();
  const hasAccount = Boolean(user?.accountId);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", "me"],
    queryFn: accountApi.getMe,
    enabled: hasAccount,
  });
  const { data: usage } = useQuery({
    queryKey: ["account", "usage"],
    queryFn: accountApi.getUsage,
    enabled: hasAccount,
  });
  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: catalogApi.get,
    staleTime: Infinity,
  });

  function hasFeature(key: string): boolean {
    if (!hasAccount || !account?.plan) return true; // legacy/no-tenant accounts: never hide anything
    const value = account.plan.features[key];
    if (value !== undefined) return value;
    return catalog?.features.find((f) => f.key === key)?.default ?? true;
  }

  return {
    account: account ?? null,
    plan: account?.plan ?? null,
    subscription: account?.subscription ?? null,
    usage,
    catalog,
    hasFeature,
    isLoading: accountLoading,
  };
}
