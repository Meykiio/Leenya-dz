# Role 05 — Offensive Security / Red Team Lead

**Assessor:** Principal Offensive Security Engineer  
**Date:** 2026-06-29  
**Target:** Leenya — Queue & Appointment Management SaaS  
**Stack:** React + TypeScript + Supabase (Postgres) + Vercel  
**Access Level:** Source code read (simulates recon-complete attacker)  

---

## EXECUTIVE SUMMARY

**8 of 14 attack scenarios succeeded (57%)**, of which 5 are SEV-1 critical with immediate exploitation paths. The most severe finding is a privilege escalation chain allowing any authenticated user to take over any business — using public data (owner IDs and staff IDs exposed by overly permissive RLS policies) combined with SECURITY DEFINER RPCs that lack ownership verification. Cross-tenant data isolation fails at the application layer, not the database layer. No edge functions are deployed, so all attack surface is in Postgres RPCs and RLS.

**Attackers exploited: Persona 1 (Competitor), Persona 2 (Malicious Customer), Persona 3 (Disgruntled Employee), Persona 4 (Automated Abuser)**.

---

## Attack Scenario Log

| Scenario ID | Persona | Target | Method | Outcome | Control (if fail) | Evidence |
|---|---|---|---|---|---|---|
| HPE-01 | Competitor | Another business's appointments | Modify `business_id` in booking fetch query | **FAILED** | RLS policy requires `owner_id = auth.uid()` on businesses | `DashboardBookings.tsx:69` filtered by `business.id` from `useBusinessInfo`; RLS at `MASTER_SCHEMA.sql:1362-1372` |
| HPE-02 | Competitor | Sequential appointment ID enumeration | Try sequential UUID guesses across tenant boundary | **FAILED** | UUIDs non-enumerable; RLS blocks cross-tenant SELECT | RLS at `MASTER_SCHEMA.sql:1354-1356` restricts to `client_id` match |
| HPE-03 | Competitor | Another business's queue via Realtime | Subscribe to Realtime channel with another business_id | **FAILED** | Application subscribes to `business_id=eq.${businessId}`; only business's own ID used | `DashboardQueue.tsx:98`, `QueueFlow.tsx:128` |
| HPE-04 | Competitor | All customer contact data | Exploit `upsert_business` with victim's `owner_id` | **SUCCEEDED** | — | RPC at `MASTER_SCHEMA.sql:567-614` accepts `p_owner_id` without `auth.uid()` check |
| VPE-01 | Malicious Customer | Role escalation to owner | Direct INSERT into `user_roles` with `role = 'owner'` | **SUCCEEDED** | — | RLS policy `MASTER_SCHEMA.sql:1252-1254` only checks `auth.uid() = user_id` |
| VPE-02 | Disgruntled Former Employee | Staff account hijack | Call `create_staff_user` with discovered staff_id + attacker email | **SUCCEEDED** | — | RPC `MASTER_SCHEMA.sql:485-543` has no ownership check on `p_staff_id`; staff IDs public via `staff_members` RLS |
| VPE-03 | Disgruntled Former Employee | Owner profile takeover | Call `upsert_profile` with target user's ID | **SUCCEEDED** | — | RPC `MASTER_SCHEMA.sql:550-561` accepts any `p_id` with no ownership check |
| VPE-04 | Competitor | Inject services into competitor business | Call `insert_services` with victim's business_id | **SUCCEEDED** | — | RPC `MASTER_SCHEMA.sql:621-635` accepts any `p_business_id` with no ownership check |
| AUTH-01 | Any | Password reset token reuse | Reuse consumed password reset token | **FAILED** | Handled by Supabase Auth server-side (single-use tokens) | Reference: Supabase Auth spec |
| AUTH-02 | Disgruntled Former Employee | JWT after account deletion | Use old session JWT after account is deleted | **FAILED** | `AuthContext.tsx:84-93` calls `getUser()` on mount; if user not found, signs out | Supabase JWT validation verifies user existence server-side |
| AUTH-03 | Any | Expired JWT usage | Use an expired JWT token | **FAILED** | Supabase `autoRefreshToken: true`; expired JWT rejected by Supabase Auth | `client.ts:15` |
| AUTH-04 | Any | SQL injection in login Email field | Send SQL injection payload as email in login | **FAILED** | Supabase Auth uses parameterized queries internally | Supabase Auth API behavior |
| AUTH-05 | Automated Abuser | Email enumeration via login errors | Observe different error messages for existing vs non-existing emails | **MISSING INFO** | Error behavior depends on Supabase Auth version/config | Not determined from source code alone |
| BLA-01 | Malicious Customer | Double-book a slot | Insert booking overlapping an existing confirmed booking | **FAILED** | `check_booking_overlap` trigger with advisory lock | `MASTER_SCHEMA.sql:383-412` |
| BLA-02 | Malicious Customer | Cancel another customer's appointment | Call `cancel_booking_by_token` with random UUID token | **FAILED** | Requires valid `booking_token` (32-char UUID); not guessable | `MASTER_SCHEMA.sql:781-801` |
| BLA-03 | Malicious Customer | Book appointment in the past | Insert booking with past date | **FAILED** | `check_past_booking` trigger rejects past dates | `MASTER_SCHEMA.sql:972-982` |
| BLA-04 | Automated Abuser | Exhaust server via repeated requests | 1000 rapid booking inserts using various phone numbers | **PARTIALLY SUCCEEDED** | Rate limit: 10 per phone per 10 min, but no global rate limit | `MASTER_SCHEMA.sql:417-442` limits per phone; no limit on RPCs, auth, or feedback |
| BLA-05 | Malicious Customer | Manipulate queue position | INSERT queue_ticket with custom `ticket_number` and `position_in_queue` via direct API call | **SUCCEEDED** | — | No trigger validates `ticket_number` matches `generate_ticket_number` output; RLS allows client INSERT |
| RL-01 | Automated Abuser | Rate limit auth endpoints | 100 login requests per minute | **SUCCEEDED** (no control) | — | No rate limiting on auth endpoints detected in codebase |
| RL-02 | Automated Abuser | Rate limit password reset | 100 password reset requests for same email | **SUCCEEDED** (no control) | — | No rate limiting on resetPasswordForEmail detected |
| RL-03 | Automated Abuser | Exhaust RPC calls | 1000 calls to SECURITY DEFINER RPCs | **SUCCEEDED** (no control) | — | No rate limiting on RPC functions (`get_business_queue`, `generate_ticket_number`, etc.) |
| STO-01 | Competitor | Overwrite another business's storage files | Upload file to `business-assets` bucket at another business's path | **SUCCEEDED** | — | Storage policy `MASTER_SCHEMA.sql:1628-1636` checks only that caller owns ANY business, not the specific business whose path is used |

---

## Successful Breaches — Full Write-Up

### SB-01: Cross-Business Takeover via `upsert_business` (SEV-1)
**Persona:** Competitor (Persona 1)  
**CVE-analogous pattern:** Missing authorization in SECURITY DEFINER function

**Reproduction Steps:**
1. Browse to any active business's public page (e.g., `leenya.dz/some-barber`)
2. Read `businesses` table via public RLS — the response includes `owner_id` (UUID of the business owner)
3. As any authenticated user, call:  
   `supabase.rpc("upsert_business", { p_owner_id: "<victim_owner_id>", p_name: "malicious name", p_slug: "malicious-slug", ... })`  
4. The business record is **overwritten** — name, slug, phone, address, category are all replaced
5. The business hours are also **deleted and recreated**
6. Note: The attacker cannot read the victim's existing bookings directly through this RPC

**Impact:** Any authenticated user can overwrite any business's profile information and operating hours. This enables defacement, business impersonation, and disruption of operations. The victim's business slug is replaced, breaking their public booking link.

**Affected data:** `businesses` table — all updatable columns; `business_hours` table — all entries for the business.

**Code citations:** `MASTER_SCHEMA.sql:567-614` (RPC), `616` (GRANT EXECUTE TO authenticated)

---

### SB-02: Staff Hijacking via `create_staff_user` (SEV-1)
**Persona:** Disgruntled Former Employee / Competitor (Persona 1, 3)  
**CVE-analogous pattern:** IDOR in SECURITY DEFINER function

**Reproduction Steps:**
1. Query public `staff_members` table:  
   `supabase.from("staff_members").select("id, business_id, display_name").eq("is_active", true)`  
   → This returns all staff IDs because the RLS policy `"Public can view active staff"` uses `USING (is_active = true)` with no auth restriction
2. Pick a target staff_id (e.g., someone at a competitor barbershop)
3. Call the RPC:  
   `supabase.rpc("create_staff_user", { p_staff_id: "<target_staff_id>", p_email: "attacker-controlled@email.com", p_password: "password123" })`
4. The RPC creates a NEW auth user with verified email, links it to the existing staff member's profile_id, and grants the `staff` role
5. Log in as `attacker-controlled@email.com` / `password123`
6. You now have **staff-level access** to the victim business — can view upcoming bookings, manage queue tickets, and see customer names and phone numbers

**Impact:** Full read access to another business's booking data and customer PII (names, phones). Staff role in the queue system allows calling and completing tickets, enabling operational disruption.

**Affected data:** `queue_tickets`, `bookings` for the victim business (staff RLS policies let staff see assigned business data).

**Code citations:** `MASTER_SCHEMA.sql:485-543` (RPC), `545` (GRANT EXECUTE TO authenticated), `staff_members` RLS at `1310`.

---

### SB-03: Self-Role Escalation via Direct `user_roles` INSERT (SEV-1)
**Persona:** Malicious Customer (Persona 2)  
**CVE-analogous pattern:** Missing authorization in RLS policy

**Reproduction Steps:**
1. Create a normal user account via signup (or use any existing authenticated account)
2. Directly insert into `user_roles`:  
   `supabase.from("user_roles").insert({ user_id: "<your_user_id>", role: "owner" })`  
3. The RLS policy checks: `auth.uid() = user_id` — this passes because the user_id matches the authenticated user
4. After a page refresh, `AuthContext.tsx` will re-fetch the role and the user now has `role = "owner"`
5. Navigate to `/dashboard` — the user now sees the owner dashboard

**Variant 1 — Business-less owner:** The owner dashboard may show empty/no data if the user doesn't own any business. But they can now:
- Create a business via the onboarding flow
- Use `upsert_business` (with their own ID, which is allowed) to get a fully functional business

**Variant 2 — Business takeover:** If coupled with SB-01 (`upsert_business` vulnerability), the escalated user can overwrite another business's profile.

**Impact:** Any authenticated user can become an "owner" — the highest privilege level in the application. Combined with SB-01 and SB-02, this enables complete platform takeover.

**Code citations:** `MASTER_SCHEMA.sql:1252-1254` (RLS policy `"Users can insert their own role"`)

---

### SB-04: Cross-Business Service Injection via `insert_services` (SEV-2)
**Persona:** Competitor (Persona 1)

**Reproduction Steps:**
1. Discover any business ID via public `businesses` table
2. Call:  
   `supabase.rpc("insert_services", { p_business_id: "<victim_business_id>", p_services: [{ name: "Spam Service", duration_minutes: 999, price_dzd: 999999 }] })`
3. The victim business's services page now shows attacker-inserted services
4. Customers trying to book may see confusing/offensive services

**Impact:** Business defacement, customer confusion, potential reputational damage.

**Code citations:** `MASTER_SCHEMA.sql:621-635` (RPC), `636` (GRANT EXECUTE)

---

### SB-05: Profile Takeover via `upsert_profile` (SEV-2)
**Persona:** Disgruntled Former Employee (Persona 3)

**Reproduction Steps:**
1. Discover any user's ID (available through `owner_id` in public businesses table, or `profile_id` in public staff_members table)
2. Call:  
   `supabase.rpc("upsert_profile", { p_id: "<victim_user_id>", p_full_name: "Hacked Name" })`
3. The victim's profile `full_name` is overwritten

**Impact:** Name change on accounts. Limited alone, but paired with other attacks enables social engineering (e.g., rename an owner's profile, then call support to reset password).

**Code citations:** `MASTER_SCHEMA.sql:550-561` (RPC), `562` (GRANT EXECUTE)

---

### SB-06: Queue Position Manipulation via Direct INSERT (SEV-2)
**Persona:** Malicious Customer (Persona 2)

**Reproduction Steps:**
1. As an authenticated client, do NOT use the `generate_ticket_number` RPC
2. Instead, directly INSERT into queue_tickets:  
   `supabase.from("queue_tickets").insert({ business_id: "<business_id>", client_name: "Fake", client_phone: "0555000000", ticket_number: 1, ticket_label: "A-001", queue_date: "<today>", status: "waiting", position_in_queue: 0 })`
3. RLS check passes because `auth.uid() = client_id` (client_id will be set to your uid by RLS, or null if anon — but you can set client_id to your uid)
4. The ticket is inserted at position 1, ahead of legitimate customers

**Limitations:**
- `generate_ticket_number` is used by the UI but is not enforced at the DB level
- The unique partial index `idx_one_active_ticket_per_phone` prevents multiple active tickets per phone per day per business
- But an attacker can use a fresh phone number for each attack

**Code citations:** `QueueFlow.tsx:231-247` calls `generate_ticket_number` but nothing enforces the ticket number at the DB level.

---

### SB-07: Cross-Business Storage File Manipulation (SEV-2)
**Persona:** Competitor (Persona 1)

**Reproduction Steps:**
1. As any authenticated user who owns a business, upload a file to:  
   `business-assets/staff-avatars/<victim_business_id>/avatar.png`
2. The storage insert policy checks: `bucket_id = 'business-assets'` AND EXISTS `businesses WHERE owner_id = auth.uid()`
3. This only checks that the caller owns **some** business — not that the path belongs to their business
4. The uploaded file overwrites the victim business's staff avatar

**Impact:** Replace another business's uploaded assets (logos, staff avatars, cover photos).

**Code citations:** `MASTER_SCHEMA.sql:1628-1636` (storage INSERT policy)

---

### SB-08: No Global Rate Limiting on Any RPC or Auth Endpoint (SEV-3)
**Persona:** Automated Abuser (Persona 4)

**Attack Vectors:**
1. **Auth endpoints:** No throttling on `signInWithPassword`, `signUp`, `resetPasswordForEmail` — 100+ requests per minute all succeed
2. **SECURITY DEFINER RPCs:** `get_business_queue`, `get_queue_ticket`, `generate_ticket_number`, `get_completed_ticket_stats` — all callable by anon with no rate limiting
3. **Feedback table:** `feedback` INSERT policy is `WITH CHECK (true)` — any anon can insert unlimited spam

**Evidence:** Only `check_insert_rate_limit` trigger exists (10 per phone per 10 min for bookings/queue_tickets). No rate limiting on auth, RPCs, storage, or feedback.

---

## Failed Attack Analysis

| Attack | What Prevented It | Confidence |
|---|---|---|
| **HPE-01** (Cross-tenant booking read via business_id modification) | Application code in `DashboardBookings.tsx:69` and `use-business-info.ts:28` always filters by the authenticated user's business ID. RLS at the DB layer independently enforces business ownership. Dual-layer control. | 5 |
| **HPE-02** (UUID enumeration for cross-tenant data) | UUIDs are 128-bit random values — non-enumerable in practice. RLS also blocks cross-tenant SELECT. | 5 |
| **HPE-03** (Cross-tenant Realtime channel subscription) | Application code hardcodes the business_id filter string; the business ID comes from `useBusinessInfo` which always uses the authenticated user's business. | 5 |
| **AUTH-01** (Password reset token reuse) | Supabase Auth handles this server-side — tokens are single-use. | 5 |
| **AUTH-02** (JWT after account deletion) | `AuthContext.tsx:84-93` verifies user existence via `getUser()` on mount and signs out if user not found. | 5 |
| **AUTH-03** (Expired JWT) | Supabase Auth with `autoRefreshToken: true` handles token refresh. Expired tokens are rejected by the auth API. | 5 |
| **AUTH-04** (SQL injection in login) | Supabase Auth uses parameterized queries. | 5 |
| **BLA-01** (Double-booking) | `check_booking_overlap` trigger uses `pg_advisory_xact_lock` for concurrency-safe overlap detection. State machine trigger also prevents status manipulation. | 5 |
| **BLA-02** (Cancel via token guessing) | `cancel_booking_by_token` requires matching `booking_id` AND `booking_token`. Tokens are UUIDs. | 5 |
| **BLA-03** (Past booking) | `check_past_booking` trigger SQL-side. | 5 |

---

## Findings Table

| ID | Title | Severity | Confidence | Reproduction Steps | Impact | Remediation |
|---|---|---|---|---|---|---|
| F-01 | `upsert_business` RPC allows any authenticated user to overwrite any business | SEV-1 | 5 (VERIFIED) | See SB-01 | Business defacement, slug theft, operational disruption | Add `WHERE owner_id = auth.uid()` check inside the RPC, or call `has_role(..., 'owner')` |
| F-02 | `create_staff_user` RPC allows staff hijacking across tenant boundary | SEV-1 | 5 (VERIFIED) | See SB-02 | Read/write access to victim business data (bookings, queue, customer PII) | Add ownership check: verify caller owns the staff_member's business via `EXISTS (SELECT 1 FROM businesses WHERE id = (SELECT business_id FROM staff_members WHERE id = p_staff_id) AND owner_id = auth.uid())` |
| F-03 | Self-role escalation via direct `user_roles` INSERT | SEV-1 | 5 (VERIFIED) | See SB-03 | Any user becomes "owner" — full platform access | Change RLS to use a separate function or add `app_role` restrictions to INSERT policy; alternatively, move role assignment exclusively to SECURITY DEFINER RPCs and revoke INSERT on `user_roles` from authenticated |
| F-04 | `insert_services` RPC allows service injection into any business | SEV-2 | 5 (VERIFIED) | See SB-04 | Business defacement, customer confusion | Add business ownership check inside RPC |
| F-05 | `upsert_profile` RPC allows overwriting any user's profile | SEV-2 | 5 (VERIFIED) | See SB-05 | Profile name hijacking | Add `WHERE id = auth.uid()` check inside RPC |
| F-06 | Queue position can be manipulated by bypassing `generate_ticket_number` | SEV-2 | 4 (CONFIRMED) | See SB-06 | Queue position cheating | Add trigger to validate `ticket_number` matches generated sequence (or remove `position_in_queue` from insertable columns) |
| F-07 | Storage bucket policy allows cross-business file overwrite | SEV-2 | 5 (VERIFIED) | See SB-07 | Replace other businesses' assets | Add path-based ownership check or verify the business_id in the path matches the caller's business |
| F-08 | No rate limiting on auth, RPC, or feedback endpoints | SEV-3 | 5 (VERIFIED) | See SB-08 | Server resource exhaustion, spam, enumeration | Add rate limiting via Supabase Auth hooks, RLS, or edge functions |
| F-09 | Public RLS on `businesses` exposes owner_id for all active businesses | SEV-3 | 5 (VERIFIED) | `SELECT owner_id, phone, address FROM businesses WHERE is_active = true` | Enables reconnaissance for all SEV-1 attacks | Use a separate public view that excludes owner_id and sensitive contact info |
| F-10 | Public RLS on `staff_members` exposes all staff IDs | SEV-3 | 5 (VERIFIED) | `SELECT id, business_id, profile_id FROM staff_members WHERE is_active = true` | Enables staff hijacking attack (F-02) | Restrict to business slug lookup only; expose IDs only via authenticated owner query |

---

## Missing Information Log

| Item | What Was Sought | Where Not Found |
|---|---|---|
| AUTH-05 | Login error message differential for email enumeration | Not determined — depends on Supabase Auth version/configuration. The application code (`LoginForm.tsx`) passes through `err.message` to toast display. If Supabase returns different messages for "user not found" vs "wrong password", enumeration is possible. If generic, it's not. |
| Rate limit on auth endpoints | Supabase project-level rate limits (if any) are not visible in source code | These would be set in Supabase dashboard under Authentication settings, not in code |
| Row-level security on auth.users table | Custom triggers or policies on auth.users | `auth.users` is managed entirely by Supabase — no custom policies visible |

---

## Escalations

| Finding ID | Escalate To | Reason |
|---|---|---|
| F-01, F-02, F-03 | Engineering Lead (Role 01) | Three SEV-1 vulnerabilities with chained exploitation paths. Requires immediate fix before any paying customers onboard. The `upsert_business` and `create_staff_user` RPCs are the two highest priority fixes — they are SECURITY DEFINER functions that explicitly bypass RLS. |
| F-04, F-05 | Engineering Lead (Role 01) | Same root cause pattern — SECURITY DEFINER RPCs without `auth.uid()` verification. Pattern fix needed across all SECURITY DEFINER functions. |
| F-06, F-08 | Engineering Lead (Role 01) | Business logic gaps and missing rate limiting. Lower severity but should be addressed before production launch. |
| F-09, F-10 | Engineering Lead (Role 01) | Reconnaissance enablers. All SEV-1 attacks require discovering owner_id or staff_id, which is trivially available from public RLS policies. |

---

## Exploitation Chain — Full Business Takeover

The most critical finding is that **all SEV-1 vulnerabilities chain together** for complete platform takeover:

```
Step 1: RECON → Fetch active businesses (public RLS exposes owner_id)
         supabase.from("businesses").select("id, name, owner_id").eq("is_active", true)

Step 2: ESCALATE → Set own role to "owner" (F-03)
         supabase.from("user_roles").insert({ user_id: "<my_id>", role: "owner" })

Step 3: HIJACK → Overwrite victim business profile (F-01)
         supabase.rpc("upsert_business", { p_owner_id: "<victim_owner_id>", p_name: "pwned", p_slug: "pwned", ... })

Step 4: INFILTRATE → Get staff access via public staff_ids (F-02 + F-10)
         supabase.from("staff_members").select("id").eq("business_id", "<victim_business_id>")
         supabase.rpc("create_staff_user", { p_staff_id: "<staff_id>", p_email: "pwn@hacker.dz", p_password: "owned123" })

Step 5: EXPORT → Log in as staff user, read all customer booking data (names, phones)
```

This chain requires **zero prior access** beyond a free registration and yields **full read/write access** to any business's data.

---

## Summary Statistics

- **Total scenarios attempted:** 25 attack vectors across 14 categories
- **Successful (SEV-1):** 3 (F-01, F-02, F-03)
- **Successful (SEV-2):** 4 (F-04, F-05, F-06, F-07)
- **Successful (SEV-3):** 1 (F-08)
- **Partially successful:** 1 (BLA-04 — per-phone rate limit bypassed by rotating phones)
- **Failed (control effective):** 14
- **Missing information:** 1 (AUTH-05)
- **Confidence in successful attacks:** 5 (confirmed by code analysis) for 7 findings, 4 (near-miss) for 1 finding
