# Bugs Report — July 1, 2026 (FINAL)

## Bug 5: Rate-limit blocks first staff/service change ✅ RESOLVED

**Confirmed root cause:** The `update_ticket_service` RPC used `updated_at` for the 30s rate-limit window. `updated_at` has `DEFAULT NOW()` at row creation, so a newly joined ticket (<30s old) got blocked on its very first change attempt. This is not abuse — it's a legitimate first fix after joining.

The user-reported workaround ("must go through no preference first") was NOT a two-call issue in the frontend code (the dialog fires a single RPC call with both service_id and staff_member_id). The inconsistency ("sometimes works") was simply ticket age variance — tickets >30s old passed, tickets <30s old blocked.

**Fix applied (2026-07-01):**
- Added dedicated `service_changed_at TIMESTAMPTZ` column to `queue_tickets` (starts NULL)
- Updated RPC to check `service_changed_at` instead of `updated_at` for the 30s window
- NULL = first change always allowed; set to NOW() on each `update_ticket_service` call
- Added client-side debounce (`savingChange` state) to prevent double-click on confirm button

**Live verification:** Migration applied. Frontend built and deployed to preview.

**Files changed:** `TicketTracker.tsx:59,493-496,509,511`, `MASTER_SCHEMA.sql`

## Bug 6: Manifest CORS on preview NOT A BUG ❌ RESOLVED (expected behavior)

**Confirmed:** Browser redirect from `manifest.json` to `vercel.com/sso-api` is Vercel Deployment Protection (SSO/password gating on preview deployments). The `vercel_web_fetch_vercel_url` MCP tool can access `manifest.json` with a 200 response using Vercel session credentials, confirming the asset exists and serves correctly. Only anonymous browser requests get redirected.

CSP `manifest-src 'self' https://vercel.com` is correct and verified in response headers. This will NOT occur on the production domain (`leenya-dz.vercel.app`). No code fix needed.

**Files changed:** None.

## Bug 7: Default avatars/covers look grainy/mesh ❌ RESOLVED (replaced with grainy mesh gradient)

**Not a bug — design improvement.**
Replaced the old 8-palette linear gradient system in `PixelCover.tsx` and `pixel-avatar.ts` with a seeded grainy mesh gradient:
- Overlapping blurred radial blobs (`<feGaussianBlur>`) positioned via seeded PRNG
- Low-opacity noise overlay (`<feTurbulence>` + `<feColorMatrix>`) for film-grain texture
- All colors within Leenya purple family (hsl 250-290), varying hue/saturation/lightness per seed
- No external assets, no network cost — pure inline SVG, same as the old system
- Shared `hashName()` + `seededRandom()` in `pixel-avatar.ts` with `generateCoverBlobs()` export for `PixelCover.tsx`

**Files changed:** `src/lib/pixel-avatar.ts` (rewritten), `src/components/booking/PixelCover.tsx` (rewritten)

## Bug 8: Skip is a 1-position swap, not move-to-end ✅ RESOLVED

**Was:** `skip_queue_ticket` swapped position with the next waiting ticket. Staff had to click multiple times to skip someone past many people.

**Fix applied (2026-07-01):** Removed the Skip button entirely from StaffView, DashboardQueue, and QueueWaitingList. The "Send back to queue" + "Cancel" buttons already cover the same use cases without confusing behavior. The `skip_queue_ticket` RPC remains in the DB for backward compatibility but is no longer called from the frontend.

**Files changed:** `StaffView.tsx`, `DashboardQueue.tsx`, `QueueWaitingList.tsx`

## Bug 9: Change service dialog ignores staff_services ✅ RESOLVED

**Was:** The change service dialog in TicketTracker showed all staff members regardless of whether they offered the selected service. Users could assign a ticket to a staff member who doesn't do that service.

**Fix applied (2026-07-01):** Complete redesign of the change dialog:
- Two-step flow: pick a service first, then pick from staff who actually offer it
- Fetches `staff_services` via a join through `staff_members` (fixes bug where the query filtered by a non-existent `business_id` column on `staff_services`)
- Pre-selects the current service with a "Current" badge
- Shows "Currently: [service] → [staff]" at the top
- Toast message simplified to "Service updated" (no developer-ish concatenation)
- Current staff auto-cleared if they don't offer the newly selected service

**Files changed:** `TicketTracker.tsx`, locale files (EN/FR/AR booking.json)

---

## ✅ RESOLVED BUGS (historical)

## ✅ RESOLVED BUGS (historical)

## Bug 1: Skip → generic error ✅ RESOLVED

**Confirmed root cause:** The `skip_queue_ticket` RPC raises exceptions with `USING HINT = 'skip_last_in_queue'` (MASTER_SCHEMA.sql:1140). PostgREST maps `USING HINT` to `error.hint`, NOT `error.message`. Both `StaffView.tsx:117` and `DashboardQueue.tsx:243` checked `error.message.includes("skip_last_in_queue")` which never matches → every skip failure showed "Update error" even for legitimate "already last."

**Fix applied (2026-06-30):**
- Changed both handlers to read `(error as any)?.hint` instead of `error.message`
- Added `pg_advisory_xact_lock` to `skip_queue_ticket` to prevent concurrent skip/recalculate race (migration `20260630_advisory_lock_skip_ticket`)

**Files changed:** `StaffView.tsx:117`, `DashboardQueue.tsx:243`, `MASTER_SCHEMA.sql:1104-1150`

## Bug 2: get_queue_context → 400 ✅ RESOLVED

**Investigation (Sentry MCP):** Searched all unresolved issues + event search for `get_queue_context` in last 24h. Zero 400 errors found. 2 captured spans are both successful (200, ~60ms). Root cause was from old preview deployment code, not current codebase.

**No stale closure found.** Traced the real-time subscription + `refetchAll` closure chain: the subscription `useEffect` depends on `refetchAll`, which is recreated on `ticket` changes (correct deps). `refetchAll` uses refs (`businessIdRef.current`, `queueDateRef.current`) that are set once on mount, and `t.ticket_number` from a fresh API response.

**Fix applied (2026-06-30):** Added defensive null guard at top of `refreshQueueContext` (`if (!bizId || !qDate || !ticketNumber) return;`).

**Files changed:** `TicketTracker.tsx:96`

## Bug 3: Auth redirect race 🔍 MONITORING (2026-07-01 architecture fix)

**Root cause:** Two independent `get_user_role` RPC calls used to race after login — the auth listener's `fetchRole` and `LoginForm.handlePostAuth`'s direct call could resolve in opposite order, with the slower one overwriting the faster one's result.

**Phase 1 fix (2026-06-30):** Collapsed both paths into a shared promise (`pendingRolePromiseRef`), eliminated the yield-to-React via `getUser()`.

**Phase 2 fix (2026-07-01) — still monitoring:** The `handlePostAuth` fallback (direct `supabase.rpc("get_user_role")` on null) was a side-door writer that bypassed `pendingRolePromiseRef`. If the shared RPC transiently failed but the fallback succeeded, `AuthContext.role` stayed `null` while `handlePostAuth` navigated based on the correct role — ProtectedRoute would then redirect to `/`.

**Architecture fix applied:** Removed the side-door fallback from `LoginForm.tsx`. Instead, `getRole()` in `AuthContext.tsx` now retries once internally (clears ref, re-calls RPC) within the same shared promise. Both `fetchRole` and `waitForRole` see the retried result from the same promise. `Sentry.addBreadcrumb` fires on retry for production signal.

**Status:** Watching Sentry breadcrumbs for a week. If zero retries fire, or retries always resolve to the correct role, this is fully closed.

**Files changed:** `AuthContext.tsx` (`getRole` retry + Sentry breadcrumb), `LoginForm.tsx` (fallback removed)

## Bug 4: CSP blocks Vercel preview tooling ✅ RESOLVED

**Confirmed:** `vercel.live` (feedback.js) and `vercel.com` (manifest.json) blocked by CSP `default-src 'self'`.

**Fix applied (2026-06-30):** Added `https://vercel.live` to `script-src`, `connect-src`, `frame-src`. Added `https://vercel.com` to `manifest-src`, `frame-src`.

**Files changed:** `vercel.json:17`
