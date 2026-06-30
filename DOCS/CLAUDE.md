# Leenya — AI Onboarding Brief

**Queue + appointment management SaaS for Algerian service businesses.** React 18 + TypeScript + Vite + Supabase (Postgres). Email/password auth only. French UI.

## Before reading anything else

Read these 4 files in order:
1. `DOCS/SYSTEM_INSTRUCTIONS.md` — conventions, build commands, AI rules
2. `DOCS/ARCHITECTURE.md` — directory structure, data flow, routing, schema
3. `DOCS/FEATURES.md` — what's built and what's not
4. `DOCS/NEXT.md` — priority tasks

## Recent cleanup (2026-06-26)

- **MASTER_SCHEMA.sql** is the single source of truth for DB schema. Run this on any fresh Supabase project.
- **Queue double-join fixed** at both DB level (partial unique index) and app level (pre-insert phone check in QueueFlow + DashboardQueue).
- **Root cleaned** — loose files moved to `DOCS/` or deleted.
- **File splits completed** — all 6 large files split into domain subdirectories:
  - `src/types/` — split into `booking.ts`, `business.ts`, `staff.ts`, `auth.ts`, re-exported from `index.ts`
  - `src/lib/whatsapp/` — split into `index.ts`, `templates.ts`, `urls.ts`
  - `src/pages/dashboard/bookings/` — split into `PendingApprovals.tsx`, `NewBookingSlideOver.tsx`, `BookingRow.tsx`, `BookingFilters.tsx`
  - Other splits: `SettingsWhatsApp.tsx`, `AppointmentFlow.tsx`, `TicketTracker.tsx`, `DashboardStaff.tsx`, `DashboardQueue.tsx`, `DashboardBookings.tsx`
- **Booking visibility** — PendingApprovals section, sidebar pending badge, pending count stat on dashboard, real-time booking subscription.
- **Auth fixes** — `refreshRole()` added to AuthContext (fixes onboarding redirect loop), signup auto-login when email confirmation is off.
- **Database reset** — MASTER_SCHEMA.sql re-applied after full `DROP SCHEMA public CASCADE`.

## What NOT to touch

- `src/integrations/supabase/client.ts` — auto-generated
- `src/integrations/supabase/types.ts` — auto-generated
- `src/components/ui/` — shadcn/ui components (Radix-based, ~50 files)
- Any shadcn/ui config files (`components.json`, `tailwind.config.ts`)
- `.env` — contains real secrets
- `supabase/config.toml` — CLI-managed

## i18n Quick Start

- **react-i18next** with 6 namespaces × 3 languages (fr/ar/en)
- Default: French (Algeria)
- Key files: `src/i18n/index.ts`, `src/hooks/useLanguage.ts`
- Language switcher in navbar (landing) and footer (other pages)
- RTL: `dir="rtl"` on `<html>`, mirrored Tailwind classes (`ms-*`/`me-*`)
- All ~992 keys per locale in `src/i18n/locales/{lang}/{namespace}.json`

## Key Pages Added Recently

| Route | Component | Notes |
|---|---|---|
| `/terms` | TermsOfService | Legal, before /:slug |
| `/privacy` | PrivacyPolicy | Legal, before /:slug |
| `/:slug/queue` | QueuePublic | Public queue view |

## Key paths for new features

| What you need | Where to look |
|---|---|
| Routes | `src/App.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` (import via `@/`) |
| DB types | `src/integrations/supabase/types.ts` (generated) |
| App types | `src/types/index.ts` (re-exports from domain files) |
| Auth | `src/contexts/AuthContext.tsx` |
| Dashboard layout | `src/components/dashboard/DashboardLayout.tsx` |
| DB schema (authoritative) | `supabase/schema/MASTER_SCHEMA.sql` |

## Build & verify

```bash
npm run build    # Must pass with zero errors
npm run dev      # Dev server
npx tsc --noEmit # Type-check only
```

## What was just done (last 3 sessions)

### Phase 3d — Final Pricing Limits & Polish (2026-06-28)
- **Pricing:** Final Algerian market limits: Free(100/300/3), Pro(500/1000/7), Business(2000/2000/unlimited). Migration applied live.
- **Legal pages:** TermsOfService + PrivacyPolicy (Algerian Law 18-07)
- **i18n:** All missing keys added (~590 total per locale). 20 new keys in demo components.
- **RTL polish:** ~20 items across 18 files. All 35+ components patched. All arrow icons flipped.
- **SubscriptionTab:** Fixed RPC array bug. Real-time subscription for counts. Staff limit frontend enforcement.
- **Bugfixes:** `bg-[var(--accent)]` → `bg-accent` across 8 files (invalid CSS). BookingRow column widths fixed.
- **Database cleanup:** All data wiped (no test/dev entries remain)
- **Build:** `npm run build` & `npx tsc --noEmit` pass zero errors.

### Phase 3c — 1-Month Trial & Honest Limits (2026-06-28)
- **trial_ends_at** column, **check_business_limits** + **check_staff_plan_limit** triggers, **get_monthly_business_counts** RPC.
- **SubscriptionTab** rewrite with trial countdown + 2 progress bars.
- **Landing page** Pro shows "Coming soon" in all 3 locales.

### Phase 3b — Concurrency & Production Readiness (2026-06-27)
- Database indexes, advisory locks, optimistic locking, analytics pagination.

### Phase 3a — Staff Auth & EWT (2026-06-27)
- Staff auth login, EWT formula, QueueDisplay sound, staff delete, onboarding auth guard.

### Phase 2d — Security Hardening (2026-06-27)
- Sentry monitoring, CI/CD, CSP headers, Playwright E2E, RLS tests.

### Bug Bash 2 — State Stability & UX Polish (2026-06-30)
- **Auth token refresh no longer unmounts dashboard** — `onAuthStateChange` skips `setRoleReady(false)` on `TOKEN_REFRESH`
- **Business reference stabilized** — `useMemo` prevents cascade re-fetches
- **Profile name from DB** — fetches from `profiles.full_name`, shows real name not email
- **Time-of-day greetings** — 5 variants per time block × 3 languages
- **Cover preview matches profile** — same 140px height, PixelCover fallback in settings
- **Revenue counts queue income** — completed queue tickets' service prices now included
- **Cover images get cache-busting `?cb=`** on each upload to prevent stale browser cache

### Queue Edge Cases — Skip, Send Back, Check-in, Pause (2026-06-30)
- **Skip + Send Back 409 conflict fixed** — 3 RPCs rewritten: `recalculate_queue_positions` now NULLs non-waiting positions first; `skip_queue_ticket` actually moves ticket to end (was duplicate recalc with no skip logic); `send_ticket_back_to_queue` clears position before recalculating
- **Check-in button** in TicketTracker — "I'm here" sets `checked_in_at` timestamp, staff see green ✓
- **Queue pause toggle** in dashboard settings — owners flip switch, QueueFlow shows amber notice, join form hidden
- **StatCard ref warning fixed** — renamed `ref` → `sectionRef` prop
- **Staff onboarding redirect fixed** — ProtectedRoute sends `!role` to `/` not `/onboarding`; LoginForm uses `get_user_role` RPC instead of direct table `.single()` query
- **i18n:** 10+ new keys added for skip, send back, check-in, queue pause (EN/FR/AR)

### Full Audit/Fix/Ship Session (2026-06-30, branch: audit/june-30)
- **Full read-only audit** of 13 tables, 46 RLS policies, 5 RPCs, security headers, bundle, ESLint
- **5 doc contradictions fixed** (DC-01–DC-05): primary color (purple not blue), avatar upload RLS, ResetPassword verified, dead code removed, pricing updated
- **Pricing updated:** Pro 4,900 DZD/mo, Business 8,900 DZD/mo
- **17 console.error calls gated** behind `import.meta.env.DEV`
- **@tanstack/react-query removed** (unused)
- **42/42 tests pass**, tsc and build zero errors
