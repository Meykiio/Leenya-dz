# System Instructions for Working with Me

I'm the founder of this platform, not a developer. When you explain things:

## Communication Style
- **No tech jargon** — Don't say "migration", "i18n keys", "fetchStaff", "state variable", "RPC", "schema". Say "we added a record", "we updated the language files", "we changed how the data loads", etc.
- **Explain the "why"** — Always start with the problem from a business perspective, not the technical solution.
- **Use real-world analogies** — Compare database records to "a notebook entry", code changes to "rewriting a page in the notebook", etc.
- **Summarize in 3-4 sentences max** — Short, punchy, no fluff. If there are many changes, bullet points are fine but keep each bullet plain language.
- **No code, no file paths** — Never reference `src/components/...` or line numbers. Say "in the queue page" or "in the staff view".
- **Focus on what it means for the business** — "Now customers can pick you as their barber" not "we inserted a staff_members row".

## When You Finish a Task
Wrap up with a simple table:
| What changed | Why |
|---|---|
| (plain english) | (plain english) |

Then ask "Want me to test anything or look at something else?"

## Session Context

### 2026-06-30 — State Stability & UX Polish
- **Auth token refresh no longer unmounts dashboard** — `AuthContext.tsx`: skip `setRoleReady(false)` on `TOKEN_REFRESH`
- **Business reference stabilized** — `use-business-info.ts`: `useMemo` wrap prevents cascade re-fetches in all dashboard pages
- **Profile name from DB** — `Dashboard.tsx` + `DashboardLayout.tsx`: fetch `full_name` from `profiles` table, display real name not email prefix
- **Time-of-day greetings** — `Dashboard.tsx`: GREETINGS split into `morning/afternoon/evening`, 5 variants each × 3 languages, random index stable per page load
- **Cover preview in settings** — `BusinessInfoTab.tsx`: height `h-[140px]` same as profile, PixelCover fallback when empty
- **Revenue counts queue tickets** — `DashboardAnalytics.tsx`: `queueRevenue` from completed queue tickets' `services.price_dzd`
- **Cache busting on uploads** — `BusinessInfoTab.tsx`: `?cb=timestamp` appended to image URLs for fresh browser fetch
- **Storage cache control** — `cacheControl: "no-cache"` on Supabase upload
- **Gradient default covers** — `PixelCover.tsx` + `pixel-avatar.ts`: seeded SVG linear gradients instead of pixel art
- **Remove cover/logo** — X button on previews, `removeImage()` sets `null` in DB
- **Staff picker in Change Service** — `TicketTracker.tsx`: also change `staff_member_id` alongside `service_id`
- **Daily docs**: CHANGELOG.md + CLAUDE.md updated

### 2026-06-30 — Queue Edge Cases: Skip, Check-in, Pause + Bug Fixes
- **Skip + Send Back 409 conflict fixed** — 3 RPCs rewritten to clear stale positions on non-waiting tickets before renumbering; skip actually moves ticket to end
- **Check-in button** — `TicketTracker.tsx`: "I'm here" button sets `checked_in_at`, staff see green checkmark
- **Queue pause toggle** — `BusinessInfoTab.tsx` + `QueueFlow.tsx`: owners flip switch, customers see amber "paused" notice
- **StatCard ref warning** — renamed `ref` → `sectionRef` in `StaffView.tsx`
- **Staff onboarding redirect fixed** — `ProtectedRoute.tsx`: `!role` → `/` not `/onboarding`; `LoginForm.tsx`: uses `get_user_role` RPC instead of direct table `.single()` query
- **Daily docs**: CHANGELOG.md + CLAUDE.md + all other DOCS files updated

### 2026-06-30 — Full Doc Audit: Cross-Reference Against Codebase
- **ARCHITECTURE.md:** Fixed wrong table name (`waiting_counters` → `queue_counters`), removed non-existent `ThemeContext.tsx` and `/forgot-password` route, added 3 missing tables + 8 missing businesses columns + full queue_tickets columns, corrected routes (`/my-bookings` → `/mes-reservations`, added `/admin`, `/:slug/queue`), updated trigger list (replaced `check_plan_booking_limit` with `check_business_limits`)
- **AI_CONTEXT.md:** Fixed "French-only" → multilingual, i18n key count ~590 → ~992, tables 10 → 13, accent color blue → purple, security gaps updated (H-004/H-010 fixed, .env never committed), session history restructured
- **CLAUDE.md:** Fixed `/queue/:slug` → `/:slug/queue`, locale path `public/locales/` → `src/i18n/locales/`
- **DESIGN.md:** Fixed locale path, namespace list (removed "queue"), key count, dark mode description (no toggle, class-based)
- **ENVIRONMENT.md:** Fixed locale path, removed "`.env` committed" lie, added latest DB migrations table
- **SYSTEM_INSTRUCTIONS.md:** Fixed `@tanstack/react-query` removal claim (still in deps), added queue features, removed stale `doctor/` references
- **CHANGELOG.md:** Fixed `@tanstack/react-query` removal claim (still in deps)
- **Schema drift FIXED this session:** backported `checked_in_at`, `is_queue_paused`, 5 missing RPCs from live DB to MASTER_SCHEMA.sql — single source of truth restored

### 2026-06-30 — Schema Backport: MASTER_SCHEMA.sql ↔ Live DB Sync
- **Drift analysis:** Compared all 18 queue_tickets columns, 22 businesses columns, 38 functions, 21 triggers, 27 indexes between MASTER_SCHEMA.sql and live Supabase DB
- **Columns backported:** `checked_in_at` (queue_tickets), `is_queue_paused` (businesses)
- **Functions backported:** `check_in_ticket`, `reassign_queue_ticket`, `recalculate_queue_positions`, `send_ticket_back_to_queue`, `skip_queue_ticket`
- **Logic fixes:** `join_queue` — added `is_queue_paused` check; `get_queue_ticket` — added `checked_in_at` + `staff_member_id` to return; `get_queue_context` — uses `position_in_queue` instead of `ticket_number`; `join_queue` params made optional with DEFAULT NULL
- **All docs updated:** Removed stale "schema drift" warnings from AI_CONTEXT.md, AGENTS.md

### 2026-07-01 — Bugfix Round 3: CSP self, join_queue Timezone, RPC for changeService
- **CSP manifest-src regression** — `vercel.json`: added missing `'self'` to `manifest-src` (was dropped when `vercel.com` was added)
- **get_queue_context ambiguous column** — `MASTER_SCHEMA.sql` + live migration: first query in function got alias `qt` to fix `ticket_number` ambiguity with `RETURNS TABLE` output column
- **update_ticket_service RPC created** — `TicketTracker.tsx` changeService dialog now calls `update_ticket_service` RPC (SECURITY DEFINER, bypasses RLS) instead of direct table UPDATE, fixing the 403 RLS error for anon users
- **join_queue timezone drift FIXED** — MASTER_SCHEMA.sql had `SET timezone = 'Africa/Algiers'` but it was NEVER applied to live DB (added in commit 90e163b but no migration ran). Live `join_queue` used UTC `CURRENT_DATE`, causing tickets created after midnight Algeria time (before midnight UTC) to get wrong `queue_date`. Applied migration + set A-018's date correctly.
- **Auth redirect defensive fix** — `LoginForm.tsx` `handlePostAuth` now falls back to `getUser()` if `getSession()` returns null, and falls back to direct RPC if `waitForRole()` returns null
- **Test function `test_timezone` cleaned up**
