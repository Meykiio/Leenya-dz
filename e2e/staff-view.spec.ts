import { test, expect } from "@playwright/test";

test.describe("Staff View (Protected)", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login/);
  });
});
