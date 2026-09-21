import { test, expect } from "@playwright/test";

test.describe("Booking Track (Anonymous)", () => {
  test("shows error for invalid token", async ({ page }) => {
    await page.goto("/booking/track/invalid-token-123");
    await expect(page.locator("body")).toContainText(/booking not found/i);
  });

  test("shows 404 for missing token", async ({ page }) => {
    await page.goto("/booking/track/");
    await expect(page.locator("body")).toContainText(/doesn't exist|404/i);
  });
});
