# System Instructions — Leenya

This file is consumed by AI coding agents (Claude Code, Copilot, etc.) to understand the project, its state, and conventions. Updated: 2026-06-26.

---

## Project Overview

Leenya is a queue and appointment management SaaS for Algerian service businesses. Built with React 18 + TypeScript + Vite + Supabase (Postgres). No phone OTP — email/password auth only.

---

## Key Files

### Core App Structure

| File | Purpose |
|---|---|
| `src/App.tsx` | Routes |
| `src/main.tsx` | Entry point |
| `src/contexts/AuthContext.tsx` | Auth state (session + role) |
| `src/integrations/supabase/client.ts` | Supabase client (do not modify) |
| `src/integrations/supabase/types.ts` | Generated DB types (do not modify) |
| `src/types/index.ts` | App-specific interfaces (re-exports from `types/booking.ts`, `types/business.ts`, `types/staff.ts`, `types/auth.ts`) |
| `.env.example` | Environment variables |

### Auth

| File | Purpose |
|---|---|
| `src/components/auth/LoginForm.tsx` | Login/signup (email only) |
| `src/components/auth/ForgotPassword.tsx` | Password reset request |
| `src/components/auth/ProtectedRoute.tsx` | Route guard by role |
| `src/pages/ResetPassword.tsx` | New password form after email link |

### Booking & Queue

| File | Purpose |
|---|---|
| `src/components/booking/AppointmentFlow.tsx` | Multi-step booking (5 steps when staff assigned) |
| `src/components/booking/QueueFlow.tsx` | Walk-in queue flow |
| `src/components/booking/TicketTracker.tsx` | Real-time queue position tracker |
| `src/lib/timeSlots.ts` | Time slot generation + overlap filtering |
| `src/lib/whatsapp/templates.ts` | Default WhatsApp template definitions (7 types) |
| `src/lib/whatsapp/index.ts` | Message builders (booking accepted, queue called, etc.) + re-exports |
| `src/lib/whatsapp/urls.ts` | WhatsApp URL link generators |

### Dashboard (Owner)

| File | Purpose |
|---|---|
| `src/hooks/use-business-info.ts` | Business info fetcher (used by all dashboard pages) |
| `src/pages/dashboard/Dashboard.tsx` | Overview with metrics |
| `src/pages/dashboard/DashboardBookings.tsx` | Booking management |
| `src/pages/dashboard/DashboardQueue.tsx` | Queue management |
| `src/pages/dashboard/DashboardServices.tsx` | Service CRUD |
| `src/pages/dashboard/DashboardStaff.tsx` | Staff CRUD with avatars + service assignment |
| `src/pages/dashboard/DashboardSettings.tsx` | Settings tabs container |
| `src/pages/dashboard/DashboardAnalytics.tsx` | Analytics |
| `src/pages/dashboard/SettingsWhatsApp.tsx` | WhatsApp template management |

### Public Pages

| File | Purpose |
|---|---|
| `src/pages/BusinessPublic.tsx` | Public business page (`/:slug`) |
| `src/pages/Landing.tsx` | Marketing landing page |
| `src/pages/BookingTrack.tsx` | Anonymous booking tracking |
| `src/pages/MyBookings.tsx` | Client booking history |
| `src/pages/StaffView.tsx` | Staff queue view |
| `src/pages/QueueDisplay.tsx` | TV display mode |
| `src/pages/NotFound.tsx` | 404 page |

### Other

| File | Purpose |
|---|---|
| `src/components/FloatingHelp.tsx` | WhatsApp help button (env var VITE_SUPPORT_PHONE) |
| `src/components/onboarding/OnboardingWizard.tsx` | 4-step wizard |
| `src/hooks/useWhatsAppTemplates.ts` | Template CRUD + compilation |
| `supabase/schema/MASTER_SCHEMA.sql` | Complete consolidated schema (idempotent, single source of truth — run this on any fresh Supabase project) |

---

## Critical Conventions

### Code Style
- **No comments.** Do NOT add comments to any file. Code should be self-documenting.
- **No console.log** — removed from all production files.
- **No emoji** — not added to code or text in the UI.
- Use existing shadcn/ui components from `src/components/ui/` — never add new packages.
- Use `@/` path aliases for all imports within `src/`.
- React functional components with hooks. No class components.

### TypeScript
- Avoid `any` where possible.
- Import Supabase types from `@/integrations/supabase/types` (tables) and `@/types` (app-level interfaces).
- Always use `import type` for type-only imports.

### Supabase
- Use `src/integrations/supabase/client.ts` — never create additional clients.
- Do NOT modify `src/integrations/supabase/client.ts` or `types.ts`.
- Check `.error` on every Supabase query and show a toast on failure.
- Realtime subscriptions must clean up on unmount (return unsubscribe in useEffect).
- For hard deletes from junction tables, use `in(ids)` with `is not null` guard on values.

### Styling
- Tailwind CSS utility classes — avoid inline styles unless absolutely necessary for dynamic values (e.g., avatar background colors).
- Mobile-first: all flows must work at 375px width.

### Routing
- React Router v6. Route params via `useParams`, navigation via `useNavigate`.
- Dashboard pages use `<DashboardLayout>` wrapper (sidebar + header + mobile bottom nav).
- Public routes use standard layout with `<Toaster>`.

---

## Current Features (Verified State as of 2026-06-26)

1. **Landing page** — Static marketing sections, CTA to login. No DB queries.
2. **Email/password auth** — Login, signup, forgot/reset password. Session handled by AuthContext. Supports both email-confirmation-on and auto-login modes.
3. **Onboarding wizard** — 4 steps: name → business type → business details → services. Calls `refreshRole()` on completion to fix redirect loop.
4. **Public business page** — `/:slug` with appointment/queue tabs, reviews, hours.
5. **Appointment booking** — 5-step flow (service → staff → datetime → details → confirmed). Staff step skipped if no staff assigned to service. "Pas de préférence" pre-selected by default.
6. **Queue booking** — Service selection → name/phone → ticket → realtime tracker. Double-join prevented at DB level (unique index) + app level (pre-insert phone check).
7. **Queue display** — `/display/:slug` full-screen TV mode.
8. **Dashboard (owner)** — Overview (with pending count stat), bookings (with PendingApprovals section + sidebar badge + realtime), queue, services, staff (with avatars + service assignment), settings, analytics.
9. **Staff view** — Simplified queue management.
10. **Client bookings** — MyBookings with review capability.
11. **Booking tracker** — Anonymous tracking by token.
12. **WhatsApp templates** — 7 types, editable, preview, reset.
13. **Staff-service assignment** — Junction table `staff_services` with dashboard UI.
14. **Staff avatars** — Upload to Supabase Storage, deterministic color initials fallback.
15. **FloatingHelp** — WhatsApp button, uses `VITE_SUPPORT_PHONE` env var.
16. **Rate limiting + overlap prevention + plan enforcement** — DB triggers.

---

## Priority Tasks (from NEXT.md — truncated, see full list there)

### P0 — Before First Real User
1. Set `VITE_SUPPORT_PHONE` in production env
2. Seed staff-service assignments for existing businesses (SQL script ready)

### P1 — High Priority
3. Add step indicator UI in AppointmentFlow
4. Verify ResetPassword email flow
5. Loading skeletons for slow pages
6. Extract shared avatar utilities to `src/lib/utils.ts`

### P2 — Monetization
7. Payment processing integration
8. Arabic RTL support

---

## Build & Test

```bash
npm run build    # TypeScript + Vite build. Must pass with zero errors.
npm run dev      # Dev server with HMR
npx tsc --noEmit # Type-check only
```

- Build runs `tsc -b && vite build`. TypeScript errors will fail the build.
- The test setup uses jsdom + vitest (`src/test/setup.ts`).

---

## Database Schema

- Single source of truth: `supabase/schema/MASTER_SCHEMA.sql` — run this on any fresh Supabase project.

---

## Past Work & Known Issues

### Things Already Checked / Fixed

- **AuthContext.tsx line 28:** Verified — no syntax bug. `const [role, setRole] = useState<AppRole>(null);` is correct.
- **Phone OTP removed:** OtpVerification.tsx deleted. LoginForm phone tab removed. All references cleaned up.
- **console.log removed:** useWhatsAppTemplates.ts and BusinessPublic.tsx cleaned.
- **FloatingHelp switched to env var:** No more hardcoded phone number.
- **Staff-system built:** avatar_url migration, staff_services junction table, DashboardStaff rewrite with upload + assignment, AppointmentFlow staff step integration.
- **All 10 DOCS files audited against codebase:** inaccuracies fixed.
- **File splits completed:** all 6 remaining large files split into domain subdirectories.
- **Booking visibility:** PendingApprovals section, sidebar pending badge, dashboard pending stat, real-time booking subscription.
- **Queue double-join:** app-level pre-insert check added alongside existing DB-level index.
- **Auth fixes:** `refreshRole()` in AuthContext, auto-login on signup when email confirmation is off.
- **`npm run build` passes:** zero errors, zero warnings.

### Pre-Existing Gaps (Not Fixed)

- No step indicator UI in AppointmentFlow
- `getInitials()` and `getAvatarColor()` duplicated in AppointmentFlow.tsx and DashboardStaff.tsx
- Analytics delta display may divide by zero
- WhatsApp template variable format may be fragile
- No error boundaries on major page sections
- No loading skeletons (spinners only)
- `.env` file committed to repo (fix: add to `.gitignore`)

### AI Agent Behavior Rules

1. **Never touch these files:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`
2. **Always read the file before editing** — never assume content.
3. **Build must pass** before declaring any task done. Run `npm run build` to verify.
4. **Check existing conventions** before writing new components — read 2-3 existing components first.
5. **Commit only when explicitly asked** — never commit unprompted.
6. **Answer concisely** — one-liners unless asked for detail.
