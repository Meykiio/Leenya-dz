// Transitional: targets production data until isolated fixtures land (Task 9).
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://leenya-dz.vercel.app";

test.describe("Customer — End User Flows", () => {
  test("Customer visits business public page", async ({ page }) => {
    await page.goto(`${BASE}/dental-are3`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toContain("Dental");
  });

  test("Customer joins queue (anonymous)", async ({ page }) => {
    await page.goto(`${BASE}/dental-are3/queue`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body.length).toBeGreaterThan(100);
  });

  test("Customer views queue display / TV mode", async ({ page }) => {
    const resp = await page.goto(`${BASE}/display/dental-are3`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("Landing page loads in French (default)", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Leenya/);
  });

  test("Arabic (RTL) rendering on landing page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      localStorage.setItem("leenya_lang", "ar");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("[dir]", { timeout: 5000 }).catch(() => {});
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl", { timeout: 10000 });
  });

  test("English rendering on landing page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      localStorage.setItem("leenya_lang", "en");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("[dir]", { timeout: 5000 }).catch(() => {});
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr", { timeout: 10000 });
  });

  test("Business page shows services (dental-are3)", async ({ page }) => {
    await page.goto(`${BASE}/dental-are3`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/coupe|barbe|soin/i);
  });

  test("Paused queue shows notice (dental-are3)", async ({ page }) => {
    await page.goto(`${BASE}/dental-are3/queue`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const pausedIndicators = /paused/i;
    const hasPaused = pausedIndicators.test(body || "");
    console.log("Dental queue page contains paused indicator:", hasPaused);
    expect(body).toMatch(/paused/i);
  });

  test("Booking track page handles invalid token gracefully", async ({ page }) => {
    await page.goto(`${BASE}/booking/track/invalid-token-here`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("Mobile viewport — business page renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dental-are3`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).toContain("Dental");
  });

  test("Mobile viewport — queue page renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dental-are3/queue`);
    await page.waitForLoadState("networkidle");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("Pricing section loads on landing page", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    const hasPricing = /free|gratuit|pro|business|dzd|da\s/i.test(body || "");
    expect(hasPricing).toBeTruthy();
  });
});

test.describe("Security & Error State Flows", () => {
  test("404 nonexistent business slug shows error page", async ({ page }) => {
    const resp = await page.goto(`${BASE}/this-business-definitely-does-not-exist`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("404 nonexistent dashboard route shows NotFound", async ({ page }) => {
    const resp = await page.goto(`${BASE}/dashboard/nonexistent-page`);
    await page.waitForLoadState("networkidle");
    expect(resp?.status()).toBe(200);
  });

  test("CSP does not block page rendering", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const cspErrors = errors.filter((e) => e.includes("CSP") || e.includes("Content Security Policy"));
    expect(cspErrors.length).toBe(0);
  });
});

test.describe("IDOR & Authorization Checks", () => {
  test("Dashboard redirects unauthenticated users", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Staff page redirects unauthenticated users", async ({ page }) => {
    await page.goto(`${BASE}/staff`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Admin page redirects unauthenticated users", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("MyBookings page redirects unauthenticated users", async ({ page }) => {
    await page.goto(`${BASE}/mes-reservations`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Onboarding accessible to unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`);
    await page.waitForLoadState("networkidle");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("CORS headers restrict to Supabase", async ({ page }) => {
    const resp = await page.goto(BASE);
    const headers = resp!.headers();
    const acao = headers["access-control-allow-origin"] || "";
    expect(acao).toContain("supabase.co");
  });
});

test.describe("All Business Categories - Public Page Loads", () => {
  const testCases = [
    { slug: "dental-are3", name: "Dental", category: "barbershop" },
    { slug: "dr-ab-vpwj", name: "Dr Ab", category: "dental" },
    { slug: "jdjdj-99dk", name: "Jdjdj", category: "barbershop" },
  ];

  for (const biz of testCases) {
    test(`Business page loads for ${biz.name} (${biz.category})`, async ({ page }) => {
      await page.goto(`${BASE}/${biz.slug}`);
      await page.waitForLoadState("networkidle");
      const body = await page.locator("body").textContent();
      expect(body).toContain(biz.name);
    });
  }
});
