import { http } from "../http";
import type { Plan } from "../../types/models";

// Public pricing list (isPublic: true only) — distinct from platformApi.listPlans
// which returns every plan including hidden/internal ones.
export const plansApi = {
  list: () => http.get<Plan[]>("/plans").then((r) => r.data),
};
