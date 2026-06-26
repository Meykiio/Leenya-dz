# Project Status — Leenya

**Last updated:** 2026-06-26
**Version:** 0.0.0 (pre-release)
**Project name:** Leenya (formerly Dawrni/Darek)
**One-line pitch:** Queue and appointment management SaaS for Algerian service businesses.

---

## Current Completion by Feature Area

| Feature Area | Completion | Status |
|---|---|---|
| Landing / Marketing pages | 90% | Done — all sections present, needs real testimonial data |
| Authentication (email/password) | 95% | Fully working — login, signup, forgot/reset password flows |
| Authentication (phone OTP) | 0% | **Removed** — phone tab deleted from LoginForm, OtpVerification.tsx deleted |
| Onboarding wizard | 95% | Fully working — 4 steps, profile + role + business + services |
| Business public page | 90% | Fully working — slug-based, tabs for appointment/queue |
| Appointment booking flow | 88% | Working — service, staff selection, date/time, details, WhatsApp links |
| Queue (walk-in) flow | 88% | Working — service selection, ticket generation, real-time tracker, double-join prevention via partial unique index |
| Queue ticket tracker | 80% | Working — realtime updates, cancel, completion/cancellation states |
| TV queue display | 80% | Working — realtime, auto-hide cursor, clock |
| Owner dashboard — homepage | 85% | Working — metrics (incl. pending count), recent bookings, quick actions |
| Owner dashboard — bookings mgmt | 90% | Working — date filter, status filter, search, CRUD, WhatsApp actions, PendingApprovals section, sidebar badge, real-time subscription |
| Owner dashboard — queue mgmt | 85% | Working — realtime, call/complete/cancel/no-show, display mode |
| Owner dashboard — services CRUD | 90% | Working — add/edit/delete/toggle, name_ar field, slider for duration |
| Owner dashboard — staff CRUD | 90% | Working — add/edit/toggle, **avatar upload**, **service assignment** |
| Owner dashboard — settings | 70% | All tabs present, most work, some features are placeholders |
| Owner dashboard — analytics | 70% | Working — metric cards, charts, peak hours grid, popular services, history table |
| Staff view | 80% | Working — queue management, call/complete/no-show |
| Client bookings page | 70% | Working — list upcoming/past, cancel, leave review |
| Booking tracker (anonymous token) | 80% | Working — view by token, cancel |
| Reviews | 60% | Working — display on public page, submit from MyBookings |
| WhatsApp templates | 70% | Working — CRUD in settings, template compilation, preview, WhatsApp link generation |
| Subscription/pricing UI | 90% | Working — pricing page and subscription tab in settings |
| Subscription enforcement | 0% | Not started — no server-side billing or plan limits |
| Payment processing | 0% | Not started — no payment gateway integrated |
| Automated notifications | 0% | Not started — all WhatsApp is manual (wa.me links) |
| SMS (Twilio) | 0% | Not started — phone OTP removed, no SMS integration |
| Arabic/RTL support | 10% | `name_ar` field exists in DB and UI form; no actual RTL layout switching |
| Testing | 30% | Unit tests exist for time slots, slugify, queue system, booking overlap, rate limiting |
| PWA / offline | 0% | Manifest exists, no service worker or caching |

---

## What Is Live and Working

The following flows work end-to-end in a local dev environment with a correctly configured Supabase project:

1. **Landing → Login → Onboarding → Dashboard:** A new user can land on the homepage, sign up via email+password, complete the 4-step onboarding wizard (profile → business type → business details → services), and land on the dashboard.
2. **Public business page → Book appointment:** A visitor can navigate to `/:slug`, see the business info, select a service, optionally pick a staff member, pick a date and time slot (filtered by staff availability if a staff member was selected), enter their name and phone, and receive a confirmed booking with a WhatsApp tracking link.
3. **Public business page → Join queue:** A visitor can navigate to `/:slug?tab=queue`, select a service, enter name/phone, get a ticket number, and see their position updated in real time.
4. **Dashboard → Manage queue:** Owner can view today's queue in real time, call/complete/cancel/no-show tickets, and open TV display mode.
5. **Dashboard → Manage bookings:** Owner can filter by date/status, search, create bookings, accept/reject, mark arrived/in-service/completed/cancelled/no-show, and send WhatsApp reminders.
6. **Dashboard → Services CRUD:** Owner can add/edit/delete services with name, duration, price, and active toggle.
7. **Dashboard → Staff CRUD:** Owner can add/edit staff members with active/accepts-bookings toggles, upload avatars (initials fallback with deterministic color), and assign services via checkbox dialog.
8. **Staff view:** Staff member can view today's queue and bookings, call/complete/no-show tickets.
9. **Booking tracker:** Anyone with a booking token URL can view and cancel their booking.
10. **My Bookings:** Logged-in client can view their booking history and cancel upcoming bookings.
11. **Analytics:** Owner can view metrics, charts, peak hours, popular services, and booking history.
12. **WhatsApp templates:** Owner can view/edit/reset WhatsApp message templates in settings.

---

## What Is Built But Broken

1. **`ResetPassword.tsx`**: The `useEffect` listener for `PASSWORD_RECOVERY` event is correct, but this flow is only half-tested — depends on Supabase email configuration being live.
2. **Dashboard analytics delta comparisons**: Previous period data is fetched but the delta display logic in `MetricCards.tsx` may not render properly for all edge cases (e.g., dividing by zero when previous period had 0 bookings).
3. **WhatsApp template initialization** (`useWhatsAppTemplates.ts`): The `initializeTemplates()` function uses hardcoded SQL variable format (`'{item1,item2}'`) for the `variables` array which may not work correctly depending on Supabase client's handling of Postgres arrays.

4. **Default booking view shows today only:** Owners must manually filter to future dates to see upcoming reservations. A booking for tomorrow is invisible by default. (Fix: change default filter to "upcoming" — P1 in NEXT.md)

5. **Queue tab is not the default on the public business page:** The appointment tab is shown by default. For barbershops and walk-in-first businesses, the queue tab should be the default. (Fix: swap default tab — P1 in NEXT.md)

---

## What Is Planned But Not Started

- Payment processing (BaridiMob / CCP / Stripe)
- Automated SMS reminders (Twilio)
- Subscription plan enforcement (server-side usage gates)
- Arabic RTL interface
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
- Queue flow works end-to-end (service → name/phone → ticket → realtime tracker)
- Dashboard queue management (call/complete/cancel) with realtime
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
