# System Instructions — Leenya

This file is consumed by AI coding agents (Claude Code, Copilot, etc.) to understand the project, its state, and conventions. Updated: 2026-06-27.

---

## Project Overview

Leenya is a queue and appointment management SaaS for Algerian service businesses. Built with React 18 + TypeScript + Vite + Supabase (Postgres). No phone OTP — email/password auth only.

---

## Key Files

### Core Files

See `DOCS/AI_CONTEXT.md` → File Map for the complete reference. Key files:

| File | Purpose |
|---|---|
| `src/App.tsx` | Routes (public + protected + dashboard) |
| `src/main.tsx` | Entry point, Sentry init |
| `src/contexts/AuthContext.tsx` | Auth state (session + role) |
| `src/types/index.ts` | App interfaces (re-exports from domain files) |
| `src/i18n/index.ts` | i18n config (6 namespaces × 3 languages) |
| `src/lib/sentry.ts` | Sentry monitoring init |
| `src/components/ErrorBoundary.tsx` | Error boundary component |
| `supabase/schema/MASTER_SCHEMA.sql` | Authoritative DB schema (idempotent) |

---

## Critical Conventions

### Code Style
- **JSDoc/** TSDoc comments on public exports and complex logic only — never on trivial getters or obvious code. Use `/** */` for functions/components/types.
- **No inline comments** for obvious code (e.g., `// fetch data` above a supabase call). Reserve comments for explaining *why* something is done, not *what* it does.
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

## Current Features (Verified State as of 2026-06-28 — Phase 3d)

1. **Landing page** — Static marketing sections, CTA to login. No DB queries.
2. **Email/password auth** — Login, signup, forgot/reset password. Session handled by AuthContext. Supports both email-confirmation-on and auto-login modes.
3. **Onboarding wizard** — 4 steps: name → business type → business details → services. Calls `refreshRole()` on completion to fix redirect loop.
4. **Public business page** — `/:slug` with appointment/queue tabs, reviews, hours.
5. **Appointment booking** — 5-step flow (service → staff → datetime → details → confirmed). Staff step skipped if no staff assigned to service. "Pas de préférence" pre-selected by default.
6. **Queue booking** — Service selection → name/phone → ticket → realtime tracker. Double-join prevented at DB level (unique index) + app level (pre-insert phone check).
7. **Queue display** — `/display/:slug` full-screen TV mode.
8. **Dashboard (owner)** — Overview (with pending count stat), bookings (with PendingApprovals section + sidebar badge + realtime), queue, services, staff (with avatars + service assignment), settings, analytics.
9. **Staff view** — Tabbed interface (queue + bookings), realtime, WhatsApp on call, login via email/password.
10. **Client bookings** — MyBookings with review capability.
11. **Booking tracker** — Anonymous tracking by token.
12. **WhatsApp templates** — 7 types, editable, preview, reset.
13. **Staff-service assignment** — Junction table `staff_services` with dashboard UI.
14. **Staff avatars** — Upload to Supabase Storage, deterministic color initials fallback.
15. **FloatingHelp** — WhatsApp button, uses `VITE_SUPPORT_PHONE` env var.
16. **Rate limiting + overlap prevention + plan enforcement** — DB triggers.

---

## Priority Tasks (from NEXT.md — see full list there)

### P0 — Before First Real User
1. Set `VITE_SUPPORT_PHONE` in production env
2. Verify Supabase email confirmation setting (currently ON)

### P1 — High Priority
3. Verify ResetPassword email flow
4. Loading skeletons for slow pages

### P2 — Security Hardening (Still Open)
5. RLS PERMISSIVE → RESTRICTIVE (Phase 2b)
6. Enable leaked password protection (requires Supabase Pro)

### P3 — Monetization
7. Payment processing integration

---

## Build & Test

```bash
npm run build    # TypeScript + Vite build. Must pass with zero errors (warnings are OK).
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
- **Staff auth login:** `create_staff_user` RPC works end-to-end — owner creates staff account with email/password, staff logs in, redirected to /staff. All 36 auth.users columns correctly set (matches GoTrue format exactly). Handles duplicate email gracefully.
- **EWT formula improved:** Uses historical wait times (30-day window), staff count divisor, fallback formula, stored in DB, included in WhatsApp URL.
- **QueueDisplay sound:** Singleton AudioContext fixes paused_in_background error, click-to-unlock overlay, muted hint.
- **Staff delete:** Trash button with confirmation dialog in DashboardStaff.
- **Onboarding auth guard:** Redirects to /login if not authenticated.
- **Phase 2a Doctor audit fixes:** C-001/C-002 (PII leak → RPC-based access), C-003 (anon cancel → dropped), H-001 (role self-insert → dropped), H-005 (business hours → trigger), H-007 (state machine → triggers), H-008 (anon cancel → RPC), H-009 (SECURITY DEFINER → EXECUTE revoked), C-005 (vitest CVE), H-003 (npm audit 19→2). See `doctor/reports/FINAL_AUDIT.md`.
- **Security model updated:** Public queue/booking access now via RPCs (not direct table queries). See `src/components/booking/TicketTracker.tsx`, `src/pages/QueueDisplay.tsx`, `src/pages/BookingTrack.tsx`.

### Pre-Existing Gaps (Not Fixed — See Phase 2b / Next)

- RLS policies are PERMISSIVE (need AS RESTRICTIVE)
- Leaked password protection disabled (requires Supabase Pro)
- Error messages leak schema details
- No error boundaries on major page sections
- No loading skeletons (spinners only)

### ✅ Fixed in Phase 4 (Launch Prep)
- Blanket per-table grants → explicit per-table grants (✅ B1)
- Storage bucket public listing — already fixed (✅ B2)
- 17 queries missing business_id — all scoped (✅ B3)
- 38 lint errors — now 0 warnings (✅ C3)
- `.env` in git history — already gitignored (✅ C2)
- Step indicator UI in AppointmentFlow (✅ A3)
- Analytics delta display divide-by-zero — already guarded (✅ A4)
- WhatsApp variable format — now uses native JS array (✅ A5)
- Default booking view → upcoming (✅ A1 — already done)
- Default public tab → queue (✅ A2 — already done)
- Unused @tanstack/react-query removed (✅ C1)

### AI Agent Behavior Rules

1. **Never touch these files:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`
2. **Always read the file before editing** — never assume content.
3. **Build must pass** before declaring any task done. Run `npm run build` to verify.
4. **Check existing conventions** before writing new components — read 2-3 existing components first.
5. **Commit only when explicitly asked** — never commit unprompted.
6. **Answer concisely** — one-liners unless asked for detail.
