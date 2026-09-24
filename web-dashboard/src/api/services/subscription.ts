import { http } from "../http";
import type { StripeInvoice, TenantSubscription } from "../../types/models";

export const subscriptionApi = {
  get: () => http.get<TenantSubscription>("/subscription").then((r) => r.data),
  checkout: (plan_key: string) => http.post<{ checkout_url: string }>("/subscription/checkout", { plan_key }).then((r) => r.data),
  portal: () => http.post<{ portal_url: string }>("/subscription/portal").then((r) => r.data),
  invoices: () => http.get<StripeInvoice[]>("/subscription/invoices").then((r) => r.data),
  cancel: () => http.post<{ message: string }>("/subscription/cancel").then((r) => r.data),
};
