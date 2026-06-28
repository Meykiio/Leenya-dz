# Leenya — AI Context File

Last updated: 2026-06-28

## Project in One Paragraph

Leenya is a queue and appointment management SaaS for Algerian service businesses (barbershops, salons, clinics, dental offices, physiotherapy, veterinary). Built with React 18 + TypeScript + Vite on the frontend and Supabase (PostgreSQL, Auth, Realtime, Storage) on the backend. UI is French-language only, prices in DZD, covers all 58 wilayas. Styled with Tailwind CSS + shadcn/ui, fonts are Sora / JetBrains Mono / IBM Plex Sans Arabic. Currently pre-revenue — subscription plans are displayed but no payment processing exists.

---

## Critical Rules (read before touching anything)

1. **Never change database table or column names** without updating ALL queries, types, and RLS policies that reference them
2. **All Supabase queries must have error handling** — check `.error` on every response
3. **All real-time subscriptions must be cleaned up on unmount** — call `supabase.removeChannel(channel)` in the cleanup function
4. **RLS is enabled on all tables** — test permissions after any schema change. ⚠️ Policies currently use `PERMISSIVE` (default) — switching to `RESTRICTIVE` is a Phase 2b item. Critical public data paths (queue, booking) use RPCs instead of direct table queries.
5. **Design system colors are in CSS variables** — never use raw hex/rgb in components. Use semantic tokens from `src/index.css` and `tailwind.config.ts`. All shadcn tokens are HSL
6. **Font classes**: `font-sans` → Sora, `font-mono` → JetBrains Mono, `font-arabic` → IBM Plex Sans Arabic
7. **Never edit these auto-generated files**: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml`
8. **Import the Supabase client from** `@/integrations/supabase/client` — never create a new client
9. **Roles are in `user_roles` table** — never store roles on profiles or in localStorage
10. **No DELETE on bookings, queue_tickets, profiles, reviews, user_roles** — only status changes (cancel, no-show)
11. **RLS policies are PERMISSIVE (default)** — switching to RESTRICTIVE is Phase 2b. Public data access (queue, booking) uses RPCs, not direct tables. See `doctor/plans/MASTER_REMEDIATION_PLAN.md`

---

## File Map (where to find things)

| Concern | File(s) |
|---------|---------|
| Booking flow (appointment) | `src/components/booking/AppointmentFlow.tsx` |
| Queue flow (walk-in) | `src/components/booking/QueueFlow.tsx` |
| Ticket tracker (client view) | `src/components/booking/TicketTracker.tsx` |
| Business public page | `src/pages/BusinessPublic.tsx` |
| WhatsApp message templates | `src/lib/whatsapp/`, `src/hooks/useWhatsAppTemplates.ts` |
| Time slot generation | `src/lib/timeSlots.ts` |
| Slug generation | `src/lib/slugify.ts` |
| Service suggestions by category | `src/lib/serviceSuggestions.ts` |
| Wilaya list (58 wilayas) | `src/lib/wilayas.ts` |
| Routing (all routes) | `src/App.tsx` |
| i18n / translations | `src/i18n/index.ts` (6 namespaces × 3 languages, ~590 keys) |
| RTL utility classes | Tailwind config `rtl:` variant, `ms-*`/`me-*` spacing |
| Language switcher hook | `src/hooks/useLanguage.ts` |
| Dashboard sidebar + layout | `src/components/dashboard/DashboardLayout.tsx` |
| Auth context + role lookup | `src/contexts/AuthContext.tsx` |
| Protected route guard | `src/components/auth/ProtectedRoute.tsx` |
| Login form (email only) | `src/components/auth/LoginForm.tsx` |
| Onboarding wizard | `src/components/onboarding/OnboardingWizard.tsx` |
| Dashboard home | `src/pages/dashboard/Dashboard.tsx` |
| Dashboard bookings management | `src/pages/dashboard/DashboardBookings.tsx` |
| Dashboard queue management | `src/pages/dashboard/DashboardQueue.tsx` |
| Dashboard services CRUD | `src/pages/dashboard/DashboardServices.tsx` |
| Dashboard staff CRUD | `src/pages/dashboard/DashboardStaff.tsx` |
| Dashboard settings (all tabs) | `src/pages/dashboard/DashboardSettings.tsx` |
| Dashboard feedback | `src/pages/dashboard/DashboardFeedback.tsx` |
| Dashboard analytics | `src/pages/dashboard/DashboardAnalytics.tsx` |
| WhatsApp template mgmt | `src/pages/dashboard/SettingsWhatsApp.tsx` |
| Staff view (tabbed: queue + bookings) | `src/pages/StaffView.tsx` |
| TV queue display | `src/pages/QueueDisplay.tsx` |
| Booking tracker (by token) | `src/pages/BookingTrack.tsx` |
| Client bookings history | `src/pages/MyBookings.tsx` |
| Public queue page | `src/pages/QueuePublic.tsx` |
| Landing page | `src/pages/Landing.tsx` |
| Legal pages (TOS + Privacy) | `src/pages/TermsOfService.tsx`, `src/pages/PrivacyPolicy.tsx` |
| Error boundary | `src/components/ErrorBoundary.tsx` |
| Floating help button | `src/components/FloatingHelp.tsx` |
| Design tokens (CSS variables) | `src/index.css` |
| Tailwind config (theme) | `tailwind.config.ts` |
| Database schema (authoritative) | `supabase/schema/MASTER_SCHEMA.sql` |
| Unit tests | `src/test/` (vi test + jsdom) |
| E2E tests | `e2e/` (Playwright) |
| CI/CD | `.github/workflows/ci.yml` + `e2e.yml` |
| Monitoring | `src/lib/sentry.ts` (Sentry, guarded by `VITE_SENTRY_DSN`) |

---

## Database Quick Reference

**Tables** (10): `businesses`, `services`, `staff_members`, `business_hours`, `bookings`, `queue_tickets`, `queue_counters`, `profiles`, `user_roles`, `reviews`

**View**: `booking_availability` — simplified non-cancelled bookings for availability checks

**Key relationships:**
```
businesses.owner_id → profiles.id
services.business_id → businesses.id
staff_members.business_id → businesses.id
staff_members.profile_id → profiles.id (nullable)
bookings.business_id → businesses.id
bookings.service_id → services.id
bookings.staff_member_id → staff_members.id (nullable)
bookings.client_id → profiles.id (nullable, NULL = anonymous)
queue_tickets.business_id → businesses.id
queue_tickets.service_id → services.id (nullable)
queue_tickets.client_id → profiles.id (nullable)
business_hours.business_id → businesses.id
queue_counters.business_id → businesses.id
reviews.business_id → businesses.id
reviews.client_id → profiles.id
reviews.booking_id → bookings.id (nullable)
user_roles.user_id → auth.users.id
```

**Key functions:**
- `generate_ticket_number(p_business_id)` → returns `{ticket_num, ticket_lbl}` — atomic daily counter
- `has_role(_user_id, _role)` → boolean — SECURITY DEFINER, bypasses RLS
- `get_user_role(_user_id)` → app_role enum
- `get_queue_ticket(p_ticket_id)` → one queue ticket (no PII) — public RPC
- `get_business_queue(p_business_id, p_statuses)` → active queue tickets — public RPC
- `get_completed_ticket_stats(p_business_id)` → stats — public RPC
- `get_queue_context(p_business_id, p_ticket_id)` → queue position — public RPC
- `get_booking_by_token(p_token)` → one booking — public RPC
- `cancel_booking_by_token(p_token)` → cancel booking — public RPC

**Key triggers:**
- `check_booking_overlap` — on bookings INSERT/UPDATE, prevents double-booking with advisory locks
- `check_insert_rate_limit` — on bookings AND queue_tickets INSERT, max 10 per phone per 10 min
- `check_business_hours_trigger` — on bookings INSERT, validates booking within operating hours
- `check_queue_ticket_state_transition_trigger` — enforces queue_ticket state machine
- `check_booking_state_transition_trigger` — enforces booking state machine
- `check_past_booking_trigger` — prevents past-dated bookings

**Enums:**
- `app_role`: owner, staff, client
- `booking_status`: pending, confirmed, arrived, in_service, completed, cancelled, no_show
- `queue_status`: waiting, called, in_service, completed, cancelled, no_show
- `business_category`: beauty_salon, barbershop, clinic, dental, physiotherapy, veterinary, other

---

## Design System Quick Reference

**Fonts:**
- Primary: Sora (`font-sans`)
- Monospace: JetBrains Mono (`font-mono`)
- Arabic: IBM Plex Sans Arabic (`font-arabic`)

**Custom color tokens** (use via `var(--token-name)`):
| Token | Light | Dark |
|-------|-------|------|
| `--bg-base` | #FFFFFF | #0C0C0A |
| `--bg-subtle` | #F9F9F8 | #161614 |
| `--bg-muted` | #F3F3F2 | #1E1E1C |
| `--text-primary` | #0C0C0A | #F5F5F3 |
| `--text-secondary` | #4A4A45 | #A8A8A2 |
| `--text-tertiary` | #9A9A92 | #6A6A64 |
| `--accent` | #1A56DB | (same) |
| `--accent-hover` | #1447C0 | (same) |
| `--accent-light` | #EBF2FF | (same) |
| `--border-default` | #E5E5E2 | #2A2A27 |
| `--border-strong` | #CBCBC5 | #3A3A36 |
| `--success` | #187A4A | `--error` #C42B1C | `--warning` #B45309 | `--info` #0369A1 |

**shadcn/ui HSL tokens** (use via `hsl(var(--token))`):
- `--primary`: 221 79% 47% (blue)
- `--destructive`: 5 73% 44% (red)
- `--muted`: 60 3% 96%
- `--border`: 60 3% 90%

**Status badge classes** (defined in index.css):
`badge-waiting`, `badge-confirmed`, `badge-in-service`, `badge-completed`, `badge-cancelled`, `badge-no-show`

**Shadows**: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg` (defined as CSS vars)

**Border radii**: `--radius-xs` (3px), `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px)

---

## Current Known Issues

### Product Gaps
1. No automated SMS/WhatsApp notifications — only manual wa.me URL links
2. No payment processing — subscription plans enforced server-side but no payment gateway
3. No staff-specific schedules — all staff share business hours
4. No break time / lunch hour support in business hours
5. French is default — Arabic RTL is 95% done but not user-selectable as primary UI
6. No hard DELETE on bookings or tickets — only status changes
7. No queue capacity limits
8. Single location per owner only
9. No offline/PWA support

### Security Gaps (Phase 2b)
1. RLS policies are `PERMISSIVE` — need `AS RESTRICTIVE` (H-006)
2. Blanket `GRANT ALL ON ALL TABLES` — need per-table grants (H-004)
3. Storage bucket `business-assets` allows public listing (H-010)
4. Leaked password protection disabled in Supabase Auth (H-011)
5. No Content Security Policy (H-002/M-02)
6. Error messages leak schema details (SEC-01)
7. 17 queries missing `business_id` scope (ARC-04)
8. 38 lint errors (all `no-explicit-any`) (H-002)
9. `.env` in git history not purged (C-004)
10. `@tanstack/react-query` imported but unused (+13 kB dead bundle)

---

## What Was Recently Changed (Last 3 Sessions)

### Session 3 (2026-06-27, current)
- **Full Doctor audit completed:** All 30 specialist reviews + Red Team runtime tests against live Supabase
- **Phase 2a remediation applied (release blockers):**
  - C-001: queue_tickets anon SELECT revoked → `get_queue_ticket`/`get_business_queue` RPCs (no PII)
  - C-002: bookings anon SELECT/UPDATE revoked → `get_booking_by_token`/`cancel_booking_by_token` RPCs
  - C-003: queue_tickets anon UPDATE policy dropped
  - H-001: user_roles self-insert policy dropped
  - H-005: `check_business_hours_trigger` added (BEFORE INSERT on bookings)
  - H-007: `check_queue_ticket_state_transition_trigger` + `check_booking_state_transition_trigger` + `check_past_booking_trigger` added
  - H-008: bookings anon UPDATE revoked → `cancel_booking_by_token` RPC requires token
  - H-009: EXECUTE revoked from anon on all SECURITY DEFINER functions except 7 public RPCs
  - C-005: vitest updated (critical CVE)
  - H-003: `npm audit fix` reduced 19→2 vulns
  - Fixed missing `buildQueueCalledUrl` import in DashboardQueue.tsx
- **Client code updated:** QueueDisplay, TicketTracker, BookingTrack use RPCs instead of direct table queries
- **Runtime retest:** 3/3 direct table queries blocked for anon. RPCs functional. No PII exposed.
- **Final score:** 3.1/10 — DO NOT SHIP (improved from 3.4 after fixes, ratings held pending full Phase 2b)

### Phase 3d — Final Pricing Limits & Polish (2026-06-28)
- **Final pricing limits (Algerian market):** Free(100/300/3), Pro(500/1000/7), Business(2000/2000/unlimited). Migration applied live.
- **Legal pages:** TermsOfService + PrivacyPolicy (Algerian Law 18-07), routes before `/:slug` catch-all
- **Footer:** Instagram removed, email → sifeddine.meb96@gmail.com
- **Missing i18n keys:** subscription upgrade, WhatsApp init, 404 (20 keys), common buttons fixed — ~590 keys per locale now
- **Navbar:** "Reviews" → "Approach"
- **RTL polish:** ~20 items across 18 files. All 35+ components now RTL-patched (dialog, toast, dashboard, breadcrumb, carousel, calendar, pagination, navigation-menu, alert, select, testimonials, how-it-works, CTA, WhatsApp, all arrow icons)
- **Back-to-top button:** new component, appears after 400px scroll
- **Demo components:** accent color fix, i18n (20 new keys), equal min-height
- **Testimonials:** 3 new messages across EN/FR/AR
- **HowItWorks step circles:** opacity fix
- **SubscriptionTab:** Fixed RPC array bug (showed /100 instead of 0/100). Real-time subscriptions for booking+queue counts. Staff limit frontend enforcement with i18n
- **Table layout fix:** BookingRow columns consistent width
- **bg-[var(--accent)] → bg-accent:** Fixed invalid CSS across 8 files (BookingFilters, Analytics, PricingSection, etc.)
- **Database cleanup:** All data wiped (development/test entries removed)
- **Build:** tsc + build pass zero errors

### Phase 3c — 1-Month Trial & Honest Limits (2026-06-28)
- **`trial_ends_at`** column on businesses — 30-day trial skip for all limits
- **`check_business_limits`** trigger — enforces booking/queue/staff caps per plan
- **`check_staff_plan_limit`** trigger — staff count enforcement
- **`get_monthly_business_counts`** RPC — returns booking + queue + staff counts
- **SubscriptionTab rewrite** — trial countdown + 2 progress bars
- **Landing page** — Pro "Coming soon" in all 3 locales

### Phase 3b — Concurrency & Production Readiness (2026-06-27)
- Database indexes added (`idx_bookings_overlap_check`, `idx_queue_tickets_business_date_ticket`, `idx_bookings_staff_date`, `idx_queue_tickets_staff_date`)
- Advisory locks for rate limiting and plan enforcement
- Optimistic locking via `.eq("status", currentStatus)` on all status transitions
- Analytics pagination via `.range(0, 1000)`
- Playwright smoke tests for 6 public pages

### Phase 3a — Staff Auth & EWT (2026-06-27)
- **Staff auth login:** `create_staff_user` RPC works end-to-end. BCrypt cost 10, all auth.users columns correct, duplicate email handled.
- **EWT formula improved:** Historical 30-day window, staff count divisor, fallback, stored in DB, WhatsApp URL param
- **QueueDisplay sound:** Singleton AudioContext, click-to-unlock overlay, muted hint
- **Staff delete:** Trash icon + AlertDialog confirmation
- **AddStaffForm** wrapped in `<form>` (fixes console warning)
- **Onboarding auth guard** redirects to /login if not authenticated

### Phase 2d — Security Hardening (2026-06-27)
- **Security audit:** `FINAL_AUDIT.md` — score 7.5/10
- **Sentry monitoring** integrated (`@sentry/react` + `@sentry/vite-plugin`)
- **CI/CD pipelines** (`.github/workflows/ci.yml` + `e2e.yml`)
- **CSP headers** for dev + production
- **Playwright E2E tests** (3 tests: booking track, queue display, staff view)
- **RLS integration tests** (`supabase/tests/rls_policies.sql`)
- **Bug fixes:** CSP WebSocket, StaffView state machine, WhatsApp 404

### Session 2 (2026-06-26)
- **File splits completed:** All 6 remaining large files split into domain subdirectories (queue/, staff/, bookings/, steps/)
- **Booking visibility:** PendingApprovals section, sidebar pending badge, dashboard pending stat, real-time booking subscription
- **Queue double-join app-level fix:** Pre-insert phone check in QueueFlow + DashboardQueue
- **Auth fixes:** `refreshRole()` in AuthContext, auto-login on signup (email confirmation off mode)
- **Database reset:** Full wipe + MASTER_SCHEMA.sql re-applied
- **Docs audit:** All 10 DOCS files reviewed and corrected against actual codebase

### Session 1 (2026-06-26, earlier)
- **MASTER_SCHEMA.sql** becomes single source of truth (replaces loose SCHEMA.sql and individual migrations)
- **Queue double-join DB fix:** Partial unique index `idx_one_active_ticket_per_phone`
- **GRANT statements** added to MASTER_SCHEMA (fixes 403 on fresh projects)
- **Root cleaned:** Loose files moved to DOCS/ or deleted
- **Types split:** `src/types/` into domain files
- **WhatsApp lib split:** `src/lib/whatsapp/` into `index.ts`, `templates.ts`, `urls.ts`
- Phone OTP removed entirely (previous session)
- Staff avatars + service assignment (previous session)

---

## What Is NOT Built Yet (don't assume it exists)

- [ ] Automated SMS reminders (Twilio integration)
- [ ] Online payments (BaridiMob / CCP / Stripe)
- [ ] Multi-location support
- [ ] Arabic RTL interface (85% — 35+ components patched)
- [ ] Enhanced PWA with offline queue tracking
- [ ] Email notification templates
- [ ] Staff-specific availability schedules
- [ ] Break time / lunch hour support
- [ ] Queue capacity limits
- [ ] Bulk SMS campaigns
- [ ] Calendar sync (Google Calendar / iCal)
- [ ] Client accounts with full booking history dashboard
