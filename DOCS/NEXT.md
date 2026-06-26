# Next Steps — Leenya

**Target:** Path to closed beta / first paying customer.

---

## P0 — Must Do Before First Real User

### Set VITE_SUPPORT_PHONE in production env

**Why:** FloatingHelp renders but uses fallback placeholder number until real support line is configured.

**What:** Set the `VITE_SUPPORT_PHONE` env variable in deployment (Vercel/Netlify) to the actual support WhatsApp number. No code changes needed.

### Seed staff-service assignments for existing businesses

**Why:** Any business created before this session has staff with zero service assignments. Staff step will be skipped silently until owner manually assigns via dashboard.

**What:** Write a one-off SQL script that for each `staff_members` row, inserts into `staff_services` all services from the same business.

---

## P1 — High Priority

### 3. Verify Supabase email confirmation setting

**Why:** Frontend handles both ON and OFF states, but confirmation is still ON in Supabase Dashboard. Owner needs to manually toggle off if they want auto-login.

**What:** Log into Supabase Dashboard → Authentication → Settings → toggle "Confirm email" OFF.

### 4. Add step indicator UI to AppointmentFlow

**Why:** 5-step flow exists but user can't see where they are.

**What:** Add "Etape X sur 5" indicator at top of each step.

### 5. Verify and fix ResetPassword flow

**Why:** The code exists but depends on Supabase email service being configured.

**What:** Trigger a password reset on deployed site and check if email arrives.

### 6. Add loading skeletons to slow pages

**Why:** Multiple pages show spinners instead of skeleton placeholders.

**Where:** Start with BusinessPublic.tsx, then dashboard pages.

### Fix: Upcoming reservations not visible by default

**Why:** The default booking view shows today only. A booking made for tomorrow or next week is invisible until the owner manually filters to that date. Owners will miss reservations.

**What:** Change the default date filter in DashboardBookings.tsx from "today" to "upcoming" (today + future dates), ordered by date ascending. Add a "Aujourd'hui" quick-filter button for when the owner wants to focus on the current day only.

**Acceptance:** When an owner opens the bookings page, they see all upcoming bookings (today and later) sorted by nearest date first. A "Aujourd'hui" button filters to today only.

### Fix: Queue tab should be the default on the public business page

**Why:** The current default tab is "Reservations". For most Algerian service businesses (barbershops, salons), walk-in queue is the primary use case. Clients landing on the page should see the queue immediately.

**What:** In BusinessPublic.tsx, change the default active tab from 'appointment' to 'queue'. Keep the tab bar so owners who prefer appointments can still switch. The `?tab=queue` URL param already works — make queue the default when no param is present.

**Acceptance:** Visiting `/:slug` defaults to the queue tab. Visiting `/:slug?tab=appointment` still opens the appointment tab.

---

## P3 — Monetization & Business

### 9. Integrate payment processing

**Why:** No way to actually charge for Pro/Business plans. Subscription tab in settings shows plan features but has no payment method.

**What:**
- Choose payment gateway: BaridiMob (Algeria), Stripe (international)
- Implement checkout flow
- Implement webhook handler for payment events
- Update plan column on successful payment

### 10. Implement server-side billing checks

**Why:** Current plan enforcement would be client-side only (easily bypassed).

**What:** Add RLS policies or trigger functions that check `businesses.plan` and monthly count before allowing bookings/tickets. Deactivate features server-side based on plan.

### 11. Multilingual / RTL support

**Why:** 10% of `name_ar` columns are populated but the whole site is left-to-right French.
**What:** Add language switcher, `dir="rtl"` support for Arabic, translate UI strings.

---

## P4 — Nice to Have

### 12. Staff availability schedules

Currently staff either accept bookings or they don't. Allow per-day-of-week or per-date availability.

### 13. Break / lunch time support

Business hours are continuous (e.g., 9:00–18:00). No concept of "fermé de 12:00 à 13:30 pour déjeuner".
**What:** Add break time start/end to business_hours or as separate table.

### 14. Queue capacity limits

No limit on how many can join a queue. Busy days could generate 200+ tickets.
**What:** Add max daily capacity field to services or businesses.

### 15. PWA / offline support

Manifest exists but no service worker. Without this, the app can't be "installed" on mobile home screens.

### 16. Calendar sync (Google Calendar / iCal)

Allow owners and staff to sync bookings to personal calendars.

### 17. Email notification templates

WhatsApp is the primary channel but email fallback would help.

### 18. Bullet-proof error boundaries

Add React error boundaries around each major page/section.

---

## P5 — Long-term / Vision

### 19. Multi-location

One owner, multiple branches, each with own staff/services/queue.

### 20. Client accounts with full dashboard

Logged-in clients can see booking history across all businesses they've visited, leave reviews, manage preferences.

### 21. Bulk SMS campaigns

Owner can message all clients who've booked in the last N months with promotions.

### 22. Analytics v2

Year-over-year comparisons, conversion funnel (page views → bookings), staff performance metrics.

---

## Known Gaps (Pre-Existing)

- No step indicator UI in AppointmentFlow (P2)
- Analytics delta display may divide by zero (edge case)
- WhatsApp variable format may be wrong for some template types
