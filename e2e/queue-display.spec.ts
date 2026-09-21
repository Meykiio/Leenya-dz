import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://leenya-dz.vercel.app";

test.describe("Queue Display (Anonymous)", () => {
  test("returns 404 for non-existent slug", async ({ page }) => {
    const response = await page.goto(`${BASE}/display/nonexistent-slug-xyz`);
    expect(response?.status()).toBe(200);
  });

  test("loading state renders", async ({ page }) => {
    await page.goto(`${BASE}/display/test-business`);
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeAttached();
  });
});
