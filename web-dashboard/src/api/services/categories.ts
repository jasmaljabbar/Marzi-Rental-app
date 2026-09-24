import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import type { Category, Id, PaginatedResult } from "../../types/models";

export interface ListCategoriesParams {
  page?: number;
  page_size?: number;
  include_archived?: boolean;
}

export const categoriesApi = {
  list: (params: ListCategoriesParams = {}): Promise<PaginatedResult<Category>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 50;
    return http
      .get<Category[]>("/categories", { params: { page, page_size, include_archived: params.include_archived || undefined } })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  create: (name: string, icon?: string | null) => http.post<Category>("/categories", { name, icon }).then((r) => r.data),
  update: (id: Id, data: Partial<{ name: string; icon: string | null }>) =>
    http.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  reorder: (orderedIds: Id[]) => http.post<{ message: string }>("/categories/reorder", { ordered_ids: orderedIds }).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/categories/${id}`).then((r) => r.data),
  archive: (id: Id) => http.post<Category>(`/categories/${id}/archive`).then((r) => r.data),
  restore: (id: Id) => http.post<Category>(`/categories/${id}/restore`).then((r) => r.data),
};
