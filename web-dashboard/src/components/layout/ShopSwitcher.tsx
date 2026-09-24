import { Store } from "lucide-react";
import { useShop } from "../../context/ShopContext";

export function ShopSwitcher() {
  const { activeShops, activeShopId, setActiveShopId } = useShop();

  if (activeShops.length <= 1) return null;

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <Store className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <span className="sr-only">Active shop</span>
      <select
        value={activeShopId ?? ""}
        onChange={(e) => setActiveShopId(e.target.value)}
        className="max-w-[10rem] truncate rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-none"
      >
        {activeShops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
    </label>
  );
}
