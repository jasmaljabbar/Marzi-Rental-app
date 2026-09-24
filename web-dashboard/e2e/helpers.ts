import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

let counter = 0;
export function unique(prefix: string) {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

// Registers a new business through the real signup screens.
export async function signUp(page: Page, { company, username, password = "correct-horse-9" }: { company: string; username: string; password?: string }) {
  await page.goto("/signup");
  await page.getByLabel("Business name").fill(company);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function logout(page: Page) {
  await page.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

export async function addCategory(page: Page, name: string) {
  await page.goto("/categories");
  await page.getByRole("button", { name: "Add category" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Category name").fill(name);
  await dialog.getByRole("button", { name: "Add category" }).click();
  await expect(dialog).toBeHidden();
}

export async function addEquipment(page: Page, { name, category, stock, rate }: { name: string; category: string; stock: number; rate: number }) {
  await page.goto("/equipment");
  await page.getByRole("button", { name: "Add equipment" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Category").selectOption({ label: category });
  await dialog.getByLabel("Initial stock").fill(String(stock));
  await dialog.getByLabel("Rent / day").fill(String(rate));
  await dialog.getByRole("button", { name: "Add equipment" }).click();
  await expect(dialog).toBeHidden();
}

export async function addCustomer(page: Page, { name, phone }: { name: string; phone: string }) {
  await page.goto("/customers");
  await page.getByRole("button", { name: "Add customer" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Phone").fill(phone);
  await dialog.getByRole("button", { name: "Add customer" }).click();
  await expect(dialog).toBeHidden();
}

export async function logIn(page: Page, username: string, password: string, businessCode?: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  if (businessCode) {
    await page.getByRole("button", { name: "Sign in with a business code" }).click();
    await page.getByLabel("Business code").fill(businessCode);
  }
  await page.getByRole("button", { name: "Log in" }).click();
}
