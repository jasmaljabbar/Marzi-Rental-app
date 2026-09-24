import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import type { Id, InventorySummary, InventoryTransaction, PaginatedResult } from "../../types/models";

export const inventoryApi = {
  // Note: neither endpoint is shop-scoped server-side (no attachTenantContext) —
  // these reflect the whole database, not just the caller's tenant/shop. Fine
  // for a single-shop deployment; flagged for a future backend fix at scale.
  summary: () => http.get<InventorySummary>("/inventory/summary").then((r) => r.data),
  transactions: (equipment_id?: Id, page = 1, page_size = 50): Promise<PaginatedResult<InventoryTransaction>> =>
    http
      .get<InventoryTransaction[]>("/inventory/transactions", { params: { equipment_id, page, page_size } })
      .then((res) => toPaginatedResult(res, { page, page_size })),
};
