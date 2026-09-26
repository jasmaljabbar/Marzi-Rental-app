import { expect, test } from "@playwright/test";
import { signUp, unique } from "./helpers";

// Runs on a phone-sized viewport (see playwright.config.ts "mobile" project).
test("main screens fit a phone screen without sideways scrolling", async ({ page }) => {
  await signUp(page, { company: unique("Mobile Co "), username: unique("mobile") });
  for (const path of ["/", "/rentals", "/customers", "/equipment", "/expenses", "/profile"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button", { name: /menu/i }).first().click();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Rentals" })).toBeVisible();
});

// A form opened as a bottom sheet on a small phone: it fits the screen, its
// number fields bring up the right keypad, and its last button can be reached.
test("forms fit a small phone and their submit button is reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signUp(page, { company: unique("Small Co "), username: unique("small") });
  await page.goto("/equipment");
  await page.getByRole("button", { name: "Add equipment" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await expect(dialog.getByLabel("Initial stock")).toHaveAttribute("inputmode", "numeric");
  await expect(dialog.getByLabel("Rent / day")).toHaveAttribute("inputmode", "decimal");

  const box = await dialog.boundingBox();
  expect(box!.y + box!.height, "the sheet ends inside the visible screen").toBeLessThanOrEqual(568);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `the sheet overflows sideways by ${overflow}px`).toBeLessThanOrEqual(1);

  const submit = dialog.getByRole("button", { name: "Add equipment" });
  await submit.scrollIntoViewIfNeeded();
  const button = await submit.boundingBox();
  expect(button!.y + button!.height, "the submit button is fully on screen").toBeLessThanOrEqual(568);
});
