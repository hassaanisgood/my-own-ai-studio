import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { generate, openCreate, promptBox, useFastMock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

for (const path of ["/", "/generations", "/favorites", "/settings"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary).toEqual([]);
  });
}

test("no axe violations in video mode and with a failed job", async ({ page }) => {
  await openCreate(page);
  await page.getByRole("tab", { name: "Video" }).click();
  await promptBox(page, "video").fill("Aurora [fail]");
  await generate(page);
  await expect(page.getByTestId("job-card")).toHaveAttribute("data-status", "failed", { timeout: 15_000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("keyboard: skip link, mode tabs, radios and generate", async ({ page }) => {
  await openCreate(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  // Tab into the mode tabs and switch with arrow keys.
  const imageTab = page.getByRole("tab", { name: "Image" });
  await imageTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Video" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Video" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(imageTab).toHaveAttribute("aria-selected", "true");

  // Tab order reaches the prompt, then model radios; arrow keys change the selection.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(promptBox(page)).toBeFocused();
  await page.keyboard.type("Keyboard only generation of a moonlit sea");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /Higgsfield Soul 2/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Qwen Image 3/ })).toBeChecked();

  // Focus is visible (outline drawn on the focused radio's label).
  const outline = await page
    .getByRole("radio", { name: /Qwen Image 3/ })
    .evaluate((el) => getComputedStyle(el.closest("label")!).outlineStyle);
  expect(outline).toBe("solid");

  await page.getByRole("button", { name: "Generate", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("job-card")).toBeVisible();
  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 15_000 });

  // Result actions are reachable and operable by keyboard.
  const fav = page.getByTestId("result-card").first().getByRole("button", { name: "Add to favorites" });
  await fav.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result-card").first().getByRole("button", { name: "Remove from favorites" })).toBeVisible();
});

test("reduced motion preference disables animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCreate(page);
  await promptBox(page).fill("Reduced motion check");
  await generate(page);
  const shimmer = page.getByTestId("job-card").locator('[class*="animate-shimmer"]').first();
  await expect(shimmer).toBeAttached();
  // motion-safe: animations don't apply at all under the OS preference.
  expect(await shimmer.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("reduce-motion setting applies even without the OS preference", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Reduce", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.goto("/");
  await promptBox(page).fill("Reduced motion via settings");
  await generate(page);
  const shimmer = page.getByTestId("job-card").locator('[class*="animate-shimmer"]').first();
  await expect(shimmer).toBeAttached();
  const duration = await shimmer.evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
