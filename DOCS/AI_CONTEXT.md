# Leenya — AI Context File

Last updated: 2026-06-30

## Project in One Paragraph

Leenya is a queue and appointment management SaaS for Algerian service businesses (barbershops, salons, clinics, dental offices, physiotherapy, veterinary). Built with React 18 + TypeScript + Vite on the frontend and Supabase (PostgreSQL, Auth, Realtime, Storage) on the backend. UI supports French (default), English, and Arabic. Prices in DZD, covers all 58 wilayas. Styled with Tailwind CSS + shadcn/ui, fonts are Sora / JetBrains Mono / IBM Plex Sans Arabic. Currently pre-revenue — subscription plans are displayed but no payment processing exists.

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
11. **RLS policies are PERMISSIVE (default)** — switching to RESTRICTIVE is Phase 2b. Public data access (queue, booking) uses RPCs, not direct tables.

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
| i18n / translations | `src/i18n/index.ts` (6 namespaces × 3 languages, ~992 keys EN) |
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

**Tables** (13): `profiles`, `user_roles`, `businesses`, `business_hours`, `services`, `staff_members`, `staff_services`, `bookings`, `queue_counters`, `queue_tickets`, `reviews`, `feedback`, `whatsapp_templates`

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
| `--accent` | hsl(260 97% 61%) | (same) |
| `--accent-hover` | hsl(260 90% 55%) | (same) |
| `--accent-light` | hsl(260 80% 95%) | (same) |
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
2. Leaked password protection disabled in Supabase Auth (H-011) — requires Pro plan
3. Error messages leak schema details (SEC-01) — `USING HINT` values in triggers expose internal identifiers

### Known Tech Debt
1. `@tanstack/react-query` in package.json but unused (+13 kB dead bundle)
2. 56 suppressed ESLint messages (36 `no-explicit-any`, 20 other)
3. **Schema drift (FIXED 2026-06-30):** `checked_in_at` and `is_queue_paused` columns, plus 5 queue RPCs were missing from MASTER_SCHEMA.sql — all backported from live Supabase DB; MASTER_SCHEMA.sql is now the single source of truth again

### Supabase Linter Warnings (Intentional)
These warnings are by design, not security issues:
- **Anon SECURITY DEFINER functions** (10): All public RPCs (`get_booking_by_token`, `cancel_booking_by_token`, `get_queue_ticket`, `get_business_queue`, `get_completed_ticket_stats`, `get_queue_context`, `generate_ticket_number`, `get_monthly_business_counts`, `get_default_whatsapp_templates`) are intentionally callable by anonymous users for public booking/queue features
- **Authenticated SECURITY DEFINER functions** (14): All internal RPCs (`assign_owner_role`, `create_staff_user`, `upsert_profile`, etc.) are intentionally callable by authenticated users for the dashboard
- **`feedback` table `INSERT` policy** (`WITH CHECK (true)`): By design for the public landing page feedback form. Owners can view/delete feedback related to their business.

---

## What Was Recently Changed (Last 3 Sessions)

### Session 5 — Bug Bash 2: State Stability & UX Polish (2026-06-30)
- **Auth token refresh no longer unmounts dashboard** — `onAuthStateChange` skips `setRoleReady(false)` on `TOKEN_REFRESH`. Used `userRef.current` comparison to prevent spurious `setUser()` calls.
- **Business reference stabilized** — `useMemo` wrap on return value of `use-business-info.ts` prevents cascade re-fetches in all dashboard pages.
- **Profile name from DB** — `Dashboard.tsx` + `DashboardLayout.tsx` fetch `full_name` from `profiles` table, fall back to `user_metadata.full_name` then email prefix.
- **Time-of-day greetings** — 5 variants per time block (morning/afternoon/evening) × 3 languages, random index stable per page load.
- **Cover preview matches profile** — same 140px height, PixelCover fallback in settings.
- **Revenue includes completed queue tickets** — `DashboardAnalytics.tsx`: `queueRevenue` from completed queue tickets' `services.price_dzd`.
- **Cache busting on uploads** — `?cb=timestamp` appended to image URLs, `cacheControl: "no-cache"` on Supabase upload.
- **Remove cover/logo** — X button on previews, `removeImage()` sets `null` in DB.
- **Staff picker in Change Service** — TicketTracker can also change `staff_member_id` alongside `service_id`.
- **Duplicate labels fixed** — "Phone" → "Business phone" in settings (EN/FR/AR).
- **Queue tab left on public page** — swapped button order so Queue appears before Appointments.
- **Build:** `npm run build` zero errors.

### Session 6 — Queue Edge Cases: Skip, Check-in, Pause + Bug Fixes (2026-06-30)
- **Skip + Send Back 409 conflict fixed** — 3 RPCs rewritten: `recalculate_queue_positions` NULLs non-waiting positions first; `skip_queue_ticket` moves ticket to end (position NULL → renumber → MAX+1); `send_ticket_back_to_queue` clears position before status change. Migration `fix_queue_position_conflicts` applied.
- **Check-in button** — `TicketTracker.tsx`: "I'm here" button sets `checked_in_at` timestamp; staff see green checkmark in waiting lists. No state machine change.
- **Queue pause toggle** — `BusinessInfoTab.tsx`: owner flips `is_queue_paused` switch on businesses table. `QueueFlow.tsx`: fetches on mount, shows amber notice, hides join form when paused.
- **DB migrations applied:** `add_queue_skip_checkin_features`, `fix_get_queue_ticket_add_checked_in`, `fix_queue_position_conflicts`.
- **StatCard ref warning fixed** — renamed `ref` → `sectionRef` prop in StaffView.tsx (3 usage sites).
- **Staff onboarding redirect fixed** — `ProtectedRoute.tsx`: `!role` → `/` not `/onboarding`; `LoginForm.tsx`: uses `get_user_role` RPC instead of direct table `.single()` query.
- **i18n:** 10+ new keys added for skip, send back, check-in, queue pause (EN/FR/AR).
- **Position calculation fixed** — `get_queue_context` now uses `position_in_queue` instead of `ticket_number` for accurate "X ahead" count after skip/send-back.
- **Schema drift fixed:** `checked_in_at`, `is_queue_paused`, and 5 missing RPC functions backported from live DB to MASTER_SCHEMA.sql — now fully in sync.

### Session 4 — Phase 3d: Final Pricing Limits & Polish (2026-06-28)
- **Final pricing limits (Algerian market):** Free(100/300/3), Pro(500/1000/7), Business(2000/2000/unlimited). Migration applied live.
- **Legal pages:** TermsOfService + PrivacyPolicy (Algerian Law 18-07), routes before `/:slug` catch-all
- **Footer:** Instagram removed, email → sifeddine.meb96@gmail.com
- **Missing i18n keys:** subscription upgrade, WhatsApp init, 404 (20 keys), common buttons fixed — ~992 keys per locale now
- **RTL polish:** ~20 items across 18 files. All 35+ components RTL-patched + all arrow icons flipped.
- **Back-to-top button:** new component, appears after 400px scroll
- **SubscriptionTab:** Fixed RPC array bug, real-time subscriptions, staff limit frontend enforcement
- **Demo components:** accent color fix, i18n (20 new keys), equal min-height
- **Testimonials:** 3 new messages across EN/FR/AR
- **bg-[var(--accent)] → bg-accent:** Fixed invalid CSS across 8 files
- **Database cleanup:** All data wiped (development/test entries removed)

### Session 7 — Schema Sync & Enterprise README (2026-06-30)
- **MASTER_SCHEMA.sql fully synced** with live Supabase DB — `checked_in_at` + `is_queue_paused` columns backported, 5 missing RPCs added (`check_in_ticket`, `reassign_queue_ticket`, `recalculate_queue_positions`, `send_ticket_back_to_queue`, `skip_queue_ticket`), `get_queue_ticket` return type updated, `join_queue` now checks pause status, `get_queue_context` uses position-based waiting count
- **All docs audited:** 9 DOCS files corrected (ARCHITECTURE.md, AI_CONTEXT.md, CLAUDE.md, DESIGN.md, ENVIRONMENT.md, SYSTEM_INSTRUCTIONS.md, CHANGELOG.md, AGENTS.md, AUDIT.md)
- **Schema drift alert cleared:** Single source of truth restored

---

## What Is NOT Built Yet (don't assume it exists)

- [ ] Automated SMS reminders (Twilio integration)
- [ ] Online payments (BaridiMob / CCP / Stripe)
- [ ] Multi-location support
- [ ] Arabic RTL interface (95% — 35+ components patched, all arrow icons flipped)
- [ ] Enhanced PWA with offline queue tracking
- [ ] Email notification templates
- [ ] Staff-specific availability schedules
- [ ] Break time / lunch hour support
- [ ] Queue capacity limits
- [ ] Bulk SMS campaigns
- [ ] Calendar sync (Google Calendar / iCal)
- [ ] Client accounts with full booking history dashboard
