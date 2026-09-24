import type { Role } from "../types/models";

// Mirrors the role checks enforced by the API routes (nodejs-backend/src/routes).
// The server is the authority; this only decides what the UI offers, so staff
// never see buttons that would just fail with "permission denied".
export type Permission =
  | "catalog.manage" // create/edit/delete/archive equipment and categories
  | "equipment.sell" // sell or scrap units
  | "equipment.stock" // add stock
  | "equipment.maintain" // report damage / log repairs
  | "customers.create"
  | "customers.edit"
  | "customers.archive" // archive/restore/delete customers
  | "rentals.operate" // create, edit, return, cancel, take payments
  | "rentals.delete"
  | "expenses.create"
  | "expenses.manage" // edit/delete/archive expenses, recurring templates
  | "reports.view"
  | "settings.manage" // company details, settings, shops, team
  | "billing.manage";

const STAFF: Permission[] = [
  "equipment.stock",
  "equipment.maintain",
  "customers.create",
  "customers.edit",
  "rentals.operate",
  "expenses.create",
];

const ADMIN: Permission[] = [
  ...STAFF,
  "catalog.manage",
  "equipment.sell",
  "customers.archive",
  "rentals.delete",
  "expenses.manage",
  "reports.view",
  "settings.manage",
  "billing.manage",
];

const BY_ROLE: Record<Role, ReadonlySet<Permission>> = {
  staff: new Set(STAFF),
  admin: new Set(ADMIN),
  owner: new Set(ADMIN),
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return role ? BY_ROLE[role].has(permission) : false;
}

export const isOwnerOrAdmin = (role: Role | undefined | null) => role === "owner" || role === "admin";
export const isStaff = (role: Role | undefined | null) => role === "staff";
