# Leenya — AI Context File

Last updated: 2026-06-26

## Project in One Paragraph

Leenya is a queue and appointment management SaaS for Algerian service businesses (barbershops, salons, clinics, dental offices, physiotherapy, veterinary). Built with React 18 + TypeScript + Vite on the frontend and Supabase (PostgreSQL, Auth, Realtime, Storage) on the backend. UI is French-language only, prices in DZD, covers all 58 wilayas. Styled with Tailwind CSS + shadcn/ui, fonts are Sora / JetBrains Mono / IBM Plex Sans Arabic. Currently pre-revenue — subscription plans are displayed but no payment processing exists.

---

## Critical Rules (read before touching anything)

1. **Never change database table or column names** without updating ALL queries, types, and RLS policies that reference them
2. **All Supabase queries must have error handling** — check `.error` on every response
3. **All real-time subscriptions must be cleaned up on unmount** — call `supabase.removeChannel(channel)` in the cleanup function
4. **RLS is enabled on all tables** — test permissions after any schema change. All policies use `RESTRICTIVE` (not permissive)
5. **Design system colors are in CSS variables** — never use raw hex/rgb in components. Use semantic tokens from `src/index.css` and `tailwind.config.ts`. All shadcn tokens are HSL
6. **Font classes**: `font-sans` → Sora, `font-mono` → JetBrains Mono, `font-arabic` → IBM Plex Sans Arabic
7. **Never edit these auto-generated files**: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml`
8. **Import the Supabase client from** `@/integrations/supabase/client` — never create a new client
9. **Roles are in `user_roles` table** — never store roles on profiles or in localStorage
10. **No DELETE on bookings, queue_tickets, profiles, reviews, user_roles** — only status changes (cancel, no-show)
11. **All RLS policies are RESTRICTIVE** (Supabase `PERMISSIVE: No`) — a row must match at least one policy per operation type

---

## File Map (where to find things)

| Concern | File(s) |
|---------|---------|
| Booking flow (appointment) | `src/components/booking/AppointmentFlow.tsx` |
| Queue flow (walk-in) | `src/components/booking/QueueFlow.tsx` |
| Ticket tracker (client view) | `src/components/booking/TicketTracker.tsx` |
| Business public page | `src/pages/BusinessPublic.tsx` |
| WhatsApp message templates | `src/lib/whatsapp/` |
| Time slot generation | `src/lib/timeSlots.ts` |
| Slug generation | `src/lib/slugify.ts` |
| Service suggestions by category | `src/lib/serviceSuggestions.ts` |
| Wilaya list (58 wilayas) | `src/lib/wilayas.ts` |
| Routing (all routes) | `src/App.tsx` |
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
| Dashboard analytics | `src/pages/dashboard/DashboardAnalytics.tsx` |
| Staff view (simplified) | `src/pages/StaffView.tsx` |
| TV queue display | `src/pages/QueueDisplay.tsx` |
| Booking tracker (by token) | `src/pages/BookingTrack.tsx` |
| Client bookings history | `src/pages/MyBookings.tsx` |
| Landing page | `src/pages/Landing.tsx` |
| Design tokens (CSS variables) | `src/index.css` |
| Tailwind config (theme) | `tailwind.config.ts` |
| Database schema (authoritative) | `supabase/schema/MASTER_SCHEMA.sql` |

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

**Key triggers:**
- `check_booking_overlap` — on bookings INSERT/UPDATE, prevents double-booking with advisory locks
- `check_insert_rate_limit` — on bookings AND queue_tickets INSERT, max 10 per phone per 10 min

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

1. No automated SMS/WhatsApp notifications — only manual wa.me URL links
2. No payment processing — subscription plans displayed but not enforced server-side
3. No staff-specific schedules — all staff share business hours
4. No break time / lunch hour support in business hours
5. French only — Arabic fields exist in schema (`name_ar`) but unused in UI
6. No hard DELETE on bookings or tickets — only status changes
7. No queue capacity limits
8. Single location per owner only
9. No offline/PWA support

---

## What Was Recently Changed (Last 2 Sessions)

### Session 2 (2026-06-26, current)
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
- [ ] Arabic RTL interface
- [ ] Enhanced PWA with offline queue tracking
- [ ] Email notification templates
- [ ] Staff-specific availability schedules
- [ ] Break time / lunch hour support
- [ ] Queue capacity limits
- [ ] Bulk SMS campaigns
- [ ] Calendar sync (Google Calendar / iCal)
- [ ] Client accounts with full booking history dashboard
