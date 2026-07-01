# Leenya — AI Context File

Last updated: 2026-07-01

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
- `--primary`: 260 97% 61% (purple) — same as `--accent`
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

### Known Bugs (Not Yet Fixed)

1. **Skip is bounded 1-position swap (not move-to-end):** `skip_queue_ticket` (MASTER_SCHEMA.sql:1160-1214) swaps `position_in_queue` with the next waiting ticket instead of moving to the end. Staff must click N times to fully skip someone past N people. The `recalculate_queue_positions` function already knows how to renumber properly. Fix: NULL the skipped ticket's position, then call `recalculate_queue_positions` for that business+date.
2. **Change service/staff dialog ignores staff_services:** TicketTracker.tsx:425-442 fetches ALL active staff without filtering by `staff_services`. The `update_ticket_service` RPC (MASTER_SCHEMA.sql:451-504) also doesn't validate staff-service assignments. Users can select a staff member who doesn't offer the chosen service. Fix: filter staff by `staff_services` join when service selection changes; add validation to the RPC.

### Supabase Linter Warnings (Intentional)
These warnings are by design, not security issues:
- **Anon SECURITY DEFINER functions** (10): All public RPCs (`get_booking_by_token`, `cancel_booking_by_token`, `get_queue_ticket`, `get_business_queue`, `get_completed_ticket_stats`, `get_queue_context`, `generate_ticket_number`, `get_monthly_business_counts`, `get_default_whatsapp_templates`) are intentionally callable by anonymous users for public booking/queue features
- **Authenticated SECURITY DEFINER functions** (14): All internal RPCs (`assign_owner_role`, `create_staff_user`, `upsert_profile`, etc.) are intentionally callable by authenticated users for the dashboard
- **`feedback` table `INSERT` policy** (`WITH CHECK (true)`): By design for the public landing page feedback form. Owners can view/delete feedback related to their business.

---

## What Was Recently Changed (Last Session)

### Session 9 — Final doc sync, bug documentation, production deploy (2026-07-01)

- **7 bugs (A–G) all fixed:**
  - **Bug A (CSP manifest-src):** `manifest-src` had `https://vercel.com` without `'self'`. Added `'self'` back in vercel.json.
  - **Bug B (get_queue_context 400):** Unqualified `ticket_number` in first query collided with `RETURNS TABLE` output column. Added `qt` alias. Live migration applied.
  - **Bug C (RLS 403 on changeService):** No anon UPDATE policy for ticket service/staff change. Created `update_ticket_service` SECURITY DEFINER RPC, frontend calls RPC instead of direct UPDATE.
  - **Bug D (Auth redirect race):** Added `getUser()` fallback if `getSession()` returns null. Added direct RPC fallback if `waitForRole()` returns null.
  - **Bug E (Staff RBAC):** Routes confirmed protected. Staff cannot access `/dashboard`.
  - **Bug F (Invisible queue tickets):** `join_queue` was missing `SET timezone = 'Africa/Algiers'` on live DB. Applied timezone + fixed existing ticket.
  - **Bug G (Staff switch + service change):** Same RPC handles both atomically now.
- **Rate-limit regression FIXED:** `service_changed_at` column added (starts NULL = first change always allowed). Client-side debounce on confirm.
- **Default avatars/covers replaced:** linear gradients → seeded grainy mesh gradient with SVG blur + turbulence noise, purple family colors.
- **Two "stubborn" bugs documented as Known Issues:**
  - **Skip is 1-position swap, not move-to-end** — `skip_queue_ticket` swaps with next waiting ticket. Staff must click N times for N people to skip. Fix: NULL position + `recalculate_queue_positions` instead of swap.
  - **Change service/staff dialog ignores staff_services** — TicketTracker shows ALL staff members, not just those offering the selected service. RPC also doesn't validate. Fix: filter staff by `staff_services` join on service selection change.
- **All DOCS files comprehensively updated** — single source of truth for future sessions.
- **Production deployed** — promoted to `leenya-dz.vercel.app`.

### Previous Sessions (summarized)

- **Session 8 — Fix Queue Skip & Hardening (2026-06-30):** Skip redesigned to bounded 1-position swap. skip_count column, RPCs updated with checked_in_at, trial window extended to July 31. Storage path scoping. Landing feedback form. 4 ESLint no-explicit-any cleaned.
- **Session 5 — State Stability & UX Polish (2026-06-30):** Auth token refresh no longer unmounts dashboard. Business reference stabilized with useMemo. Profile name from DB. Time-of-day greetings (5×3). Cover preview matches. Queue revenue included. Cache busting on uploads. Remove cover/logo. Staff picker in change service.
- **Session 6 — Queue Edge Cases (2026-06-30):** Skip+Send Back 409 fixed. Check-in button. Queue pause toggle. StatCard ref warning. Staff onboarding redirect. 10+ i18n keys. Schema drift fixed (checked_in_at, is_queue_paused, 5 RPCs backported).
- **Session 7 — Schema Sync (2026-06-30):** MASTER_SCHEMA.sql fully synced with live DB. All docs audited. Schema drift alert cleared.
- **Session 4 — Phase 3d: Final Pricing & Polish (2026-06-28):** Final Algeria pricing. Legal pages. RTL polish (~20 items). Subscriptions. bg-[var(--accent)]→bg-accent fix across 8 files. DB cleanup.

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
