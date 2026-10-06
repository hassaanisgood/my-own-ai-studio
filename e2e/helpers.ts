import { expect, type Page } from "@playwright/test";

/** Seeds fast mock timing once per test (not on reloads, so persistence can be checked). */
export async function useFastMock(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript((extraSettings) => {
    if (!sessionStorage.getItem("__seeded_test")) {
      sessionStorage.setItem("__seeded_test", "1");
      localStorage.setItem("studio:v1:settings", JSON.stringify({ mockSpeed: "fast", ...extraSettings }));
    }
  }, extra);
}

export async function openCreate(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Image" })).toBeVisible();
  await expect(page.locator("#prompt-input-image, #prompt-input-video")).toBeVisible();
}

export const promptBox = (page: Page, mode: "image" | "video" = "image") => page.locator(`#prompt-input-${mode}`);

export async function generate(page: Page) {
  await page.getByRole("button", { name: "Generate", exact: true }).click();
}

export const results = (page: Page) => page.getByRole("region", { name: "Results" }).or(page.locator('section[aria-labelledby="results-heading"]'));

export async function historyLength(page: Page): Promise<number> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("studio:v1:history") ?? "[]").length);
}
