import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import { downloadAuthenticatedFile } from "../../utils/downloadFile";
import type { Customer, Id, PaginatedResult } from "../../types/models";

export interface ListCustomersParams {
  page?: number;
  page_size?: number;
  search?: string;
  include_archived?: boolean;
  include_stats?: boolean;
}

export interface CustomerInput {
  name: string;
  phone: string;
  address?: string | null;
  doc_url?: string | null;
  photo_url?: string | null;
}

export const customersApi = {
  list: (params: ListCustomersParams = {}): Promise<PaginatedResult<Customer>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 20;
    return http
      .get<Customer[]>("/customers", {
        params: {
          page,
          page_size,
          search: params.search || undefined,
          include_archived: params.include_archived || undefined,
          include_stats: params.include_stats || undefined,
        },
      })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  get: (id: Id) => http.get<Customer>(`/customers/${id}`).then((r) => r.data),
  getByPhone: (phone: string) => http.get<Customer>(`/customers/${encodeURIComponent(phone)}`).then((r) => r.data),
  create: (data: CustomerInput) => http.post<Customer>("/customers", data).then((r) => r.data),
  update: (id: Id, data: Partial<CustomerInput>) => http.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/customers/${id}`).then((r) => r.data),
  archive: (id: Id) => http.post<Customer>(`/customers/${id}/archive`).then((r) => r.data),
  restore: (id: Id) => http.post<Customer>(`/customers/${id}/restore`).then((r) => r.data),
  downloadStatement: (id: Id, customerName: string) =>
    downloadAuthenticatedFile(`/customers/${id}/statement/pdf`, `statement-${customerName.replace(/[^a-z0-9]/gi, "-")}.pdf`),
};
