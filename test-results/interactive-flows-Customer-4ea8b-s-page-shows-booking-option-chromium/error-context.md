# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interactive-flows.spec.ts >> Customer - Booking Flow >> Business page shows booking option
- Location: e2e\interactive-flows.spec.ts:23:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e7]:
      - img "Leen Barber" [ref=e9]
      - heading "Leen Barber" [level=1] [ref=e10]
      - paragraph [ref=e11]:
        - img [ref=e12]
        - text: Barbershop · Alger
      - paragraph [ref=e15]:
        - img [ref=e16]
        - text: "0783007142"
      - generic [ref=e18]:
        - generic [ref=e21]: Closed
        - link "Take me there" [ref=e22] [cursor=pointer]:
          - /url: https://www.google.com/maps/dir/?api=1&destination=Printazix%2C%20lot%20115%20Rte%20Dr%C3%A2a%2C%20Beni%20Messous%2016044%2C%20Alger
          - img [ref=e23]
          - text: Take me there
    - generic [ref=e26]:
      - button "Queue" [ref=e27] [cursor=pointer]
      - button "Appointment" [ref=e28] [cursor=pointer]
    - generic [ref=e30]: Choose a service, take a ticket, and wait for your turn live.
    - generic [ref=e31]:
      - generic [ref=e32]:
        - heading "Live queue" [level=3] [ref=e35]
        - generic [ref=e36]:
          - generic [ref=e37]:
            - img [ref=e38]
            - text: 0 waiting
          - generic [ref=e43]:
            - img [ref=e44]
            - text: ~0 min
        - paragraph [ref=e47]: "* Estimate based on history — actual time may vary"
      - generic [ref=e48]:
        - heading "Choose a service" [level=2] [ref=e49]
        - generic [ref=e50]:
          - button "Coupe homme 30 min · 500 DZD" [ref=e51] [cursor=pointer]:
            - generic [ref=e52]:
              - paragraph [ref=e53]: Coupe homme
              - paragraph [ref=e54]: 30 min · 500 DZD
            - img [ref=e55]
          - button "Barbe 20 min · 300 DZD" [ref=e57] [cursor=pointer]:
            - generic [ref=e58]:
              - paragraph [ref=e59]: Barbe
              - paragraph [ref=e60]: 20 min · 300 DZD
            - img [ref=e61]
          - button "Coupe + Barbe 45 min · 700 DZD" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]:
              - paragraph [ref=e65]: Coupe + Barbe
              - paragraph [ref=e66]: 45 min · 700 DZD
            - img [ref=e67]
          - button "Soin cheveux 30 min · 600 DZD" [ref=e69] [cursor=pointer]:
            - generic [ref=e70]:
              - paragraph [ref=e71]: Soin cheveux
              - paragraph [ref=e72]: 30 min · 600 DZD
            - img [ref=e73]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const BASE = "https://leenya-dz.vercel.app";
  4   | 
  5   | test.describe("Customer - Queue Join Flow", () => {
  6   |   test("Queue join page has form elements (anon)", async ({ page }) => {
  7   |     await page.goto(`${BASE}/leen-barber/queue`);
  8   |     await page.waitForLoadState("networkidle");
  9   |     const body = await page.locator("body").textContent();
  10  |     // Should show service selection and name/phone fields
  11  |     const hasForm = /nom|name|pr[eé]nom|t[eé]l[eé]phone|phone|service/i.test(body || "");
  12  |     expect(hasForm).toBeTruthy();
  13  |   });
  14  | 
  15  |   test("Queue page shows correct business name", async ({ page }) => {
  16  |     await page.goto(`${BASE}/leen-barber/queue`);
  17  |     await page.waitForLoadState("networkidle");
  18  |     await expect(page.locator("body")).toContainText(/Leen Barber/i);
  19  |   });
  20  | });
  21  | 
  22  | test.describe("Customer - Booking Flow", () => {
  23  |   test("Business page shows booking option", async ({ page }) => {
  24  |     await page.goto(`${BASE}/leen-barber`);
  25  |     await page.waitForLoadState("networkidle");
  26  |     const body = await page.locator("body").textContent();
  27  |     // Should have a way to book or join queue
  28  |     const hasAction = /r[eé]server|book|prendre.*rendez-vous|join.*queue|file/i.test(body || "");
> 29  |     expect(hasAction).toBeTruthy();
      |                       ^ Error: expect(received).toBeTruthy()
  30  |   });
  31  | });
  32  | 
  33  | test.describe("TV Display Mode", () => {
  34  |   test("Display page shows queue for real business", async ({ page }) => {
  35  |     await page.goto(`${BASE}/display/leen-barber`);
  36  |     await page.waitForLoadState("networkidle");
  37  |     const body = await page.locator("body").textContent();
  38  |     expect(body).toBeTruthy();
  39  |     // TV display should be minimal / full-screen
  40  |     const hasTicketLabel = /A-|ticket|file/i.test(body || "");
  41  |   });
  42  | 
  43  |   test("Display page for non-existent slug still loads", async ({ page }) => {
  44  |     const resp = await page.goto(`${BASE}/display/nonexistent-business`);
  45  |     await page.waitForLoadState("networkidle");
  46  |     expect(resp?.status()).toBe(200);
  47  |   });
  48  | });
  49  | 
  50  | test.describe("Booking Tracking Flow", () => {
  51  |   test("Booking track renders even with invalid UUID", async ({ page }) => {
  52  |     await page.goto(`${BASE}/booking/track/not-a-valid-token`);
  53  |     await page.waitForLoadState("networkidle");
  54  |     await expect(page.locator("body")).toBeVisible();
  55  |   });
  56  | });
  57  | 
  58  | test.describe("Authenticated Route Protection", () => {
  59  |   test("Dashboard redirects to login, then back after login (sequential redirect)", async ({ page }) => {
  60  |     // Visit dashboard without auth
  61  |     const resp = await page.goto(`${BASE}/dashboard`);
  62  |     await page.waitForLoadState("networkidle");
  63  |     // Should redirect to /login
  64  |     expect(page.url()).toContain("/login");
  65  |     // Login page should have email/password fields
  66  |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  67  |     await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
  68  |   });
  69  | 
  70  |   test("Login page has forgot password link", async ({ page }) => {
  71  |     await page.goto(`${BASE}/login`);
  72  |     await page.waitForLoadState("networkidle");
  73  |     const body = await page.locator("body").textContent();
  74  |     const hasForgotPwd = /mot de passe.*oubli|forgot.*password|reset/i.test(body || "");
  75  |     expect(hasForgotPwd).toBeTruthy();
  76  |   });
  77  | });
  78  | 
  79  | test.describe("Customer - Full Queue Join Attempt", () => {
  80  |   test("Queued business shows queue page with services", async ({ page }) => {
  81  |     await page.goto(`${BASE}/leen-barber/queue`);
  82  |     await page.waitForLoadState("networkidle");
  83  |     // The business has 4 services: Coupe homme, Barbe, Coupe + Barbe, Soin cheveux
  84  |     const body = await page.locator("body").textContent();
  85  |     const hasServices = /Coupe homme|Barbe|Soin/i.test(body || "");
  86  |     expect(hasServices).toBeTruthy();
  87  |   });
  88  | });
  89  | 
  90  | test.describe("Landing Page Content", () => {
  91  |   test("Landing page features section renders", async ({ page }) => {
  92  |     await page.goto(BASE);
  93  |     await page.waitForLoadState("networkidle");
  94  |     const body = await page.locator("body").textContent();
  95  |     const hasFeatures = /fonctionnalit[eé]|features|caract[eé]ristique|gestion|manage|queue|file.*attente/i.test(body || "");
  96  |     expect(hasFeatures).toBeTruthy();
  97  |   });
  98  | 
  99  |   test("Footer has legal links", async ({ page }) => {
  100 |     await page.goto(BASE);
  101 |     await page.waitForLoadState("networkidle");
  102 |     const body = await page.locator("body").textContent();
  103 |     const hasLegal = /terms|conditions|privacy|confidentialit[eé]|mention.*l[eé]gal/i.test(body || "");
  104 |     expect(hasLegal).toBeTruthy();
  105 |   });
  106 | 
  107 |   test("FAQ section renders", async ({ page }) => {
  108 |     await page.goto(BASE);
  109 |     await page.waitForLoadState("networkidle");
  110 |     const body = await page.locator("body").textContent();
  111 |     const hasFaq = /FAQ|questions.*frequentes|frequently.*asked/i.test(body || "");
  112 |     expect(hasFaq).toBeTruthy();
  113 |   });
  114 | });
  115 | 
```