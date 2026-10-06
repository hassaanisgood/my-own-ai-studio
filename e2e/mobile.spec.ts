import { expect, test, type Page } from "@playwright/test";
import { generate, promptBox, useFastMock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

async function noHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test("mobile: navigation drawer, stacked results, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary")).toBeHidden(); // desktop sidebar collapsed
  await noHorizontalScroll(page);

  // Results sit below the form.
  const formBox = await page.locator("#composer-panel").boundingBox();
  const resultsBox = await page.locator('section[aria-labelledby="results-heading"]').boundingBox();
  expect(resultsBox!.y).toBeGreaterThan(formBox!.y + formBox!.height - 1);

  // Generate button is pinned within thumb reach.
  const gen = page.getByRole("button", { name: "Generate", exact: true });
  const box = await gen.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh);
  expect(box!.y).toBeGreaterThan(vh * 0.75);

  await promptBox(page).fill("Mobile flow with dunes at dusk");
  await generate(page);
  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 15_000 });
  await noHorizontalScroll(page);

  // Video mode on mobile
  await page.getByRole("tab", { name: "Video" }).click();
  await noHorizontalScroll(page);

  await page.getByRole("button", { name: /Open navigation/ }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: /Generations/ }).click();
  await expect(page).toHaveURL(/\/generations/);
  await expect(drawer).toBeHidden();
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: /^Videos/ }).click();
  await expect(page.getByTestId("gallery").locator('[data-kind="image"]')).toHaveCount(0);

  for (const path of ["/favorites", "/settings"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
});

test("mobile: details dialog fits the screen", async ({ page }) => {
  await page.goto("/generations");
  await page.getByTestId("result-card").nth(1).getByRole("button", { name: "View details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Generate again" })).toBeVisible();
  await noHorizontalScroll(page);
  await dialog.getByRole("button", { name: "Close details" }).click();
  await expect(dialog).toBeHidden();
});
