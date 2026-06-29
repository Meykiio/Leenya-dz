# Phase A — Role 04: Security Engineer

**Auditor:** Security Engineer (Staff-level)
**Application:** Leenya — Queue & Appointment Management SaaS
**Stack:** React + TypeScript + Tailwind + Supabase + Vercel
**Date:** 2026-06-29
**Stage:** Pre-launch

---

## Security Surface Map

### Client-Side Entry Points (Routes)
| Route | Auth Required | Page Component | Data Operations |
|---|---|---|---|
| `/` | No | Landing | None |
| `/login` | No | Login | `auth.signInWithPassword`, `auth.signUp` |
| `/onboarding` | Auth required | OnboardingWizard | RPC: `upsert_profile`, `assign_owner_role`, `upsert_business`, `insert_services` |
| `/reset-password` | No | ResetPassword | `auth.resetPasswordForEmail` |
| `/booking/track/:token` | No | BookingTrack | RPC: `get_booking_by_token`, `cancel_booking_by_token` |
| `/mes-reservations` | Client role | MyBookings | Direct table queries via RLS |
| `/dashboard/*` | Owner role | Dashboard pages | Direct table queries via RLS, RPC: `create_staff_user`, `get_monthly_business_counts` |
| `/staff` | Staff/Owner | StaffView | Direct table queries via RLS |
| `/display/:slug` | No | QueueDisplay | Realtime subscription, RPC: `get_business_queue` |
| `/:slug/queue` | No | QueuePublic | RPC: `generate_ticket_number`, direct INSERT via RLS |
| `/:slug` | No | BusinessPublic | Direct SELECT via RLS |
| `/terms`, `/privacy` | No | Static pages | None |

### Server-Side Attack Surface (Supabase)
| Surface | Type | Exposure |
|---|---|---|
| REST API (`/rest/v1/*`) | HTTP | All tables via RLS |
| RPC (`/rest/v1/rpc/*`) | HTTP | 15+ functions, mixed anon/authenticated grants |
| Realtime (WebSocket) | Subscriptions | `queue_tickets`, `bookings`, `whatsapp_templates` |
| Storage (`/storage/v1/*`) | HTTP | `business-assets` bucket (public) |
| Auth (`/auth/v1/*`) | HTTP | Supabase-managed |

### Realtime Channels
| Channel | Filter | Data Leak Risk |
|---|---|---|
| `queue-stats` | `business_id=eq.{id}` | Low — scoped per business |
| `ticket-updates` | `id=eq.{ticket_id}` | Low — scoped per ticket |
| `booking-changes` (via dashboard) | Not examined in full | Medium — verify filters |

---

## Authentication Coverage Matrix

| Route / Endpoint | Auth Required? | Auth Present? | Verified? | Gap? |
|---|---|---|---|---|
| `/` (Landing) | No | N/A | ✅ | None |
| `/login` | No | N/A | ✅ | None |
| `/onboarding` | Yes — any session | Frontend: `ProtectedRoute` sets `!role` redirect | ✅ | Role is null until onboarding completes, so no gap |
| `/booking/track/:token` | No — token-based | Token validated in RPC | ✅ | Token is UUID — brute-force resistant |
| `/mes-reservations` | Yes — `client` role | `ProtectedRoute allowedRoles={["client"]}` | ✅ | None |
| `/dashboard/*` | Yes — `owner` role | `ProtectedRoute allowedRoles={["owner"]}` | ✅ | None |
| `/staff` | Yes — `staff` or `owner` | `ProtectedRoute allowedRoles={["staff","owner"]}` | ✅ | None |
| `/display/:slug` | No | N/A | ✅ | Intentional — TV display |
| `/:slug/queue` | No | N/A | ✅ | Intentional — public walk-in |
| `/:slug` | No | N/A | ✅ | Intentional — public profile |
| **RPC: `upsert_business`** | Yes — any `authenticated` | JWT + `SECURITY DEFINER` | ❌ | **No ownership check** — trusts `p_owner_id` |
| **RPC: `upsert_profile`** | Yes — any `authenticated` | JWT + `SECURITY DEFINER` | ❌ | **No identity check** — trusts `p_id` |
| **RPC: `assign_owner_role`** | Yes — any `authenticated` | JWT + `SECURITY DEFINER` | ❌ | **Self-escalation** — any auth user can become owner |
| **RPC: `create_staff_user`** | Yes — any `authenticated` | JWT + `SECURITY DEFINER` | ❌ | **No business ownership check** |
| **RPC: `insert_services`** | Yes — any `authenticated` | JWT + `SECURITY DEFINER` | ❌ | **No business ownership check** |
| **Table: `user_roles` INSERT** | Yes — any `authenticated` | RLS: `auth.uid() = user_id` | ❌ | **Self-escalation** — policy allows any authenticated user to self-assign any role |

### Key Finding on Auth Architecture
The application lacks server-side middleware (no Edge Functions, no API routes). All authorization relies on PostgreSQL RLS policies + SECURITY DEFINER RPC functions. The RPC functions intentionally bypass RLS but fail to verify the caller's relationship to the affected resources. This is the single largest architectural weakness.

---

## Dependency CVE Report

| Package | Version | CVE ID | Severity | Description | Remediation |
|---|---|---|---|---|---|
| vite | ^5.4.19 | GHSA-fx2h-pf6j-xcff | **HIGH** | `server.fs.deny` bypass on Windows alternate paths — path traversal allowing arbitrary file reads in dev mode | Upgrade to vite 6.x+ or apply workaround |
| vite | ^5.4.19 | GHSA-4w7w-66w2-5vf9 | Moderate | Path traversal in optimized deps `.map` handling | Upgrade to 6.5.0+ |
| vite | ^5.4.19 | GHSA-v6wh-96g9-6wx3 | Moderate | NTLMv2 hash disclosure via UNC path handling on Windows | Upgrade to 6.5.0+ |
| postcss (dep of `next`) | <8.5.10 | GHSA-qx2v-qp2m-jg93 | Moderate | XSS via unescaped `</style>` in CSS stringify output | Update `next` to 16.3.0+ |
| esbuild | <=0.24.2 | GHSA-67mh-4wv8-2f99 | Moderate | Any website can send requests to dev server and read response | Upgrade vite major (breaking) |

**Note:** No CRITICAL CVEs found. The single HIGH finding (vite) affects the dev server only and does not impact production builds.

---

## Secret Exposure Audit

| Secret Type | Expected Location | Actual Location Found | Exposed to Client? | Severity |
|---|---|---|---|---|
| Supabase URL | `VITE_SUPABASE_URL` in `.env` | `.env` (gitignored) | Yes — VITE_ prefixed → bundled | SEV-4 (intentional — anon key only) |
| Supabase Anon Key | `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` | `.env` (gitignored) | Yes — VITE_ prefixed → bundled | SEV-4 (intentional — designed for client use) |
| Supabase Service Role Key | N/A | **Not found anywhere** | No | ✅ **Not exposed** |
| Supabase Project ID | `VITE_SUPABASE_PROJECT_ID` | `.env` (gitignored) | Yes — VITE_ prefixed → bundled | SEV-4 (low — not a secret) |
| Sentry DSN | Environment variable | Referenced as `process.env.VITE_SENTRY_DSN` | Conditional — only if set | SEV-5 |
| Sentry Auth Token | `SENTRY_AUTH_TOKEN` | Referenced in vite.config.ts | No — build-time only | SEV-5 |
| `.env` in git history | Should not be committed | **Not committed** — only `.env.example` tracked | N/A | ✅ **Clean** |

### Git History Analysis
- `.env` is in `.gitignore` — confirmed not tracked
- `.env.example` contains placeholder values only
- Initial commit does not contain any secrets

---

## Security Scan Checklist

### [✅] 1. Supabase service key: client-side exposure check
**Result: PASS** — No service role key found anywhere in `src/`, `.env`, or git history. Only the anon (publishable) key is used via `VITE_SUPABASE_PUBLISHABLE_KEY`.

### [❌] 2. All API routes: auth middleware verified per route
**Result: FAIL** — Multiple RPC functions lack proper authorization:
| Function | Grant | Issue |
|---|---|---|
| `assign_owner_role` | authenticated | Any auth'd user can escalate to owner |
| `upsert_business` | authenticated | Trusts `p_owner_id`, no `auth.uid()` check |
| `upsert_profile` | authenticated | Trusts `p_id`, no `auth.uid()` check |
| `create_staff_user` | authenticated | No ownership check |
| `insert_services` | authenticated | No business ownership check |

### [❌] 3. All POST/PUT/PATCH/DELETE routes: CSRF protection verified
**Result: N/A** — This is a Single Page Application using Supabase Auth (JWT in Authorization header). CSRF is inherently mitigated by the Same-Origin Policy + JWT pattern. However, the **token-based cancellation flow** (`/booking/track/:token` via `cancel_booking_by_token`) is vulnerable to CSRF-like attacks if a user clicks an attacker's link with a valid booking token embedded. The cancel action uses POST-style RPC calls with the token in the request body. While not classic CSRF (no session cookies), the **booking tracking URL** embeds a token in the URL that is shared via WhatsApp — if intercepted, anyone can cancel the booking.

### [✅] 4. All user inputs: injection path traced to database layer
**Result: PASS** — All database queries use Supabase JS SDK parameterized queries (`.eq()`, `.in()`, `.insert()`, `.update()`, `.select()`), never string interpolation. RPC function parameters are passed as typed parameters, not concatenated strings. The `insert_services` RPC uses `jsonb_to_recordset` which is safe from SQL injection.

### [✅] 5. Error handling: stack trace / internal detail leakage check
**Result: PASS** — Error messages shown to users are abstracted through translation keys:
```
catch (err: any) {
  toast({ title: t("common:toast.error"), description: t("auth:onboarding.name.error") });
  console.error("onboarding create profile failed:", err);
}
```
- Console errors may include details in development but are not visible to production users
- Sentry captures detailed errors server-side
- Supabase API errors show generic messages via toast notifications
- No raw database errors are rendered to the DOM

### [❌] 6. Content Security Policy: allows inline scripts
**Result: FAIL** — CSP in both `vite.config.ts` and `vercel.json` includes `'unsafe-inline'`:
```
script-src 'self' 'unsafe-inline'
```
This allows execution of any inline JavaScript. While React requires `'unsafe-inline'` in dev mode for HMR, in production this should be tightened by using a nonce or hash-based approach.

Additional CSP issues:
- `vite.config.ts` CSP applies only to the dev server — not deployed
- `vercel.json` CSP **lacks `font-src` and `media-src`** directives present in the vite config
- `connect-src` allows wildcard Supabase subdomains (`https://*.supabase.co`) which is reasonable but wide

### [⚠️] 7. CORS: origin restriction verified in configuration
**Result: NOT CONFIGURED** — No CORS configuration was found in the codebase. CORS for the Supabase REST API must be configured in the Supabase Dashboard (not in code). Default Supabase CORS policy allows all origins (`*`). This should be restricted to the application's domain.

### [✅] 8. HTTP security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
**Result: PASS** — Configured in both `vite.config.ts` and `vercel.json`:
- `X-Content-Type-Options: nosniff` ✅
- `X-Frame-Options: DENY` ✅  
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✅

**Note:** `Strict-Transport-Security` (HSTS) is **missing** from both configurations.

### [⚠️] 9. npm audit: HIGH and CRITICAL CVEs listed
**Result: 1 HIGH, 0 CRITICAL** — See Dependency CVE Report above. The high severity vulnerability affects vite dev server only.

### [✅] 10. Secrets: .env files, config files, committed credentials check
**Result: PASS** — No secrets committed to git history. `.env` is properly gitignored.

### [⚠️] 11. RLS: enabled check on all tables
**Result: ENABLED ON ALL TABLES** — All 12 public tables have RLS enabled. See RLS Analysis below for policy issues.

---

## RLS Policy Analysis

### Verified Working
| Table | Policy | Verdict |
|---|---|---|
| `profiles` | User can only see/update own profile | ✅ |
| `businesses` | Owner CRUD, public read if active | ✅ |
| `services` | Owner manage, public read if active | ✅ |
| `staff_members` | Owner manage, public read if active, staff read own | ✅ |
| `bookings` | Client read own, owner manage, staff view/update scoped | ✅ (with gaps) |
| `queue_tickets` | Client read own, owner manage, staff view/update scoped | ✅ (with gaps) |
| `whatsapp_templates` | Owner full CRUD | ✅ |
| `reviews` | Client CRUD own, public read | ✅ |

### Identified Policy Gaps

**Gap 1: `user_roles` INSERT policy allows self-escalation**
```sql
-- Line 1252-1254
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```
**Attack:** Any authenticated user can insert `('owner')` for their own `user_id`, granting themselves business owner access.

**Gap 2: `queue_counters` anon SELECT allows public enumeration**
```sql
-- Line 1514-1516
CREATE POLICY "Public can read queue counters" ON public.queue_counters
  FOR SELECT TO anon USING (true);
```
**Attack:** Anyone can enumerate `last_number` values across all businesses to determine booking/ticketing volume.

**Gap 3: `feedback` anon INSERT is unrestricted**
```sql
-- Line 1536-1538
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);
```
**Attack:** Anonymous users can spam the feedback table. This is also flagged by Supabase advisor.

**Gap 4: Anon booking cancellation by token is wide**
```sql
-- Line 1417-1421
CREATE POLICY "Anon can cancel booking by token"
  ON public.bookings FOR UPDATE TO anon
  USING (booking_token IS NOT NULL AND client_id IS NULL)
  WITH CHECK (status = 'cancelled');
```
**Attack:** Any anon user can cancel any anon booking where `client_id IS NULL` by guessing or intercepting the token. The uniqueness of the UUID token limits brute-force risk but does not eliminate token interception via shared WhatsApp links.

---

## SECURITY DEFINER RPC Analysis

### Functions Granting EXECUTE to `anon` (public)
| Function | Risk | Verdict |
|---|---|---|
| `generate_ticket_number(p_business_id)` | Any anon can increment queue counter for any business | SEV-2 |
| `cancel_booking_by_token(p_booking_id, p_token)` | Any anon can cancel any booking with valid token | SEV-3 |
| `get_booking_by_token(p_token)` | Any anon can read booking details by token | SEV-3 |
| `get_queue_ticket(p_ticket_id)` | Low — read-only, scoped to active statuses | SEV-5 |
| `get_business_queue(p_business_id, p_queue_date)` | Low — read-only | SEV-5 |
| `get_completed_ticket_stats(p_business_id, p_service_id)` | Low — read-only aggregated data | SEV-5 |
| `get_queue_context(p_business_id, p_queue_date, p_ticket_number)` | Low — read-only | SEV-5 |
| `get_default_whatsapp_templates()` | Low — returns static template data | SEV-5 |

### Functions Granting EXECUTE to `authenticated`
| Function | Risk | Verdict |
|---|---|---|
| `assign_owner_role(p_user_id)` | **Any auth user can become owner** | **SEV-1** |
| `upsert_business(p_owner_id, ...)` | **Any auth user can create/update business for any owner_id** | **SEV-1** |
| `upsert_profile(p_id, p_full_name)` | **Any auth user can overwrite any profile** | **SEV-1** |
| `create_staff_user(p_staff_id, p_email, p_password)` | **Any auth user can create auth users for any staff** | **SEV-1** |
| `insert_services(p_business_id, p_services)` | **Any auth user can add services to any business** | **SEV-1** |
| `get_monthly_business_counts(p_business_id)` | Any auth user can query any business's monthly metrics | SEV-3 |
| `get_user_role(_user_id)` | Any auth user can query any user's role | SEV-3 (information disclosure) |
| `has_role(_user_id, _role)` | Any auth user can check any user's role | SEV-3 |

---

## Findings Table

| ID | Title | Attack Surface | Description | Severity | Confidence | Evidence | Remediation |
|---|---|---|---|---|---|---|---|
| S-001 | `assign_owner_role` — Privilege escalation via SECURITY DEFINER | RPC `assign_owner_role` at `/rest/v1/rpc/assign_owner_role` | Any authenticated user can call this RPC with any `p_user_id` to grant that user the `owner` role. The function is SECURITY DEFINER and bypasses RLS. Verified in `supabase/schema/MASTER_SCHEMA.sql:468-478`, GRANT at line 480. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:480`: `GRANT EXECUTE ON FUNCTION assign_owner_role(UUID) TO authenticated;` — no `auth.uid()` check exists in the function body | Add `IF auth.uid() = p_user_id THEN ... END IF;` check in function body, or remove the function and use an Edge Function with proper auth |
| S-002 | `upsert_business` — Cross-tenant business hijacking | RPC `upsert_business` at `/rest/v1/rpc/upsert_business` | Any authenticated user can call `upsert_business` with any `p_owner_id` to create or update a business belonging to another user. Verified in `MASTER_SCHEMA.sql:567-616`, GRANT at line 616. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:616`: `GRANT EXECUTE ON FUNCTION upsert_business(...) TO authenticated;` — function trusts `p_owner_id` without checking `auth.uid()` | Replace `p_owner_id` parameter with `auth.uid()` internal lookup |
| S-003 | `upsert_profile` — Profile hijacking | RPC `upsert_profile` at `/rest/v1/rpc/upsert_profile` | Any authenticated user can call `upsert_profile` with any `p_id` to overwrite any user's profile data. Verified in `MASTER_SCHEMA.sql:550-562`, GRANT at line 562. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:562`: `GRANT EXECUTE ON FUNCTION upsert_profile(UUID, TEXT) TO authenticated;` — trusts `p_id` without `auth.uid()` check | Use `auth.uid()` internally instead of accepting `p_id` as parameter |
| S-004 | `insert_services` — Cross-tenant service injection | RPC `insert_services` at `/rest/v1/rpc/insert_services` | Any authenticated user can attach services to any business by passing an arbitrary `p_business_id`. Verified in `MASTER_SCHEMA.sql:621-636`, GRANT at line 636. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:636`: `GRANT EXECUTE ON FUNCTION insert_services(UUID, JSONB) TO authenticated;` — no business ownership check | Add ownership check: verify caller owns the business before inserting |
| S-005 | `create_staff_user` — Unauthorized staff account creation | RPC `create_staff_user` at `/rest/v1/rpc/create_staff_user` | Any authenticated user can create arbitrary auth users linked to any staff member. Inserts directly into `auth.users` table. Verified in `MASTER_SCHEMA.sql:485-543`, GRANT at line 545. Attack path: `src/pages/dashboard/DashboardStaff.tsx:134-138` calls this for any staff member. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:545`: `GRANT EXECUTE ON FUNCTION create_staff_user(UUID, TEXT, TEXT) TO authenticated;` — no business ownership verification | Add ownership check: verify the caller owns the business associated with `p_staff_id` |
| S-006 | `user_roles` RLS self-escalation | Table `public.user_roles` INSERT | RLS policy allows authenticated users to insert any role (including `owner`) for themselves. Verified in `MASTER_SCHEMA.sql:1252-1254`. | SEV-1 | 5 — VERIFIED | `MASTER_SCHEMA.sql:1253`: `FOR INSERT WITH CHECK (auth.uid() = user_id);` — no role restriction | Add a role restriction: only allow `client` role to be self-inserted, or remove anon INSERT and use SECURITY DEFINER function with proper checks |
| S-007 | CSP allows `'unsafe-inline'` | Content-Security-Policy header | Both `vite.config.ts:24` and `vercel.json:13` CSP include `'unsafe-inline'` for `script-src`, allowing arbitrary inline script execution. This weakens XSS protection. | SEV-3 | 5 — VERIFIED | `vite.config.ts:24`: `script-src 'self' 'unsafe-inline'` and `vercel.json:13`: same | Use nonce-based CSP for scripts (React supports nonce via `ReactDOM.createRoot` options), or use hash-based approach for known scripts |
| S-008 | Storage bucket `business-assets` is public | Supabase Storage | `business-assets` bucket has `public = true`. While the listing policy was removed (H-010 fix), any file with a known URL is publicly accessible. No path-scoping on upload policy. Verified in `MASTER_SCHEMA.sql:1614-1616` and `supabase_get_storage_config`. | SEV-3 | 4 — VERIFIED | `MASTER_SCHEMA.sql:1615`: `VALUES ('business-assets', 'business-assets', true)` | Keep public if intentional for public business pages. Add path-based validation if not needed for public access. |
| S-009 | No rate limiting on auth endpoints | Supabase Auth | The application does not implement any rate limiting on login/signup/reset-password endpoints beyond what Supabase Auth provides by default. No custom rate limiting in application code. | SEV-3 | 3 — INFERRED | No rate limiting configuration found in any application file or Supabase config | Configure Supabase Auth rate limiting in dashboard, or implement client-side CAPTCHA |
| S-010 | `generate_ticket_number` anon-executable | RPC `/rest/v1/rpc/generate_ticket_number` | Any anonymous user can call this SECURITY DEFINER function to increment the queue counter for any business ID, causing a denial-of-service by exhausting ticket numbers. Verified in `MASTER_SCHEMA.sql:338-362`, GRANT at line 362. | SEV-2 | 4 — VERIFIED | `MASTER_SCHEMA.sql:362`: `GRANT EXECUTE ON FUNCTION generate_ticket_number(UUID) TO anon, authenticated;` | Remove anon grant; only `authenticated` users should be able to generate tickets (or use a signed nonce) |
| S-011 | JWT session valid 1 hour after logout | Supabase Auth lifecycle | Supabase JWT access token has a default 1-hour expiry. When a user signs out, the client-side session is cleared but the JWT remains valid until expiry. Any stolen token can be used for up to 1 hour. | SEV-2 | 4 — INFERRED | `src/contexts/AuthContext.tsx:111`: `await supabase.auth.signOut()` — client-side only, no server-side token invalidation | Acceptable for this architecture (no server). Document risk. |
| S-012 | Anon queue counter enumeration | Table `public.queue_counters` | Anon users can read `last_number` across all businesses via the `"Public can read queue counters"` policy with `USING (true)`. This leaks business activity volume. Verified in `MASTER_SCHEMA.sql:1516`. | SEV-4 | 4 — VERIFIED | `MASTER_SCHEMA.sql:1516`: `FOR SELECT TO anon USING (true);` | Restrict to authenticated users only, or add business_id scoping |
| S-013 | HSTS missing | HTTP response headers | Neither `vite.config.ts` nor `vercel.json` configure `Strict-Transport-Security` header. This weakens HTTPS enforcement. | SEV-4 | 4 — VERIFIED | Absent from both `vite.config.ts:17-33` and `vercel.json:8-15` | Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` to Vercel headers |
| S-014 | No server-side CORS restriction | Supabase CORS configuration | The Supabase project likely has default CORS (`*`), which would allow any origin to make API calls from the browser. Not configurable in code. | SEV-3 | 3 — INFERRED | Not found in any configuration file | Configure CORS in Supabase Dashboard → API → Settings to restrict to production domain |
| S-015 | `feedback` table allows anon spam | Table `public.feedback` INSERT | Anyone (including unauthenticated users) can insert arbitrary rows into the feedback table. Verified in `MASTER_SCHEMA.sql:1538`. | SEV-4 | 5 — VERIFIED | `MASTER_SCHEMA.sql:1538`: `FOR INSERT WITH CHECK (true);` | Add rate limiting or require CAPTCHA before insert |
| S-016 | Vite HIGH severity vulnerability | Build tooling | `vite:^5.4.19` has GHSA-fx2h-pf6j-xcff (path traversal on Windows). High severity. | SEV-4 | 5 — VERIFIED | `package.json:95`: `"vite": "^5.4.19"`, confirmed via npm audit | Upgrade to vite 6.5.0+ or apply security mitigation |

---

## Chained Exploitation Path

The SEV-1 findings compose into a complete account-takeover chain:

1. **Escalate to owner** — Call `assign_owner_role` with own `user_id` (S-001) OR self-insert `('owner')` via `user_roles` INSERT (S-006)
2. **Hijack any business** — Call `upsert_business` with any victim's `owner_id` (S-002), overwrite their business record
3. **Insert backdoor services** — Call `insert_services` with hijacked business ID (S-004)
4. **Infiltrate staff** — Call `create_staff_user` to create auth accounts for attacker-controlled staff (S-005)
5. **Exfiltrate data** — Access all booking/queue data via RLS which trusts business ownership (no additional auth)
6. **Overwrite other profiles** — Call `upsert_profile` with any user ID to change display names or phone numbers (S-003)

**Single RPC call required:** Any of S-001, S-003, or S-006 alone is sufficient for privilege escalation.

**Mitigation in order of importance:**
1. Remove `assign_owner_role` GRANT or add `auth.uid()` check
2. Fix `user_roles` INSERT policy to only allow `client` role
3. Add `auth.uid()` checks to `upsert_profile`, `upsert_business`, `insert_services`, `create_staff_user`
4. Convert read-only SECURITY DEFINER functions to `SECURITY INVOKER` where possible

---

## Missing Information Log

| Item | What Was Sought | Where Not Found |
|---|---|---|
| Supabase CORS configuration | Explicit CORS allowlist | Not in codebase — must check Supabase Dashboard |
| Auth settings (session duration, rate limiting) | Supabase Auth config | Not in codebase — configured in Supabase Dashboard |
| Service role key usage | Any reference in src, .env, CI config | **Not found** — confirmed absent |
| Edge Functions | Server-side middleware | **None deployed** — confirmed via `supabase_list_edge_functions()` |
| Webhook configuration | External notification endpoints | **None configured** |
| Custom JWT claims | Role embedded in token | **Not used** — roles fetched from `user_roles` table |
| Data retention / cleanup policies | Cron jobs, scheduled functions | **None found** |
| MFA / 2FA configuration | Auth provider settings | **Not implemented** |
| Audit logging | System-wide audit trail | **Not implemented** |

---

## Escalations

| Finding ID | Escalate To | Reason |
|---|---|---|
| S-001 through S-006 | Lead Engineer + RLS Verifier | All five SEV-1 findings relate to SECURITY DEFINER functions lacking authorization checks. These are the single highest-priority remediation items and require schema/function changes. |
| S-010, S-012 | Lead Engineer | Anon-executable functions and permissive anon policies need policy adjustments |
| S-007, S-013 | Infrastructure / DevOps | CSP and HSTS configuration changes in `vercel.json` |
| S-014 | Infrastructure / Lead Engineer | CORS must be restricted in Supabase Dashboard |
| S-016 | Lead Engineer | npm audit remediation — upgrade vite to latest |

---

## Summary Statistics

| Category | Count |
|---|---|
| SEV-1 (Critical) | 6 |
| SEV-2 (High) | 2 |
| SEV-3 (Medium) | 5 |
| SEV-4 (Low) | 4 |
| SEV-5 (Info) | 0 |
| **Total** | **17** |

### Security Posture

**Overall: 🔴 CRITICAL — Do not launch without remediation of SEV-1 items.**

The application has a fundamentally sound architecture (RLS on all tables, no service key in client, parameterized queries, proper session management) but the critical finding is that **all six SEV-1 items share a single root cause**: SECURITY DEFINER RPC functions and RLS policies that trust client-provided identifiers instead of verifying them against `auth.uid()`. These functions were intentionally created to bypass RLS for valid onboarding flows but were implemented without the corresponding authorization checks.

**Minimum launch requirements:**
1. Fix all 6 SEV-1 findings (S-001 through S-006)
2. Restrict `generate_ticket_number` to authenticated users (S-010)
3. Remove `USING (true)` from queue_counters anon policy (S-012)
4. Configure CORS restriction in Supabase Dashboard (S-014)
5. Add HSTS header (S-013)
