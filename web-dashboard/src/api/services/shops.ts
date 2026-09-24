import { http } from "../http";
import type { Id, Shop, ShopSummary } from "../../types/models";

export const shopsApi = {
  list: () => http.get<Shop[]>("/shops").then((r) => r.data),
  summary: (id: Id) => http.get<ShopSummary>(`/shops/${id}/summary`).then((r) => r.data),
  create: (data: { name: string; address?: string; phone?: string }) =>
    http.post<Shop>("/shops", data).then((r) => r.data),
  update: (id: Id, data: Partial<{ name: string; address: string; phone: string; is_active: boolean }>) =>
    http.put<Shop>(`/shops/${id}`, data).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/shops/${id}`).then((r) => r.data),
};
