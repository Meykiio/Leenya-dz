# Role 08 — Row Level Security Verifier

## Executed By
Senior RLS Verifier (automated audit using pg_policies query + schema analysis)

## Date
2026-06-29

## Source of Truth
All policies verified by querying `pg_policies` directly from the live Supabase database. Schema verified via `information_schema.columns` and `pg_class`.

---

## RLS Status Table

| Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Compliant? |
|---|---|---|---|---|---|---|
| profiles | YES | YES | YES | YES | NO | PARTIAL |
| user_roles | YES | YES | NO | NO | NO | FAIL |
| businesses | YES | YES (2) | YES | YES | YES | YES |
| business_hours | YES | YES (2) | ALL (via owner) | ALL (via owner) | ALL (via owner) | PARTIAL |
| services | YES | YES (2) | ALL (via owner) | ALL (via owner) | ALL (via owner) | YES |
| staff_members | YES | YES (3) | ALL (via owner) | ALL (via owner) | ALL (via owner) | YES |
| staff_services | YES | YES | ALL (via owner) | ALL (via owner) | ALL (via owner) | YES |
| bookings | YES | YES (3) | YES (3) | YES (2) | NO | PARTIAL |
| queue_counters | YES | YES (3) | ALL (via owner) | ALL (via owner) | ALL (via owner) | PARTIAL |
| queue_tickets | YES | YES (3) | YES (3) | YES (2) | NO | PARTIAL |
| reviews | YES | YES (USING true) | YES | YES | NO | PARTIAL |
| feedback | YES | YES | YES (WITH CHECK true) | NO | YES | PARTIAL |
| whatsapp_templates | YES | YES | YES | YES | YES | YES |
| storage.objects (business-assets) | YES (bucket-level) | NO | YES | YES | YES | FAIL |

### Key Observations
- **Every table** in the public schema has RLS enabled — no unprotected sensitive tables.
- `storage.objects` has NO SELECT policy for the `business-assets` bucket — API-based reads (list/download) are blocked for all roles.
- `user_roles` has only a SELECT policy — role management depends entirely on SECURITY DEFINER RPCs.
- Several tables intentionally lack DELETE policies (soft-delete pattern via status fields) — `bookings`, `queue_tickets`, `reviews`, `profiles`.
- The `booking_availability` view has `security_invoker = on` (confirmed via `pg_class.relrowsecurity=false` + view definition), meaning it correctly inherits the caller's RLS from the underlying `bookings` table.

---

## Policy Expression Audit

### profiles
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Users can insert their own profile | INSERT | — | `auth.uid() = id` | YES | User can only create their own profile |
| Users can update their own profile | UPDATE | `auth.uid() = id` | NULL (inherits USING) | YES | Cannot change id |
| Users can view their own profile | SELECT | `auth.uid() = id` | — | YES | Self-scoped |

### user_roles
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Users can read their own roles | SELECT | `auth.uid() = user_id` | — | YES | Read-only self-scope |

### businesses
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Owners can delete their business | DELETE | `auth.uid() = owner_id` | — | YES | Owner-only delete |
| Owners can insert their business | INSERT | — | `auth.uid() = owner_id` | YES | Owner must be the owner |
| Owners can update their business | UPDATE | `auth.uid() = owner_id` | NULL | YES | Cannot reassign owner_id |
| Owners can view own business | SELECT | `auth.uid() = owner_id` | — | YES | Owner-only access to full record |
| Public can view active businesses | SELECT | `is_active = true` | — | YES | Public read of active businesses |

### business_hours
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Owners can manage business hours | ALL | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_hours.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped via business join |
| Public can view business hours | SELECT | `true` | — | YES | Hours are intentionally public |

### services
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Owners can manage services | ALL | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = services.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped |
| Public can view active services | SELECT | `is_active = true` | — | YES | Active services visible publicly |

### staff_members
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Owners can manage staff | ALL | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = staff_members.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped |
| Public can view active staff | SELECT | `is_active = true` | — | YES | Active staff visible publicly |
| Staff can view own record | SELECT | `auth.uid() = profile_id` | — | YES | Staff can see their own profile |

### staff_services
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| owners_manage_staff_services | ALL | `EXISTS (SELECT 1 FROM staff_members sm JOIN businesses b ON sm.business_id = b.id WHERE sm.id = staff_services.staff_member_id AND b.owner_id = auth.uid())` | NULL | YES | Owner-scoped via staff→business join |
| public_read_staff_services | SELECT | `EXISTS (SELECT 1 FROM staff_members sm JOIN businesses b ON sm.business_id = b.id WHERE sm.id = staff_services.staff_member_id AND b.is_active = true)` | — | YES | Public read on active businesses only |

### bookings
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Business owners can insert bookings | INSERT | — | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())` | YES | Owner-scoped insert |
| Business owners can manage bookings | UPDATE | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped update |
| Business owners can view bookings | SELECT | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped select |
| Clients can insert bookings | INSERT | — | `auth.uid() = client_id` | **FAIL** | Does NOT validate business_id — client can book at any business |
| Clients can view own bookings | SELECT | `auth.uid() = client_id` | — | YES | Self-scoped |
| Public can insert bookings | INSERT | — | `client_id IS NULL` | YES | Walk-in unauthenticated bookings |
| Staff can update business bookings | UPDATE | `EXISTS (SELECT 1 FROM staff_members sm WHERE sm.profile_id = auth.uid() AND sm.business_id = bookings.business_id AND (bookings.staff_member_id IS NULL OR bookings.staff_member_id = sm.id))` | NULL | YES | Staff-scoped to their business |
| Staff can view business bookings | SELECT | `EXISTS (SELECT 1 FROM staff_members sm JOIN businesses b ON b.id = sm.business_id WHERE sm.profile_id = auth.uid() AND b.id = sm.business_id AND (bookings.staff_member_id IS NULL OR bookings.staff_member_id = sm.id))` | — | PARTIAL | The `b.id = sm.business_id` join condition is redundant (already true from the JOIN) but harmless |

### queue_counters
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Business owners can manage counters | ALL | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = queue_counters.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped |
| Public can read queue counters | SELECT | `true` | — | YES (intentional) | Public queue counter display |
| Staff can read counters | SELECT | `EXISTS (SELECT 1 FROM staff_members sm WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_counters.business_id)` | — | YES | Staff-scoped |

### queue_tickets
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Business owners can insert queue tickets | INSERT | — | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = queue_tickets.business_id AND businesses.owner_id = auth.uid())` | YES | Owner-scoped insert |
| Business owners can manage queue | UPDATE | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = queue_tickets.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped update |
| Business owners can view queue | SELECT | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = queue_tickets.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped select |
| Clients can insert tickets | INSERT | — | `auth.uid() = client_id` | **FAIL** | Does NOT validate business_id — client can insert tickets at any business |
| Clients can view own tickets | SELECT | `auth.uid() = client_id` | — | YES | Self-scoped |
| Public can insert queue tickets | INSERT | — | `client_id IS NULL` | YES | Walk-in unauthenticated tickets |
| Staff can update business queue | UPDATE | `EXISTS (SELECT 1 FROM staff_members sm WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_tickets.business_id AND (queue_tickets.staff_member_id IS NULL OR queue_tickets.staff_member_id = sm.id))` | NULL | YES | Staff-scoped |
| Staff can view business queue | SELECT | `EXISTS (SELECT 1 FROM staff_members sm WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_tickets.business_id AND (queue_tickets.staff_member_id IS NULL OR queue_tickets.staff_member_id = sm.id))` | — | YES | Staff-scoped |

### reviews
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Clients can insert reviews | INSERT | — | `auth.uid() = client_id` | **FAIL** | Does NOT validate business_id or booking relationship — client can review any business |
| Clients can update own reviews | UPDATE | `auth.uid() = client_id` | NULL | YES | Self-scoped update |
| Public can view reviews | SELECT | `true` | — | PARTIAL | All reviews public; business owners cannot filter via RLS alone (must use WHERE clause) |

### feedback
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Anyone can insert feedback | INSERT | — | `true` | PARTIAL | Intentionally open for public feedback, but no validation of business_id relationship |
| Owners can delete feedback | DELETE | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped delete |
| Owners can view their feedback | SELECT | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped select |

### whatsapp_templates
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Business owners can delete templates | DELETE | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = whatsapp_templates.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped |
| Business owners can insert templates | INSERT | — | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = whatsapp_templates.business_id AND businesses.owner_id = auth.uid())` | YES | Owner-scoped |
| Business owners can update templates | UPDATE | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = whatsapp_templates.business_id AND businesses.owner_id = auth.uid())` | NULL | YES | Owner-scoped |
| Business owners can view templates | SELECT | `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = whatsapp_templates.business_id AND businesses.owner_id = auth.uid())` | — | YES | Owner-scoped |

### storage.objects (bucket: business-assets)
| Policy Name | Operation | USING Expression | WITH CHECK Expression | Correct? | Notes |
|---|---|---|---|---|---|
| Owners can delete business assets | DELETE | `bucket_id = 'business-assets' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.owner_id = auth.uid())` | — | PARTIAL | Does not scope to specific business asset; any owner can delete any file |
| Owners can update business assets | UPDATE | `bucket_id = 'business-assets' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.owner_id = auth.uid())` | — | PARTIAL | Same — any owner can update any file |
| Owners can upload business assets | INSERT | — | `bucket_id = 'business-assets' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.owner_id = auth.uid())` | PARTIAL | Same — any owner can upload |
| *(missing)* | SELECT | *(no policy exists)* | — | **FAIL** | No SELECT policy → all API reads (list, download) blocked |

---

## Tenant Isolation Test Results

| Table | Tested Scenario | Expected Outcome | Actual Outcome | Evidence |
|---|---|---|---|---|
| businesses | Owner A reads Owner B's business via owner-policy | Blocked | Blocked | Policy: `auth.uid() = owner_id` |
| businesses | Anon reads active business info | Allowed (public) | Allowed | Policy: `is_active = true` — intentional |
| bookings | Client inserts booking for another business | Blocked | **ALLOWED** | Policy "Clients can insert bookings": `auth.uid() = client_id` — no business_id validation |
| bookings | Client A reads Client B's booking | Blocked | Blocked | Policy "Clients can view own bookings": `auth.uid() = client_id` |
| bookings | Owner A reads Owner B's bookings | Blocked | Blocked | Policy via business join + owner_id check |
| queue_tickets | Client inserts ticket for another business | Blocked | **ALLOWED** | Policy "Clients can insert tickets": `auth.uid() = client_id` — no business_id validation |
| queue_tickets | Client A reads Client B's ticket | Blocked | Blocked | Policy "Clients can view own tickets": `auth.uid() = client_id` |
| reviews | Client inserts review for another business | Blocked | **ALLOWED** | Policy "Clients can insert reviews": `auth.uid() = client_id` — no business_id validation |
| reviews | Owner A reads Owner B's reviews | Blocked | **ALLOWED** | Policy "Public can view reviews": `USING(true)` — all reviews are public |
| feedback | Anon inserts feedback with arbitrary business_id | Partially blocked | **ALLOWED** | Policy "Anyone can insert feedback": `WITH CHECK (true)` |
| user_roles | User inserts role for another user | Blocked | Blocked | No INSERT policy → RLS default-deny |
| storage.objects | Owner A reads Owner B's file (via API) | Blocked | Blocked | No SELECT policy → RLS default-deny (but bucket is public via URL) |

---

## Findings Table

| ID | Title | Table | Description | Severity | Confidence | Evidence | Remediation |
|---|---|---|---|---|---|---|---|
| F-01 | No SELECT policy on storage.objects (business-assets) | storage.objects | The business-assets bucket has INSERT, UPDATE, DELETE policies but NO SELECT policy. API-based read operations (`list()`, `download()`) are blocked for all roles. Direct URL access still works because the bucket is public. | SEV-3 | 5 (VERIFIED) | `pg_policies` shows no SELECT policy for business-assets bucket. `supabase_list_storage_buckets()` shows `"public":true`. | Add a SELECT policy: `bucket_id = 'business-assets' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.owner_id = auth.uid())` for owners, or make it publicly readable for active businesses. |
| F-02 | Clients can insert bookings for any business | bookings | "Clients can insert bookings" has WITH CHECK `auth.uid() = client_id` but does NOT validate that the `business_id` belongs to a legitimate business or that the client has a relationship with it. A client can spam-book any business. | SEV-2 | 5 (VERIFIED) | Policy verified from `pg_policies`: WITH CHECK `(auth.uid() = client_id)`. No reference to business_id validation. | Add validation: `auth.uid() = client_id AND EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.is_active = true)` |
| F-03 | Clients can insert queue tickets for any business | queue_tickets | "Clients can insert tickets" has WITH CHECK `auth.uid() = client_id` but does NOT validate business_id. Same pattern as F-02. | SEV-2 | 5 (VERIFIED) | Policy verified from `pg_policies`: WITH CHECK `(auth.uid() = client_id)`. | Add validation: `auth.uid() = client_id AND EXISTS (SELECT 1 FROM businesses WHERE businesses.id = queue_tickets.business_id AND businesses.is_active = true)` |
| F-04 | Reviews INSERT does not validate business or booking relationship | reviews | "Clients can insert reviews" has WITH CHECK `auth.uid() = client_id` but does not verify the review is for a business the client actually visited, or that the booking_id references a real completed booking. A client can spam-review any business. | SEV-2 | 5 (VERIFIED) | Policy verified from `pg_policies`: WITH CHECK `(auth.uid() = client_id)`. No business_id or booking_id validation. | Add: `auth.uid() = client_id AND EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.client_id = auth.uid() AND bookings.status = 'completed')`. Or at minimum validate business_id exists. |
| F-05 | user_roles missing INSERT/UPDATE/DELETE policies | user_roles | Only a SELECT policy exists. No one can directly INSERT, UPDATE, or DELETE roles via RLS. The app relies entirely on SECURITY DEFINER RPCs (`assign_owner_role`, `create_staff_user`). This is fragile — any future code path that tries direct table access will fail silently. | SEV-3 | 5 (VERIFIED) | `pg_policies` shows only one policy for user_roles: SELECT. No INSERT/UPDATE/DELETE policies. | Consider adding INSERT/UPDATE/DELETE policies for owners to manage staff roles, or document that the RPC-only pattern is intentional and add a test to prevent regression. |
| F-06 | No DELETE policy on bookings | bookings | No DELETE policy exists for the bookings table. RLS default-deny means no one can delete bookings through the API. This uses a soft-delete pattern via status updates (cancelled). | SEV-4 | 5 (VERIFIED) | `pg_policies` shows no DELETE policies for bookings. | Confirm soft-delete is intentional. If business owners should be able to purge test data, add DELETE policy: `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())`. |
| F-07 | No DELETE policy on queue_tickets | queue_tickets | Same pattern as F-06 — no DELETE policy. Soft-delete via status changes. | SEV-4 | 5 (VERIFIED) | `pg_policies` shows no DELETE policies for queue_tickets. | Same as F-06 recommendation. |
| F-08 | No DELETE policy on reviews | reviews | Clients cannot delete their own reviews. Business owners cannot delete reviews on their business. No DELETE policy exists. | SEV-4 | 5 (VERIFIED) | `pg_policies` shows no DELETE policy for reviews. | Add business-owner delete policy if needed: `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.business_id AND businesses.owner_id = auth.uid())`. Consider also allowing clients to delete their own reviews. |
| F-09 | No DELETE policy on profiles | profiles | Users cannot delete their own profile via RLS. Account deletion is blocked at the database level (unless done via service role or direct SQL). | SEV-4 | 5 (VERIFIED) | `pg_policies` shows no DELETE policy for profiles. | Add: `auth.uid() = id` if self-deletion should be supported, or document as intentional. |
| F-10 | Reviews are fully public (USING true) | reviews | "Public can view reviews" has `USING (true)`. Any authenticated or unauthenticated user can read ALL reviews across all businesses. Business owners cannot scope review reads to their own business through RLS alone. | SEV-3 | 5 (VERIFIED) | `pg_policies`: USING `true` on reviews SELECT policy. | Either keep as-is (public reviews is a common pattern and app-layer WHERE clause handles filtering) or add a business-owner restricted policy as the first matching policy. |
| F-11 | Feedback has WITH CHECK (true) — no input validation | feedback | "Anyone can insert feedback" allows any user (anon or authenticated) to insert feedback records with any business_id, email, category, or message. No validation at the database level. | SEV-4 | 5 (VERIFIED) | `pg_policies`: WITH CHECK `true` for feedback INSERT. | If business_id linkage is desired, add: `business_id IS NULL OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id AND businesses.is_active = true)`. |
| F-12 | Anon can read all queue_counters (USING true) | queue_counters | "Public can read queue counters" allows any anon user to read counter data for all businesses. This exposes operational data (last_number per business per day) publicly. | SEV-4 | 5 (VERIFIED) | `pg_policies`: USING `true` for anon role on queue_counters SELECT. | If this is intentional for public queue display, no change needed. If this leaks sensitive information, restrict to authenticated users. |
| F-13 | Storage policies do not scope to specific business asset path | storage.objects | INSERT/UPDATE/DELETE policies for business-assets check `bucket_id = 'business-assets' AND EXISTS (SELECT 1 FROM businesses WHERE businesses.owner_id = auth.uid())`. Any business owner can delete/update/upload any file in the bucket (including files belonging to other businesses). No path-based scoping. | SEV-2 | 4 (INFERRED) | Storage policies lack a path prefix check like `storage.objects.name LIKE (SELECT id::text || '/' FROM businesses WHERE businesses.owner_id = auth.uid()) || '%'`. | Add path-based scoping: `bucket_id = 'business-assets' AND (storage.foldername(name))[1] IN (SELECT id::text FROM businesses WHERE owner_id = auth.uid())`. Organize assets by `{business_id}/{filename}`. |
| F-14 | RLS integration tests are incomplete and untestable | (all) | The file `supabase/tests/rls_policies.sql` has only 4 working anon tests, 1 authenticated test that fails without real auth context, and 1 placeholder test. No test covers cross-tenant scenarios, business-owner access, staff access, or the token-based booking flow. | SEV-2 | 5 (VERIFIED) | Read `supabase/tests/rls_policies.sql` — lines 1–38. Only anon tests SET ROLE; authenticated tests lack `auth.uid()` setup. | Rewrite tests using `supabase-test` or `pgTAP` with proper auth context setup. Test every policy operation for every role. |
| F-15 | Staff select policy on bookings has redundant join condition | bookings | "Staff can view business bookings" joins `staff_members sm JOIN businesses b ON b.id = sm.business_id` then checks `b.id = sm.business_id` in WHERE clause (already guaranteed by JOIN). This is redundant but not harmful. | SEV-5 | 5 (VERIFIED) | Policy expression: `EXISTS (SELECT 1 FROM staff_members sm JOIN businesses b ON b.id = sm.business_id WHERE sm.profile_id = auth.uid() AND b.id = sm.business_id AND ...)` | Remove `b.id = sm.business_id` from WHERE clause as it's already satisfied by the JOIN condition. |

---

## Required Questions — Answered

### 1. Is RLS enabled on every table containing customer, business, or appointment data? List every table and its RLS status.

YES — all 13 tables in the `public` schema have RLS enabled:
- `profiles` ✅
- `user_roles` ✅
- `businesses` ✅
- `business_hours` ✅
- `services` ✅
- `staff_members` ✅
- `staff_services` ✅
- `bookings` ✅
- `queue_counters` ✅
- `queue_tickets` ✅
- `reviews` ✅
- `feedback` ✅
- `whatsapp_templates` ✅

Additionally, `storage.objects` has RLS active for the `business-assets` bucket.

### 2. Are there any tables with RLS enabled but zero policies defined?

No. Every RLS-enabled table has at least one policy defined. However, several tables have zero policies for specific operations (e.g., `user_roles` has 0 INSERT/UPDATE/DELETE policies, `bookings` has 0 DELETE policies).

### 3. Are there any policies using USING (true) or WITH CHECK (true) without documented justification?

YES — three policies:
- **reviews — "Public can view reviews"**: USING `true`. All reviews are fully public. No documented business justification in the policy name or in project docs. While this is a common pattern, the policy allows cross-tenant reading (Owner A can see reviews for Owner B's business).
- **queue_counters — "Public can read queue counters"**: USING `true` for anon role. Exposes operational data publicly.
- **feedback — "Anyone can insert feedback"**: WITH CHECK `true`. Allows arbitrary data submission.

### 4. Can a business owner read records belonging to another business? Trace the policy path.

**Partially.** Trace per table:
- **businesses**: No — owner policy requires `auth.uid() = owner_id`. However, public policy allows reading basic info (`is_active = true`) of any active business.
- **bookings**: No — requires `EXISTS (SELECT 1 FROM businesses WHERE businesses.id = bookings.business_id AND businesses.owner_id = auth.uid())`.
- **services**: No — same owner-scoped pattern.
- **staff_members**: No — same owner-scoped pattern.
- **queue_tickets**: No — same owner-scoped pattern.
- **reviews**: **YES** — "Public can view reviews" is USING `true`, so Owner A can read all reviews including Owner B's business reviews.
- **feedback**: No — owner-scoped via business join.
- **whatsapp_templates**: No — owner-scoped.
- **queue_counters**: **YES** — "Public can read queue counters" is USING `true` for anon role, so anyone can read all counters.
- **storage.objects**: **Blocked by RLS default-deny** — no SELECT policy exists.

### 5. Can a customer read another customer's appointment record? Trace the policy path.

**No.** For both `bookings` and `queue_tickets`, the client access policies filter by `auth.uid() = client_id`. An authenticated user can only see their own bookings/tickets. Cross-client access to bookings is blocked:
- Bookings: "Clients can view own bookings" → `auth.uid() = client_id`
- Queue tickets: "Clients can view own tickets" → `auth.uid() = client_id`

### 6. Are INSERT policies present on all tables, and do they prevent setting foreign keys to other tenants' records?

**INSERT policies are present on all tables** EXCEPT:
- `user_roles` — no INSERT policy (intentional, relies on SECURITY DEFINER RPCs)

**Prevention of cross-tenant FK setting:**
- **PROBLEM**: `bookings` — "Clients can insert bookings" only validates `auth.uid() = client_id`, not `business_id`. A client can create a booking pointing to any business.
- **PROBLEM**: `queue_tickets` — "Clients can insert tickets" only validates `auth.uid() = client_id`, not `business_id`. Same issue.
- **PROBLEM**: `reviews` — "Clients can insert reviews" only validates `auth.uid() = client_id`, not `business_id`. Client can review any business.
- **PROBLEM**: `storage.objects` — INSERT policy checks any business ownership, not the specific business the asset belongs to.
- **OK**: `businesses` — INSERT validates `auth.uid() = owner_id` (self-ownership).
- **OK**: `whatsapp_templates` — INSERT validates ownership via business join.
- **OK**: `feedback` — WITH CHECK true (intentionally open, business_id is nullable).

### 7. Are UPDATE policies present, and do they prevent changing business_id or user_id on existing records?

**Missing UPDATE policies:**
- `user_roles` — no UPDATE policy.
- `feedback` — no UPDATE policy.
- `reviews` — UPDATE policy exists for clients (`auth.uid() = client_id`) but no business-owner UPDATE policy.

**Prevention of changing tenant FK:**
- For tables with UPDATE policies that check owner via USING, the NULL WITH CHECK means the USING expression applies to the new row values as well. So:
  - `bookings` (owner update): USING checks `businesses.owner_id = auth.uid()` via business_id join → changing business_id to another business would fail the USING check on the new row. **Protected.**
  - `bookings` (staff update): USING checks staff belongs to the booking's business → changing business_id would break this. **Protected.**
  - `businesses` (owner update): USING checks `auth.uid() = owner_id` → changing owner_id to another user would fail. **Protected.**
  - `profiles` (user update): USING checks `auth.uid() = id` → changing id fails. **Protected.**
  - `queue_tickets`: Same pattern as bookings. **Protected.**
  - `whatsapp_templates`: Owner-scoped via business join. Changing business_id breaks the policy. **Protected.**
  - `reviews` (client update): USING checks `auth.uid() = client_id` → client cannot change client_id. **Protected.**

### 8. Are DELETE policies appropriately restrictive?

**Tables with DELETE policies:**
- `businesses`: Owner-only (`auth.uid() = owner_id`) ✅
- `whatsapp_templates`: Owner-only (via business join) ✅
- `feedback`: Owner-only (via business join) ✅
- `storage.objects`: Authenticated owner (checks any business ownership, see F-13 for scoping issue) ⚠️

**Tables MISSING DELETE policies (soft-delete pattern):**
- `bookings` (SEV-4) — relies on status updates to "cancelled"
- `queue_tickets` (SEV-4) — relies on status updates
- `reviews` (SEV-4) — no one can delete reviews
- `profiles` (SEV-4) — users cannot self-delete
- `user_roles` (SEV-4) — roles cannot be removed via RLS

These may be intentional soft-delete patterns, but the application may need hard-delete capabilities for some operations.

### 9. Are there any tables that should have RLS but do not?

No. All 13 tables in the `public` schema have RLS enabled. The `booking_availability` view has `security_invoker = on` which correctly inherits the caller's RLS from the `bookings` table.

### 10. Is RLS tested with actual SQL queries (documented here), or only assumed correct from policy text?

**Assumed correct from policy text, with partial SQL verification.** The file `supabase/tests/rls_policies.sql` exists but is severely incomplete:
- Only 4 anon-level tests that can actually execute
- 1 authenticated test that cannot run without a real `auth.uid()` context
- Zero tests for: business owner access, staff access, cross-tenant scenarios, INSERT validation, UPDATE validation, storage policies, RPC calls from RLS context
- No test framework (no pgTAP, no supabase-test)

The audit performed here verified policies by querying `pg_policies` directly, but did not execute SQL test queries against the database because the test environment lacks a seeded state with multiple businesses, users, and role assignments. **True functional RLS verification requires executing DML as different roles and asserting access expectations.**

---

## Missing Information Log

| Item | What Was Sought | Where Not Found |
|---|---|---|
| Actual RLS test execution across roles | SQL output of SET ROLE tests for owners, staff, clients | `supabase/tests/rls_policies.sql` only has anon tests and 1 authenticated placeholder |
| Business justification for USING(true) policies | Documentation or code comment explaining why reviews/queue_counters/feedback are fully public | No documentation file, no in-code comment |
| Service role key usage in backend | Whether any server-side code uses the service role to bypass RLS | Client code only uses anon key; SECURITY DEFINER RPCs used instead — no service role found in client code |
| Plan enforcement integration | How `plan` column and `trial_ends_at` interact with RLS to enforce plan limits | No RLS policy references the `plan` or `trial_ends_at` columns — limits are enforced by SECURITY DEFINER RPCs or application logic |
| Booking token-based access (anon flow) | Whether `booking_token` in bookings table has a dedicated anon access policy | No policy references `booking_token` — the token-based access is handled entirely by SECURITY DEFINER RPCs (`get_booking_by_token`, `cancel_booking_by_token`) |

---

## Escalations

| Finding ID | Escalate To | Reason |
|---|---|---|
| F-02 | Role 09 (Data Integrity Validator), Role 11 (Security Hardening Specialist) | Client can insert bookings for any business — cross-tenant data injection. Needs data integrity validation and security hardening review. |
| F-03 | Role 09, Role 11 | Same pattern as F-02 for queue tickets. |
| F-04 | Role 09, Role 11 | Review spam insertion without booking validation. |
| F-13 | Role 09, Role 11 | Storage cross-tenant access — any business owner can delete/modify any business's assets. |
| F-14 | Role 10 (Integration Test Auditor) | RLS tests are incomplete and untestable. Needs full test coverage audit. |
| All | Role 01 (Overall Audit Coordinator) | Full findings for phase A report consolidation. |

---

## Summary

**Overall RLS posture: MODERATE. RLS is enabled on all tables, but several critical gaps exist:**

**Critical (SEV-2+):**
1. **Cross-tenant data injection** via bookings, queue_tickets, and reviews INSERT policies that don't validate business_id (F-02, F-03, F-04)
2. **Storage cross-tenant access** — no path-based scoping on business-assets bucket (F-13)
3. **No verifiable test coverage** — the existing test file cannot meaningfully verify RLS (F-14)

**Significant (SEV-3):**
4. **No SELECT policy on storage.objects** — API reads blocked for all (F-01)
5. **user_roles locked to RPC-only** — fragile reliance on SECURITY DEFINER functions (F-05)
6. **Reviews fully public** — cross-tenant visibility (F-10)

**Minor (SEV-4/5):**
7. Missing DELETE policies on 4 tables (likely intentional soft-delete)
8. Feedback WITH CHECK(true) (intentionally open)
9. Anon-accessible queue_counters (intentionally public)
10. Redundant join condition in staff bookings policy (cosmetic)

**The most urgent action items are:**
1. Add business_id validation to bookings, queue_tickets, and reviews INSERT policies
2. Add path-based scoping to storage objects policies
3. Add a SELECT policy to storage.objects for business-assets
4. Rewrite RLS integration tests with proper role context setup
