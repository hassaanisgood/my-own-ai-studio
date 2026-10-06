import { expect, test } from "@playwright/test";
import { generate, openCreate, promptBox } from "./helpers";

test("the studio keeps working when local storage throws", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await openCreate(page);
  await promptBox(page).fill("Storage failure resilience test");
  await expect(page.getByText("Storage unavailable")).toBeVisible();
  await generate(page);
  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 20_000 });
  await page.goto("/settings");
  await expect(page.getByRole("alert").filter({ hasText: "Browser storage" })).toContainText("Browser storage is full");
});

test("the studio keeps working when IndexedDB is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined });
  });
  await openCreate(page);
  await page.getByRole("tab", { name: "Video" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image" }).click();
  await (await chooser).setFiles({
    name: "ref.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByText("Reference kept for this session only")).toBeVisible();
  await expect(page.getByAltText("Reference: ref.png")).toBeVisible();
});
