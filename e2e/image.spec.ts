import { expect, test } from "@playwright/test";
import { generate, historyLength, openCreate, promptBox, useFastMock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

test("shows an intentional empty state before anything is generated", async ({ page }) => {
  await openCreate(page);
  await expect(page.getByTestId("empty-state")).toContainText("Your canvas is clear");
});

test("image generation: queued → generating (simulated) → result in gallery and history", async ({ page }) => {
  await openCreate(page);
  const before = await historyLength(page);
  await promptBox(page).fill("Sea-green ceramic vase on a limestone plinth, soft window light");
  await page.getByRole("radio", { name: /Qwen\ Image\ 3/ }).check();
  await page.getByRole("radio", { name: /16:9/ }).check();
  await page.getByRole("radio", { name: "1 image", exact: true }).check();
  await expect(page.getByTestId("estimated-cost")).toHaveText("$0.004");

  await generate(page);
  const job = page.getByTestId("job-card");
  await expect(job).toBeVisible();
  await expect(job).toHaveAttribute("data-status", /queued|running/);
  await expect(job.getByText("Simulated progress")).toBeVisible();
  await expect(job.getByRole("progressbar")).toBeVisible();

  const card = page.getByTestId("result-card").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(job).toHaveCount(0);
  await expect(card).toContainText("Qwen Image 3");
  await expect(card).toContainText("Sea-green ceramic vase");
  await expect(card).toContainText("$0.004");
  await expect(card).toContainText("Just now");
  await expect(card.locator("img")).toHaveAttribute("src", /\/mock\/images\/vessel-16x9\.jpg/);
  // The asset actually loads.
  await expect.poll(() => card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
  await expect(page.getByTestId("announcer")).toContainText("Generation complete");
  expect(await historyLength(page)).toBe(before + 1);
});

test("multiple outputs create one result per image", async ({ page }) => {
  await openCreate(page);
  await promptBox(page).fill("Rolling desert dunes at dusk");
  await page.getByRole("radio", { name: "3 images", exact: true }).check();
  await expect(page.getByTestId("estimated-cost")).toHaveText("$0.0171");
  await generate(page);
  await expect(page.getByTestId("job-card").getByText("3 images", { exact: false })).toBeVisible();
  await expect(page.getByTestId("result-card")).toHaveCount(3, { timeout: 15_000 });
});

test("validation: empty and too-short prompts are blocked and focus moves to the prompt", async ({ page }) => {
  await openCreate(page);
  await promptBox(page).fill("");
  await generate(page);
  await expect(page.locator("#prompt-input-image-error")).toHaveText("Describe what you want to generate.");
  await expect(promptBox(page)).toBeFocused();
  await expect(promptBox(page)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("job-card")).toHaveCount(0);

  await promptBox(page).fill("ab");
  await expect(page.locator("#prompt-input-image-error")).toHaveText("Prompt must be at least 3 characters.");
  await promptBox(page).fill("abc and more");
  await expect(page.locator("#prompt-input-image-error")).toHaveCount(0);
});

test("unsupported settings are disabled and adjusted when switching models", async ({ page }) => {
  await openCreate(page);
  await page.getByRole("radio", { name: /9:16/ }).check();
  await page.getByRole("radio", { name: "4 images", exact: true }).check();
  await page.getByRole("radio", { name: /Recraft\ V4\.1/ }).check();
  await expect(page.getByText(/Adjusted for Recraft V4.1: aspect ratio set to 1:1, resolution set to 1K, outputs limited to 2/)).toBeVisible();
  await expect(page.getByRole("radio", { name: /9:16.*not supported/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /3 images.*not supported/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /1:1/ })).toBeChecked();
  await expect(page.getByTestId("estimated-cost")).toHaveText("$0.08");
});

test("Ctrl+Enter in the prompt starts a generation", async ({ page }) => {
  await openCreate(page);
  await promptBox(page).fill("Three chrome spheres on a studio floor");
  await promptBox(page).press("Control+Enter");
  await expect(page.getByTestId("job-card")).toBeVisible();
  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 15_000 });
});
