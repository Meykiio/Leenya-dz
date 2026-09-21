# Live Database Baseline — Leenya Production

*As of 2026-09-21. Captured with read-only queries against the live project `ieuhknpdhjvuuwtpsguw` (Supabase MCP) and the Supabase security/performance advisors. Nothing was modified. This document is the reference every database change in the remediation plan is checked against.*

## Current Data Volume

| Item | Count |
|---|---|
| Public tables | 14 (incl. `push_subscriptions`) + 1 view `booking_availability` (security_invoker) |
| Businesses | 3 (`dental-are3` "Dental", `dr-ab-vpwj` "Dr Ab", `jdjdj-99dk` "Jdjdj") — all `is_queue_paused = true` |
| Active services | 5 (dental-are3: 4, dr-ab-vpwj: 1, jdjdj-99dk: 0) |
| Queue tickets / bookings | 1 / 1 |
| Profiles | 1 |
| Applied DB changes (live history) | 76 (first `20260627023045`, last `20260919134346`) |
| Migration files in repo | 6 — the repo is NOT a complete recovery record |

## Function Security (verified via pg_proc + advisors)

- 33 functions in `public`. Every one is executable by BOTH `anon` and `authenticated` (Postgres default `EXECUTE` to `PUBLIC` was never revoked live; the repo SQL file's REVOKE/GRANT block was never applied to production).
- Advisors flag 27 `SECURITY DEFINER` functions callable by anon (lint 0028) and the same 27 by authenticated (lint 0029). Notable: `get_dashboard_queue`, `check_in_ticket`, `reassign_queue_ticket`, `recalculate_queue_positions`, `send_ticket_back_to_queue`, `skip_queue_ticket`, `get_staff_queue`, `cancel_queue_ticket`, `generate_ticket_number`, `assign_owner_role`, `delete_my_account`, `upsert_business`, `insert_services`, `create_staff_user`, `handle_new_user`.
- 4 non-definer functions have a mutable search_path (lint 0011): `update_updated_at`, `application_status_timestamps`, `generate_invoice_number`, `set_invoice_number` (the latter three belong to another project's schema, present live).
- Function bodies were NOT individually read live; body-level authorization gaps (e.g. `get_staff_queue` trusting a caller-supplied staff id, `get_monthly_business_counts`/`recalculate_queue_positions` lacking caller checks) are verified in the repo SQL and must be re-confirmed live before fixing.

## Row-Level Security (verified via pg_policies)

- RLS is enabled on all 14 tables; `FORCE ROW LEVEL SECURITY` is not set on any of them.
- 57 policies live, all PERMISSIVE. Advisors report 71 overlapping permissive-policy findings (lint 0006) and 42 slow per-row auth checks (lint 0003).
- High-impact verified policies:
  - `queue_tickets` "Anon can view own ticket by id": `USING (status IN ('waiting','called','in_service'))` — status-only, no ownership or id binding. Any anonymous user can SELECT all active tickets of all businesses (names, phones, ids).
  - `queue_tickets` "Public can insert queue tickets": `WITH CHECK (client_id IS NULL)` — anonymous callers can INSERT rows with arbitrary ticket numbers, labels, dates, positions, service/staff ids. Same pattern on `bookings` ("Public can insert bookings").
  - `bookings` "Anon can view booking by token": `USING (booking_token IS NOT NULL AND client_id IS NULL)` — grants SELECT on ALL anon bookings, not just the one whose token the caller holds.
  - `storage.objects` UPDATE/DELETE policies check only that the caller owns SOME business, not the object path (INSERT is path-scoped; UPDATE/DELETE are not).
  - `push_subscriptions` INSERT: `WITH CHECK (true)` for anon + authenticated — unrestricted subscription spam.

## Realtime (verified via pg_publication_tables)

- Publication `supabase_realtime` contains: `bookings`, `queue_tickets`, `whatsapp_templates`.
- `businesses` is NOT in the publication, but `QueueFlow` subscribes to `businesses` UPDATE for the pause state → customers do not receive live pause changes. Schema file claims `push_subscriptions` was added; live publication does not include it.

## Storage (verified via bucket listing)

- `business-assets`: public, no file-size limit, no MIME restrictions.
- `verification_documents`: private, 5 MB limit, image/pdf MIME restrictions (belongs to another project's schema, present live).

## Advisor Summary (2026-09-21)

| Advisor | Findings |
|---|---|
| 0028/0029 SECURITY DEFINER executable by anon/authenticated | 27 + 27 |
| 0003 auth RLS initplan (slow per-row checks) | 42 |
| 0006 multiple permissive policies | 71 |
| 0001 unindexed foreign keys | 12 |
| 0011 function search_path mutable | 4 |
| 0005 unused indexes | 7 |

## Backup Status

- Logical dumps created 2026-09-21 in `C:\Users\DELL\Desktop\Sifeddine\leenya-recovery-work` (`leenya-live-schema.sql`, `leenya-live-data.sql`) via `supabase db dump --linked`.
- SHA-256 verification and owner confirmation: PENDING — see `DOCS/DATABASE_RECOVERY.md`. No production writes are permitted until this gate passes.

## How This Baseline Is Used

- Task 1 (reconciliation) reconciles the 76 live records with versioned files starting from this snapshot.
- Task 2 (authorization containment) fixes the policy/function findings above and must prove, with negative tests, that each finding is closed against this baseline.
- Any drift between this document and the live database invalidates downstream sprint assumptions and must be re-captured first.
