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
