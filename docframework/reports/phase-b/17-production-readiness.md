# Role 17 — Production Readiness Inspector

**Date:** 2026-06-29  
**Auditor:** Role 17  

---

## Verdict

**SHIP WITH CONDITIONS**

---

## Conditions

### Blocking (must fix before any public launch)

1. **Fix all 6 SEV-1 RPC security findings** — Replace every `p_user_id`, `p_owner_id`, `p_id`, `p_business_id` parameter in SECURITY DEFINER functions with `auth.uid()` calls. Remove the `user_roles` INSERT policy entirely. This eliminates the full business takeover chain executable in 3 API calls.

2. **Configure Sentry or remove it** — Either set `VITE_SENTRY_DSN` in production and add it to `.env.example`, or uninstall `@sentry/react`, `@sentry/vite-plugin`, and remove the Sentry init code. Having a no-op error tracking system gives false confidence.

### Within 30 Days of Launch

3. **Enforce queue data integrity** — Add `UNIQUE (business_id, queue_date, position)` constraint on `queue_tickets` and add `NOT NULL DEFAULT now()` on `created_at`.

4. **Add rate limiting** to all auth endpoints and sensitive RPCs (`assign_owner_role`, `upsert_business`, `insert_services`, `create_staff_user`, `generate_ticket_number`).

5. **Fix DashboardLogs route** — Either implement the page or remove the route. A dead route with no fallback is a poor user experience.

### Recommended

- Add `Strict-Transport-Security` header to `vercel.json`
- Update `jsdom` from v20.0.3 to latest (v25+)
- Add `VITE_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` to `.env.example`

---

## Abandoned / Incomplete Features

| Feature | Status | Evidence |
|---|---|---|
| Dashboard Logs page | Abandoned | Files never created. Route likely points to 404. |
| Agent Skills feature | Not implemented | No `agent_skills` table, no UI, no routes |
| Email notifications | Not implemented | Zero email-sending code. ToS/Privacy promise this. |
| SMS notifications | Not implemented | Only manual WhatsApp deep-links (`wa.me` URLs) |
| Queue lifecycle management | Incomplete | No `pause`/`closed`/`reset` in DB enum. No capacity column. |
| Subscription/Payment | Stub | Tier enum exists; no Stripe or payment integration |

---

## Last-Mile Issues

1. `.env.example` missing 4+ variables (Sentry-related). Only 4 of ~8 required vars documented.
2. ToS/Privacy Policy promise email notifications — not implemented.
3. `jsdom` v20.0.3 severely outdated (latest is v25+).
4. No CI/CD pipeline — no `.github/workflows` or build checks.
5. `recharts` 2.15.4 bundles ~200KB+; lightweight alternative possible.

---

## Dependency Health

| Package | Version | Status | Notes |
|---|---|---|---|
| vite | 5.4.19 | ✅ Good | Latest 5.x, stable |
| react/react-dom | 18.3.1 | ✅ Good | Current stable |
| @supabase/supabase-js | 2.98.0 | ✅ Good | Latest |
| @sentry/react | 10.62.0 | ⚠️ No DSN | No-op in prod |
| typescript | 5.8.3 | ✅ Good | Latest |
| tailwindcss | 3.4.17 | ✅ Good | V3 stable |
| jsdom | 20.0.3 | ❌ Outdated | v20 → v25+ needed |
| @playwright/test | 1.61.1 | ✅ Good | Latest |

---

## Priority Order for Remediation

| Priority | Category | Effort | Impact |
|---|---|---|---|
| P0 | Fix 6 SEV-1 RPCs (auth.uid()) | 1-2 days | Eliminates full takeover chain |
| P0 | Configure Sentry DSN | 15 min | Enables error monitoring |
| P1 | Queue UNIQUE constraint | 30 min | Prevents data corruption |
| P1 | Rate limiting on auth+RPC | 1 day | Prevents abuse/DoS |
| P2 | HSTS header in vercel.json | 5 min | Security hardening |
| P3 | Implement email notifications | 3-5 days | Fulfills ToS promise |
| P3 | Queue pause/resume/close/reset | 2-3 days | Completes queue lifecycle |
| P3 | Fix DashboardLogs route | 1 hour | UX completeness |
