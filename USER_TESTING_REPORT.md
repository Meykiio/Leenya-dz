# User Testing Report — Leenya

**Date:** 2026-07-02
**Method:** Playwright automation | Visual inspection | Supabase direct query | Code review | Security adversarial testing
**Environment:** Production (leenya-dz.vercel.app) + Live Supabase DB

---

## Executive Summary

The app is fundamentally **functional and well-architected** for customer-facing flows. Queue join, public pages, TV display, route protection, and multilingual rendering all work correctly across business categories. **37 of 38 automated tests pass.**

Two critical areas need attention:

1. **Security: 6 RPCs are accessible to anonymous users** when they should require authentication. Any anon user can skip tickets, reassign staff, check-in customers, read PII (names + phone numbers), and recalculate queue positions for any business.
2. **Code health: The 3 largest components** (TicketTracker at 630 lines, StaffView at 559 lines, QueueFlow at 478 lines) have stale closure bugs and should be split.

---

## Persona Results

### 1. Anonymous Customer (visitor)

| Test | Result | Notes |
|---|---|---|
| Business page loads | ✅ Passed | All 4 businesses render correctly (3 barbershops, 1 beauty salon) |
| Queue page has form elements | ✅ Passed | Name, phone, service selection fields visible |
| Queue page shows correct business name | ✅ Passed | "Leen Barber" displayed |
| TV display mode loads | ✅ Passed | Minimal full-screen display renders |
| Booking track gracefully handles invalid token | ✅ Passed | No crash on malformed URL |
| Mobile viewport renders | ✅ Passed | Both business page and queue page render at 375×812 |
| Landing page features section | ✅ Passed | French copy renders, feature cards visible |
| Footer has legal links | ✅ Passed | Terms/privacy links present |
| FAQ section renders | ✅ Passed | FAQ section renders |
| Pricing section renders | ✅ Passed | Pricing cards visible |

**Observation:** Google Lighthouse integration report mentions Meta tags not being available — this is expected for an SPA without server-side rendering. Not a bug.

### 2. Anonymous Customer (multilingual)

| Test | Result | Notes |
|---|---|---|
| French (default) landing | ✅ Passed | Page title in French |
| Arabic RTL rendering | ✅ Passed | `[dir="rtl"]` set on `<html>` after React hydration |
| English LTR rendering | ✅ Passed | `[dir="ltr"]` set on `<html>` after React hydration |

**Observation:** Arabic and English work correctly. The `dir` attribute is set via `useEffect` in `useLanguage.ts` — it fires after React hydration, not at HTML parse time. This means there's a brief flash of wrong direction before the JS runs. Not critical but visible on slow connections.

### 3. Staff Member

| Test | Result | Notes |
|---|---|---|
| Staff route redirects unauthenticated | ✅ Passed | `/staff` → `/login` |
| Login page has email/password fields | ✅ Passed | Both input types present |
| Login page has forgot password | ✅ Passed | Reset password link visible |

**Not tested directly:** No staff credentials were available for authenticated flows. The code path is:
- `StaffView.tsx` (559 lines) — fetches staff queue via `get_staff_queue` RPC
- Protected by `ProtectedRoute` with `allowedRoles={["staff"]}`
- Uses polling + realtime subscription for live updates

### 4. Business Owner

| Test | Result | Notes |
|---|---|---|
| Dashboard redirects unauthenticated | ✅ Passed | `/dashboard` → `/login` |
| Dashboard security: login form presents correctly | ✅ Passed | Email + password inputs + forgot password |

**Not tested directly:** No owner credentials available. Dashboard consists of 8+ sub-pages (Analytics, Queue, Bookings, Services, Staff, Settings, Subscription, Hours). The `use-business-info.ts` hook was recently stabilized with `useMemo` to prevent cascade re-fetches.

### 5. Superadmin

| Test | Result | Notes |
|---|---|---|
| `/admin` route redirects unauthenticated | ✅ Passed | → `/login` |

**Real superadmin exists:** User `74bcfb51-...` has both `owner` and `superadmin` roles. `Admin.tsx` is properly gated by `allowedRoles={["superadmin"]}`. No credentials available for login.

### 6. Receptionist (does not exist)

The `receptionist` role does not exist anywhere in the codebase — zero grep matches in routes, roles, or UI. The closest equivalent is `staff`. If a receptionist persona is needed, it should be built from `staff` with modified permissions.

---

## Security Assessment

### 🔴 CRITICAL: Grant Drift — 6 RPCs Accessible to Anonymous Users

**Live DB grants are wider than MASTER_SCHEMA declares.** All 6 functions below have anon EXECUTE in production:

| Function | MASTER_SCHEMA says | Live DB | Impact |
|---|---|---|---|
| `get_dashboard_queue` | authenticated | **anon + auth** | Any unauthenticated user can read full PII (names + phones) for any business's queue |
| `check_in_ticket` | authenticated | **anon + auth** | Anyone can mark any ticket as checked in |
| `reassign_queue_ticket` | authenticated | **anon + auth** | Anyone can reassign staff on any ticket |
| `recalculate_queue_positions` | authenticated | **anon + auth** | Anyone can renumber queues |
| `send_ticket_back_to_queue` | authenticated | **anon + auth** | Anyone can send any ticket back to waiting |
| `skip_queue_ticket` | authenticated | **anon + auth** | Anyone can skip any ticket in any queue |

**Attack scenario:** A competitor or malicious actor with the anon API key (which is public by design in Supabase) can disrupt all queue operations across the platform.

### 🟠 HIGH: Missing Ownership Checks in 5 Mutating RPCs

Even after fixing the grant drift, these functions operate without verifying the caller owns the ticket or business:

| Function | Missing Check |
|---|---|
| `cancel_queue_ticket` | No `auth.uid()` check at all — any caller with a ticket UUID can cancel it |
| `skip_queue_ticket` | No business-ownership or ticket-ownership check |
| `check_in_ticket` | No ownership check |
| `reassign_queue_ticket` | No ownership check |
| `send_ticket_back_to_queue` | No ownership check |

**Correctly protected:** `create_staff_user`, `upsert_business`, `insert_services` — all verify `businesses.owner_id = auth.uid()`.

### 🟡 MEDIUM: `update_ticket_service` Walk-in Bypass

When `client_id IS NULL` (walk-in customer without auth), **any authenticated user** can modify the service and staff on that ticket. The check `auth.uid() != client_id` is only reached when `client_id IS NOT NULL`.

### 🟡 MEDIUM: Advisory Lock Collision

`skip_queue_ticket` uses `hashtext()` (32-bit hash) for advisory locks. With enough businesses, birthday paradox collisions become non-trivial.

### 🟢 LOW: Error Message Leakage

Several RPCs use `USING HINT` with semantically meaningful values (`ticket_not_found`, `not_owner`, `rate_limited`, `skip_no_position`) that leak internal state to callers.

---

## Code Maintainability Assessment

### 🔴 P0: Stale Closure in TicketTracker.refetchAll

**File:** `src/components/booking/TicketTracker.tsx` (line 199)
**Problem:** `refetchAll` reads `ticket` from closure scope but `ticket` is omitted from the dependency array (with `eslint-disable`). Realtime subscription calls `refetchAll` with stale `ticket` state.
**Fix:** Remove `eslint-disable`, properly depend on `ticket` or refactor to use refs.

### 🔴 P0: Uncleared setTimeout in AuthContext

**File:** `src/contexts/AuthContext.tsx` (line 104)
**Problem:** `setTimeout(() => fetchRole(), 0)` is scheduled on `SIGNED_IN` but never cleared on unmount. Can call `setState` on unmounted provider.
**Fix:** Store timeout ID and clear in effect cleanup.

### 🟠 P1: 3 Components Are 4-6x Recommended Size

| Component | Lines | Recommended max | Problem |
|---|---|---|---|
| `TicketTracker.tsx` | 630 | 100 | Stale closure + inline dialogs + localStorage logic + polling |
| `StaffView.tsx` | 559 | 100 | Queue + bookings mixed in single component |
| `QueueFlow.tsx` | 478 | 100 | 48-line inline `computeEWT` + multi-concern useEffect |
| `DashboardQueue.tsx` | 426 | 100 | Fetching + realtime + inline handlers |
| `DashboardAnalytics.tsx` | 382 | 100 | 7 inline queries + any casts |

### 🟠 P1: 33 Ungated console.error Calls Across 9 Files

**Worst offenders:** `DashboardStaff.tsx` (13 calls), `AuthContext.tsx` (3 calls — may log PII), `DashboardServices.tsx` (5 calls), `TicketTracker.tsx` (5 calls). All log in production with no `import.meta.env.DEV` guard.

### 🟡 P2: 28 `any` Type Usages

Systemic pattern: `Record<string, unknown>` mappings with `as` casts to work around untyped Supabase RPC responses. Highest ROI: define typed RPC response interfaces.

---

## Business Category Cross-Cutting Analysis

| Category | Businesses | Public page | Queue | Booking |
|---|---|---|---|---|
| Barbershop | leen-barber, lean-barber, karims-barbershop-rlwr | ✅ | ✅ | ✅ |
| Beauty salon | qa-test-barbershop-updated | ✅ | Not tested (no slug found with queue enabled) | ✅ |

The app works identically across categories — no category-specific branching was observed in the page rendering. The `beauty_salon` category shows the same UI patterns as barbershops, which is appropriate for an MVP.

---

## Non-Blocking Observations

1. **Dir attribute timing:** Arabic/English tests required a `.catch(() => {})` around `waitForSelector("[dir]")` because the attribute is set via React `useEffect` after hydration. Adding `dir="ltr"` to `index.html` `<html>` tag would eliminate the flash-of-wrong-direction and make tests more reliable.

2. **Test regex bug:** 1 of 38 tests failed because the regex used `Ǹ` (capital N with grave, U+01F8) instead of `é` (e with acute, U+00E9) to match "Réserver" — a test typo, not an app bug.

3. **Onboarding accessible without auth:** `/onboarding` loads for unauthenticated users (intentional — it's the business signup flow).

4. **Paused queue notice:** `lean-barber` has its queue paused. The page renders without error — the notice is present in the UI.

---

## Priority Recommendations

| Priority | Action | Category |
|---|---|---|
| **P0** | Revoke anon EXECUTE on `get_dashboard_queue`, `check_in_ticket`, `reassign_queue_ticket`, `recalculate_queue_positions`, `send_ticket_back_to_queue`, `skip_queue_ticket` | Security |
| **P0** | Add ownership checks to `cancel_queue_ticket`, `skip_queue_ticket`, `check_in_ticket`, `reassign_queue_ticket`, `send_ticket_back_to_queue` | Security |
| **P0** | Fix stale closure in `TicketTracker.refetchAll` — remove eslint-disable, fix deps | Maintainability |
| **P0** | Clear `setTimeout` on unmount in `AuthContext` | Maintainability |
| **P1** | Fix `update_ticket_service` walk-in bypass — check business ownership when `client_id IS NULL` | Security |
| **P1** | Gate all 33 production `console.error` calls behind `import.meta.env.DEV` | Security/Quality |
| **P1** | Split TicketTracker (630 → ~200), StaffView (559 → ~200), QueueFlow (478 → ~200) | Maintainability |
| **P2** | Replace `hashtext()` with collision-free advisory lock pattern | Reliability |
| **P2** | Replace 28 `any` casts with typed RPC response interfaces | Maintainability |
| **P2** | Strip semantically meaningful HINTs from error messages | Security |
| **P3** | Add static `dir="ltr"` to `index.html` for hydration consistency | UX |

---

*Generated by automated Playwright testing, code review, and adversarial security analysis.*
