import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Store } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { useShop } from "../../context/ShopContext";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main" className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
          <SubscriptionBanner />
          <Breadcrumbs />
          <ShopGate>
            <Outlet />
          </ShopGate>
        </main>
      </div>
    </div>
  );
}

// Pages only mount once the active shop is known, so their first requests
// already carry the right shop (no second round of fetches, no flash).
function ShopGate({ children }: { children: ReactNode }) {
  const { activeShopId, activeShops, isLoading } = useShop();
  if (activeShopId) return <>{children}</>;
  if (!isLoading && activeShops.length === 0) {
    return <EmptyState icon={Store} title="No active shop" description="This business has no active shop. Ask an owner to reactivate one in Settings." />;
  }
  return (
    <div className="flex justify-center py-16" role="status">
      <Spinner className="h-6 w-6" />
      <span className="sr-only">Loading your shop…</span>
    </div>
  );
}
