import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { generate, openCreate, promptBox, useFastMock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

test("history filters: all / images / videos", async ({ page }) => {
  await page.goto("/generations");
  const gallery = page.getByTestId("gallery");
  await expect(gallery.getByTestId("result-card")).toHaveCount(13);
  await page.getByRole("button", { name: /^Images/ }).click();
  await expect(page.getByRole("button", { name: /^Images/ })).toHaveAttribute("aria-pressed", "true");
  await expect(gallery.getByTestId("result-card")).toHaveCount(9);
  await expect(gallery.locator('[data-kind="video"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Videos/ }).click();
  await expect(gallery.getByTestId("result-card")).toHaveCount(4);
  await expect(gallery.locator('[data-kind="image"]')).toHaveCount(0);
  await expect(gallery.locator("video[controls]")).toHaveCount(4);
  await page.getByRole("button", { name: /^All/ }).click();
  await page.getByRole("searchbox", { name: "Search prompts" }).fill("chrome");
  await expect(gallery.getByTestId("result-card")).toHaveCount(2);
});

test("favorites toggle and appear on the Favorites page", async ({ page }) => {
  await page.goto("/favorites");
  await expect(page.getByTestId("result-card")).toHaveCount(2);
  await page.goto("/generations");
  const card = page.getByTestId("gallery").getByTestId("result-card").filter({ hasText: "alpine ridgelines" });
  const fav = card.getByRole("button", { name: "Add to favorites" });
  await fav.click();
  await expect(card.getByRole("button", { name: "Remove from favorites" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: /Favorites/ }).first().click();
  await expect(page.getByTestId("result-card")).toHaveCount(3);
  const favCard = page.getByTestId("result-card").filter({ hasText: "alpine ridgelines" });
  await favCard.getByRole("button", { name: "Remove from favorites" }).click();
  await expect(page.getByTestId("result-card")).toHaveCount(2);
});

test("download saves the exact displayed asset", async ({ page }) => {
  await page.goto("/generations");
  const card = page.getByTestId("gallery").getByTestId("result-card").filter({ hasText: "alpine ridgelines" });
  const src = await card.locator("img").getAttribute("src");
  const dl = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download" }).click();
  const download = await dl;
  expect(download.suggestedFilename()).toMatch(/^northlight-qwen-image-3-\d{8}-\d{4}\.jpg$/);
  const saved = readFileSync(await download.path());
  const original = readFileSync(`public${src}`);
  expect(saved.equals(original)).toBe(true);
  await expect(page.getByText("Download started")).toBeVisible();

  // Video download
  const vcard = page.getByTestId("gallery").locator('[data-kind="video"]').first();
  const vsrc = await vcard.locator("video").getAttribute("src");
  const vdl = page.waitForEvent("download");
  await vcard.getByRole("button", { name: "Download" }).click();
  const vdownload = await vdl;
  expect(vdownload.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  expect(readFileSync(await vdownload.path()).equals(readFileSync(`public${vsrc}`))).toBe(true);
});

test("copy prompt copies the full prompt and confirms", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/generations");
  const card = page.getByTestId("gallery").getByTestId("result-card").first();
  await card.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByText("Prompt copied", { exact: true }).first()).toBeVisible();
  await expect(card.getByRole("button", { name: "Prompt copied" })).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe(
    "Slow push-in on aurora curtains rippling above a dark mountain ridge, faint stars twinkling, long exposure feel",
  );
});

test("generate again restores the original prompt and settings, then runs", async ({ page }) => {
  await page.goto("/generations");
  const card = page.getByTestId("gallery").getByTestId("result-card").filter({ hasText: "Evening tide rolling in" });
  await card.getByRole("button", { name: "Generate again" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("tab", { name: "Video" })).toHaveAttribute("aria-selected", "true");
  await expect(promptBox(page, "video")).toHaveValue(
    "Evening tide rolling in under a setting sun, gentle waves catching warm light, static tripod shot",
  );
  await expect(page.getByRole("radio", { name: /Seedance 2\.5/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "10 seconds" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /720p/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /9:16/ })).toBeChecked();
  // Create only lists generations made in this workspace, so a result here proves a new run happened.
  const result = page.getByTestId("result-card").first();
  await expect(result).toBeVisible({ timeout: 20_000 });
  await expect(result.locator("video")).toHaveAttribute("src", /tide-9x16-10s\.(mp4|webm)$/);
});

test("details dialog: keyboard navigation, focus return and delete", async ({ page }) => {
  await page.goto("/generations");
  const first = page.getByTestId("gallery").getByTestId("result-card").nth(1);
  const opener = first.getByRole("button", { name: "View details" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("2 of 13")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("3 of 13")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete from history" }).click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog.getByText("3 of 12")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.getByTestId("gallery").getByTestId("result-card")).toHaveCount(12);
});

test("history, favorites, settings and drafts persist across refresh", async ({ page }) => {
  await openCreate(page);
  await promptBox(page).fill("Chrome spheres for persistence");
  await generate(page);
  const card = page.getByTestId("result-card").first();
  await expect(page.getByTestId("result-card")).toHaveCount(2, { timeout: 15_000 });
  await card.getByRole("button", { name: "Add to favorites" }).click();

  await page.goto("/settings");
  await page.getByRole("switch", { name: "Show cost estimates" }).click();
  await expect(page.getByRole("switch", { name: "Show cost estimates" })).toHaveAttribute("aria-checked", "false");

  await page.reload();
  await expect(page.getByRole("switch", { name: "Show cost estimates" })).toHaveAttribute("aria-checked", "false");
  await page.goto("/");
  await expect(promptBox(page)).toHaveValue("Chrome spheres for persistence");
  await expect(page.getByTestId("result-card")).toHaveCount(2);
  await expect(page.getByTestId("estimated-cost")).toHaveCount(0);
  await page.goto("/favorites");
  await expect(page.getByTestId("result-card").filter({ hasText: "Chrome spheres for persistence" })).toHaveCount(1);
  await page.goto("/generations");
  await expect(page.getByTestId("gallery").getByTestId("result-card")).toHaveCount(15);
});
