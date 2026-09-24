import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import type { Id, PaginatedResult, Payment, PaymentMethod, Rental, RentalStatus, ReturnInput, ReturnPreview } from "../../types/models";

export interface ListRentalsParams {
  status?: RentalStatus;
  customer_id?: Id;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ListRentalHistoryParams {
  include_cancelled?: boolean;
  customer_id?: Id;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const rentalsApi = {
  list: (params: ListRentalsParams = {}): Promise<PaginatedResult<Rental>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 50;
    return http
      .get<Rental[]>("/rentals", { params: { ...params, page, page_size } })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  history: (params: ListRentalHistoryParams = {}): Promise<PaginatedResult<Rental>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 50;
    return http
      .get<Rental[]>("/rentals/history", {
        params: { ...params, include_cancelled: params.include_cancelled ? "true" : undefined, page, page_size },
      })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  get: (id: Id) => http.get<Rental>(`/rentals/${id}`).then((r) => r.data),
  createBulk: (data: {
    customer_id: Id;
    items: Array<{ equipment_id: Id; quantity: number }>;
    expected_return_date?: string;
    advance_amount?: number;
    remark?: string;
    payment_method?: PaymentMethod;
  }) => http.post<Rental[]>("/rentals/bulk", data).then((r) => r.data),
  update: (id: Id, data: Partial<{ expected_return_date: string | null; advance_amount: number; remark: string | null; payment_method: PaymentMethod }>) =>
    http.put<Rental>(`/rentals/${id}`, data).then((r) => r.data),
  // Server-computed bill for returning one or more rentals of one customer.
  previewReturn: (input: ReturnInput) => http.post<ReturnPreview>("/rentals/return/preview", input).then((r) => r.data),
  completeReturn: (input: ReturnInput) =>
    http.post<{ rentals: Rental[]; summary: ReturnPreview }>("/rentals/return", input).then((r) => r.data),
  addPayment: (id: Id, input: { amount_paid: number; discount_amount?: number; due_date?: string | null; payment_method?: PaymentMethod }) =>
    http.post<Rental>(`/rentals/${id}/payment`, input).then((r) => r.data),
  payments: (id: Id) => http.get<Payment[]>(`/rentals/${id}/payments`).then((r) => r.data),
  cancel: (id: Id, input: { refund_advance?: boolean; payment_method?: PaymentMethod } = {}) =>
    http.post<Rental>(`/rentals/${id}/cancel`, input).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/rentals/${id}`).then((r) => r.data),
};
