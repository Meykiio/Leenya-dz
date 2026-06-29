# Role 29 — Multi-Tenancy Isolation Auditor Report

**Date:** 2026-06-29
**Auditor:** Role 29 (Multi-Tenancy Isolation Auditor)
**Scope:** Full tenant isolation audit across all interfaces (database, API, Realtime, Storage, RPC functions)

---

## Tenant Identity Establishment Assessment

| Code Path | Tenant ID Source | Secure? | Evidence |
|-----------|-----------------|---------|----------|
| Owner dashboard queries | Derived from JWT: `businesses` looked up via `.eq("owner_id", auth.uid())` in `useBusinessInfo()` | YES | `src/hooks/use-business-info.ts:28-29` — `supabase.from("businesses").select("...").eq("owner_id", user.id)` |
| Staff view | Derived from JWT: `staff_members` looked up via `.eq("profile_id", user.id)` | YES | `src/pages/StaffView.tsx:41-47` — `.eq("profile_id", user.id)` |
| Client views | Derived from JWT: RLS policies check `auth.uid() = client_id` | YES | RLS policies: bookings, queue_tickets client-scoped |
| Public business page | URL slug (slug) — not a tenant ID, used to look up business | N/A (public) | `src/pages/BusinessPublic.tsx:75` — `.eq("slug", slug)` |
| Public display queue | URL slug → business ID | N/A (public) | `src/pages/QueueDisplay.tsx:108-113` — `.eq("slug", slug)` |
| Booking tracking | Booking token (UUID) — not a tenant ID | N/A (public) | `src/pages/BookingTrack.tsx:31` — `.rpc("get_booking_by_token", { p_token: token })` |
| SECURITY DEFINER RPCs (various) | Client-supplied UUID parameter | **NO — VULNERABLE** | `supabase/schema/MASTER_SCHEMA.sql:485` onwards — multiple RPCs accept `p_business_id`, `p_staff_id`, `p_owner_id` from caller without verifying ownership |

**Verdict:** Application code (frontend) always derives tenant identity from JWT. However, multiple SECURITY DEFINER RPC functions accept tenant/resource identifiers from the client without verifying the caller's ownership — these bypass the JWT-based identity chain.

---

## Isolation Coverage Matrix

| Interface | Resource Type | Tenant Filter Present? | Verified By | Bypass Possible? |
|-----------|--------------|----------------------|-------------|-----------------|
| Database (RLS) | bookings | YES — owner, staff, client policies all scoped | RLS policies 1-8 | No (RLS enforces at row level) |
| Database (RLS) | queue_tickets | YES — owner, staff, client, anon policies scoped | RLS policies 25-32 | No (RLS enforces at row level) |
| Database (RLS) | businesses | YES — owner-only for write, `is_active = true` for public read | RLS policies 11-15 | No |
| Database (RLS) | services | YES — owner-manage, public-read-active | RLS policies 36-37 | No |
| Database (RLS) | staff_members | YES — owner-manage, public-read-active | RLS policies 38-40 | Partial — "Public can view active staff" exposes all staff IDs and business IDs |
| Database (RLS) | staff_services | YES — owner-manage, public-read-active | RLS policies 41-42 | No |
| Database (RLS) | reviews | YES — `auth.uid() = client_id` for insert, public read | RLS policies 33-35 | No (public read by design) |
| Database (RLS) | business_hours | YES — owner-manage, public-read | RLS policies 9-10 | No |
| Database (RLS) | whatsapp_templates | YES — scoped by business ownership | RLS policies 44-47 | No |
| Database (RLS) | queue_counters | YES — owner/staff scoped | RLS policies 22-24 | No |
| Database (RLS) | profiles | YES — own-profile only | RLS policies 19-21 | No |
| Database (RLS) | user_roles | YES — own-roles only | RLS policies 43 | No |
| Database (RLS) | feedback | YES — owner-scoped for SELECT/DELETE | RLS policies 16-18 | No |
| API — RPC: `get_business_queue` | queue_tickets | **NO** — takes `p_business_id` from caller | `MASTER_SCHEMA.sql:656-673` | YES — SECURITY DEFINER bypass, any business |
| API — RPC: `get_queue_ticket` | queue_tickets | **NO** — takes `p_ticket_id` from caller | `MASTER_SCHEMA.sql:643-653` | YES — SECURITY DEFINER, returns ticket data for any ID |
| API — RPC: `get_booking_by_token` | bookings | **NO** — takes `p_token` from caller | `MASTER_SCHEMA.sql:754-778` | YES — SECURITY DEFINER, returns booking data (name, phone, date, notes) |
| API — RPC: `cancel_booking_by_token` | bookings | **NO** — takes `p_booking_id` + `p_token` | `MASTER_SCHEMA.sql:781-801` | Partial — requires token (mitigated by token security) |
| API — RPC: `create_staff_user` | staff_members | **NO** — takes `p_staff_id` from caller, no ownership check | `MASTER_SCHEMA.sql:485-543` | **YES — CRITICAL: cross-tenant staff account hijack** |
| API — RPC: `upsert_business` | businesses | **NO** — takes `p_owner_id` from caller, no verification | `MASTER_SCHEMA.sql:567-614` | YES — cross-tenant business modification |
| API — RPC: `insert_services` | services | **NO** — takes `p_business_id` from caller | `MASTER_SCHEMA.sql:621-636` | YES — cross-tenant service insertion |
| API — RPC: `get_completed_ticket_stats` | queue_tickets | **NO** — takes `p_business_id` | `MASTER_SCHEMA.sql:676-711` | YES — but public data only (avg wait time, staff count) |
| API — RPC: `get_queue_context` | queue_tickets | **NO** — takes `p_business_id` | `MASTER_SCHEMA.sql:714-751` | YES — but public data only |
| API — RPC: `get_monthly_business_counts` | bookings/queue | **NO** — takes `p_business_id` | `MASTER_SCHEMA.sql:447-463` | YES — SECURITY DEFINER, returns booking/queue/staff counts for any business |
| Realtime | queue_tickets | YES — filter `business_id=eq.${business.id}` | `src/components/dashboard/DashboardLayout.tsx:78-82`, `src/pages/dashboard/DashboardQueue.tsx:96-101` | No |
| Realtime | bookings | YES — filter `business_id=eq.${business.id}` | `src/components/dashboard/DashboardLayout.tsx:97-102`, `src/pages/dashboard/DashboardBookings.tsx:148-153` | No |
| Realtime | queue_tickets (staff) | YES — filter `business_id=eq.${business.id}` | `src/pages/StaffView.tsx:102-106` | No |
| Realtime | queue_tickets (display) | YES — filter `business_id=eq.${businessId}` | `src/pages/QueueDisplay.tsx:124-131` | No |
| Storage | business-assets | **Partial** — INSERT/UPDATE/DELETE require auth + business ownership, SELECT is public | `MASTER_SCHEMA.sql:1614-1658` | YES — bucket is public, files world-readable by URL |
| Storage | business-assets (INSERT) | **Incomplete** — path not validated against caller's business | `MASTER_SCHEMA.sql:1628-1636` | YES — any business owner can write to any path |

---

## IDOR Test Results

| Resource Type | Test: Tenant A ID accessed as Tenant B | Outcome | Control That Prevented (if blocked) |
|--------------|---------------------------------------|---------|-------------------------------------|
| booking `id` via Supabase SELECT (owner access) | Blocked | RLS: `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())` |
| booking `id` via Supabase UPDATE (owner access) | Blocked | RLS: same subquery pattern |
| queue_ticket `id` via Supabase SELECT (owner access) | Blocked | RLS: same subquery pattern |
| staff_member `id` via Supabase DELETE (owner access) | Blocked | RLS: `EXISTS (SELECT 1 FROM businesses WHERE id = staff_members.business_id AND owner_id = auth.uid())` |
| service `id` via Supabase UPDATE (owner access) | Blocked | RLS: same subquery pattern |
| **staff_member `id` via RPC `create_staff_user`** | **VULNERABLE** | **No control — SECURITY DEFINER RPC doesn't verify caller owns the staff member** |
| business `owner_id` via RPC `upsert_business` | **VULNERABLE** | **No control — SECURITY DEFINER RPC trusts client-supplied p_owner_id** |
| business `id` via RPC `insert_services` | **VULNERABLE** | **No control — SECURITY DEFINER RPC trusts client-supplied p_business_id** |
| booking via `get_booking_by_token` | Accessible | Design — token-gated access (requires valid UUID token from the booking) |
| queue_ticket via `get_queue_ticket` | Accessible | Design — public RPC for ticket tracking (returns non-sensitive status data) |
| business queue via `get_business_queue` | Accessible | Design — public RPC returns active queue (ticket labels + status, no PII) |
| staff_services (`id`) via Supabase | Blocked | RLS: joins through staff_members → businesses → owner_id check |
| bookings via Supabase SELECT (client access, different business) | Blocked | RLS: `auth.uid() = client_id` |

---

## Realtime Isolation Audit

| Channel | Filtered by Tenant? | Evidence | Risk |
|---------|-------------------|----------|------|
| `sidebar-queue-badge` | YES — `business_id=eq.${business.id}` | `src/components/dashboard/DashboardLayout.tsx:78-82` | None |
| `sidebar-pending-bookings` | YES — `business_id=eq.${business.id}` | `src/components/dashboard/DashboardLayout.tsx:97-102` | None |
| `queue-realtime` | YES — `business_id=eq.${business.id}` | `src/pages/dashboard/DashboardQueue.tsx:96-101` | None |
| `bookings-realtime` | YES — `business_id=eq.${business.id}` | `src/pages/dashboard/DashboardBookings.tsx:148-153` | None |
| `queue-stats` (public) | YES — `business_id=eq.${businessId}` | `src/components/booking/QueueFlow.tsx:126-131` | None (public page, uses business ID from URL) |
| `display-queue` | YES — `business_id=eq.${businessId}` | `src/pages/QueueDisplay.tsx:124-131` | None (public queue display) |
| `staff-view` | YES — `business_id=eq.${business.id}` | `src/pages/StaffView.tsx:102-106` | None |
| `queue-tracker-{ticketId}` | YES — `business_id=eq.${businessIdRef.current}` | `src/components/booking/TicketTracker.tsx:169-181` | None (uses business ID from the fetched ticket) |

**Realtime Verdict:** All channels are scoped by `business_id` via Realtime filter expressions. No cross-tenant Realtime leak identified.

---

## Findings Table

| ID | Title | Interface | Description | Severity | Confidence | Evidence | Remediation |
|----|-------|-----------|-------------|----------|------------|----------|-------------|
| MT-001 | **`create_staff_user` RPC accepts any staff_member_id without ownership validation** | RPC (SECURITY DEFINER) | Any authenticated user can call `create_staff_user(p_staff_id, p_email, p_password)` with a staff_member ID from any other business. The RPC creates a new auth user, creates a staff role, and UPDATES the target staff_member's `profile_id` to the new user — bypassing RLS. The attacker then signs in as the new user and accesses the victim's business as a staff member. Staff_member IDs are discoverable via the "Public can view active staff" RLS policy on `staff_members`. | **SEV-1** | **5** | `MASTER_SCHEMA.sql:485-543` — function body; `MASTER_SCHEMA.sql:1308-1316` — staff SELECT policy exposes IDs; `src/pages/dashboard/DashboardStaff.tsx:121-148` — how it's called legitimately from frontend | Add `SELECT 1 FROM businesses JOIN staff_members ON staff_members.business_id = businesses.id WHERE staff_members.id = p_staff_id AND businesses.owner_id = auth.uid()` check inside the function, or switch to using `business_id` parameter and verifying ownership. |
| MT-002 | **`upsert_business` RPC trusts client-supplied `p_owner_id`** | RPC (SECURITY DEFINER) | Any authenticated user can call `upsert_business(p_owner_id, ...)` with any user ID as `p_owner_id`. This allows modifying or creating a business in another user's name. Business owner_ids are discoverable via the "Public can view active businesses" RLS policy. | **SEV-1** | **5** | `MASTER_SCHEMA.sql:567-614` — function body; `MASTER_SCHEMA.sql:1259-1261` — businesses SELECT policy exposes owner_id | Remove `p_owner_id` parameter. Use `auth.uid()` inside the function.  |
| MT-003 | **`insert_services` RPC trusts client-supplied `p_business_id`** | RPC (SECURITY DEFINER) | Any authenticated user can call `insert_services(p_business_id, ...)` to insert services into any business. Business IDs are discoverable via the public businesses policy. | **SEV-2** | **5** | `MASTER_SCHEMA.sql:621-636` — function body | Add ownership check: `EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid())` |
| MT-004 | **`get_monthly_business_counts` RPC returns counts for any `p_business_id`** | RPC (SECURITY DEFINER) | Any authenticated user can call `get_monthly_business_counts(p_business_id)` to get booking count, queue count, and staff count for any business. Confidence 4 because this is aggregate data, not PII. | **SEV-3** | **4** | `MASTER_SCHEMA.sql:447-463` | Change to SECURITY INVOKER or add ownership check |
| MT-005 | **Storage bucket is public — files world-readable by URL** | Storage | The `business-assets` bucket is public. Any file URL is accessible to anyone who knows or guesses the path. File paths use business IDs (UUIDs) which are not guessable but are discoverable. | **SEV-3** | **5** | `MASTER_SCHEMA.sql:1614-1616` — bucket `public = true`; comment on line 1618: "Public URLs still work without listing permission" | Set bucket to private if business assets should not be public. Alternatively, keep public if business logos/covers are intended to be public (they are shown on the public business page). |
| MT-006 | **Storage INSERT policy doesn't validate upload path** | Storage | The RLS for storage INSERT checks `owner_id = auth.uid()` (user owns ANY business) but does NOT check that the upload path belongs to the user's business. A user with `business_a.id` could upload to path `business_b/logo.png` and overwrite business B's logo. | **SEV-3** | **3** | `MASTER_SCHEMA.sql:1628-1636` — policy does not reference file path | Add path-based validation (e.g., check that path starts with the user's business ID or staff ID pattern that they own) |
| MT-007 | **`get_booking_by_token` RPC returns PII for any valid token** | RPC (SECURITY DEFINER) | The RPC returns client_name, client_phone, date, time, status, notes for a booking when given a valid `booking_token`. While tokens are UUIDs (unguessable), the `booking_token` appears in URLs sent via WhatsApp (tracking links). Anyone with the URL can access the booking data. | **SEV-3** | **3** | `MASTER_SCHEMA.sql:754-778` — returns `client_name`, `client_phone`, `notes`; `src/pages/BookingTrack.tsx:30-42` — how it's called from frontend | Consider rate limiting the token lookup or adding optional auth check |
| MT-008 | **Public RLS policy on staff_members exposes all staff IDs** | Database | The "Public can view active staff" policy exposes all staff member IDs, business IDs, and display names to anyone (including unauthenticated users). This is the prerequisite for the MT-001 attack. | **SEV-4** | **5** | `MASTER_SCHEMA.sql:1308-1316` — policy `FOR SELECT USING (is_active = true)` | Restrict to only necessary columns or only expose for active businesses. But staff member IDs are needed by the public booking flow to show staff options. |
| MT-009 | **Public RLS policy on businesses exposes owner_id** | Database | The "Public can view active businesses" policy exposes `owner_id` for every active business. This is the prerequisite for the MT-002 attack. | **SEV-4** | **5** | `MASTER_SCHEMA.sql:1259-1261` — policy `FOR SELECT USING (is_active = true)` | Remove `owner_id` from the public select, or create a view that excludes it. But the frontend public page query (`BusinessPublic.tsx`) selects `*` which includes owner_id. |
| MT-010 | **Feedback dashboard page doesn't set business_id** | Frontend | The dashboard feedback form (`DashboardFeedback.tsx`) submits feedback without setting `business_id`. This means feedback from the dashboard is not associated with any business and owners cannot view it via RLS (since the SELECT policy checks `business_id`). | **SEV-5** | **5** | `src/pages/dashboard/DashboardFeedback.tsx:30-35` — `supabase.from("feedback").insert({...})` missing `business_id` | Include `business_id: business.id` in the insert |
| MT-011 | **TicketTracker cancellation calls RPC with empty strings** | Frontend | The `handleCancel` function in `TicketTracker.tsx` calls `cancel_booking_by_token` with empty strings: `{ p_booking_id: "", p_token: "" }`. The `canCancel` flag is hardcoded to `false`, so this code path is never triggered, but it represents dead/unmaintained code. | **SEV-5** | **5** | `src/components/booking/TicketTracker.tsx:186-197` | Remove dead code or implement proper cancellation |

---

## Missing Information Log

| Item | What Was Sought | Where Not Found |
|------|----------------|-----------------|
| Edge Functions | Whether any Edge Functions exist that could bypass RLS | No Edge Functions deployed. Confirmed via codebase inspection and context. |
| Caching layer | Whether any server-side/Redis/CDN caching could mix tenant data | No caching layer identified. Supabase queries go directly to Postgres with RLS. No Redis, no CDN caching of database results. |
| Data export feature | Whether any CSV/JSON export could expose other tenant data | No export feature identified in the codebase. |
| Webhook configuration | Whether webhooks could leak cross-tenant data | No webhook configuration found. |
| Service role key usage in client | Whether the service role key is used client-side | Only `SUPABASE_PUBLISHABLE_KEY` (anon key) is used in the client. Confirmed in `src/integrations/supabase/client.ts:5-6`. |
| `get_booking_by_token` rate limit | Whether there is rate limiting on token lookup | No rate limiting on the RPC. The `check_insert_rate_limit` trigger only applies to INSERT operations on bookings and queue_tickets. |
| `upsert_profile` RPC vulnerability | Whether `upsert_profile` accepts and trusts client-supplied `p_id` | Yes, it takes `p_id` from client. However, the frontend (onboarding) always passes `user.id`. An authenticated user could call it with any `p_id` to update another user's profile. Additional SEV-2 finding. | 

**Note on `upsert_profile`:** This RPC (line 550-562) also trusts client-supplied `p_id` without verifying `auth.uid()`. Any authenticated user could update another user's profile. This was not in the initial system prompt's RPC list but was found during codebase inspection.

---

## Escalations

| Finding ID | Escalate To | Reason |
|-----------|-------------|--------|
| MT-001 | Database / Security Lead | Cross-tenant data access via staff account hijack. Requires immediate database schema fix. |
| MT-002 | Database / Security Lead | Cross-tenant business data manipulation. Requires immediate database schema fix. |
| MT-003 | Database / Security Lead | Cross-tenant service insertion. Requires immediate database schema fix. |
| MT-006 | Database / Security Lead | Storage path validation gap. Should be fixed to prevent overwriting other business assets. |
| MT-011 | Frontend Lead | Dead code that should be cleaned up or properly implemented. |

---

## Isolation Verdict

**VERDICT: NOT ISOLATED**

### Confirmed Cross-Tenant Data Access Paths

**1. MT-001 — Staff Account Hijack (SEV-1, Confidence 5)**

This is a confirmed cross-tenant data access path:

**Attack chain:**
1. Attacker signs up as a legitimate user (e.g., `attacker@example.com`)
2. Attacker queries `staff_members` → gets `id` of a staff member belonging to Business B
3. Attacker calls `supabase.rpc("create_staff_user", { p_staff_id: "victim-staff-id", p_email: "evil@example.com", p_password: "hacked" })`
4. The SECURITY DEFINER RPC creates auth user `evil@example.com`, assigns `staff` role, and updates victim staff member's `profile_id` to the new user
5. Attacker signs in as `evil@example.com`
6. Attacker accesses Business B's bookings and queue data through staff RLS policies

**Result:** Attacker gains staff-level access to any business. Can view, update, call, and complete queue tickets and bookings belonging to the victim business. Can send WhatsApp messages to clients using the business identity. This is catastrophic.

**Blocking:** SEV-1 blocks release unconditionally.

**Fix required:** Add `businesses.owner_id = auth.uid()` check inside `create_staff_user` before allowing the staff member link.

**2. MT-002 — Business Data Manipulation (SEV-1, Confidence 5)**

**Attack chain:**
1. Attacker queries `businesses` with `is_active = true` → gets `owner_id` of any business
2. Attacker calls `upsert_business(p_owner_id: "victim-owner-id", ...)` with malicious data
3. The SECURITY DEFINER RPC updates or recreates the victim's business with attacker-controlled data
4. Victim's business name, slug, phone, address, and category are all overwritten

**Result:** Attacker can deface, impersonate, or redirect clients of any active business.

**Fix required:** Remove `p_owner_id` parameter; use `auth.uid()` inside the function.

### Isolation Status by Layer

| Layer | Status | Notes |
|-------|--------|-------|
| Database RLS | **ISOLATED** | All table-level RLS policies correctly scope queries by tenant |
| Realtime | **ISOLATED** | All channels filter by `business_id` |
| Storage upload | **PARTIALLY ISOLATED** | Upload restricted to authenticated business owners, but path not validated against caller's business |
| Storage read | **NOT ISOLATED** | Bucket is public — files are world-readable by URL |
| **RPC Functions (SECURITY DEFINER)** | **NOT ISOLATED** | Multiple RPCs accept tenant/resource IDs from client without verifying ownership. Three functions (`create_staff_user`, `upsert_business`, `insert_services`) allow confirmed cross-tenant operations. |
| Frontend queries | **ISOLATED** | All queries use business ID from React context (derived from JWT) |

### Required Actions Before Release

1. **IMMEDIATE (blocks release):** Fix `create_staff_user` to validate `p_staff_id` belongs to caller's business (MT-001)
2. **IMMEDIATE (blocks release):** Fix `upsert_business` to use `auth.uid()` instead of client-supplied `p_owner_id` (MT-002)
3. **HIGH:** Fix `insert_services` to validate `p_business_id` ownership (MT-003)
4. **HIGH:** Fix `upsert_profile` to validate `p_id` matches `auth.uid()` (found during audit, not in original scope)
5. **MEDIUM:** Fix storage INSERT policy to validate upload path against caller's business (MT-006)
6. **LOW:** Fix feedback form to include `business_id` (MT-010)
7. **LOW:** Remove dead cancel code from TicketTracker (MT-011)

---

*Report compiled from codebase analysis of `C:\Users\DELL\Desktop\Projects\Leenya\leenya-main` — files examined include all dashboard pages, public pages, booking components, onboarding components, MASTER_SCHEMA.sql, Realtime subscriptions, and Storage policies.*
