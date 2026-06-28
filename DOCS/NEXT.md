# Next Steps — Leenya

**Target:** Path to closed beta / first paying customer.

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

### Seed staff-service assignments for existing businesses

**Why:** Any business created before this session has staff with zero service assignments. Staff step will be skipped silently until owner manually assigns via dashboard.

**What:** Write a one-off SQL script that for each `staff_members` row, inserts into `staff_services` all services from the same business.

### ✅ Doctor audit completed — Phase 2a release blockers fixed

**Status: DONE.** Full 30-specialist audit run against live Supabase. 8 critical/high findings fixed in Phase 2a.

### ✅ i18n / Translation layer completed

**Status: DONE.** react-i18next with 6 namespaces × 3 languages. All ~60+ components use `t()` calls. Language switcher in navbar.

### ✅ Arabic RTL — critical components patched

**Status: DONE.** 15+ UI components patched (dialog, switch, sheet, toast, carousel, calendar, dropdown, context-menu, sidebar, floating help, hero, pricing, filters). ~20 low-severity items remain.

### ✅ Hardcoded French removed from all dashboard components

**Status: DONE.** 9 components fixed (AddToQueueDialog, NewBookingSlideOver, AddStaffForm, StaffRow, ServiceAssignmentDialog, TemplatePreview/Edit dialogs, QueueWaitingList, AccountTab, DashboardLayout).

---

## ✅ P1 — Remaining RTL Polish

**Status: DONE.** All ~20 low-severity items fixed (dialog close, toast animations/slides/padding, dashboard sidebar padding, NewBookingSlideOver borders/alignment, breadcrumb separator, calendar/carousel/pagination icons, navigation-menu animations, alert icon position, select checkmark, dialog/sheet footer space-x, testimonials accent bar, how-it-works badge, CTA banner arrow, WhatsApp icon margins, dashboard arrows, and all back/forward arrow icons across 12+ pages). Back-to-top button added to landing page.

---

## P2 — Security Hardening

### Fix RLS policies: PERMISSIVE → RESTRICTIVE (H-006)

**Why:** All RLS policies use PERMISSIVE mode — any matching policy grants access. RESTRICTIVE requires all matching policies to grant.

**What:** Add `AS RESTRICTIVE` to all CREATE POLICY statements in MASTER_SCHEMA.sql.

### Fix blanket per-table grants (H-004)

**Why:** `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` exposes any un-RLS'd table.

**What:** Replace with explicit per-table grants.

### Fix storage bucket public listing (H-010)

**Why:** `business-assets` bucket allows anyone to list all files.

**What:** Remove the public SELECT policy on `storage.objects`.

### Enable leaked password protection (H-011)

**Why:** HaveIBeenPwned check is disabled.

**What:** Toggle on in Supabase Dashboard → Authentication → Settings.

### Add business_id to 17 query WHERE clauses (ARC-04)

**Why:** 17 queries don't filter by `business_id`, risking cross-tenant data leaks.

**What:** Audit and fix each query.

---

## P3 — High Priority UX

### Verify Supabase email confirmation setting

**What:** Log into Supabase Dashboard → Authentication → Settings → toggle "Confirm email" OFF.

### Add step indicator UI to AppointmentFlow

**What:** Add "Etape X sur 5" indicator at top of each step.

### Verify and fix ResetPassword flow

**Why:** Depends on Supabase email service being configured.

### Add loading skeletons to slow pages

**Where:** Start with BusinessPublic.tsx, then dashboard pages.

### Fix: Upcoming reservations not visible by default

**What:** Change default date filter from "today" to "upcoming" (today + future dates), ascending.

### Fix: Queue tab should be the default on the public business page

**What:** Change default active tab from 'appointment' to 'queue'.

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
