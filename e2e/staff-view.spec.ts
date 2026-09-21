import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://leenya-dz.vercel.app";

test.describe("Staff View (Protected)", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${BASE}/staff`);
    await expect(page).toHaveURL(/\/login/);
  });
});
