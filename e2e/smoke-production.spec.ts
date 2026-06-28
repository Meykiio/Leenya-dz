import { test, expect } from "@playwright/test";

const BASE = "https://leenya-dz.vercel.app";

test.describe("Production smoke test", () => {
  test("Landing page loads", async ({ page }) => {
    const resp = await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle(/Leenya/);
  });

  test("Login page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Terms page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/terms`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Privacy page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/privacy`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Display page loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/display/test`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Security headers present", async ({ page }) => {
    const resp = await page.goto(BASE);
    const headers = resp!.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toBeDefined();
  });

  test("404 handled by SPA", async ({ page }) => {
    const resp = await page.goto(`${BASE}/nonexistent-route`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Signup CTA visible on login page", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasSignup = /creer|inscrire|inscription|create.*account|s'enregistrer|gratuit|free.*account/i.test(body || "");
    expect(hasSignup).toBeTruthy();
  });

  test("Login form has email and password fields", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });
});
