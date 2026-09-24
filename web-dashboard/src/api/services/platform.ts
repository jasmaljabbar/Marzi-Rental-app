import { http } from "../http";
import type { AccountDetail, AccountSummary, Plan, PlanLimits, PlanFeatures, BillingCycle } from "../../types/models";

export interface PlanInput {
  key?: string;
  name?: string;
  description?: string;
  price?: number;
  billing_cycle?: BillingCycle;
  currency?: string;
  trial_days?: number | null;
  stripe_price_id?: string | null;
  is_public?: boolean;
  is_active?: boolean;
  sort_order?: number;
  limits?: Partial<PlanLimits>;
  features?: Partial<PlanFeatures>;
}

export interface ChangePlanInput {
  plan_id: string;
  start_date?: string;
  expiry_date?: string | null;
  auto_renew?: boolean;
}

// Back-office API for the platform operator (us) to manage every tenant
// ("app user") and the plan catalog itself. Requires the logged-in user to
// have isPlatformAdmin: true on the backend — see middleware/platformAdmin.js.
export const platformApi = {
  listPlans: () => http.get<Plan[]>("/platform/plans").then((r) => r.data),
  createPlan: (input: PlanInput) => http.post<Plan>("/platform/plans", input).then((r) => r.data),
  updatePlan: (id: string, input: PlanInput) => http.put<Plan>(`/platform/plans/${id}`, input).then((r) => r.data),
  deletePlan: (id: string) => http.delete<{ message: string }>(`/platform/plans/${id}`).then((r) => r.data),

  listAccounts: () => http.get<AccountSummary[]>("/platform/accounts").then((r) => r.data),
  getAccount: (id: string) => http.get<AccountDetail>(`/platform/accounts/${id}`).then((r) => r.data),
  changePlan: (id: string, input: ChangePlanInput) =>
    http.put<{ message: string }>(`/platform/accounts/${id}/plan`, input).then((r) => r.data),
  suspend: (id: string) => http.post<{ message: string }>(`/platform/accounts/${id}/suspend`).then((r) => r.data),
  reactivate: (id: string) => http.post<{ message: string }>(`/platform/accounts/${id}/reactivate`).then((r) => r.data),
  remove: (id: string) => http.delete<{ message: string }>(`/platform/accounts/${id}`).then((r) => r.data),

  getDashboard: () =>
    http
      .get<{
        total_accounts: number;
        mrr: number;
        status_counts: Record<string, number>;
        active_count: number;
        trialing_count: number;
        expiring_soon_count: number;
        expiring_within_days: number;
      }>("/platform/dashboard")
      .then((r) => r.data),
};
