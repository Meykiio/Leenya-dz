# Project Status — Leenya

**Last updated:** 2026-06-30 (Queue Edge Cases + Bug Fixes)
**Version:** 0.0.1 (closed beta candidate)
**Project name:** Leenya (formerly Dawrni/Darek)
**One-line pitch:** Queue and appointment management SaaS for Algerian service businesses.

---

## Current Completion by Feature Area

| Feature Area | Completion | Status |
|---|---|---|---|
| Landing / Marketing pages | 98% | Done — all sections present, testimonials rewritten, back-to-top added, demos i18n'd with accent color, equal-height panels |
| Authentication (email/password) | 95% | Fully working — login, signup, forgot/reset password flows |
| Authentication (phone OTP) | 0% | **Removed** — phone tab deleted from LoginForm, OtpVerification.tsx deleted |
| Onboarding wizard | 95% | Fully working — 4 steps, profile + role + business + services |
| Business public page | 92% | Fully working — slug-based, tabs default to queue, appointment/queue flows |
| Appointment booking flow | 90% | Working — service, staff selection, date/time, details, WhatsApp links, step indicator |
| Queue (walk-in) flow | 95% | Working — service selection, ticket generation, real-time tracker, double-join prevention, skip/send-back, check-in, queue pause toggle |
| Queue ticket tracker | 90% | Working — realtime updates, cancel, check-in button, completion/cancellation states |
| TV queue display | 80% | Working — realtime, auto-hide cursor, clock |
| Owner dashboard — homepage | 85% | Working — metrics (incl. pending count), recent bookings, quick actions |
| Owner dashboard — bookings mgmt | 92% | Working — upcoming/by-date filter, search, CRUD, WhatsApp actions, PendingApprovals, real-time subscription |
| Owner dashboard — queue mgmt | 92% | Working — realtime, call/complete/cancel/no-show, skip/send-back, checked-in indicators, display mode |
| Owner dashboard — services CRUD | 90% | Working — add/edit/delete/toggle, name_ar field, slider for duration |
| Owner dashboard — staff CRUD | 97% | Working — add/edit/toggle, service assignment, auth login creation, delete |
| Owner dashboard — settings | 75% | All tabs present. Subscription tab with real-time counts. Queue pause toggle in BusinessInfoTab |
| Owner dashboard — analytics | 80% | Working — metric cards with safe delta calculations (no divide-by-zero), charts, peak hours, popular services, history table |
| Staff view | 93% | Working — queue management, call/complete/no-show, skip/send-back, checked-in indicators, **bookings tab**, **staff login** |
| Client bookings page | 70% | Working — list upcoming/past, cancel, leave review |
| Booking tracker (anonymous token) | 80% | Working — view by token, cancel |
| Reviews | 60% | Working — display on public page, submit from MyBookings |
| WhatsApp templates | 72% | Working — CRUD in settings, template compilation, preview, WhatsApp link generation, array format fixed |
| Subscription/pricing UI | 97% | Working — pricing page, redesigned subscription modal, trial countdown, 2 progress bars, DB-backed usage with real-time subscriptions |
| Subscription enforcement | 100% | Server-side triggers enforce per-plan booking/queue/staff limits with trial skip |
| Payment processing | 0% | Not started — no payment gateway integrated |
| Automated notifications | 0% | Not started — all WhatsApp is manual (wa.me links) |
| SMS (Twilio) | 0% | Not started — phone OTP removed, no SMS integration |
| i18n / translations | 97% | react-i18next configured, 6 namespaces × 3 languages, step indicator key added |
| Arabic/RTL support | 95% | All components patched, all arrows flipped, toast/dialog/sheet/carousel/calendar/navigation-menu fully RTL-aware |
| Security — DB grants | 100% | Per-table grants replace blanket GRANT ALL. Storage bucket public listing removed |
| Security — RLS | 90% | PERMISSIVE → RESTRICTIVE pending (Phase 2b/next) |
| Testing | 30% | Unit tests exist for time slots, slugify, queue system, booking overlap, rate limiting |
| PWA / offline | 0% | Manifest exists, no service worker or caching |
| Bundle size | — | Unused @tanstack/react-query (+13kB) removed |

---

## What Is Live and Working

The following flows work end-to-end in a local dev environment with a correctly configured Supabase project:

1. **Landing → Login → Onboarding → Dashboard:** A new user can land on the homepage, sign up via email+password, complete the 4-step onboarding wizard (profile → business type → business details → services), and land on the dashboard.
2. **Public business page → Book appointment:** A visitor can navigate to `/:slug`, see the business info, select a service, optionally pick a staff member, pick a date and time slot (filtered by staff availability if a staff member was selected), enter their name and phone, and receive a confirmed booking with a WhatsApp tracking link.
3. **Public business page → Join queue:** A visitor can navigate to `/:slug?tab=queue`, select a service, enter name/phone, get a ticket number, and see their position updated in real time.
4. **Dashboard → Manage queue:** Owner can view today's queue in real time, call/complete/cancel/no-show tickets, skip/send-back tickets, see checked-in indicators, toggle queue pause, and open TV display mode.
5. **Dashboard → Manage bookings:** Owner can filter by date/status, search, create bookings, accept/reject, mark arrived/in-service/completed/cancelled/no-show, and send WhatsApp reminders.
6. **Dashboard → Services CRUD:** Owner can add/edit/delete services with name, duration, price, and active toggle.
7. **Dashboard → Staff CRUD:** Owner can add/edit staff members with active/accepts-bookings toggles, upload avatars (initials fallback with deterministic color), assign services via checkbox dialog, **create auth login accounts (email/password)**, and **delete staff members**.
8. **Staff view:** Staff member can login via email/password, view today's queue and bookings in tabbed interface, call/complete/no-show/skip/send-back tickets, see checked-in indicators, and send WhatsApp messages.
9. **Booking tracker:** Anyone with a booking token URL can view and cancel their booking.
10. **My Bookings:** Logged-in client can view their booking history and cancel upcoming bookings.
11. **Analytics:** Owner can view metrics, charts, peak hours, popular services, and booking history.
12. **WhatsApp templates:** Owner can view/edit/reset WhatsApp message templates in settings.

---

## What Is Built But Broken

1. **`ResetPassword.tsx`**: The `useEffect` listener for `PASSWORD_RECOVERY` event is correct, but this flow is only half-tested — depends on Supabase email configuration being live.
2. **RLS policies still use PERMISSIVE** — need to switch to RESTRICTIVE (AS RESTRICTIVE on all CREATE POLICY statements). This is a known gap from Phase 2b.

---

## What Is Planned But Not Started

- Payment processing (BaridiMob / CCP / Stripe)
- Automated SMS reminders (Twilio)
- Arabic RTL interface (85% — all critical components patched)
- Staff-specific availability schedules
- Break time / lunch hour support
- Queue capacity limits
- Multi-location support
- Client accounts with full booking history dashboard
- Bulk SMS campaigns
- Calendar sync (Google Calendar / iCal)
- Email notification templates
- PWA with offline support

---

## Concurrency & Scalability Assessment

| Operation | Safe? | Mechanism |
|---|---|---|
| Queue ticket creation | ✅ Yes | Atomic upsert counter (`generate_ticket_number`) + partial unique index prevents duplicate active tickets |
| Booking creation | ✅ Yes | Advisory lock per time slot (`check_booking_overlap`) serializes concurrent bookings |
| Queue state machine | ✅ Yes | DB trigger enforces valid transitions; UPDATEs are atomic |
| Ticket number generation | ✅ Yes | `INSERT ... ON CONFLICT` (atomic upsert) |
| Cross-tenant data leaks | ✅ Yes | RLS policies correctly isolate all tenants |
| Rate limit enforcement | ✅ Yes | `pg_advisory_xact_lock` serializes per-phone (added Phase 3b) |
| Plan limit enforcement | ✅ Yes | `pg_advisory_xact_lock` serializes per-business (added Phase 3b) |
| Status updates (queue + booking) | ✅ Yes | Optimistic locking via `.eq("status", currentStatus)` on all transitions (added Phase 3b) |
| Analytics queries | ⚠️ Mitigated | `.range(0, 1000)` prevents MB-size transfers; client-side aggregation is fine for current scale |
| Realtime (Postgres Changes) | ⚠️ Monitor | 4 channels per dashboard session. At 5k+ concurrent dashboards, migrate to Broadcast pattern |

### Missing Indexes (All Resolved in Phase 3b)
| Index | Status | Purpose |
|---|---|---|
| `idx_bookings_overlap_check` | ✅ Added | Covering index for overlap check trigger |
| `idx_queue_tickets_business_date_ticket` | ✅ Added | ORDER BY ticket_number in queue context |
| `idx_bookings_staff_date` | ✅ Added | Staff-scoped booking queries |
| `idx_queue_tickets_staff_date` | ✅ Added | Staff-scoped queue queries |

---

## Tech Debt (Ranked by Severity)

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **Exposed Supabase anon key in `.env` committed to repo** | `.env` file is checked in with real `VITE_SUPABASE_PUBLISHABLE_KEY` | The anon key is technically public (used client-side), but committing `.env` is bad practice — it should be in `.gitignore` |
| 2 | **No monorepo lint-staged / pre-commit hooks** | — | Code quality relies on manual discipline |
| 3 | **No TypeScript `strict: true` in tsconfig** | `tsconfig.json` and `tsconfig.app.json` have `strict: true` actually — okay, the JSON I read has it. But there's possible `any` usage | Moderate — some `any` usage in state types |
| 4 | **Inline styles mixed with Tailwind** | Multiple components use inline `style={{}}` blocks with CSS variable references | Creates inconsistency, though sometimes necessary for dynamic values |
| 5 | **Error boundaries** | `src/components/ErrorBoundary.tsx` | DONE — exists but not wrapped around all routes yet |
| 6 | **No loading skeletons for slow queries** | Several pages show basic loading spinners | Better UX possible but not critical |

---

## Last Known Working State

The last confirmed working flows (as of the code audit on 2026-06-25):

- Landing page renders with all sections
- Login via email+password works (no phone tab present)
- Onboarding wizard completes (creates profile, role, business, services)
- Dashboard loads with today's data
- Public business page (`/:slug`) renders for an active business
- Booking flow works end-to-end (service → staff → date/time → details → confirmation with WhatsApp link)
- Staff step is skipped if no staff assigned to the selected service
- "Pas de préférence" pre-selected when staff step is shown
- Time slots filtered by selected staff member's existing bookings
- Queue flow works end-to-end (service → name/phone → ticket → realtime tracker) with skip/send-back, check-in, and pause toggle
- Dashboard queue management (call/complete/cancel/skip/send-back) with realtime
- Dashboard booking management (filter/search/update status, PendingApprovals section for future pending bookings)
- Sidebar shows real-time pending booking badge
- Services and staff CRUD with avatar upload and service assignment
- Settings tabs load and save
- Analytics renders charts and metrics
- TV display mode opens and shows queue

**Updated 2026-06-26 (Session 2):**
- Queue double-join prevented at both DB level (partial unique index) and app level (pre-insert phone check in QueueFlow and DashboardQueue)
- Dashboard pending bookings: sidebar badge, pending count stat, PendingApprovals section showing future pending bookings with Accept/Refuse
- Auth: refreshRole() fixes onboarding redirect loop; auto-login on signup when email confirmation is off
- All large files split into domain subdirectories (bookings/, queue/, staff/, booking/steps/)
- MASTER_SCHEMA.sql re-applied after full DB reset

**Updated 2026-06-27 (Session 3):**
- Staff auth login fully working: owner creates staff account with email/password, staff logs in, redirected to /staff
- create_staff_user RPC function works end-to-end with all 36 auth.users columns set correctly (instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, etc.)
- EWT formula improved: uses historical wait times (30-day window), staff count divisor, fallback formula, stored in DB
- QueueDisplay sound: singleton AudioContext, click-to-unlock overlay, muted hint
- Staff delete: trash button with confirmation dialog in DashboardStaff
- Onboarding auth guard: redirects to /login if not authenticated
- MCP set up for database inspection via opencode
- Supabase MCP used to compare auth.users rows between working and non-working users

**Updated 2026-06-27 (Session 4 — Phase 2d):**
- **Security audit FINAL_AUDIT.md** created: score 7.5/10. All critical + high items resolved.
- **Sentry monitoring** integrated (`@sentry/react` + `@sentry/vite-plugin`). Init guarded by `VITE_SENTRY_DSN`.
- **CI/CD pipeline** created: `.github/workflows/ci.yml` (eslint + tsc + test + build on PR/push) + `e2e.yml` (Playwright nightly).
- **CSP headers** configured: `_headers` for production, `vite.config.ts` `server.headers` for dev.
- **Playwright E2E tests** added: 3 tests for booking track, queue display, staff view redirect.
- **RLS integration tests** added: `supabase/tests/rls_policies.sql` (7 SQL assertions).
- **0 npm vulnerabilities** in production dependencies.
- **Bug fixes:** CSP WebSocket `wss://` added, StaffView state machine split (called → Commencer / in_service → Terminer), WhatsApp test send 404 fixed with business phone fallback.

**Updated 2026-06-28 (Phase 3c — 1-Month Trial & Honest Limits):**
- **`trial_ends_at` column** added to `businesses` — all businesses get 30-day trial on creation
- **`check_business_limits`** replaces old `check_plan_booking_limit` — skips limits during trial, separates booking/queue counts, matches landing page numbers exactly
- **`check_staff_plan_limit`** trigger on staff_members INSERT — enforces staff caps with trial skip
- **`get_monthly_business_counts`** RPC returns booking + queue + staff counts in one call
- **SubscriptionTab fully rewritten** — reads DB plan/trial, shows trial countdown, 2 progress bars (bookings + queue), Pro "Choose" → "Coming soon"
- **Landing page PricingSection** — Pro CTA "Free 14-day trial" → "Coming soon" in all 3 locales, Free plan shows trial subtitle
- **Dashboard i18n keys updated** — `free30bookings` → `free50bookings`, `free100queue`, `pro300bookings`, `pro500queue`
- **Migration `phase_3c_trial_limits`** applied to live Supabase
- **`npx tsc --noEmit`** and **`npm run build`** pass with zero errors

**Updated 2026-06-28 (Phase 3d — Final Pricing Limits & Polish):**
- **Final pricing limits** for Algerian market: Free(100/300/3), Pro(500/1000/7), Business(2000/2000/unlimited). Migration applied live.
- **Legal pages** created: Terms of Service & Privacy Policy (Algerian Law 18-07 compliant)
- **Footer cleaned up:** Instagram removed, email updated to sifeddine.meb96@gmail.com
- **All missing i18n keys added:** subscription, WhatsApp, 404 (20 keys), common buttons
- **Navbar fixed:** "Reviews" → "Approach"
- **404 route fixed:** dashboard catch-all renders NotFound
- **RTL polish completed:** ~35 components now patched (was 15), including all arrow icons across 12+ pages
- **Back-to-top button** added to landing page
- **Demo components rewritten:** accent color, i18n translations (20 new keys), equal height
- **Testimonials section rewritten:** 3 new professional/touching messages in all 3 languages
- **HowItWorks:** step circles full opacity with white text

**Updated 2026-06-30 (Bug Bash 2 — State Stability & UX Polish):**
- **Auth token refresh no longer unmounts dashboard** — `onAuthStateChange` skips `setRoleReady(false)` on `TOKEN_REFRESH`
- **Business reference stabilized** — `useMemo` wrap prevents cascade re-fetches in all dashboard pages
- **Profile name from DB** — fetches `full_name` from `profiles` table; shows real name not email prefix
- **Time-of-day greetings** — 5 variants per time block × 3 languages, random index stable per page load
- **Cover preview matches profile** — same 140px height, PixelCover fallback in settings
- **Revenue counts queue income** — completed queue tickets' service prices now included in revenue
- **Cache busting on uploads** — `?cb=timestamp` appended to image URLs, `cacheControl: "no-cache"`
- **Gradient default covers** — PixelCover + pixel-avatar use seeded SVG linear gradients instead of pixel art
- **Remove cover/logo** — X button on previews, `removeImage()` sets `null` in DB
- **Staff picker in Change Service** — TicketTracker can also change staff_member_id alongside service_id
- **Duplicate labels fixed** — "Phone" → "Business phone" in settings (EN/FR/AR)
- **Queue tab left on public page** — swapped button order so Queue appears before Appointments

**Updated 2026-06-30 (Queue Edge Cases — Skip, Check-in, Pause + Bug Fixes):**
- **Skip + Send Back 409 conflict fixed** — 3 RPCs rewritten: `recalculate_queue_positions` NULLs non-waiting positions first; `skip_queue_ticket` moves ticket to end; `send_ticket_back_to_queue` clears position before recalculating
- **Check-in button** in TicketTracker — "I'm here" sets `checked_in_at` timestamp; staff see green checkmark
- **Queue pause toggle** in dashboard settings — owners flip `is_queue_paused` switch; QueueFlow shows amber notice, hides join form
- **StatCard ref warning fixed** — renamed `ref` → `sectionRef` in StaffView.tsx
- **Staff onboarding redirect fixed** — ProtectedRoute: `!role` → `/` not `/onboarding`; LoginForm uses `get_user_role` RPC instead of direct table `.single()` query
- **i18n keys added** — 10+ new keys for skip, send back, check-in, queue pause (EN/FR/AR)
- **DB migrations applied** — `add_queue_skip_checkin_features`, `fix_get_queue_ticket_add_checked_in`, `fix_queue_position_conflicts`
- **Build passes** — `npm run build` zero errors
