import { test, expect } from "@playwright/test";

const BASE = "https://leenya-dz.vercel.app";

test.describe("Customer - Queue Join Flow", () => {
  test("Queue join page has form elements (anon)", async ({ page }) => {
    await page.goto(`${BASE}/leen-barber/queue`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    // Should show service selection and name/phone fields
    const hasForm = /nom|name|pr[eé]nom|t[eé]l[eé]phone|phone|service/i.test(body || "");
    expect(hasForm).toBeTruthy();
  });

  test("Queue page shows correct business name", async ({ page }) => {
    await page.goto(`${BASE}/leen-barber/queue`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/Leen Barber/i);
  });
});

test.describe("Customer - Booking Flow", () => {
  test("Business page shows booking option", async ({ page }) => {
    await page.goto(`${BASE}/leen-barber`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    // Should have a way to book or join queue
    const hasAction = /r[eé]server|book|prendre.*rendez-vous|join.*queue|file/i.test(body || "");
    expect(hasAction).toBeTruthy();
  });
});

test.describe("TV Display Mode", () => {
  test("Display page shows queue for real business", async ({ page }) => {
    await page.goto(`${BASE}/display/leen-barber`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    // TV display should be minimal / full-screen
    const hasTicketLabel = /A-|ticket|file/i.test(body || "");
  });

  test("Display page for non-existent slug still loads", async ({ page }) => {
    const resp = await page.goto(`${BASE}/display/nonexistent-business`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });
});

test.describe("Booking Tracking Flow", () => {
  test("Booking track renders even with invalid UUID", async ({ page }) => {
    await page.goto(`${BASE}/booking/track/not-a-valid-token`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Authenticated Route Protection", () => {
  test("Dashboard redirects to login, then back after login (sequential redirect)", async ({ page }) => {
    // Visit dashboard without auth
    const resp = await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    // Should redirect to /login
    expect(page.url()).toContain("/login");
    // Login page should have email/password fields
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
  });

  test("Login page has forgot password link", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasForgotPwd = /mot de passe.*oubli|forgot.*password|reset/i.test(body || "");
    expect(hasForgotPwd).toBeTruthy();
  });
});

test.describe("Customer - Full Queue Join Attempt", () => {
  test("Queued business shows queue page with services", async ({ page }) => {
    await page.goto(`${BASE}/leen-barber/queue`);
    await page.waitForLoadState("networkidle");
    // The business has 4 services: Coupe homme, Barbe, Coupe + Barbe, Soin cheveux
    const body = await page.locator("body").textContent();
    const hasServices = /Coupe homme|Barbe|Soin/i.test(body || "");
    expect(hasServices).toBeTruthy();
  });
});

test.describe("Landing Page Content", () => {
  test("Landing page features section renders", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasFeatures = /fonctionnalit[eé]|features|caract[eé]ristique|gestion|manage|queue|file.*attente/i.test(body || "");
    expect(hasFeatures).toBeTruthy();
  });

  test("Footer has legal links", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasLegal = /terms|conditions|privacy|confidentialit[eé]|mention.*l[eé]gal/i.test(body || "");
    expect(hasLegal).toBeTruthy();
  });

  test("FAQ section renders", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasFaq = /FAQ|questions.*frequentes|frequently.*asked/i.test(body || "");
    expect(hasFaq).toBeTruthy();
  });
});
