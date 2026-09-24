import { expect, test } from "@playwright/test";
import { addCategory, addCustomer, addEquipment, signUp, unique } from "./helpers";

// The core business journey: set up a shop, rent two items with one advance,
// return them together and collect the balance.
test("rent two items with an advance, return them together, collect the rest", async ({ page }) => {
  await signUp(page, { company: unique("Flow Co "), username: unique("flow") });
  await addCategory(page, "Power tools");
  await addEquipment(page, { name: "Concrete Mixer", category: "Power tools", stock: 3, rate: 100 });
  await addEquipment(page, { name: "Tile Cutter", category: "Power tools", stock: 2, rate: 50 });
  await addCustomer(page, { name: "Priya Shah", phone: "9876543210" });

  await page.goto("/rentals");
  await page.getByRole("button", { name: "New rental" }).first().click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Customer (name or phone)").fill("Priya");
  await create.getByRole("button", { name: /Priya Shah/ }).click();
  for (const item of ["Concrete Mixer", "Tile Cutter"]) {
    await create.getByPlaceholder("Search equipment").fill(item.split(" ")[0]);
    await create.getByRole("button", { name: new RegExp(item) }).click();
  }
  await create.getByLabel("Advance / deposit").fill("120");
  await create.getByRole("button", { name: "Create rental (2 items)" }).click();
  await expect(create).toBeHidden();

  await expect(page.getByRole("region", { name: "Rentals for Priya Shah" })).toBeVisible();
  await page.getByRole("button", { name: "Return all (2)" }).click();
  const ret = page.getByRole("dialog");
  // 1 day: 100 + 50 = 150 total; the 120 advance was split across both lines, not copied.
  await expect(ret.getByText("Total")).toBeVisible();
  await expect(ret.getByText("₹150", { exact: true }).first()).toBeVisible();
  await expect(ret.getByText("Still due")).toBeVisible();
  await expect(ret.getByText("₹30", { exact: true })).toBeVisible();
  await ret.getByLabel("Amount received now").fill("30");
  await expect(ret.getByText("Settled")).toBeVisible();
  await ret.getByRole("button", { name: "Complete return" }).click();
  await expect(ret).toBeHidden();

  await page.getByRole("tab", { name: /History/ }).click();
  const rows = page.getByRole("row").filter({ hasText: "Priya Shah" });
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Paid");
  await expect(rows.first()).toContainText(/INV-\d{4}-000\d/);

  await page.goto("/");
  await expect(page.getByText("Cash in this month")).toBeVisible();
});
