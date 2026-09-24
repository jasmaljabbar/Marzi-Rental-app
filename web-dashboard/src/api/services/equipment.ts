import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import type {
  Equipment,
  EquipmentSale,
  EquipmentSalesSummary,
  Id,
  MaintenanceAction,
  PaginatedResult,
} from "../../types/models";

export interface ListEquipmentParams {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: string;
  include_archived?: boolean;
}

export interface EquipmentInput {
  name: string;
  description?: string | null;
  stock_count?: number;
  rent_per_day: number;
  deposit_amount?: number;
  purchase_price_per_unit?: number;
  useful_life_years?: number;
  category_id: string;
  images?: string[];
}

export const equipmentApi = {
  list: (params: ListEquipmentParams = {}): Promise<PaginatedResult<Equipment>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 20;
    return http
      .get<Equipment[]>("/equipment", {
        params: {
          page,
          page_size,
          search: params.search || undefined,
          category_id: params.category_id || undefined,
          include_archived: params.include_archived || undefined,
        },
      })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  get: (id: Id) => http.get<Equipment>(`/equipment/${id}`).then((r) => r.data),
  create: (data: EquipmentInput) => http.post<Equipment>("/equipment", data).then((r) => r.data),
  update: (id: Id, data: Partial<EquipmentInput>) => http.put<Equipment>(`/equipment/${id}`, data).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/equipment/${id}`).then((r) => r.data),
  archive: (id: Id) => http.post<Equipment>(`/equipment/${id}/archive`).then((r) => r.data),
  restore: (id: Id) => http.post<Equipment>(`/equipment/${id}/restore`).then((r) => r.data),
  duplicate: (id: Id) => http.post<Equipment>(`/equipment/${id}/duplicate`).then((r) => r.data),

  addStock: (id: Id, quantity_added: number, unit_price?: number, note?: string) =>
    http.post<Equipment>(`/equipment/${id}/stock`, { quantity_added, unit_price, note }).then((r) => r.data),
  scrap: (id: Id, quantity: number, remark?: string) =>
    http.post<Equipment>(`/equipment/${id}/scrap`, { quantity, remark }).then((r) => r.data),
  sell: (id: Id, data: { customer_id: Id; quantity: number; selling_price: number; amount_paid?: number; remark?: string; payment_method?: string }) =>
    http.post<EquipmentSale>(`/equipment/${id}/sell`, data).then((r) => r.data),
  maintenance: (equipment_id: Id, action: Exclude<MaintenanceAction, "Scrap">, input: { remark?: string; cost?: number; quantity?: number; photos?: string[] } = {}) =>
    http.post(`/equipment/maintenance`, { equipment_id, action, ...input }).then((r) => r.data),

  sales: (params: { customer_id?: Id; equipment_id?: Id; payment_status?: string; page?: number; page_size?: number } = {}) => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 20;
    return http
      .get<EquipmentSale[]>("/equipment/sales", { params: { ...params, page, page_size } })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  salesSummary: (start_date?: string, end_date?: string) =>
    http.get<EquipmentSalesSummary>("/equipment/sales/summary", { params: { start_date, end_date } }).then((r) => r.data),
  updateSalePayment: (id: Id, amount_paid: number) =>
    http.post<EquipmentSale>(`/equipment/sales/${id}/payment`, { amount_paid }).then((r) => r.data),
};
