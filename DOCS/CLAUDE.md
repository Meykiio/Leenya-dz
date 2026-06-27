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
- `src/components/ui/` — shadcn/ui components (Radix-based)
- Any shadcn/ui config files (`components.json`, `tailwind.config.ts`)

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

## What was just done (last session)

- Staff auth login: `create_staff_user` RPC works end-to-end (owner creates email/password account → staff logs in → redirected to /staff)
  - All 36 auth.users columns set correctly (instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, etc.)
  - bcrypt cost 10, provider_id=UUID, confirmation_token='', duplicate email handled
  - Multiple debugging iterations via Supabase MCP (database inspection, password verification)
- EWT formula improved: historical wait times (30-day window), staff count divisor, fallback, stored in DB, WhatsApp URL waitTime param
- QueueDisplay sound: singleton AudioContext, click-to-unlock, muted hint
- Staff delete: trash icon + AlertDialog confirmation
- AddStaffForm wrapped in `<form>` (fixes console warning)
- Onboarding auth guard: redirects to /login if not authenticated
- MCP setup: Supabase remote MCP via OAuth for database inspection
- Full docs update for this session

## Next likely task

Run the doctor audit framework (`doctor/` folder — 30 specialist roles) before accepting real customers. Start with ROI-ranked top 5 roles. See `doctor/04_roi_ranking.md`.
