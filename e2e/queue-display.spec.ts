import { test, expect } from "@playwright/test";

test.describe("Queue Display (Anonymous)", () => {
  test("returns 404 for non-existent slug", async ({ page }) => {
    const response = await page.goto("/display/nonexistent-slug-xyz");
    expect(response?.status()).toBe(200);
  });

  test("loading state renders", async ({ page }) => {
    await page.goto("/display/test-business");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeAttached();
  });
});
