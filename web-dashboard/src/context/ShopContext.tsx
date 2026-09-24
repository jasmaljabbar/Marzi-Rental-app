import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shopsApi } from "../api/services";
import { setActiveShopIdForRequests, setShopNotAccessibleHandler } from "../api/http";
import { useAuth } from "./AuthContext";
import type { Shop } from "../types/models";

const SHOP_ID_KEY = "rental_admin_shop_id";

interface ShopContextValue {
  shops: Shop[];
  activeShops: Shop[];
  activeShopId: string | null;
  activeShop: Shop | null;
  setActiveShopId: (id: string) => void;
  isLoading: boolean;
}

const ShopContext = createContext<ShopContextValue | null>(null);

function readStoredShop() {
  try {
    return localStorage.getItem(SHOP_ID_KEY);
  } catch {
    return null;
  }
}

function writeStoredShop(id: string | null) {
  try {
    if (id) localStorage.setItem(SHOP_ID_KEY, id);
    else localStorage.removeItem(SHOP_ID_KEY);
  } catch {
    /* ignore */
  }
}

// Holds the shop every tenant request acts on. The id is pushed into the HTTP
// layer synchronously (not in an effect) so no request goes out without it,
// and the query cache is keyed by it (see App.tsx), so switching shops can
// never show one shop's data under another.
export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTenant = Boolean(user?.accountId);

  const [activeShopId, setActiveShopIdState] = useState<string | null>(() => (isTenant ? readStoredShop() : null));
  setActiveShopIdForRequests(isTenant ? activeShopId : null);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["shops", user?.accountId],
    queryFn: shopsApi.list,
    enabled: isTenant,
  });
  const activeShops = useMemo(() => shops.filter((s) => s.is_active), [shops]);

  const select = useCallback((id: string | null) => {
    writeStoredShop(id);
    setActiveShopIdForRequests(id);
    setActiveShopIdState(id);
  }, []);

  // Drop a stale id (deleted/deactivated shop, or one from another login).
  useEffect(() => {
    if (!isTenant) {
      if (activeShopId !== null) select(null);
      return;
    }
    if (activeShops.length === 0) return;
    if (!activeShops.some((s) => s.id === activeShopId)) select(activeShops[0].id);
  }, [activeShops, isTenant, activeShopId, select]);

  useEffect(() => {
    if (!user) select(null);
  }, [user, select]);

  useEffect(() => {
    setShopNotAccessibleHandler(() => {
      select(null);
      queryClient.invalidateQueries({ queryKey: ["shops"] });
    });
  }, [queryClient, select]);

  const value = useMemo(
    () => ({
      shops,
      activeShops,
      activeShopId,
      activeShop: shops.find((s) => s.id === activeShopId) ?? null,
      setActiveShopId: (id: string) => select(id),
      isLoading: isTenant && isLoading,
    }),
    [shops, activeShops, activeShopId, isLoading, isTenant, select]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
