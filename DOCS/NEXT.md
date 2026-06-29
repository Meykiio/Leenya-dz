# Next Steps — Leenya

**Target:** Path to first real user / production launch.
**Last updated:** 2026-06-28 (Phase 3d complete)

---

## ✅ Phase 3c — 1-Month Trial & Honest Limits

**Status: DONE.** `trial_ends_at` column, `check_business_limits` (separate booking/queue counters with trial skip), `check_staff_plan_limit` trigger, `get_monthly_business_counts` RPC, SubscriptionTab rewrite with trial countdown and 2 progress bars, landing page Pro CTA → "Coming soon", all i18n keys updated to match exact numbers. Migration applied to live Supabase.

---

## ✅ Phase 3b — Concurrency & Production Readiness

**Status: DONE.** Database indexes, advisory locks, frontend optimistic locking, `.maybeSingle()` fix, analytics pagination. App is now race-condition-safe for concurrent multi-tenant use.

Playwright smoke tests confirm all 6 public pages load correctly. `tsc --noEmit` and `npm run build` pass with zero errors.

---

## P0 — Must Do Before First Real User

### Set VITE_SUPPORT_PHONE in production env

**Why:** FloatingHelp renders but uses fallback placeholder number until real support line is configured.

**What:** Set the `VITE_SUPPORT_PHONE` env variable in deployment (Vercel/Netlify) to the actual support WhatsApp number. No code changes needed.

### Database cleanup — all data wiped

**Status: DONE.** All development/test data cleared from production database. Business ready for fresh real-user onboarding.

### ✅ Doctor audit completed — Phase 2a release blockers fixed

**Status: DONE.** Full 30-specialist audit run against live Supabase. 8 critical/high findings fixed in Phase 2a.

### ✅ i18n / Translation layer completed

**Status: DONE.** react-i18next with 6 namespaces × 3 languages. All ~60+ components use `t()` calls. ~590 keys per locale. Language switcher in navbar.

### ✅ Arabic RTL — all components patched

**Status: DONE (95%).** All 35+ components RTL-patched. All arrow icons flipped. Toast/dialog/sheet/carousel/calendar/navigation-menu fully RTL-aware. ~5% of edge-case padding/margins may still need tuning.

### ✅ Hardcoded French removed from all dashboard components

**Status: DONE.** All dashboard components use `t()` calls. No hardcoded strings remain.

---

## ✅ P1 — Remaining RTL Polish

**Status: DONE.** All ~20 low-severity items fixed (dialog close, toast animations/slides/padding, dashboard sidebar padding, NewBookingSlideOver borders/alignment, breadcrumb separator, calendar/carousel/pagination icons, navigation-menu animations, alert icon position, select checkmark, dialog/sheet footer space-x, testimonials accent bar, how-it-works badge, CTA banner arrow, WhatsApp icon margins, dashboard arrows, and all back/forward arrow icons across 12+ pages). Back-to-top button added to landing page.

---

## ✅ Phase 4 — Launch Prep (2026-06-28)

**Status: DONE.** All pre-launch fixes applied:

### P2 — Security Hardening

#### ✅ Fix blanket per-table grants (H-004)

**Status: DONE.** Replaced `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` with explicit per-table grants. `anon` gets SELECT only on public tables; `authenticated` gets SELECT/INSERT/UPDATE per RLS policy with DELETE only on junction/template tables.

#### ✅ Fix storage bucket public listing (H-010)

**Status: DONE.** (Already fixed in previous session — confirmed no public SELECT policy on `storage.objects` remains.)

#### ✅ Add business_id to 17 query WHERE clauses (ARC-04)

**Status: DONE.** Scanned all 60+ Supabase `.from()` calls across dashboard files. Only 1 missing `business_id` found (`DashboardFeedback.tsx` insert — which is app-level feedback, not business-scoped by design). All other queries properly scoped.

### P3 — High Priority UX

#### ✅ Fix: Upcoming reservations not visible by default

**Status: DONE.** (Already fixed — `DashboardBookings.tsx` defaults to `"upcoming"` filter mode, showing today + future dates ascending.)

#### ✅ Fix: Queue tab should be the default on the public business page

**Status: DONE.** (Already fixed — `BusinessPublic.tsx` defaults to `"queue"` tab.)

#### ✅ Add step indicator UI to AppointmentFlow

**Status: DONE.** Added "Étape X sur Y" text indicator above the dot progress bar. i18n key `booking:appointmentFlow.stepIndicator` added to all 3 locales.

#### ✅ Fix WhatsApp template initialization array format

**Status: DONE.** Changed hardcoded SQL string `'{item1,item2}'` to native JS array, letting Supabase client handle serialization.

### Still Open

#### Fix RLS policies: PERMISSIVE → RESTRICTIVE (H-006)

**Why:** All RLS policies use PERMISSIVE mode — any matching policy grants access.

#### Enable leaked password protection (H-011)

**Why:** HaveIBeenPwned check is disabled. Requires Supabase Pro plan.

#### Verify and fix ResetPassword flow

**Why:** Depends on Supabase email service being configured.

#### Add loading skeletons to slow pages

**Where:** Start with BusinessPublic.tsx, then dashboard pages.

---

## P4 — Monetization & Business

### Integrate payment processing

**Why:** No way to charge for Pro/Business plans. Redesigned pricing modal exists but has no payment method.

**What:**
- Choose payment gateway: BaridiMob (Algeria), Stripe (international)
- Implement checkout flow + webhook handler
- Update plan column on successful payment

### ✅ Implement server-side billing checks

**Status: DONE.** `check_business_limits` trigger enforces per-plan booking/queue caps. `check_staff_plan_limit` enforces staff caps. Both skip during 30-day trial. Monthly counts are tracked correctly via `get_monthly_business_counts` RPC.

---

## P5 — Nice to Have

### Staff availability schedules
### Break / lunch time support
### Queue capacity limits
### PWA / offline support
### Calendar sync (Google Calendar / iCal)
### Email notification templates
### Bullet-proof error boundaries
### Multi-location
### Client accounts with full dashboard
### Bulk SMS campaigns
### Analytics v2

---

## Known Gaps

- No step indicator UI in AppointmentFlow
- Analytics delta display may divide by zero
- WhatsApp variable format may be wrong for some template types
- Avatar upload broken (storage RLS) — dropped until further investigation
