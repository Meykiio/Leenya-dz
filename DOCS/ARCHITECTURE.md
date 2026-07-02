# Leenya — Technical Architecture Reference

*Last verified: 2026-07-02 against live Supabase DB, deployed Vercel production, and source code on disk.*

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React 18 + Vite | React 18.3, Vite 5.4 |
| Routing | React Router DOM | 6.30 |
| Styling | Tailwind CSS 3 | 3.4 |
| UI Components | shadcn/ui (Radix primitives) | Multiple @radix-ui packages |
| Backend | Supabase (Postgres 17) | 2.98 (client SDK) |
| Auth | Supabase Auth (GoTrue) | v2.191 |
| Deployment | Vercel (static SPA) | Node 24.x |
| Error Tracking | Sentry | 10.62 (optional via DSN) |
| i18n | i18next + react-i18next | 26.3 / 17.0 |
| Animation | Framer Motion | 12.35 |
| Charts | Recharts | 2.15 |
| Forms | react-hook-form | 7.61 |
| Icons | Lucide React | 0.462 |

---

## Routes (22 total)

### Public (no auth required)

| Path | Component | Notes |
|---|---|---|
| `/` | Landing | Marketing page |
| `/login` | Login | Sign-in form |
| `/onboarding` | Onboarding | Business setup wizard |
| `/reset-password` | ResetPassword | Password reset |
| `/booking/track/:token` | BookingTrack | Tracking by token |
| `/display/:slug` | QueueDisplay | TV/monitor display |
| `/terms` | TermsOfService | Legal page |
| `/privacy` | PrivacyPolicy | Legal page |
| `/:slug/queue` | QueuePublic | Join queue for a business |
| `/:slug` | BusinessPublic | Business public profile |

### Protected (auth + role required)

| Path | Component | Roles Allowed |
|---|---|---|
| `/admin` | Admin | superadmin |
| `/mes-reservations` | MyBookings | client, superadmin |
| `/dashboard` | Dashboard | owner, superadmin |
| `/dashboard/bookings` | DashboardBookings | owner, superadmin |
| `/dashboard/queue` | DashboardQueue | owner, superadmin |
| `/dashboard/services` | DashboardServices | owner, superadmin |
| `/dashboard/staff` | DashboardStaff | owner, superadmin |
| `/dashboard/settings` | DashboardSettings | owner, superadmin |
| `/dashboard/analytics` | DashboardAnalytics | owner, superadmin |
| `/dashboard/feedback` | DashboardFeedback | owner, superadmin |
| `/staff` | StaffView | staff, owner, superadmin |

All pages are lazy-loaded via `React.lazy()`. Dashboard routes are nested under `DashboardLayout` for persistent sidebar.

---

## Auth Flow

1. On mount: listen to `onAuthStateChange`, call `supabase.auth.getSession()`
2. Resolve role via RPC: `supabase.rpc("get_user_role")`
3. If returns null: retry once, log Sentry breadcrumb
4. `fetchRole()` and `waitForRole()` share the same promise via `pendingRolePromiseRef`
5. `ProtectedRoute`:
   - `loading` → spinner
   - `!user` → redirect `/login`
   - `user && !role` → redirect `/`
   - `role === "superadmin"` → always allowed
   - `role not in allowedRoles` → redirect to correct area

User roles: `owner`, `staff`, `client`, `superadmin`.

---

## Database (13 tables)

All tables have RLS enabled. 53 RLS policies, all PERMISSIVE mode.

### Tables

| Table | Rows | Key Columns |
|---|---|---|
| `profiles` | 9 | id→auth.users, full_name, phone, preferred_lang |
| `user_roles` | 9 | user_id→auth.users, role (app_role enum) |
| `businesses` | 4 | owner_id, name, slug, category, plan, is_queue_paused, trial_ends_at |
| `business_hours` | 28 | business_id, day_of_week, opens_at, closes_at, is_closed |
| `services` | 11 | business_id, name, name_ar, duration_minutes, price_dzd |
| `staff_members` | 7 | business_id, profile_id, display_name, is_active, accepts_bookings |
| `staff_services` | 16 | staff_member_id, service_id (junction table) |
| `bookings` | 2 | business_id, client_name, client_phone, date, start_time, end_time, status |
| `queue_counters` | 4 | business_id, counter_date, last_number |
| `queue_tickets` | 42 | business_id, ticket_number, ticket_label, status, position_in_queue, checked_in_at, skip_count, service_changed_at |
| `reviews` | 9 | business_id, booking_id, ticket_id, client_id, rating, comment |
| `feedback` | 1 | business_id, email, category, message |
| `whatsapp_templates` | 21 | business_id, template_key, name, message_template, variables |

### Enums
- `app_role`: owner, staff, client, superadmin
- `business_category`: beauty_salon, barbershop, clinic, dental, physiotherapy, veterinary, other
- `booking_status`: pending, confirmed, arrived, in_service, completed, cancelled, no_show
- `queue_status`: waiting, called, in_service, completed, cancelled, no_show

### 38 Functions / RPCs

Key categories:
- **Auth helpers** (SECURITY DEFINER): `get_user_role()`, `has_role()`, `is_superadmin()`, `assign_owner_role()`, `upsert_profile()`, `upsert_business()`, `insert_services()`, `create_staff_user()`
- **Queue operations** (SECURITY DEFINER): `join_queue()`, `cancel_queue_ticket()`, `update_ticket_service()`, `get_queue_ticket()`, `get_business_queue()`, `get_queue_context()`, `get_staff_queue()`, `get_dashboard_queue()`, `get_completed_ticket_stats()`, `check_in_ticket()`, `reassign_queue_ticket()`, `recalculate_queue_positions()`, `send_ticket_back_to_queue()`, `skip_queue_ticket()` (unused by frontend, kept for API compatibility)
- **Booking operations** (SECURITY DEFINER): `get_booking_by_token()`, `cancel_booking_by_token()`
- **Other**: `get_monthly_business_counts()`, `get_default_whatsapp_templates()`
- **Trigger-only** (EXECUTE revoked from PUBLIC): `check_business_limits()`, `check_staff_plan_limit()`, `check_booking_overlap()`, `check_booking_service_business()`, `check_business_hours()`, `check_past_booking()`, `check_insert_rate_limit()`, `check_queue_ticket_state_transition()`, `check_booking_state_transition()`, `handle_new_user()`, `update_updated_at_column()`

Anon can call 10 functions (GRANT EXECUTE TO anon).
Authenticated can call all remaining functions with GRANT EXECUTE TO authenticated.

### 22 Triggers

All match between MASTER_SCHEMA.sql and live DB (one was recently fixed — `trg_user_roles_updated_at` was missing from live, now applied).

### 27 Indexes

Key ones: `idx_one_active_ticket_per_phone` (prevents double queue join), `queue_tickets_position_unique` (unique position constraint on waiting tickets), `idx_bookings_overlap_check` (concurrency).

---

## Component Architecture

```
src/
├── App.tsx                    — Root component, routes, error boundaries
├── main.tsx                   — Entry point
├── components/
│   ├── auth/                  — LoginForm, ProtectedRoute, ForgotPassword
│   ├── booking/               — AppointmentFlow, QueueFlow, TicketTracker, BusinessHeader
│   │   └── steps/             — StepService, StepStaff, StepDateTime, StepDetails, StepConfirmed
│   ├── dashboard/             — DashboardLayout (sidebar shell)
│   │   ├── analytics/         — BookingsChart, QueueChart, PopularServices, MetricCards, etc.
│   │   └── settings/          — BusinessInfoTab, HoursTab, AccountTab, BookingPrefsTab, SubscriptionTab
│   ├── landing/               — HeroSection, FeaturesSection, PricingSection, etc.
│   │   └── demo/              — CalendarDemo, DashboardDemo, QueueDemo
│   ├── onboarding/            — OnboardingWizard + step components
│   ├── ui/                    — 50 shadcn/ui primitives (accordion, button, dialog, etc.)
│   ├── ErrorBoundary.tsx
│   ├── FloatingHelp.tsx
│   └── NavLink.tsx
├── pages/                     — 15 page components (lazy-loaded)
│   └── dashboard/             — 8 dashboard pages + sub-pages (bookings/, queue/, staff/, whatsapp/)
├── contexts/
│   └── AuthContext.tsx        — Session + role management
├── hooks/                     — use-business-info, use-mobile, use-toast, useLanguage, useWhatsAppTemplates
├── lib/                       — utils, sentry, slugify, avatar, pixel-avatar, serviceSuggestions, timeSlots, wilayas, phone/validation, whatsapp/
├── i18n/
│   └── locales/{en,fr,ar}/   — 6 JSON files per language (auth, booking, common, dashboard, landing, staff)
├── types/                     — auth.ts, booking.ts, business.ts, staff.ts
└── integrations/supabase/     — client.ts (Supabase singleton), types.ts (auto-generated)
```

---

## i18n (Internationalization)

- 3 languages: English (default), French, Arabic
- 6 namespaces: common, landing, auth, dashboard, booking, staff
- 18 JSON files total (6 × 3)
- Detection: localStorage (`leenya_lang`), then browser navigator

### Key Counts (Flattened, Verified 2026-07-02)

| Namespace | EN | FR | AR |
|---|---|---|---|
| common | 71 | 71 | 69 |
| auth | 93 | 93 | 93 |
| booking | 149 | 149 | 149 |
| dashboard | 446 | 391 | 444 |
| landing | 211 | 211 | 211 |
| staff | 51 | 51 | 51 |
| **Total** | **1,021** | **966** | **1,017** |

### Gaps
- **FR missing 55 keys** — all in dashboard analytics section (CSV exports, status labels, day abbreviations, metrics)
- **AR missing 4 keys** — 2 in common (admin section), 2 in dashboard (unknown status, staff modify error)

---

## Security

### HTTP Headers (Live Production)
- Content-Security-Policy: restrictive (no `'unsafe-inline'` on scripts; `'self'` + Supabase + Sentry + Vercel)
- Strict-Transport-Security: `max-age=31536000; includeSubDomains; preload`
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `DENY`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: camera/mic/geolocation all denied
- CORS: restricted to Supabase project URL

### RLS
- All 13 tables have RLS enabled
- 53 policies, all PERMISSIVE
- Policies by role: anon (SELECT on public data, INSERT on queue/feedback/reviews), authenticated (per-RLS access), service_role (full access)
- Superadmin bypass exists on all owner-level policies via `is_superadmin()` function

### Known RLS Gaps
- Storage UPDATE/DELETE policies check only that user owns *any* business, not the one in the file path (minor — paths are UUID-based)
- 4 anon policies were recently applied (2026-07-02 migration) for booking token lookup/cancel and queue ticket view/cancel

---

## Storage

- 1 bucket: `business-assets` (public, no listing for anon)
- Upload paths: `{businessId}/logo.png`, `{businessId}/cover.png`, `staff-avatars/{businessId}/{staffId}.{ext}`
- All uploads use `upsert: true` and `cacheControl: "no-cache"`

---

## Deployment

- **Platform:** Vercel (static SPA with rewrites)
- **Production URL:** https://leenya-dz.vercel.app
- **Current commit:** `a9d5884a` (branch `fix/queue-skip-and-hardening`)
- **Build:** Vite → static dist/ → deployed to Vercel Edge Network
- **Build output:** ~310 kB gzip main chunk (warning: >500 kB raw)

### Environment Variables (Required)
| Var | Source |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase project → Settings → API (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project → Settings → General (ref ID) |
| `VITE_SUPPORT_PHONE` | WhatsApp number for floating help button |
| `VITE_SENTRY_DSN` | Sentry project → Client Keys (optional) |

---

## Key Files

| File | Purpose |
|---|---|
| `supabase/schema/MASTER_SCHEMA.sql` | Single source of truth for DB schema (idempotent) |
| `src/integrations/supabase/client.ts` | Supabase client singleton |
| `src/contexts/AuthContext.tsx` | Auth state management |
| `src/App.tsx` | Route definitions |
| `vercel.json` | CSP headers, URL rewrites |

---

## Known Limitations

1. **Auth redirect race (Bug 3)** — MONITORING: fix deployed (shared promise + retry), needs 1 week of production Sentry data to confirm
2. **Skip button removed** — `skip_queue_ticket` RPC still exists for API compatibility but is not called from frontend
3. **No payment processing** — plan upgrade is defined in the schema but there's no way to pay
4. **RLS PERMISSIVE → RESTRICTIVE** — all policies use PERMISSIVE mode; RESTRICTIVE would be more correct but requires careful testing
5. **~35 hardcoded French strings** — claimed by TEXT_INVENTORY.md, not verified in this audit
