import { useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountApi } from "../api/services";
import { setActiveCurrency } from "../utils/format";
import { useAuth } from "./AuthContext";

// Pushes the logged-in account's currency into the module-level singleton in
// utils/format.ts (same pattern as ShopContext -> setActiveShopIdGetter in
// api/http.ts) so `currency()` formats amounts correctly everywhere without
// every call site needing to become a hook. Reuses the same `["account",
// "me"]` query every other screen already fetches (useAccountPlan, billing,
// notifications) — no extra request.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const hasAccount = Boolean(user?.accountId);

  const { data: account } = useQuery({
    queryKey: ["account", "me"],
    queryFn: accountApi.getMe,
    enabled: hasAccount,
  });

  useEffect(() => {
    setActiveCurrency(hasAccount ? account?.currency || "INR" : "INR");
  }, [hasAccount, account?.currency]);

  return <>{children}</>;
}
