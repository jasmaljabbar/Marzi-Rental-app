import { http } from "../http";
import type { Catalog } from "../../types/models";

// Public registry of every limit/feature key a Plan can define (GET /catalog).
// Drives the platform admin's Plan form and any generic usage/feature
// display — a new limit/feature key needs no change here or in those
// components, only a new entry in the backend's config/planCatalog.js.
export const catalogApi = {
  get: () => http.get<Catalog>("/catalog").then((r) => r.data),
};
