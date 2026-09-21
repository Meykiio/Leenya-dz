# Leenya Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Leenya's security, database integrity, customer flows, accessibility, performance, testing, and release process without replacing working architecture or risking production data.

**Architecture:** Keep React 18 + Vite + Supabase + Vercel. Move sensitive browser writes behind narrowly scoped database functions, use capability tokens for anonymous customer tracking, keep owner/staff actions authenticated and business-scoped, and make the database migration history the only path to production schema changes.

**Tech Stack:** React, TypeScript, React Router, Supabase Auth/Postgres/RLS/Realtime/Storage/Edge Functions, Vite, Vitest, Playwright, pgTAP, GitHub Actions, Vercel.

---

## Operating Rules

- Never run destructive SQL on production without a verified backup, rollback plan, and explicit approval.
- Never run `supabase db reset --linked` against production.
- Never run the master schema file against the live project.
- Every database change starts as a timestamped migration and is tested locally first.
- Every sprint ends with tests, documentation, a clean diff, and a commit.
- One tool owns uncommitted work at a time.
- Do not run `npm audit fix --force`; review upgrades individually.
- Stop immediately if a change could delete data, weaken authorization, or alter booking meaning.

## Audit Baseline

Verified on 2026-09-21:

- Unit tests pass: 42 tests.
- Type checking passes.
- Production build passes, but Vite warns about a large JavaScript chunk: about 750 KB raw and 222 KB compressed.
- Source lint passes with two hook dependency warnings.
- Production E2E passes 41/52. The 11 failures mainly use deleted historical businesses and stale service names. Current live businesses are different and must become isolated fixtures.
- Live database contains 76 applied database changes, 14 public tables, one public view, three businesses, five services, one queue ticket, and one booking.
- Supabase reports 27 anonymous and authenticated SECURITY DEFINER permission warnings, 42 slow RLS checks, 71 overlapping permissive policies, and 12 missing foreign-key indexes.
- Current live businesses all have the queue paused. Confirm that this is intentional before changing defaults.
- No application or database changes are made by this plan document.

## Target Security Model

1. Public visitors can read only deliberately public business, service, hours, staff display, and review projections.
2. Anonymous booking creation uses one validated `create_public_booking` function.
3. Anonymous queue creation uses one validated `join_queue` function.
4. Anonymous tracking and cancellation use a random capability token, never a raw row ID alone.
5. Owners and staff use authenticated functions or RLS-scoped writes, always checked against the same business.
6. SECURITY DEFINER is used only where RLS bypass is required, with `search_path = ''`, fully qualified names, explicit grants, and default privileges that deny future accidental access.
7. Browser code never submits an arbitrary push endpoint to the server. The server loads stored subscriptions by an authorized booking or ticket.
8. Public image files remain public only because they are intentionally public. Upload, replace, and delete operations remain owner-scoped.

## Task 0: Production Safety Baseline

**Files:** `supabase/config.toml`, `DOCS/ARCHITECTURE.md`, `DOCS/ENVIRONMENT.md`, new `DOCS/DATABASE_RECOVERY.md`.

- [ ] Confirm the canonical Supabase project ID with the owner and update `supabase/config.toml` only after confirmation.
- [ ] Export a database backup and record the backup timestamp, project, region, plan, and restore instructions in `DOCS/DATABASE_RECOVERY.md`.
- [ ] Confirm whether daily backup or PITR is enabled. Enable the appropriate protection before write changes.
- [ ] Run `supabase db pull --linked` into a review branch. Include `public`, `auth`, and `storage` differences separately.
- [ ] Compare the pulled structure, live migration history, and repository files. Do not repair migration history yet.
- [ ] Capture current grants, policies, functions, indexes, publication tables, storage buckets, and advisor results as audit evidence.
- [ ] Create a disposable local or Supabase development database. No production data is copied into tests.

**Gate:** Stop if the canonical project, backup, or restore process is unclear.

## Task 1: Database Recovery and Version Control

**Files:** `supabase/migrations/*`, `supabase/seed.sql`, `DOCS/DATABASE.md`, `DOCS/ARCHITECTURE.md`.

- [ ] Treat the pulled live schema as a baseline for review, not as an automatic deployment script.
- [ ] Separate structural history from test/demo data. Store only safe local fixtures in `supabase/seed.sql`.
- [ ] Reconcile the 76 live migration records with versioned migration files. Use migration repair only when the live structure already matches the intended migration.
- [ ] Build a clean local reset path with `supabase db reset`. A fresh clone must recreate tables, functions, policies, indexes, publication settings, and safe seed data.
- [ ] Remove or clearly label historical reports that contradict the verified state.
- [ ] Add CI checks for `supabase db lint`, local reset, and migration list consistency.

**Verification:** A clean local reset succeeds twice, and a schema diff after reset is empty.

## Task 2: Authorization Containment

**Files:** new migrations under `supabase/migrations/`, `supabase/tests/database/001_security_permissions.test.sql`, `src/integrations/supabase/client.ts`, affected public flow components.

- [ ] Inventory every exposed function by role and classify it as public customer, authenticated owner/staff, trigger-only, or internal-only.
- [ ] Add default privileges that revoke table, sequence, and function access from `anon`, `authenticated`, and `PUBLIC` until explicitly granted.
- [ ] Revoke anonymous access from dashboard, staff, reassignment, check-in, recalculation, skip, monthly-count, ticket-number, and account-management functions.
- [ ] Change unsafe functions to `search_path = ''` and qualify every public table and function name.
- [ ] Make `get_staff_queue` derive the staff member from the signed-in user or verify owner/superadmin access before returning customer data.
- [ ] Add owner, staff, superadmin, and same-business checks to every privileged queue and booking operation.
- [ ] Remove direct browser access to sensitive queue and booking tables after replacement functions are deployed.
- [ ] Run the containment migration on a development branch first, then deploy only after negative tests pass.

**Verification:** Anonymous users cannot read customer names or phones, cannot forge queue rows, and cannot execute privileged commands. Two businesses cannot access each other's records.

## Task 3: Safe Public Booking and Queue Commands

**Files:** new database migrations, `src/components/booking/AppointmentFlow.tsx`, `src/components/booking/QueueFlow.tsx`, `src/components/booking/TicketTracker.tsx`, `src/pages/BookingTrack.tsx`, `src/integrations/supabase/types.ts`.

- [ ] Add a queue capability token with a default generated value and backfill existing active tickets before using it.
- [ ] Return the queue token from `join_queue`; store only the token locally and use it in tracking, cancellation, review, and optional check-in commands.
- [ ] Add `get_queue_ticket_by_token`, `cancel_queue_ticket_by_token`, and, only if retained after product review, `check_in_ticket_by_token`.
- [ ] Add `create_public_booking` to validate business status, appointment setting, active service, staff compatibility, date, hours, phone, length limits, and notes.
- [ ] Change the booking flow to call the function instead of inserting directly into the table.
- [ ] Change duplicate queue checking from a browser query to a server-side decision. Keep the unique active-ticket index as the final safety net.
- [ ] Validate service, staff, and business relationships inside `join_queue` and enforce `accepts_walkins`, capacity, and pause state.
- [ ] Return only the minimum public fields from all customer functions.

**Verification:** Public customers can still book and join normally. Invalid business, service, staff, phone, date, capacity, and token combinations fail without leaking internal details.

## Task 4: Booking and Queue Concurrency

**Files:** new database migrations, `src/test/bookingOverlap.test.ts`, `src/test/queueSystem.test.ts`, new integration tests under `supabase/tests/database/`.

- [ ] Decide and document the no-preference booking rule: a no-preference booking reserves a business slot, while a staff-specific booking reserves that staff member.
- [ ] Serialize booking creation by business and date using a 64-bit advisory lock or use a tested PostgreSQL exclusion constraint. Do not keep the current exact-start-time lock.
- [ ] Serialize all queue position changes with the same business/date lock, including join, cancel, send-back, skip, and recalculation.
- [ ] Make position changes use a temporary null position or one safe transaction so the unique position index cannot reject an intermediate state.
- [ ] Ensure all non-waiting tickets have a null queue position.
- [ ] Add same-business constraints for staff services, booking staff, queue staff, and queue services.
- [ ] Add indexes for foreign keys and the exact RLS filters reported by Supabase.

**Verification:** Concurrent integration tests prove no overlapping bookings, duplicate active tickets, duplicate positions, or cross-business references.

## Task 5: Push, Storage, and Data Protection

**Files:** `supabase/functions/send-push/index.ts`, `src/hooks/useWebPush.ts`, `src/sw.ts`, storage migration, upload components, `DOCS/ENVIRONMENT.md`.

- [ ] Require a valid authenticated caller for push sending, or make the function callable only by an internal server process with custom authentication.
- [ ] Accept a booking or queue ticket ID, not a caller-supplied endpoint. Load the subscription server-side after authorization.
- [ ] Validate subscription JSON, payload size, allowed endpoint host, and URL destination. Delete expired subscriptions after provider errors.
- [ ] Add a uniqueness rule for a push endpoint and prevent a subscription from referencing both unrelated booking and ticket contexts.
- [ ] Remove all Supabase REST and Auth requests from the service-worker runtime cache. Delete old private-data cache entries during activation.
- [ ] Add bucket file-size and MIME restrictions. Validate image type and size before upload and keep replace/delete path-scoped.
- [ ] Minimize phone numbers, tokens, and customer data stored in browser storage. Add expiry and explicit cleanup.

**Verification:** Push abuse, cross-business storage changes, stale private cache reads, oversized uploads, and malformed subscriptions are rejected.

## Task 6: Flow Reliability

**Files:** `src/pages/BookingTrack.tsx`, `src/components/booking/TicketTracker.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/pages/ResetPassword.tsx`, `src/components/landing/HeroSection.tsx`, `src/pages/BusinessPublic.tsx`.

- [ ] Store the booking ID in state and subscribe only after it exists. Refresh on reconnect and page focus.
- [ ] Add a real queue tracking route and update push and WhatsApp links to use it.
- [ ] Show check-in success only after the server confirms it. Otherwise show a translated error or remove the action.
- [ ] Preserve the requested protected URL through login.
- [ ] Add an explicit sign-up mode or route.
- [ ] Render password reset fields only after a valid recovery session is confirmed.
- [ ] Add visible error and retry states to public business, appointment, queue, and tracking loads.
- [ ] Centralize Algeria time handling and locale-aware dates, numbers, and currency.
- [ ] Validate URL-selected tabs against business settings and keep the active tab in the URL.

**Verification:** Test network failure, expired tokens, refresh, browser back/forward, reconnect, invalid forms, and changing language during each public flow.

## Task 7: Accessibility and Mobile UX

**Files:** public booking components, dashboard custom overlays, staff view, `src/components/ui/button.tsx`, `src/index.css`, locale files.

- [ ] Give every input a stable ID, label, name, autocomplete value, input mode, and connected error message.
- [ ] Replace custom overlays with the existing accessible dialog primitives.
- [ ] Use real tab and radio semantics or equivalent selected states.
- [ ] Add live regions for queue position, status, errors, and save completion.
- [ ] Ensure icon-only controls have translated accessible names.
- [ ] Increase undersized controls to at least WCAG 2.2 minimum target spacing, using 44px where practical.
- [ ] Add reduced-motion variants and prevent sticky headers from hiding focused controls.
- [ ] Add safe-area padding to mobile navigation and test 320px, 375px, 768px, and desktop widths.
- [ ] Verify contrast for muted text, status colors, focus rings, and dark mode.
- [ ] Complete French and Arabic language entries, including legal pages.

**Verification:** Keyboard-only pass, mobile pass, WebKit pass, automated accessibility scan, and manual RTL pass.

## Task 8: Performance and Scale

**Files:** dashboard queries, analytics components, realtime subscriptions, `src/i18n/index.ts`, `vite.config.ts`, `package.json`, `playwright.config.ts`.

- [ ] Replace broad selects with explicit columns everywhere, especially public business and analytics queries.
- [ ] Add pagination or bounded windows to bookings, queues, reviews, staff, and analytics history.
- [ ] Move totals, revenue, wait times, and trend data into tested database functions.
- [ ] Debounce realtime events and update only affected rows instead of refetching entire lists.
- [ ] Narrow customer tracker subscriptions to the individual ticket. Consider Broadcast for high-fan-out queues.
- [ ] Lazy-load analytics charts and locale files where measurement justifies it.
- [ ] Remove duplicated external font loading and keep only the fonts actually used.
- [ ] Add bundle-size and Core Web Vitals budgets to CI.

**Verification:** Large seeded data remains responsive, analytics stays correct above 1,000 rows, and no page performs repeated full-table requests on one event.

## Task 9: Testing and Release Gates

**Files:** `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `playwright.config.ts`, `e2e/`, `supabase/tests/database/`, new test fixtures.

- [ ] Replace the current RLS test file with pgTAP tests using transactions, two businesses, two owners, staff, client, and anonymous contexts.
- [ ] Test every sensitive read and write as allowed and denied cases.
- [ ] Add database structure tests for RLS, grants, function security, indexes, publication tables, and constraints.
- [ ] Add authenticated Playwright fixtures without using production data.
- [ ] Add Chromium, WebKit, mobile, keyboard, network-failure, and reduced-motion coverage.
- [ ] Configure Playwright to start a local preview server and use the correct environment variable names.
- [ ] Run E2E tests on pull requests, not only scheduled/manual runs.
- [ ] Regenerate database types and fail CI when they differ from the canonical database.
- [ ] Keep dependency upgrades in separate reviewable commits.

**Verification:** A pull request cannot merge if type checking, lint, unit tests, database tests, build, security tests, or critical E2E flows fail.

## Task 10: Documentation and Launch Readiness

**Files:** `README.md`, `DOCS/ARCHITECTURE.md`, `DOCS/OVERVIEW.md`, `DOCS/ENVIRONMENT.md`, `DOCS/CHANGELOG.md`, `DOCS/DATABASE.md`, `DOCS/FEATURES.md`.

- [ ] Document the canonical project, local setup, migration workflow, backup procedure, restore procedure, environment variables, and test data policy.
- [ ] Document public customer capabilities separately from authenticated owner/staff permissions.
- [ ] Record data retention, account deletion, customer token handling, and incident response.
- [ ] Record the exact pricing model and remove contradictory Free/Pro/Business claims.
- [ ] Add a release checklist requiring backup confirmation, migration dry run, local reset, database tests, E2E pass, production smoke test, and rollback owner.
- [ ] Update the changelog only after each verified sprint.

## Definition of Done

- [ ] No blocker security finding remains.
- [ ] Anonymous users cannot read or modify another customer's data.
- [ ] Every privileged command has explicit role and business authorization.
- [ ] Booking and queue concurrency tests pass.
- [ ] A clean local database reset succeeds from version-controlled changes.
- [ ] Production and repository database histories are reconciled.
- [ ] Public, client, staff, owner, and superadmin flows pass with isolated test data.
- [ ] Accessibility, RTL, mobile, and reduced-motion checks pass.
- [ ] Analytics remains accurate above 1,000 records.
- [ ] Core Web Vitals targets are measured and met for the public page.
- [ ] Documentation describes verified reality, not intended behavior.

## Research References

- Supabase functions and permissions: https://supabase.com/docs/guides/database/functions
- Supabase RLS and performance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase migrations: https://supabase.com/docs/guides/local-development/database-migrations
- Supabase local workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase database testing: https://supabase.com/docs/guides/database/testing
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase Realtime scaling: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase Storage access control: https://supabase.com/docs/guides/storage/access-control
- PostgreSQL range constraints: https://www.postgresql.org/docs/current/rangetypes.html
- OWASP API Security Top 10: https://owasp.org/API-Security/editions/2023/en/0x11-t10
- WCAG 2.2 status messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- React effect cleanup: https://react.dev/learn/synchronizing-with-effects
- Core Web Vitals: https://web.dev/articles/vitals
