import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { addCategory, signUp, unique } from "./helpers";

// Photos through the real browser, API and storage: a customer photo shows in
// the list, the detail page and the edit form; four equipment photos picked in
// one go are saved and still there when the item is reopened.

// A real 2x2 PNG, so the API decodes and re-encodes it as in production.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWMwTvtvnPafAUIBACl+BmEHpXmKAAAAAElFTkSuQmCC",
  "base64"
);
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

// Waits until the avatar has actually loaded its photo (not the initials).
async function expectPhotoLoaded(avatar: Locator) {
  await expect(avatar).toHaveAttribute("data-state", "image");
  const img = avatar.locator("img");
  await expect(img).toHaveAttribute("src", /\/files\/t\/[a-f\d]{24}\/customer_photo\/.+\?exp=\d+&sig=/);
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
}

test("a customer's photo shows in the list, on the detail page and in the edit form", async ({ page }) => {
  await signUp(page, { company: unique("Photo Co "), username: unique("photo") });
  await page.goto("/customers");
  await page.getByRole("button", { name: "Add customer" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Jasmal");
  await dialog.getByLabel("Phone").fill("9876500001");
  await dialog.getByLabel("Choose Profile photo files").setInputFiles(png("jasmal.png"));
  await expect(dialog.getByRole("img", { name: "Profile photo 1" })).toBeVisible();
  await dialog.getByRole("button", { name: "Add customer" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Add customer" }).first().click();
  await dialog.getByLabel("Name").fill("Noor");
  await dialog.getByLabel("Phone").fill("9876500002");
  await dialog.getByRole("button", { name: "Add customer" }).click();
  await expect(dialog).toBeHidden();

  const jasmalRow = page.getByRole("row").filter({ hasText: "Jasmal" });
  await expectPhotoLoaded(jasmalRow.locator("[data-state]").first());
  const noorAvatar = page.getByRole("row").filter({ hasText: "Noor" }).locator("[data-state]").first();
  await expect(noorAvatar).toHaveAttribute("data-state", "initials");
  await expect(noorAvatar).toHaveText("N");

  await jasmalRow.getByText("Jasmal").click();
  await expectPhotoLoaded(page.getByRole("main").locator("[data-state]").first());
  await page.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog");
  const photo = edit.getByRole("img", { name: "Profile photo 1" });
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test("four equipment photos picked at once are saved, kept on edit and limited to four", async ({ page }) => {
  await signUp(page, { company: unique("Gear Co "), username: unique("gear") });
  await addCategory(page, "Tents");
  await page.goto("/equipment");
  await page.getByRole("button", { name: "Add equipment" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Party Tent");
  await dialog.getByLabel("Category").selectOption({ label: "Tents" });
  await dialog.getByLabel("Rent / day").fill("500");

  await dialog.getByLabel("Choose Photos files").setInputFiles(["front.png", "side.png", "inside.png", "packed.png"].map(png));
  await expect(dialog.getByText("(4/4)")).toBeVisible();
  for (let i = 1; i <= 4; i++) await expect(dialog.getByRole("img", { name: `Photos ${i}` })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add photos" })).toBeHidden();
  await dialog.getByRole("button", { name: "Add equipment" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("row").filter({ hasText: "Party Tent" }).getByText("Party Tent").click();
  await page.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog");
  await expect(edit.getByText("(4/4)")).toBeVisible();
  const first = edit.getByRole("img", { name: "Photos 1" });
  expect(await first.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  // Remove two, then try to add three at once: refused, nothing uploaded.
  await edit.getByRole("button", { name: "Remove image 1" }).click();
  await edit.getByRole("button", { name: "Remove image 1" }).click();
  await expect(edit.getByText("(2/4)")).toBeVisible();
  await edit.getByLabel("Choose Photos files").setInputFiles(["a.png", "b.png", "c.png"].map(png));
  await expect(edit.getByRole("alert")).toHaveText("You can add up to 4 photos. You selected 3, but only 2 more can be added.");
  await expect(edit.getByText("(2/4)")).toBeVisible();

  // Two fit.
  await edit.getByLabel("Choose Photos files").setInputFiles(["a.png", "b.png"].map(png));
  await expect(edit.getByText("(4/4)")).toBeVisible();
  await expect(edit.getByTestId("pending-image")).toHaveCount(0);
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog").getByText("(4/4)")).toBeVisible();
});
