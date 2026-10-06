import { expect, test } from "@playwright/test";
import { generate, historyLength, openCreate, promptBox, useFastMock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useFastMock(page);
});

test("[fail] token fails deterministically and never lands in history", async ({ page }) => {
  await openCreate(page);
  const before = await historyLength(page);
  await promptBox(page).fill("Moonlit sea at night [fail]");
  await generate(page);
  const job = page.getByTestId("job-card");
  await expect(job).toHaveAttribute("data-status", "failed", { timeout: 15_000 });
  await expect(job).toContainText("The model provider returned an error (simulated).");
  await expect(job).toContainText("nothing was added to history");
  await expect(page.getByTestId("result-card")).toHaveCount(0);
  expect(await historyLength(page)).toBe(before);

  // Retrying the same prompt fails again — the trigger is deterministic.
  await job.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("job-card")).toHaveAttribute("data-status", "failed", { timeout: 15_000 });
  expect(await historyLength(page)).toBe(before);

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByTestId("job-card")).toHaveCount(0);
});

test("'fail next run' fails once, then Retry succeeds", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: /Fail next run/ }).check();
  await page.getByRole("link", { name: "Create" }).first().click();
  await promptBox(page).fill("Terracotta arches over a calm sea");
  const before = await historyLength(page);
  await generate(page);
  const job = page.getByTestId("job-card");
  await expect(job).toHaveAttribute("data-status", "failed", { timeout: 15_000 });
  await expect(page.getByTestId("announcer-assertive")).toContainText("Generation failed");
  await job.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("result-card")).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByTestId("job-card")).toHaveCount(0);
  expect(await historyLength(page)).toBe(before + 2);
});

test("content-policy failure offers 'Edit prompt' instead of retry", async ({ page }) => {
  await openCreate(page);
  await promptBox(page).fill("Something blocked [fail:policy]");
  await generate(page);
  const job = page.getByTestId("job-card");
  await expect(job).toHaveAttribute("data-status", "failed", { timeout: 15_000 });
  await expect(job.getByRole("button", { name: "Retry" })).toHaveCount(0);
  await promptBox(page).fill("something else entirely");
  await job.getByRole("button", { name: "Edit prompt" }).click();
  await expect(promptBox(page)).toHaveValue("Something blocked [fail:policy]");
  await expect(promptBox(page)).toBeFocused();
});

test("cancel stops a running job and nothing is saved", async ({ page }) => {
  await page.addInitScript(() => {
    // Realistic timing so there is time to cancel.
    if (!sessionStorage.getItem("__slow")) {
      sessionStorage.setItem("__slow", "1");
      localStorage.setItem("studio:v1:settings", JSON.stringify({ mockSpeed: "realistic" }));
    }
  });
  await openCreate(page);
  const before = await historyLength(page);
  await promptBox(page).fill("Alpine ridgelines in morning fog");
  await generate(page);
  const job = page.getByTestId("job-card");
  await expect(job).toHaveAttribute("data-status", "running", { timeout: 5_000 });
  await job.getByRole("button", { name: /Cancel generation/ }).click();
  await expect(job).toHaveAttribute("data-status", "canceled");
  await expect(job).toContainText("Nothing was added to history");
  await expect(page.getByTestId("announcer")).toContainText("Generation canceled");
  await page.waitForTimeout(6_000);
  await expect(page.getByTestId("result-card")).toHaveCount(0);
  expect(await historyLength(page)).toBe(before);
});

test("progress is never announced to assistive tech, only status changes", async ({ page }) => {
  await openCreate(page);
  await page.evaluate(() => {
    (window as unknown as { __announced: string[] }).__announced = [];
    const el = document.querySelector('[data-testid="announcer"]')!;
    new MutationObserver(() => {
      if (el.textContent) (window as unknown as { __announced: string[] }).__announced.push(el.textContent);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await promptBox(page).fill("Petal bloom pattern");
  await generate(page);
  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 15_000 });
  const announced = await page.evaluate(() => (window as unknown as { __announced: string[] }).__announced);
  expect(announced.some((a) => a.startsWith("Queued"))).toBe(true);
  expect(announced.some((a) => a.startsWith("Generating"))).toBe(true);
  expect(announced.some((a) => a.startsWith("Generation complete"))).toBe(true);
  expect(announced.every((a) => !/%/.test(a))).toBe(true);
  expect(announced.length).toBeLessThanOrEqual(4);
});
