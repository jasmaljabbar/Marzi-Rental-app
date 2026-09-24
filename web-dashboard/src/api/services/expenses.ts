import { http } from "../http";
import { toPaginatedResult } from "../pagination";
import type { Expense, Id, PaginatedResult, RecurringExpenseTemplate } from "../../types/models";

export interface ExpenseInput {
  category: string;
  amount: number;
  remark?: string | null;
  payment_mode?: string;
  receipt_url?: string | null;
  equipment_id?: string | null;
  date?: string;
}

export interface ListExpensesParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;
}

export interface RecurringExpenseInput {
  category: string;
  amount: number;
  remark?: string | null;
  day_of_month: number;
  equipment_id?: string | null;
  is_active?: boolean;
}

export const expensesApi = {
  list: (params: ListExpensesParams = {}): Promise<PaginatedResult<Expense>> => {
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 50;
    return http
      .get<Expense[]>("/expenses", {
        params: { ...params, page, page_size, search: params.search || undefined, include_archived: params.include_archived || undefined },
      })
      .then((res) => toPaginatedResult(res, { page, page_size }));
  },
  create: (data: ExpenseInput) => http.post<Expense>("/expenses", data).then((r) => r.data),
  update: (id: Id, data: Partial<ExpenseInput>) => http.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: Id) => http.delete<{ message: string }>(`/expenses/${id}`).then((r) => r.data),
  archive: (id: Id) => http.post<Expense>(`/expenses/${id}/archive`).then((r) => r.data),
  restore: (id: Id) => http.post<Expense>(`/expenses/${id}/restore`).then((r) => r.data),

  listRecurring: () => http.get<RecurringExpenseTemplate[]>("/expenses/recurring").then((r) => r.data),
  createRecurring: (data: RecurringExpenseInput) => http.post<RecurringExpenseTemplate>("/expenses/recurring", data).then((r) => r.data),
  updateRecurring: (id: Id, data: Partial<RecurringExpenseInput>) =>
    http.put<RecurringExpenseTemplate>(`/expenses/recurring/${id}`, data).then((r) => r.data),
  removeRecurring: (id: Id) => http.delete<{ message: string }>(`/expenses/recurring/${id}`).then((r) => r.data),
};
