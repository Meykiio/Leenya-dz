# Architecture — Leenya

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Vite, not CRA |
| Routing | React Router v6 | Declarative routes, `createBrowserRouter` |
| Styling | Tailwind CSS v3 + shadcn/ui | Utility-first, Radix-based components, `rtl:` variant |
| Backend | Supabase (Postgres) | Auth, DB, Storage, Realtime |
| State | React context + hooks | No Redux/Zustand |
| Animations | framer-motion | Page/component transitions |
| Charts | Recharts | Analytics dashboard |
| i18n | react-i18next | 6 namespaces × 3 languages (fr/ar/en), ~590 keys |
| Monitoring | Sentry | `@sentry/react` + `@sentry/vite-plugin` |
| Testing | Vitest + Playwright | Unit tests (vitest), E2E (Playwright) |

---

## Directory Structure

```
src/
├── components/
│   ├── auth/           — LoginForm, ForgotPassword, ProtectedRoute
│   ├── booking/
│   │   └── steps/      — StepService, StepStaff, StepDateTime, StepDetails, StepConfirmed
│   ├── dashboard/
│   │   ├── bookings/   — PendingApprovals, NewBookingSlideOver, BookingRow, BookingFilters
│   │   ├── queue/      — QueueStats, WaitingList, ServingSection
│   │   ├── staff/      — StaffCard, StaffFormDialog, ServiceAssignmentDialog
│   │   ├── settings/   — BusinessInfoTab, HoursTab, BookingPrefsTab, etc.
│   │   └── analytics/  — MetricCards, BookingsChart, PeakHoursGrid, etc.
│   ├── landing/        — HeroSection, SocialProofBar, FeaturesSection, etc.
│   ├── onboarding/     — OnboardingWizard, StepName, StepBusinessType, etc.
│   └── ui/             — shadcn/ui components (button, dialog, card, etc.)
├── contexts/
│   ├── AuthContext.tsx  — Session + role management
│   └── ThemeContext.tsx — Light/dark theme (currently always light)
├── hooks/
│   ├── use-business-info.ts
│   ├── useWhatsAppTemplates.ts
│   └── use-toast.ts    — Toast notifications
├── integrations/
│   └── supabase/
│       ├── client.ts   — Supabase client singleton
│       └── types.ts    — Auto-generated Supabase types
├── lib/
│   ├── timeSlots.ts          — Appointments time slot generation + overlap filtering
│   ├── utils.ts              — cn() utility (clsx + tailwind-merge)
│   ├── avatar.ts             — Avatar utility functions
│   └── whatsapp/
│       ├── templates.ts      — 7 default WhatsApp template definitions
│       ├── index.ts          — Message builders + re-exports
│       └── urls.ts           — WhatsApp URL link generators
├── pages/
│   ├── dashboard/
│   │   ├── bookings/    — PendingApprovals, NewBookingSlideOver, BookingRow, BookingFilters
│   │   ├── queue/       — QueueStats, WaitingList, ServingSection
│   │   ├── staff/       — StaffCard, StaffFormDialog, ServiceAssignmentDialog
│   │   ├── Dashboard.tsx
│   │   ├── DashboardAnalytics.tsx
│   │   ├── DashboardBookings.tsx
│   │   ├── DashboardQueue.tsx
│   │   ├── DashboardServices.tsx
│   │   ├── DashboardSettings.tsx
│   │   └── DashboardStaff.tsx
│   ├── BookingTrack.tsx
│   ├── BusinessPublic.tsx
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── MyBookings.tsx
│   ├── NotFound.tsx
│   ├── Onboarding.tsx
│   ├── QueueDisplay.tsx
│   ├── ResetPassword.tsx
│   └── StaffView.tsx
├── types/
│   ├── index.ts         — Re-exports from domain type files
│   ├── booking.ts       — Booking, queue_ticket types
│   ├── business.ts      — Business, hours, service types
│   ├── staff.ts         — StaffMember, StaffService types
│   └── auth.ts          — UserRole, Profile types
└── test/                — Unit tests (time slots, queue, booking, rate limiting)
```

---

## Data Flow

```
Browser → React Router → Page Component → Supabase Client → Supabase REST/RPC
                                           (anon key)           or Realtime
                                                                    ↓
                                                              PostgreSQL
                                                              (RLS + Triggers)
```

### Public anonymous access (queue + booking tracking):
```
Browser → RPC call (token parameter) → SECURITY DEFINER function → filtered row(s)
```
Anon users no longer query tables directly. Public data access is through parameterized RPCs (Phase 2a):
- `get_queue_ticket(p_ticket_id)` — one queue ticket (no PII)
- `get_business_queue(p_business_id, p_statuses)` — active tickets for display
- `get_completed_ticket_stats(p_business_id)` — aggregate stats
- `get_queue_context(p_business_id, p_ticket_id)` — position in queue
- `get_booking_by_token(p_token)` — one booking by tracking token
- `cancel_booking_by_token(p_token)` — cancel booking (token required)

### Authenticated access (dashboard):
```
Browser (logged-in) → Supabase client (JWT in session) → Table query with RLS
```
Dashboard pages fetch by `business.id` from `auth.uid()` via `use-business-info.ts`. RLS enforces owner/tenant isolation.

### Flow steps:
1. **Auth:** Supabase Auth emits `onAuthStateChange` → `AuthContext` stores session → `ProtectedRoute` checks role.
2. **Business pages:** Public pages use `slug` from URL params → `useEffect` fetches via Supabase (RPC for anon data, direct table for business data with RLS).
3. **Dashboard:** Dashboard pages fetch by `business.id` from `auth.uid()` via `use-business-info.ts`.
4. **Realtime:** Dashboard pages subscribe to Supabase Realtime channels for live queue/booking updates. Channels cleaned up on unmount.

---

## Authentication System

### Architecture

- Auth context wraps the entire app and manages session via Supabase client.
- On mount, listens for token recovery events from Supabase (page refresh).
- On auth state change (login, token refresh), fetches the user's role from `user_roles` table.
- **Key types:** `AppRole = 'owner' | 'staff' | 'client' | null`
- Route protection happens in `ProtectedRoute` component (accepts `allowedRoles` prop).

### Current Flow

```
Page Load → Supabase.getSession() → session exists?
  → Yes → fetch role from user_roles → set user + role in context
  → No → set user = null, role = null

Login → AuthContext.setRole() called after login
  → role === null → redirect to onboarding
  → role === 'owner' → redirect to dashboard
  → role === 'staff' → redirect to staff view
  → role === 'client' → redirect to my bookings
```

### Protected Routes

- `/dashboard/*` — Requires `owner` role
- `/staff/*` — Requires `staff` role
- `/my-bookings` — Requires `client` role
- `/onboarding` — Requires authenticated user with no role

### Important Notes

- No persisted role in localStorage — roles re-fetched on every page load via Supabase session recovery.
- Role is fetched from `user_roles` table, not from `profiles`.
- Password reset flow: Supabase sends email → user clicks link → `ResetPassword.tsx` captures the `PASSWORD_RECOVERY` event → shows new password form.

---

## Database Schema

Full schema is in `supabase/schema/MASTER_SCHEMA.sql` (idempotent, single source of truth).

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profile data | `id` (PK, FK→auth.users), `full_name`, `phone` |
| `user_roles` | Role assignment | `id`, `user_id` (FK→profiles), `role` ('owner'/'staff'/'client') |
| `businesses` | Business info | `id`, `owner_id` (FK→profiles), `name`, `slug`, `category`, `phone`, `address`, `is_active`, `accepts_appointments`, `accepts_walkins`, `advance_booking_days` |
| `business_hours` | Weekly schedule | `id`, `business_id` (FK), `day_of_week`, `open_time`, `close_time`, `is_closed` |
| `services` | Offered services | `id`, `business_id` (FK), `name`, `name_ar`, `duration`, `price`, `is_active` |
| `staff_members` | Staff list | `id`, `business_id` (FK), `profile_id` (FK→profiles, nullable), `display_name`, `avatar_url`, `is_active`, `accepts_bookings` |
| `staff_services` | Staff-service assignments | `id`, `staff_member_id` (FK), `service_id` (FK), UNIQUE(staff_member_id, service_id) |
| `bookings` | Appointment bookings | `id`, `business_id` (FK), `service_id` (FK), `staff_member_id` (FK, nullable), `client_name`, `client_phone`, `date`, `start_time`, `end_time`, `status`, `tracking_token`, `notes` |
| `queue_tickets` | Walk-in queue tickets | `id`, `business_id` (FK), `service_id` (FK), `ticket_number`, `client_name`, `client_phone`, `status`, `called_at` |
| `whatsapp_templates` | Message templates | `id`, `business_id` (FK), `type`, `message_template`, `variables` |
| `reviews` | Client reviews | `id`, `business_id` (FK), `booking_id` (FK), `profile_id` (FK), `rating`, `comment` |

### Key Constraints & Indexes

- `bookings`: CHECK status IN (...), rate limit trigger, overlap check trigger, advisory lock
- `queue_tickets`: Generate ticket number function, rate limit trigger (shared with bookings). Partial unique index `idx_one_active_ticket_per_phone` on `(business_id, client_phone, queue_date) WHERE status IN ('waiting', 'called', 'in_service')` prevents double join.
- `bookings.staff_member_id`: nullable FK (null when no preference or without staff selection)
- `staff_services`: UNIQUE(staff_member_id, service_id), CASCADE deletes
- `businesses.slug` is indexed via its UNIQUE constraint — no separate index needed

### DB Triggers (Phase 2a additions)

- `check_business_hours_trigger` — BEFORE INSERT on bookings: validates start_time falls within business's operating hours for the given date
- `check_queue_ticket_state_transition_trigger` — BEFORE UPDATE on queue_tickets: enforces valid state transitions (waiting→called→in_service→completed, waiting→cancelled, etc.)
- `check_booking_state_transition_trigger` — BEFORE UPDATE on bookings: enforces valid booking state transitions
- `check_past_booking_trigger` — BEFORE INSERT on bookings: prevents creating bookings with past dates

### Auth Helpers (SECURITY DEFINER, restricted to authenticated users)

- `generate_ticket_number(business_id)` — Atomic daily counter per business via UPSERT
- `assign_owner_role(user_id)` — Bypasses RLS to assign owner role during onboarding
- `upsert_profile(id, full_name)` — Bypasses RLS to create/update profile during onboarding
- `upsert_business(owner_id, name, slug, ...)` — Bypasses RLS to create/update business + default hours
- `insert_services(business_id, services_jsonb)` — Bypasses RLS to bulk-insert services during onboarding
- `get_monthly_booking_count(business_id)` — Counts bookings + tickets for plan enforcement
- `create_staff_user(email, password, staff_member_id, business_id, full_name)` — Creates auth.users + identities + user_roles for staff login

### Public RPCs (SECURITY DEFINER, callable by anon — Phase 2a)

- `get_queue_ticket(p_ticket_id)` — Returns one queue ticket with no PII (nulls client_name, client_phone)
- `get_business_queue(p_business_id, p_statuses)` — Returns active queue tickets for TV display (no PII)
- `get_completed_ticket_stats(p_business_id)` — Returns stats (avg wait time, total today)
- `get_queue_context(p_business_id, p_ticket_id)` — Returns position in queue for given ticket
- `get_booking_by_token(p_token)` — Returns one booking matching the tracking token
- `cancel_booking_by_token(p_token)` — Cancels a booking, requires valid token

### DB Triggers

- `check_booking_overlap()` — Prevents double-booking using advisory lock
- `check_insert_rate_limit()` — Limits 10 requests/phone/10min
- `check_plan_booking_limit()` — Enforces 30-booking/month cap on free plan
- `check_booking_service_business()` — Validates service/staff belong to business before INSERT
- `check_business_hours_trigger` — Ensures booking falls within operating hours
- `check_queue_ticket_state_transition_trigger` — Enforces queue_ticket state machine
- `check_booking_state_transition_trigger` — Enforces booking state machine
- `check_past_booking_trigger` — Prevents past-dated bookings

---

## Mutations & RLS

### Row-Level Security

All tables have RLS enabled (**PERMISSIVE** mode — switching to RESTRICTIVE is Phase 2b):

- **businesses:** owner manages (ALL), public reads (SELECT for active)
- **services:** owner manages (ALL), public reads (SELECT for active)
- **staff_members:** owner manages (ALL), public reads (SELECT for active)
- **staff_services:** owner manages (ALL), public reads (SELECT)
- **bookings:** owner manages (ALL). **⚠️ Anon SELECT/UPDATE revoked (Phase 2a).** Public INSERT allowed with rate limit + overlap prevention (trigger-based). Public read/write via RPCs only.
- **queue_tickets:** owner manages (ALL). **⚠️ Anon SELECT/UPDATE revoked (Phase 2a).** Public INSERT allowed. Public read via RPCs only.
- **waiting_counters:** only through `generate_ticket_number()` function

### Storage RLS

- `business-assets` bucket: owner manages, public reads (for images)
- `staff-avatars/{business_id}/{staff_member_id}` — private to owner, public read

---

## Routing

### Public Routes

| Path | Component | Notes |
|---|---|---|
| `/` | Landing | Marketing page |
| `/login` | Login | Email login/signup |
| `/forgot-password` | ForgotPassword | Email-only |
| `/reset-password` | ResetPassword | Captures PASSWORD_RECOVERY event |
| `/:slug` | BusinessPublic | Dynamic business page — public |
| `/:slug?tab=queue` | BusinessPublic | Queue tab |
| `/booking/track/:token` | BookingTrack | Anonymous tracking |
| `/display/:slug` | QueueDisplay | TV display mode |

### Protected Routes

| Path | Component | Role Required |
|---|---|---|
| `/onboarding` | Onboarding | Authenticated (no role) |
| `/dashboard` | Dashboard | Owner |
| `/dashboard/bookings` | DashboardBookings | Owner |
| `/dashboard/queue` | DashboardQueue | Owner |
| `/dashboard/services` | DashboardServices | Owner |
| `/dashboard/staff` | DashboardStaff | Owner |
| `/dashboard/settings` | DashboardSettings | Owner |
| `/dashboard/analytics` | DashboardAnalytics | Owner |
| `/staff` | StaffView | Staff |
| `/my-bookings` | MyBookings | Client |

---

## Key Design Decisions

1. **No DELETE on bookings** — Only status changes (`cancelled`, `no_show`).
2. **Queue ticket numbers reset daily** — `generate_ticket_number()` uses `CURRENT_DATE` as counter key.
3. **Rate limiting shared** — Bookings and queue_tickets count toward same 10/phone/10min limit.
4. **Overlap prevention per staff member** — Advisory lock hashed from `(business_id, date, start_time, staff_member_id)`.
5. **Staff step conditional** — If no staff assigned to selected service via `staff_services`, the staff selection step is skipped.
6. **Staff avatar colors deterministic** — Hash from `display_name` maps to fixed 8-color palette.
7. **No `console.log()` in production code** — All removed in 2026-06-25 session.
8. **OtpVerification.tsx deleted** — Phone OTP removed entirely in 2026-06-25.
