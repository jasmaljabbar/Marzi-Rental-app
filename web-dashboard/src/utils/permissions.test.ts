import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("permissions mirror the API's role rules", () => {
  it("lets staff run the counter but not manage the catalog, money records or settings", () => {
    expect(can("staff", "rentals.operate")).toBe(true);
    expect(can("staff", "customers.create")).toBe(true);
    expect(can("staff", "equipment.stock")).toBe(true);
    expect(can("staff", "catalog.manage")).toBe(false);
    expect(can("staff", "expenses.manage")).toBe(false);
    expect(can("staff", "reports.view")).toBe(false);
    expect(can("staff", "settings.manage")).toBe(false);
  });

  it("gives owners and admins everything", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(can(role, "catalog.manage")).toBe(true);
      expect(can(role, "settings.manage")).toBe(true);
      expect(can(role, "rentals.delete")).toBe(true);
    }
  });

  it("denies everything without a role", () => {
    expect(can(null, "rentals.operate")).toBe(false);
  });
});
