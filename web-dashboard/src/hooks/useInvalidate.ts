import { useQueryClient } from "@tanstack/react-query";

// Centralizes "mutation kind -> query-key families to invalidate" in one
// place instead of every page author re-deriving the full fan-out (e.g. a
// stock-in mutation also auto-creates an Expense server-side, so equipment
// AND expenses AND account-usage all need to be refetched).
export function useInvalidate() {
  const queryClient = useQueryClient();

  function invalidate(...resources: string[]) {
    resources.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  return {
    invalidate,
    afterEquipmentStockChange: () => invalidate("equipment", "inventory", "expenses", "account", "reports"),
    afterEquipmentCatalogChange: () => invalidate("equipment", "account", "reports"),
    afterEquipmentDelete: () => invalidate("equipment", "expenses", "account", "reports"),
    afterRentalChange: () => invalidate("rentals", "equipment", "account", "reports", "invoices", "customer-rentals"),
    afterCategoryChange: () => invalidate("categories", "equipment", "reports"),
    afterCustomerChange: () => invalidate("customers", "reports"),
    afterExpenseChange: () => invalidate("expenses", "reports"),
    afterShopChange: () => invalidate("shops", "account"),
    afterStaffChange: () => invalidate("staff", "account"),
    afterSettingChange: () => invalidate("settings"),
    afterSubscriptionChange: () => invalidate("subscription", "account"),
  };
}
