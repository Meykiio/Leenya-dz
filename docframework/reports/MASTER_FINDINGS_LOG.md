# Leenya Audit — Master Findings Log

**Last Updated:** 2026-06-29 (added updated_at triggers on 9 tables)  
**Audit Phase:** ✅ Phase A + Phase B Complete (9 roles, 9 reports)  
**Final Verdict:** 🟡 **SHIP WITH CONDITIONS** — 4 blocking conditions  
**Release Blockers (SEV-1):** ⚠️ **10 confirmed** — 5 security RPCs + 5 observability  
**Pre-Launch Required (SEV-2):** ⚠️ 15+ findings  

> **Note:** Several findings from the initial code-only audit were corrected after live Supabase DB verification. The live schema includes triggers, rate limiting, and RLS protections that were not in the local schema files. See the "Live DB Corrections" section.

---

## Final Verdict: SHIP WITH CONDITIONS

**Verdict by Role 17 (Production Readiness Inspector):** The app is structurally well-architected but **cannot launch without fixing 5 SEV-1 security RPCs** and **configuring Sentry**. All fixes are well-understood and scoped (2-3 days of focused work).

### Blocking Conditions (must fix before any public launch)
1. **Fix all 5 SEV-1 RPC security findings** — replace client-supplied ID params with `auth.uid()`
2. **Configure Sentry DSN** or remove Sentry dependency entirely
3. **Fix `fetchRole` silent catch in AuthContext** — log errors to Sentry
4. **Add queue UNIQUE constraint** on `(business_id, queue_date, position)`

### 30-Day Conditions
5. **Add `VITE_SENTRY_DSN` and Sentry vars to `.env.example`**
6. **Security headers** — HSTS, remove `unsafe-inline` from CSP, add CORS restriction
7. **Fix DashboardLogs route** — implement or remove
8. **Add RPC-level rate limiting** (client-side rate limiting via phone already exists)

---

## Live DB Verification Results

The following findings from the initial audit were **corrected after querying the live Supabase database:**

| Original Finding | Correction | Reason |
|---|---|---|
| S-006: user_roles INSERT policy allows escalation | **REMOVED from SEV-1** | No INSERT policy exists on `user_roles` — only SELECT with `auth.uid() = user_id`. Vector is the RPC only. |
| F-02: Bookings INSERT policy missing validation | **DOWNGRADED** | Policies correctly verify `auth.uid() = client_id` or `businesses.owner_id = auth.uid()` |
| F-03: Queue tickets INSERT policy missing validation | **DOWNGRADED** | Policies correctly verify `auth.uid() = client_id` or business ownership |
| F-04: Reviews INSERT policy missing validation | **DISCONFIRMED** | Policy uses `auth.uid() = client_id` |
| F-08: No rate limiting | **PARTIALLY CORRECT** | `check_insert_rate_limit` trigger limits 10/phone/10min on bookings+queue. But RPC endpoints and auth have no rate limiting. |
| DS-007: Booking accepts times outside business hours | **DISCONFIRMED** | `check_business_hours` BEFORE INSERT trigger validates hours |
| BL-003: Advisory lock race condition | **DISCONFIRMED** | `pg_advisory_xact_lock()` is correctly implemented |
| BL-001: advance_booking_days is UI-only | **PARTIALLY CORRECT** | Column EXISTS with DEFAULT 14 but no trigger enforces it for future dates (only past-date trigger exists) |
| DI-003: created_at nullable | **DOWNGRADED** | Has `DEFAULT now()` so effectively non-nullable in practice |
| upsert_business param name | **CORRECTED** | Parameter is `p_owner_id`, not `p_business_id` |
| create_staff_user param name | **CORRECTED** | Parameters are `(p_staff_id, p_email, p_password)`, no `p_business_id` |

---

## SEV-1 Findings (Release Blockers)

### Security SEV-1 (Root cause: SECURITY DEFINER RPCs trust client-supplied IDs)

Verified live on 2026-06-29 — all 5 functions confirmed.

| ID | Function | Params | `auth.uid()` check? | Resolution |
|---|---|---|---|---|
| S-001 | `assign_owner_role` | `p_user_id` | ❌ | Replace param with `auth.uid()` |
| S-002 | `upsert_business` | `p_owner_id, p_name, p_slug, p_phone, p_address, p_wilaya_code, p_wilaya_name, p_category` | ❌ | Replace `p_owner_id` with `auth.uid()` |
| S-003 | `upsert_profile` | `p_id, p_full_name` | ❌ | Replace `p_id` with `auth.uid()` |
| S-004 | `insert_services` | `p_business_id, p_services` | ❌ | Add business ownership check via `auth.uid()` |
| S-005 | `create_staff_user` | `p_staff_id, p_email, p_password` | ❌ | Add business ownership check via `auth.uid()` |

**Exploitation Chain (full takeover in 3 RPC calls from any authenticated session):**
```
RECON (RLS exposes owner_ids) → ESCALATE (assign_owner_role) → HIJACK (upsert_business) → INFILTRATE (create_staff_user) → EXPORT
```

### Observability SEV-1

| ID | Source | Title | Status |
|---|---|---|---|
| OBS-001 | `src/lib/sentry.ts:13` | Sentry DSN not configured — runtime no-op | 🔴 Confirmed |
| OBS-002 | `src/contexts/AuthContext.tsx:59` | `fetchRole` bare catch silently swallows errors | 🔴 Confirmed |
| OBS-003 | — | Zero alerting rules configured | 🔴 Confirmed |
| OBS-004 | — | No business event logging (bookings/queue) | 🔴 Confirmed |
| OBS-005 | — | No way to correlate user error reports to logs | 🔴 Confirmed |

---

## SEV-2 Findings (Pre-Launch Required)

### Database & Data Integrity

| ID | Role | Title | Status |
|---|---|---|---|
| DI-001 | 27 | Queue position NOT unique — no UNIQUE(business_id, queue_date, position) | 🔴 Confirmed |
| DI-002 | 27 | No queue capacity column or enforcement | 🔴 Confirmed |
| DI-004 | 27 | No `updated_at` trigger on any table | ✅ Resolved — added `update_updated_at_column()` trigger on 9 tables |
| DI-005 | 27 | Staff can be assigned to bookings while inactive (no trigger check) | 🔴 Confirmed |
| DI-006 | 27 | Queue status enum missing 'paused', 'closed', 'reset' | 🔴 Confirmed |
| DS-001 | 30 | Queue pause/resume/close/reset RPCs absent | 🔴 Confirmed |
| DS-002 | 30 | No `queue_capacity` column on businesses | 🔴 Confirmed |
| DS-003 | 30 | Wait time uses average of last 20 — not real-time | 🔴 Confirmed |

### Business Logic

| ID | Role | Title | Status |
|---|---|---|---|
| BL-001 | 03 | `advance_booking_days` stored in DB (default 14) but **no trigger enforces** it for future dates | 🔴 Confirmed |
| BL-002 | 03 | Booking max duration not enforced server-side | 🔴 Confirmed |
| BL-004 | 03 | Booking can reference deactivated service (no `is_active` check in trigger) | 🔴 Confirmed |
| BL-005 | 03 | No minimum notice period for booking | 🔴 Confirmed |
| BL-006 | 03 | No maximum advance booking days enforced | 🔴 Confirmed |

### Observability

| ID | Source | Title | Status |
|---|---|---|---|
| OBS-006 | `src/components/ErrorBoundary.tsx:26` | componentDidCatch doesn't call Sentry | 🔴 Confirmed |
| OBS-007 | — | `Sentry.captureException()` never called anywhere | 🔴 Confirmed |
| OBS-008 | All `console.*` | 76 console logs are unstructured plain text | 🔴 Confirmed |
| OBS-009 | Auth forms | Auth events (login, failed login, reset) never logged | 🔴 Confirmed |
| OBS-010 | 11+ locations | Catch blocks discard error object after toast | 🔴 Confirmed |

### Security

| ID | Title | Status |
|---|---|---|
| A-01 | JWT valid 1h after logout | 🔴 Confirmed |
| A-14 | JWT in localStorage → XSS exposure | 🔴 Confirmed |
| F-06 | Queue position can bypass generate_ticket_number | 🔴 Confirmed |
| F-07 | Storage bucket cross-business file overwrite | 🔴 Confirmed |
| F-08 | RPC endpoints not rate-limited (client-side rate limiting via phone exists) | 🔴 Confirmed |
| S-010 | `generate_ticket_number` callable by anon (DoS vector) | 🔴 Confirmed |
| LM-001 | `.env.example` missing VITE_SENTRY_DSN + 3 other Sentry vars | 🔴 Confirmed |

### Last-Mile

| ID | Title | Status |
|---|---|---|
| LM-002 | ToS/Privacy mention email notifications — not implemented | 🔴 Confirmed |
| LM-003 | Subscription tab is a stub — no payment integration | 🔴 Confirmed |
| LM-004 | No CI/CD pipeline (.github/workflows absent) | 🔴 Confirmed |

---

## SEV-3 Findings (Fix Within 30 Days)

| Source | Title | Status |
|---|---|---|
| 08, 29 | RLS/storage policy gaps (8 items) | 🔴 Confirmed |
| 06 | Auth gaps: no server-side role, no session revoke | 🔴 Confirmed |
| 05 | Public businesses RLS exposes owner_id (recon enabler) | 🔴 Confirmed |
| 04 | CSP `unsafe-inline` in script-src and style-src | 🔴 Confirmed |
| 04 | No HSTS header in vercel.json | 🔴 Confirmed |
| 04 | No CORS origin restriction | 🔴 Confirmed |
| DI-009 | No CHECK constraint on queue_tickets.status | 🔴 Confirmed |
| DS-005 | No DST handling documented (low risk for Africa/Algiers) | 🔴 Confirmed |
| DS-006 | Algerian phones (+213) not validated | 🔴 Confirmed |
| DS-008 | Slot picker labels not RTL-aware | 🔴 Confirmed |
| OBS-011 | ~40% console.error gated by `import.meta.env.DEV` — silent in prod | 🔴 Confirmed |
| OBS-012 | `ctx.resume().catch(() => {})` swallows audio context failures | 🔴 Confirmed |

---

## Abandoned / Not-Implemented Features

| Feature | Status | Detail |
|---|---|---|
| Dashboard Logs page | ❌ Abandoned | Route likely 404s — no files found |
| Agent Skills feature | ❌ Not implemented | No table, UI, or routes |
| Email notifications | ❌ Not implemented | ToS/Privacy promise this; no code |
| SMS notifications | ❌ Not implemented | WhatsApp deep-links only |
| Queue lifecycle (pause/close/reset) | ⚠️ Incomplete | Missing from DB enum + RPCs |
| Subscription/Payment | ⚠️ Stub | `plan` column (text) exists; no Stripe code |

---

## Dependency Health

| Package | Version | Status |
|---|---|---|
| vite | 5.4.19 | ✅ Good |
| react/react-dom | 18.3.1 | ✅ Good |
| @supabase/supabase-js | 2.98.0 | ✅ Good |
| @sentry/react | 10.62.0 | ⚠️ No DSN configured |
| typescript | 5.8.3 | ✅ Good |
| tailwindcss | 3.4.17 | ✅ Good |
| jsdom | 20.0.3 | ❌ Outdated (latest v25+) |

---

## Session Log

| Date | Phase | Roles | Status | Report |
|---|---|---|---|---|
| 2026-06-29 | Phase A Wave 1 | 08 (RLS), 29 (Multi-Tenancy) | ✅ Complete | `reports/phase-a/08-rls-verifier.md`, `29-multitenancy.md` |
| 2026-06-29 | Phase A Wave 2 | 06 (Auth), 05 (Red Team) | ✅ Complete | `reports/phase-a/06-auth.md`, `05-red-team.md` |
| 2026-06-29 | Phase A Wave 3 | 04 (Security Engineer) | ✅ Complete | `reports/phase-a/04-security-engineer.md` |
| 2026-06-29 | Phase B Wave 1 | 03 (Business Logic), 27 (Data Integrity) | ✅ Complete | `reports/phase-b/03-business-logic.md`, `27-data-integrity.md` |
| 2026-06-29 | Phase B Wave 2 | 30 (Domain Specialist) | ✅ Complete | `reports/phase-b/30-domain-specialist.md` |
| 2026-06-29 | Phase B Wave 3 | 15 (Observability) | ✅ Complete | `reports/phase-b/15-observability.md` |
| 2026-06-29 | Phase B Final | 17 (Production Readiness) | ✅ Complete | `reports/phase-b/17-production-readiness.md` |
| 2026-06-29 | Verification | Live DB cross-check | ✅ Complete | This document |
