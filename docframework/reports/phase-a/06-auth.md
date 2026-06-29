# Role 06 — Auth & Authorization Specialist Report

## Identity Lifecycle Trace

### STEP 1 — Account Creation

**Registration Flow:**
1. `src/components/auth/LoginForm.tsx:69-72` — User submits email+password via `supabase.auth.signUp()` (Supabase Auth SDK)
2. `supabase/schema/MASTER_SCHEMA.sql:1154-1157` — Trigger `on_auth_user_created` fires AFTER INSERT on `auth.users`, calling `handle_new_user()`
3. `MASTER_SCHEMA.sql:367-378` — `handle_new_user` inserts a row into `public.profiles` with `id = NEW.id` and `full_name` from `raw_user_meta_data`
4. If `data.session` is present (email confirmation disabled), user is redirected to onboarding (`StepName.tsx`)
5. `src/components/onboarding/StepName.tsx:30-36` — `assign_owner_role` RPC called to insert into `user_roles`
6. `MASTER_SCHEMA.sql:468-478` — `assign_owner_role` is SECURITY DEFINER, inserts `(user_id, 'owner')` into `user_roles`

**Email verification:** The app checks `if (data?.session)` after signup (`LoginForm.tsx:74`). If Supabase is configured to **not** require email confirmation (default in development), the session is returned immediately and the user proceeds to onboarding without verifying their email. If email confirmation IS enabled, `data.session` will be null, and the user sees a "check your email" toast — but they have no server-side gate preventing API access while unverified. The JWT is issued with `email_confirmed_at: null` but the app does not check this claim.

**Registration fields affecting roles:** None. Roles are assigned exclusively via SECURITY DEFINER RPCs (`assign_owner_role`, `create_staff_user`). The signup form itself only captures email and password.

**Email validation:** `type="email"` with HTML5 validation and `required` attribute on the Input. No server-side email format validation before calling `supabase.auth.signUp()`. Supabase Auth performs its own validation server-side.

### STEP 2 — Session Establishment

1. `src/integrations/supabase/client.ts:11-16` — Supabase client initialized with `localStorage`, `persistSession: true`, `autoRefreshToken: true`
2. `LoginForm.tsx:83` — `supabase.auth.signInWithPassword({ email, password })` triggers JWT issuance from Supabase Auth
3. Supabase SDK automatically stores the JWT in `localStorage` under `sb-{project-ref}-auth-token`
4. JWT claims (Supabase default): `sub` (user UUID), `aud` ('authenticated'), `role` ('authenticated' | 'anon'), `iat`, `exp` (1 hour default), `email`, `user_metadata`
5. **NOT in JWT:** `app_role` (owner/staff/client), `business_id`, `tenant_id`, or any custom claims
6. JWT expiry: Supabase default **3600 seconds (1 hour)**
7. `autoRefreshToken: true` directs Supabase SDK to automatically refresh the token using the refresh token before expiry
8. Refresh token lifetime: Supabase default (configurable in Supabase dashboard, typically 60 days or until revoked)
9. `src/contexts/AuthContext.tsx:67-79` — `onAuthStateChange` listener captures session changes; `AuthContext.tsx:82-104` — `getSession()` on mount restores persisted session from localStorage

### STEP 3 — Request Authentication

**Client-side verification:**
- `AuthContext.tsx:82-93` — On mount, calls `getSession()`, then calls `getUser()` which performs a **server-side token verification** via the Supabase REST API (`GET /auth/v1/user` with Authorization header). If `getUser()` returns no user, the session is considered invalid and the user is signed out.
- All subsequent calls use the Supabase client which automatically attaches the `Authorization: Bearer <JWT>` header from the stored session.

**Server-side verification (Postgres/RLS):**
- `auth.uid()` in RLS policies and SECURITY DEFINER functions is resolved from the JWT presented in the request's Authorization header. This is handled by Supabase's PostgREST layer automatically.
- **No Edge Functions exist** (`supabase/functions/` is empty). There is no server-side middleware to perform additional JWT validation beyond what Supabase PostgREST provides.

**What happens when JWT is:**
- **Expired:** Supabase SDK detects `401` response, attempts auto-refresh. If refresh fails, `onAuthStateChange` fires with `SIGNED_OUT` event. `ProtectedRoute` redirects to `/login`.
- **Tampered:** Supabase's GoTrue service validates the JWT signature on `getUser()` calls. Tampered tokens are rejected with `401` and the client's `onAuthStateChange` fires `SIGNED_OUT`.
- **Missing:** API calls without JWT are executed as `anon` role. RLS policies restrict what anon can access. `ProtectedRoute` checks `user` from context and redirects to `/login` if null.

**Critical gap:** Between `getSession()` returning a stored token and `getUser()` verifying it server-side (line 82-84), there's a window where `session` is set (line 94) before the user is confirmed. However, the flow handles this correctly by calling `getUser()` and invalidating if no user is returned.

### STEP 4 — Authorization Decisions

**Role storage:**
- Roles stored in `public.user_roles` table (`user_id UUID`, `role app_role`). `app_role` enum: `owner`, `staff`, `client`.
- `user_roles` uses a UNIQUE constraint on `(user_id, role)` — a user can theoretically have multiple roles.
- `get_user_role` RPC (`MASTER_SCHEMA.sql:325-333`) returns the **first** role for a user (via `LIMIT 1`), meaning if a user has both 'owner' and 'staff' roles, only one is returned.

**Role injection into auth context:**
- `AuthContext.tsx:53-63` — `fetchRole` calls `supabase.rpc("get_user_role", { _user_id: userId })` and stores result in React state.
- `AuthContext.tsx:58` — Casts raw data directly to `AppRole` type (TypeScript cast only, no runtime validation).
- Roles are stored in React context state, **NOT in the JWT**. The `get_user_role` RPC is called on every login/session restore.

**Client can modify own role?**
- `user_roles` table has only a SELECT policy (`MASTER_SCHEMA.sql:1248-1250`): "Users can read their own roles". There is also an INSERT policy (`MASTER_SCHEMA.sql:1252-1254`): "Users can insert their own role" — **this allows any authenticated user to insert a role row for themselves**.
- INSERT on `user_roles` is granted to `authenticated` via table grants (`MASTER_SCHEMA.sql:1684`).
- **Finding: F-05 (from Wave 1)** — `user_roles` has no UPDATE or DELETE policy, but the INSERT policy allows any authenticated user to create a `user_roles` entry for themselves. If they insert `('owner', user_id)`, the `get_user_role` RPC could return `'owner'` (first row via LIMIT 1).

**Permission enforcement layers:**

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| **Database RLS** | Row-level security policies using `auth.uid()` | All tables |
| **SECURITY DEFINER RPCs** | Bypass RLS, used for onboarding/staff creation | `assign_owner_role`, `create_staff_user`, `upsert_profile`, `upsert_business`, `insert_services` |
| **React route guards** | `<ProtectedRoute allowedRoles={[...]}>` | Owner dashboard, staff view, client bookings |
| **Client-side role check** | `userRole` from `useAuth()` hook used for conditional rendering | UI elements, navigation |

**Key gap — no server-side middleware:** With no Edge Functions, all "authenticated" users with any role can call any table directly (subject to RLS) via the Supabase REST API. RLS policies use `auth.uid()` but do NOT check `app_role` from `user_roles` table. Example: `bookings` table allows any authenticated user with `auth.uid() = client_id` to SELECT/INSERT. There is no check that the user has the `client` role.

**Permission matrix is implicit** through RLS policies; there is no centralized permission matrix in code.

### STEP 5 — Session Termination

**Logout flow:**
1. `AuthContext.tsx:110-115` — `signOut()` calls `supabase.auth.signOut()` then clears React state
2. `supabase.auth.signOut()` clears localStorage and revokes the session server-side by calling Supabase's `GET /auth/v1/logout` endpoint
3. Supabase Auth by default **does invalidate the refresh token** on logout, but the **access token (JWT) remains valid until it expires** (up to 1 hour)

**Server-side invalidation:**
- Supabase Auth marks the refresh token as revoked on `signOut()`.
- The access JWT (1-hour expiry) is **not** added to a blocklist — it remains valid until `exp`.
- If an attacker captured a JWT before logout, it will work for up to 1 hour after logout.

**Session revocation for compromised accounts:**
- Supabase provides `supabase.auth.admin.deleteUser()` — but this requires `service_role` key and is not exposed in the app UI.
- No "revoke all sessions" functionality in the app.
- Supabase dashboard allows manual user suspension, but this is not exposed in the application.

**Post-logout JWT usage:**
- The JWT access token works until its `exp` claim (~1 hour after issuance) even after `signOut()`.
- The refresh token is invalidated server-side by Supabase Auth on logout.
- After logout, `supabase.auth.getSession()` returns null, but any stored token in localStorage (if not cleared) would work until expiry.

---

## Required Questions

**1. Where are user roles stored, and how are they injected into the auth context?**
- Stored in `public.user_roles` table with columns `(id, user_id, role)`. Role is a custom enum `app_role` with values `owner`, `staff`, `client`.
- Injected via: `AuthContext.tsx:53-63` — calls `get_user_role` SECURITY DEFINER RPC which queries `user_roles` and returns the first role found. Result stored in React context state (`role`).
- Also fetched directly in `LoginForm.tsx:30-35` from `user_roles` table via `.from("user_roles").select("role")` for post-login redirect logic.

**2. Can a user modify their own JWT claims (role, tenant ID, permissions) through any mechanism?**
- JWT claims cannot be modified client-side (JWTs are signed by Supabase Auth). However:
- **The app does NOT include role/permissions in JWT claims.** Roles are stored in DB and fetched separately.
- A user CAN insert a `user_roles` row for themselves via the INSERT policy (`MASTER_SCHEMA.sql:1252-1254`): "Users can insert their own role" WITH CHECK `auth.uid() = user_id`. This means an authenticated user can give themselves a second role entry.
- `get_user_role` uses `LIMIT 1`, so inserting a second role could change which role is returned (first row wins).
- **Finding: MT-001 (cross-tenant staff hijack)** — `create_staff_user` RPC is granted to ALL `authenticated` users without ownership verification (`GRANT EXECUTE ON FUNCTION public.create_staff_user(UUID, TEXT, TEXT) TO authenticated;`), allowing any authenticated user to create staff accounts with arbitrary emails/passwords.

**3. Are password reset tokens single-use and time-limited?**
- `ForgotPassword.tsx:24-25` — Uses `supabase.auth.resetPasswordForEmail()` which delegates to Supabase Auth.
- Supabase Auth reset tokens are **single-use and time-limited** (default: 24 hours, configurable in dashboard).
- `ResetPassword.tsx:36` — uses `supabase.auth.updateUser({ password })` to change password.
- The `PASSWORD_RECOVERY` event (`ResetPassword.tsx:21`) triggers the UI to show the password form. This event fires when the user arrives via the reset link with the recovery token.
- **Assessment:** The client code leverages Supabase's built-in flow, which handles token validation server-side. Token validation happens on the Supabase Auth server, not in application code. **CORRECT by delegation.**

**4. What is the session lifetime, and is it appropriate?**
- Access token (JWT): **1 hour** (Supabase default, configurable in Supabase dashboard)
- Refresh token: **60 days** (Supabase default, configurable)
- The app sets `autoRefreshToken: true` so the SDK refreshes automatically.
- **Assessment:** 1-hour JWT lifetime is appropriate for a SaaS application. However, the 60-day refresh token window means a stolen refresh token grants long-lived access. This is Supabase's default and is not overridden — acceptable for launch but should be reviewed.

**5. Does logout actually invalidate the session server-side?**
- **Partial.** `supabase.auth.signOut()` invalidates the **refresh token** on the Supabase Auth server.
- The **access token (JWT)** is NOT invalidated — it remains valid until its `exp` time (up to 1 hour).
- The SDK clears persisted session from localStorage.

**6. Is email verification enforced before granting access to protected features?**
- **No.** The application never checks `user.email_confirmed_at` or any email verified status.
- After signup, if Supabase's "Confirm email" setting is off (common in development), a session is returned immediately and the user proceeds to onboarding.
- Even with email verification enabled, the JWT is issued upon login (post-verification), but the app does not explicitly check `email_confirmed_at` anywhere.
- **No client-side or server-side code verifies email verification status.**

**7. Are all auth methods (email/password, OAuth, magic link if present) secured consistently?**
- **Only email/password is implemented.** `LoginForm.tsx:67-72` for signup, `LoginForm.tsx:83-84` for login.
- No OAuth, no magic links, no phone auth.
- Password reset uses Supabase's built-in email-based flow. Consistent security via Supabase delegation.

**8. What happens when a JWT expires mid-session?**
- Supabase SDK detects a 401 response, attempts auto-refresh using the refresh token.
- If refresh succeeds: session continues transparently.
- If refresh fails (refresh token also expired): `onAuthStateChange` fires `SIGNED_OUT`, ProtectedRoute redirects to `/login`.
- The AuthContext has no explicit handling for "session expired mid-action" beyond the Supabase SDK's default behavior.
- **Risk:** No user-visible toast/message for session expiry. The app silently redirects to login, losing any unsaved work.

**9. Can all sessions for a user be revoked if their account is compromised?**
- **No in-app mechanism.** Supabase's `admin.deleteUser()` or `admin.invalidateUserSessions()` requires `service_role` key and is not exposed.
- Supabase dashboard provides manual user management, but no application-level "terminate all sessions" button.
- Founder can use Supabase dashboard to disable the user, which prevents new logins but does not invalidate existing JWTs until they expire.

**10. Do authentication errors distinguish between "email not found" and "wrong password" (enumeration risk)?**
- Supabase's `signInWithPassword()` returns a generic "Invalid login credentials" error for both cases (by default).
- The `ForgotPassword` flow (`ForgotPassword.tsx:24`) always shows "Email sent" regardless of whether the email exists (if Supabase's "Hide user" setting is enabled, which is the default).
- **Assessment:** The app relies on Supabase's default behavior, which returns **generic error messages** that do NOT distinguish between "email not found" and "wrong password". The Supabase default protects against email enumeration. **CORRECT.**

---

## Permission Matrix

| Role | Resource | Operation | Permitted? | Enforcement Layer | Code Location |
|------|----------|-----------|------------|-------------------|---------------|
| anon | businesses | SELECT (active) | Yes | RLS | `MASTER_SCHEMA.sql:1259-1261` |
| anon | services | SELECT (active) | Yes | RLS | `MASTER_SCHEMA.sql:1295-1297` |
| anon | staff_members | SELECT (active) | Yes | RLS | `MASTER_SCHEMA.sql:1308-1310` |
| anon | business_hours | SELECT | Yes | RLS | `MASTER_SCHEMA.sql:1282-1284` |
| anon | bookings | INSERT (client_id NULL) | Yes | RLS | `MASTER_SCHEMA.sql:1408-1410` |
| anon | bookings | SELECT (token-based) | Yes | RLS | `MASTER_SCHEMA.sql:1412-1415` |
| anon | bookings | UPDATE (cancel by token) | Yes | RLS | `MASTER_SCHEMA.sql:1417-1421` |
| anon | queue_tickets | INSERT (client_id NULL) | Yes | RLS | `MASTER_SCHEMA.sql:1479-1481` |
| anon | queue_tickets | SELECT (active statuses) | Yes | RLS | `MASTER_SCHEMA.sql:1484-1487` |
| anon | queue_tickets | UPDATE (cancel, client_id NULL) | Yes | RLS | `MASTER_SCHEMA.sql:1489-1494` |
| anon | queue_counters | SELECT | Yes | RLS | `MASTER_SCHEMA.sql:1514-1516` |
| anon | reviews | SELECT | Yes | RLS | `MASTER_SCHEMA.sql:1521-1523` |
| anon | feedback | INSERT | Yes | RLS | `MASTER_SCHEMA.sql:1536-1538` |
| anon | profiles | anything | No | No grant | Grants omitted for anon on profiles |
| anon | user_roles | anything | No | No grant | Grants omitted for anon on user_roles |
| authenticated | profiles | SELECT own | Yes | RLS | `MASTER_SCHEMA.sql:1233-1235` |
| authenticated | profiles | UPDATE own | Yes | RLS | `MASTER_SCHEMA.sql:1237-1239` |
| authenticated | profiles | INSERT own | Yes | RLS | `MASTER_SCHEMA.sql:1241-1243` |
| authenticated | user_roles | SELECT own | Yes | RLS | `MASTER_SCHEMA.sql:1248-1250` |
| authenticated | user_roles | INSERT own | **Yes (vuln)** | RLS | `MASTER_SCHEMA.sql:1252-1254` |
| authenticated (owner) | businesses | INSERT/UPDATE/DELETE own | Yes | RLS | `MASTER_SCHEMA.sql:1263-1277` |
| authenticated (owner) | services | ALL (own business) | Yes | RLS | `MASTER_SCHEMA.sql:1299-1303` |
| authenticated (owner) | staff_members | ALL (own business) | Yes | RLS | `MASTER_SCHEMA.sql:1312-1316` |
| authenticated (owner) | bookings | SELECT/UPDATE/INSERT (own business) | Yes | RLS | `MASTER_SCHEMA.sql:1362-1383` |
| authenticated (owner) | queue_tickets | SELECT/UPDATE/INSERT (own business) | Yes | RLS | `MASTER_SCHEMA.sql:1434-1455` |
| authenticated (staff) | bookings | SELECT/UPDATE (scoped) | Yes | RLS | `MASTER_SCHEMA.sql:1385-1406` |
| authenticated (staff) | queue_tickets | SELECT/UPDATE (scoped) | Yes | RLS | `MASTER_SCHEMA.sql:1457-1477` |
| authenticated (client) | bookings | SELECT/INSERT own | Yes | RLS | `MASTER_SCHEMA.sql:1354-1361` |
| authenticated (client) | queue_tickets | SELECT/INSERT own | Yes | RLS | `MASTER_SCHEMA.sql:1426-1432` |
| authenticated (client) | reviews | INSERT own | Yes | RLS | `MASTER_SCHEMA.sql:1525-1527` |

**Critical observation:** RLS policies on `bookings` and `queue_tickets` check `auth.uid()` but do **NOT** verify the user has the correct `app_role`. For example, an `owner` can also insert a booking as themselves (using their own `auth.uid()` as `client_id`) without having the `client` role. This is an **implicit trust model** — any authenticated user with any role can act as a client on these tables.

---

## Auth Configuration Assessment

| Config Item | Expected Value | Actual Value | Correct? | Risk |
|-------------|---------------|--------------|----------|------|
| JWT expiry | 3600s (1 hour) | 3600s (default) | Yes | Low |
| Refresh token expiry | Configurable | 60 days (default) | Tolerable | Medium — long-lived refresh window |
| autoRefreshToken | true | true | Yes | None |
| persistSession | true | true | Yes | None |
| storage | localStorage | localStorage | Yes | Medium — XSS would leak tokens |
| Email confirmation | Required for prod | Not checked in code | **No** | Medium — unverified emails can access |
| JWT contains app_role | Should be present | **Missing** | **No** | **SEV-1** — role in separate DB query, not verifiable server-side without DB call |
| RLS on user_roles INSERT | Restrictive | `auth.uid() = user_id` | **No** | **SEV-2** — users can insert own role rows |
| create_staff_user EXECUTE grant | Owner-only | All authenticated | **No** | **SEV-1** — MT-001 cross-tenant hijack |
| upsert_business | Owner-only | All authenticated | **No** | **SEV-1** — MT-002 owner_id parameter trusted |
| insert_services | Business-scoped only | All authenticated | **No** | **SEV-1** — MT-003 business_id parameter trusted |
| get_user_role returns first role | Single role | Single role (LIMIT 1) | Ambiguous | Medium — user with multiple roles gets unpredictable result |
| Password min length | 6 | 6 | Tolerable | Low — 6 chars is weak but Supabase default allows it |
| Logout invalidates refresh token | Yes | Yes | Yes | None (access token still valid until expiry) |
| Logout invalidates access token | No | No | **No** | **SEV-2** — A-01: lingering JWT post-logout |
| Edge Functions auth middleware | Should exist | **None** | **No** | **SEV-2** — no server-side enforcement layer |
| Login error specificity | Generic | Generic (Supabase default) | Yes | None — enumeration protection |

---

## Findings Table

| ID | Title | Description | Severity | Confidence | Evidence | Location | Remediation |
|----|-------|-------------|----------|------------|----------|-----------|-------------|
| **A-01** | JWT remains valid after logout | Supabase `signOut()` invalidates refresh token but access token (JWT) remains valid for remaining lifetime (~1h). Attacker with intercepted JWT can continue API access. | **SEV-2** | 5 — VERIFIED | `AuthContext.tsx:110-115` calls `supabase.auth.signOut()` which only revokes refresh token (Supabase documented behavior) | Supabase does not support JWT blocklisting at the application level. Mitigation: shorter JWT expiry (e.g., 15 min) + use `getUser()` on every sensitive API call. Or implement a session blacklist in DB checked by RPCs. |
| **A-02** | user_roles INSERT allows self-role escalation | Any authenticated user can insert a `user_roles` row for themselves. `get_user_role` uses `LIMIT 1` so inserting an `owner` row could elevate access. | **SEV-2** | 5 — VERIFIED | `MASTER_SCHEMA.sql:1252-1254`: policy "Users can insert their own role" WITH CHECK `auth.uid() = user_id`. Grant at line 1684: `GRANT SELECT, INSERT ON TABLE public.user_roles TO authenticated` | Remove INSERT policy on `user_roles`. Role assignment should happen exclusively through SECURITY DEFINER RPCs (`assign_owner_role`, `create_staff_user`) which enforce business logic. |
| **A-03** | No server-side middleware for auth enforcement (no Edge Functions) | All server-side auth enforcement relies solely on PostgreSQL RLS policies. There is no API gateway, middleware, or Edge Function layer to validate JWTs, check roles, or enforce permissions before data access. | **SEV-2** | 5 — VERIFIED | `supabase/functions/` directory is empty. No Edge Functions exist in the project. | Deploy Edge Functions for critical operations (business creation, staff management, analytics). These should verify JWT claims and check `user_roles` before processing. |
| **A-04** | Email verification not enforced in application code | The app never checks `user.email_confirmed_at`. If Supabase "Confirm email" is disabled (common), unverified users get full access. Even if enabled, the app has no secondary check. | **SEV-2** | 5 — VERIFIED | `AuthContext.tsx` does not check `email_confirmed_at`. `LoginForm.tsx:74` — only checks `data.session` exist but does not validate email verification status. | Enable "Confirm email" in Supabase Auth settings. Add check in AuthContext: if `user.email_confirmed_at` is null, restrict access to email verification page. |
| **A-05** | Role in React context, not JWT — client-side check bypassable | User role is stored in React state fetched from DB. All role-based gating (`ProtectedRoute`, conditional rendering) relies on this React state. Direct API calls (via browser console or Postman) bypass client-side checks entirely. | **SEV-3** | 5 — VERIFIED | `AuthContext.tsx:53-63` — role stored in `useState`. `ProtectedRoute.tsx:29-34` — role check in React. | Add role verification in RLS policies (e.g., check `public.has_role(auth.uid(), 'owner')` in addition to `auth.uid() = owner_id`). This is a defense-in-depth issue — RLS is the real enforcement layer. |
| **A-06** | create_staff_user grants all authenticated users staff creation power | MT-001. Any authenticated user can call `create_staff_user` to create arbitrary auth accounts with staff roles, including setting passwords. No ownership verification. | **SEV-1** | 5 — VERIFIED | `MASTER_SCHEMA.sql:544`: `GRANT EXECUTE ON FUNCTION public.create_staff_user(UUID, TEXT, TEXT) TO authenticated;` | Add a check inside the function: verify the caller owns the business associated with the staff_member. Use `auth.uid()` within the SECURITY DEFINER function to check business ownership. |
| **A-07** | upsert_business trusts client-supplied owner_id | MT-002. Any authenticated user can call `upsert_business` with any `p_owner_id`, allowing creation/modification of businesses on behalf of other users. | **SEV-1** | 5 — VERIFIED | `MASTER_SCHEMA.sql:567-616`: Function accepts `p_owner_id` as parameter. `GRANT EXECUTE TO authenticated` at line 616. | Remove `p_owner_id` parameter. Use `auth.uid()` inside the function to set the owner. |
| **A-08** | insert_services trusts client-supplied business_id | MT-003. Any authenticated user can call `insert_services` with any `p_business_id`, allowing service insertion into any business. | **SEV-1** | 5 — VERIFIED | `MASTER_SCHEMA.sql:621-636`: Function accepts `p_business_id`. `GRANT EXECUTE TO authenticated` at line 636. | Verify ownership inside function: check `EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid())` before inserting. |
| **A-09** | Client role is implicit (no user_roles row) — cannot be verified server-side | Clients have no `user_roles` row. The app treats NULL from `get_user_role` as "client". This means unauthenticated-anon and authenticated-client are indistinguishable at the DB RLS level. | **SEV-2** | 4 — VERIFIED | `AuthContext.tsx:58` casts NULL to client. RLS policies do not distinguish client from any authenticated user. | Create a `user_roles` row with `client` role for all new users (e.g., via trigger or signup hook). Update RLS policies on `bookings`, `reviews`, and `queue_tickets` to additionally check `has_role(auth.uid(), 'client')`. |
| **A-10** | No rate limiting on login/signup attempts | The application does not implement any rate limiting on authentication endpoints. The form has only a client-side `loading` state variable but no exponential backoff or lockout. | **SEV-3** | 4 — VERIFIED | `LoginForm.tsx:62-97` — `handleEmailSubmit` no rate limit logic. Relies on Supabase's built-in rate limiting (which is generous). | Implement exponential backoff or use Supabase's built-in rate limiting (configure in Supabase dashboard). Add reCAPTCHA for production. |
| **A-11** | `get_user_role` returns first role, ambiguous for multi-role users | If a user has multiple `user_roles` rows, `get_user_role` returns whichever row Postgres visits first (non-deterministic without ORDER BY). | **SEV-3** | 4 — VERIFIED | `MASTER_SCHEMA.sql:332`: `SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1` | Add `ORDER BY role ASC` or business logic to determine primary role. Consider adding a `is_primary` column or enforcing single-role constraint. |
| **A-12** | Password minimum length is 6 characters | The client-side form sets `minLength={6}` (line 143 in LoginForm.tsx). Supabase also defaults to 6 chars minimum. | **SEV-3** | 5 — VERIFIED | `LoginForm.tsx:143`: `minLength={6}`. Supabase Auth default minimum. | Increase to 8+ characters. Configure in Supabase Auth settings (Security > Password Requirements) and update client-side validation. |
| **A-13** | No session revocation UI for account compromise | There is no in-app mechanism for a user to view active sessions or revoke them. No "log out all devices" feature. | **SEV-3** | 5 — VERIFIED | No such feature exists in any UI component examined. | Add a "Session management" page in dashboard settings showing active sessions with revoke capability (use Supabase Auth admin API via Edge Function). |
| **A-14** | Auth state managed in React memory + localStorage — XSS risk | JWT stored in localStorage (`persistSession: true`). Any XSS vulnerability would expose the token. Additionally, React state (session, user, role) is ephemeral but localStorage persists. | **SEV-2** | 4 — INFERRED | `client.ts:13`: `storage: localStorage`. `AuthContext.tsx:46-48`: state in useState. | Consider using `httpOnly` cookies for production (requires custom Supabase setup with `gotrue-js` or Edge Functions proxy). At minimum, apply strict CSP headers. |

---

## Missing Information Log

| Item | What Was Sought | Where Not Found |
|------|----------------|-----------------|
| Supabase project auth settings | Email confirmation enabled/disabled, JWT expiry config, refresh token config | Supabase dashboard — not in codebase. Code assumes defaults. |
| `user_roles` UPDATE/DELETE RLS policies | Whether authenticated users can update/delete role rows | `MASTER_SCHEMA.sql:1248-1254` — only SELECT and INSERT policies exist. No UPDATE/DELETE. |
| Reset password token expiry configuration | Whether token expiry differs from Supabase default | Supabase dashboard config, not in codebase. |
| OAuth provider configuration | Whether OAuth is supported | No OAuth buttons or provider config found in codebase. |
| `useBusinessInfo` hook implementation | How business context is fetched and cached | Not examined in detail but used in staff dashboard (`DashboardStaff.tsx:37`). |
| SMS/custom email auth | Whether phone auth is supported | No phone signup/login found. |
| API key for staff QR code / magic link | Whether staff login uses token-based auth | Staff login is via email/password same as owner. `create_staff_user` creates standard auth user. |

---

## Escalations

| Finding ID | Escalate To | Reason |
|------------|-------------|--------|
| **A-06** (MT-001) | Role 01 — Database Architecture & Security | `create_staff_user` SECURITY DEFINER function allowing cross-tenant staff account creation — this is a database-level vulnerability requiring schema changes |
| **A-07** (MT-002) | Role 01 — Database Architecture & Security | `upsert_business` trusting client-supplied `p_owner_id` — requires function rewrite to use `auth.uid()` |
| **A-08** (MT-003) | Role 01 — Database Architecture & Security | `insert_services` trusting client-supplied `p_business_id` — requires ownership verification inside function |
| **A-03** (No Edge Functions) | Role 02 — API & Edge Functions | Missing auth middleware layer — need Edge Functions for sensitive operations with role verification |
| **A-02** (user_roles INSERT self-escalation) | Role 01 — Database Architecture & Security | Needs RLS policy change on `user_roles` table — remove INSERT policy, rely solely on SECURITY DEFINER RPCs |
| **A-09** (Implicit client role) | Role 01 — Database Architecture & Security | Need `client` role assignment on signup and RLS policy updates to check `has_role()` for role-gated operations |
| **A-05** (Client-side role enforcement) | Role 03 — Frontend Architecture | Role gating in React components without server-side verification — while RLS provides backup, add server-side role checks for consistency |

---

## Summary of Critical Issues

The authentication architecture has **3 SEV-1** and **5 SEV-2** findings. The most critical issues are:

1. **Three SECURITY DEFINER RPCs grant unchecked access** (A-06, A-07, A-08 — MT-001/MT-002/MT-003 from Wave 1): Any authenticated user can create staff accounts, modify any business, and insert services into any business. These must be fixed before launch.

2. **No server-side middleware layer** (A-03): With zero Edge Functions, all server-side auth enforcement is delegated to PostgreSQL RLS policies. While RLS is powerful, it cannot perform complex validation (e.g., JWT claim verification beyond `auth.uid()`). Add Edge Functions for critical paths.

3. **user_roles INSERT self-escalation** (A-02): The INSERT RLS policy on `user_roles` allows any authenticated user to insert their own role row, potentially creating an `owner` entry that `get_user_role` (LIMIT 1) may return.

4. **Email verification not enforced** (A-04): The application never checks email confirmation status. An unverified user has the same access as a verified one.

5. **JWT post-logout validity** (A-01): Access tokens remain valid for up to 1 hour after logout. Mitigate with shorter expiry and session blacklist.
