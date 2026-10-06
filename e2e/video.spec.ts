import { expect, test } from "@playwright/test";
import { generate, openCreate, promptBox, useFastMock } from "./helpers";

// 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

test("video mode: cost by model + duration, reference upload, playable result", async ({ page }) => {
  await openCreate(page);
  await page.getByRole("tab", { name: "Video" }).click();
  await expect(page.getByRole("tab", { name: "Video" })).toHaveAttribute("aria-selected", "true");
  await expect(promptBox(page, "video")).toBeVisible();

  // Kling 3.0 · 5 s · 1080p = $0.71 (mock)
  await expect(page.getByText("5 seconds · 1080p · 16:9")).toBeVisible();
  await expect(page.getByTestId("estimated-cost")).toHaveText("$0.71");
  await page.getByRole("radio", { name: "10 seconds" }).check();
  await expect(page.getByTestId("estimated-cost")).toHaveText("$1.42");
  await page.getByRole("radio", { name: "5 seconds" }).check();

  // Reference upload (stored in IndexedDB)
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image" }).click();
  await (await chooser).setFiles({ name: "still.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("still.png", { exact: true })).toBeVisible();
  await expect(page.getByAltText("Reference: still.png")).toBeVisible();

  // Invalid file type is rejected with a message
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Replace" }).click();
  await (await chooser2).setFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(page.locator("#video-reference-error")).toContainText("Use a PNG, JPEG or WebP image.");

  // Text-only model conflicts with the reference → validation blocks generation
  await page.getByRole("radio", { name: /MiniMax\ H3/ }).check();
  await expect(page.locator("#video-reference-error")).toContainText("MiniMax H3 is text-to-video only. Remove the reference");
  await promptBox(page, "video").fill("Evening tide rolling in under a setting sun");
  await generate(page);
  await expect(page.getByTestId("job-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Replace" })).toBeFocused();
  await page.getByRole("button", { name: /Remove reference image/ }).click();

  // MiniMax H3 · 5 s · 1080p = $0.46
  await expect(page.getByTestId("estimated-cost")).toHaveText("$0.46");
  await generate(page);
  await expect(page.getByTestId("job-card")).toBeVisible();
  const card = page.getByTestId("result-card").first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toHaveAttribute("data-kind", "video");
  await expect(card).toContainText("MiniMax H3");
  await expect(card).toContainText("5s · 1080p");
  await expect(card).toContainText("$0.46");

  const video = card.locator("video");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).toHaveAttribute("src", /\/mock\/videos\/tide-16x9-5s\.(mp4|webm)$/);
  // Native playback works: play, advance, pause.
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 8_000 }).toBeGreaterThan(0.3);
  expect(await video.evaluate((v: HTMLVideoElement) => Math.round(v.duration))).toBe(5);
  await video.evaluate((v: HTMLVideoElement) => v.pause());
});

test("image-to-video keeps the reference on the result", async ({ page }) => {
  await openCreate(page);
  await page.getByRole("tab", { name: "Video" }).click();
  await promptBox(page, "video").fill("Slow push-in on aurora curtains above a mountain ridge");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image" }).click();
  await (await chooser).setFiles({ name: "first-frame.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("first-frame.png", { exact: true })).toBeVisible();
  await generate(page);
  const card = page.getByTestId("result-card").first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.getByRole("button", { name: "View details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/first-frame\.png/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Reload: draft reference metadata survives and its preview is read back from IndexedDB.
  await page.reload();
  await expect(page.getByAltText("Reference: first-frame.png")).toBeVisible();
});
