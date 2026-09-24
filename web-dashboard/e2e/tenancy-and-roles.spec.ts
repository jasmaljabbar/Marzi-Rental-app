import { expect, test } from "@playwright/test";
import { addCustomer, logIn, logout, signUp, unique } from "./helpers";

test("one business never sees another business's customers", async ({ page }) => {
  const secret = unique("Alpha Only ");
  await signUp(page, { company: unique("Alpha "), username: unique("alpha") });
  await addCustomer(page, { name: secret, phone: "9000000001" });
  await expect(page.getByText(secret)).toBeVisible();
  await logout(page);

  await signUp(page, { company: unique("Beta "), username: unique("beta") });
  await page.goto("/customers");
  await expect(page.getByText("No customers yet")).toBeVisible();
  await expect(page.getByText(secret)).toHaveCount(0);
});

test("staff get the counter tools but not settings, and can change their own password", async ({ page }) => {
  const staffName = unique("desk");
  await signUp(page, { company: unique("Roles Co "), username: unique("boss") });
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Team" }).click();
  await page.getByRole("button", { name: "Add team member" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Username").fill(staffName);
  await dialog.getByLabel("Temporary password").fill("temp-password-1");
  await dialog.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(staffName)).toBeVisible();
  await logout(page);

  await logIn(page, staffName, "temp-password-1");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Rentals" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);

  await page.goto("/profile");
  await page.getByLabel("Current password").fill("temp-password-1");
  await page.getByLabel("New password", { exact: true }).fill("my-own-password-1");
  await page.getByLabel("Confirm new password").fill("my-own-password-1");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText(/Password changed/)).toBeVisible();
  await logout(page);
  await logIn(page, staffName, "my-own-password-1");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
