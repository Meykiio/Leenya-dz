# Changelog — Leenya

Dates are approximate, reconstructed from migration timestamps and documentation.

---

## 2026-06-26 — Second Cleanup: Split Completion, Booking Visibility, Queue App-Level Fix, Docs Audit

### File Splits Completed
- `src/pages/dashboard/DashboardBookings.tsx` → split into `bookings/PendingApprovals.tsx`, `bookings/NewBookingSlideOver.tsx`, `bookings/BookingRow.tsx`, `bookings/BookingFilters.tsx`
- `src/pages/dashboard/DashboardQueue.tsx` → split into `queue/QueueStats.tsx`, `queue/WaitingList.tsx`, `queue/ServingSection.tsx`
- `src/pages/dashboard/DashboardStaff.tsx` → split into `staff/StaffCard.tsx`, `staff/StaffFormDialog.tsx`, `staff/ServiceAssignmentDialog.tsx`
- `src/pages/dashboard/SettingsWhatsApp.tsx` → split internally with shared hooks
- `src/components/booking/AppointmentFlow.tsx` → split into `booking/steps/` subdirectory
- `src/components/booking/TicketTracker.tsx` → split into `booking/TicketWaiting.tsx`, `booking/TicketCalled.tsx`, `booking/TicketDone.tsx`

### Booking Visibility
- Created `bookings/PendingApprovals.tsx` — shows future pending bookings (capped at 10) with Accept/Refuse buttons and overflow message
- Added sidebar badge in `DashboardLayout.tsx` — pending count next to "Reservations" nav item, updated via real-time subscription
- Added real-time subscription in `DashboardBookings.tsx` for auto-refresh on booking status changes
- Replaced NO-SHOWS stat card in `Dashboard.tsx` with "EN ATTENTE" pending count stat (pulses when > 0)

### Queue Double-Join — App-Level Prevention
- Added pre-insert duplicate check in `QueueFlow.tsx` — queries for existing active ticket on same phone+date+business before calling `generate_ticket_number`
- Added identical check in `DashboardQueue.tsx` — shows "Ticket deja actif" toast on duplicate attempt
- Complements existing DB-level partial unique index for defense-in-depth

### Auth Fixes
- Added `refreshRole()` method to `AuthContext` — re-fetches user role from `user_roles` table
- `OnboardingWizard.tsx` calls `refreshRole()` before navigating to `/dashboard` after completion (fixes redirect loop to onboarding)
- `LoginForm.tsx` handles auto-login after signup: checks if `signUp()` returns a session (email confirmation off) and calls `handlePostAuth()` to redirect to onboarding

### Database
- Full reset: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then re-applied MASTER_SCHEMA.sql
- Resolved duplicate ticket conflict (cancelled extra tickets blocking index creation)
- Resolved publication membership errors (tables already in publication — skipped those lines)

### Documentation Audit
- Started systematic audit of all 10 DOCS files against actual codebase
- Fixed CLAUDE.md: file listings, recent work, next task
- Fixed SYSTEM_INSTRUCTIONS.md: wrong paths, outdated features, missing new features
- Fixed CHANGELOG.md: this entry
- Remaining docs in progress

---

## 2026-06-26 — Codebase Cleanup + Queue Double-Join Fix

### Database (MASTER_SCHEMA.sql)
- Added missing `GRANT USAGE ON SCHEMA public TO anon, authenticated` + `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` + `GRANT USAGE, SELECT ON ALL SEQUENCES` — fixes `permission denied for table` 403 errors on fresh Supabase projects
- Added partial unique index `idx_one_active_ticket_per_phone` on `queue_tickets(business_id, client_phone, queue_date) WHERE status IN ('waiting', 'called', 'in_service')` — prevents double queue join race condition at the database level
- Created migration `20260626_6_prevent_double_queue_join.sql`

### Root Cleanup
- Deleted redundant root files: `DOCUMENTATION.md`, `SCHEMA.sql`, `create_whatsapp_templates.sql`, `fix_whatsapp_templates.sql`
- Moved context files to `docs/`: `AI_CONTEXT.md`, `AUDIT.md`, `ENVIRONMENT.md`
- Renamed `DOCS/` to `docs/` (lowercase convention)

### File Splits (Type 1 structural cleanup — no logic changes)
- `types/index.ts` (276 lines) → split into `types/booking.ts`, `types/business.ts`, `types/staff.ts`, `types/auth.ts`, re-exported from `types/index.ts`
- `lib/whatsapp.ts` (357 lines) → split into `lib/whatsapp/templates.ts`, `lib/whatsapp/index.ts`, `lib/whatsapp/urls.ts`
- Remaining splits completed in next session (see below)

### Small Fixes
- Gated `console.error` in `NotFound.tsx` behind `import.meta.env.DEV`
- Gated `console.error` in `useWhatsAppTemplates.ts` behind `import.meta.env.DEV`
- Removed emoji from toast messages (4 files)
- Renamed `package.json` name from `vite_react_shadcn_ts` to `leenya`

### Documentation
- Created `docs/CLAUDE.md` — cold-start onboarding for AI sessions
- Updated all docs to reflect new file structure and cleanup changes

---

## 2026-06-25 — Staff Avatars, Service Assignment, Phone OTP Removal, Bug Fixes

### BREAKING: Phone OTP removed
- Deleted `src/components/auth/OtpVerification.tsx` entirely
- Removed phone tab, phone state, and OtpVerification import from `LoginForm.tsx`
- Login now shows email/password form only — no tab switcher

### Staff Avatars
- Created migration `20260328_add_staff_avatar.sql`: adds `avatar_url TEXT` column to `staff_members`
- Updated `DashboardStaff.tsx`: staff cards now show circular avatar (uploaded image or deterministic-color initials)
- Avatar upload to Supabase Storage: path `staff-avatars/{business_id}/{staff_member_id}`
- Deterministic color function based on name hash (8-color palette)
- Camera icon overlay on avatar for upload trigger

### Staff-Service Junction Table
- Created migration `20260328_add_staff_services.sql`: new `staff_services` junction table with:
  - `staff_member_id` UUID (FK → staff_members, CASCADE)
  - `service_id` UUID (FK → services, CASCADE)
  - `UNIQUE(staff_member_id, service_id)` prevents duplicates
  - RLS policies: owner manages, public read for booking flow
- Updated `types/index.ts`: added `StaffService` interface

### Staff Service Assignment UI
- DashboardStaff: "N services" button per staff card opens dialog with checkboxes for all active services
- On save: diffs selection against current, INSERTs new, DELETEs removed
- Assigned services shown as chips/badges on staff cards
- Error handling with toasts on all Supabase operations

### Booking Flow — Staff Selection Step
- Inserted step 1.5 (staff selection) between service and datetime in AppointmentFlow
- Fetches active staff-members with `accepts_bookings=true` + matching `staff_services` for selected service
- "Pas de préférence" pre-selected by default
- Skips staff step if 0 staff available for the selected service
- Passes `staff_member_id` to booking INSERT
- Filters time slots by selected staff member's existing bookings
- Shows "Avec {name}" in booking summary when a specific staff is chosen

### Bug Fixes
- Fixed `FloatingHelp.tsx`: replaced hardcoded `213XXXXXXXXX` with `import.meta.env.VITE_SUPPORT_PHONE` (fallback `213770000000`), removed `includes('X')` null-return guard
- Removed `console.log()` calls from `useWhatsAppTemplates.ts` (3 locations in `initializeTemplates`)
- Removed unused `data` destructuring in `useWhatsAppTemplates.ts`
- Added `VITE_SUPPORT_PHONE=` to `.env.example`

### Types
- Added `avatar_url: string | null` to `StaffMember` interface
- Added `StaffService` interface

---

## 2026-03-27 — WhatsApp Templates

- Added `whatsapp_templates` table with RLS policies
- Created `src/hooks/useWhatsAppTemplates.ts` — CRUD, compilation, initialization
- Created `src/pages/dashboard/SettingsWhatsApp.tsx` — Template editor with preview, reset
- Added `src/lib/whatsapp.ts` — 7 default template definitions + URL builders
- Added Realtime publication for `whatsapp_templates`
- Created migration `20260327_add_whatsapp_templates.sql`
- Created ad-hoc SQL scripts: `create_whatsapp_templates.sql`, `fix_whatsapp_templates.sql`

---

## 2026-03-09 — Documentation Suite + Bug Fixes

- Created comprehensive documentation: `README.md`, `DOCUMENTATION.md`, `SCHEMA.sql`, `ENVIRONMENT.md`, `AI_CONTEXT.md`
- Rebranded from "Dawrni"/"Darek" to **Leenya**
- Design system overhaul: Sora + JetBrains Mono fonts, zinc & signal color palette
- Added `check_booking_overlap` trigger with advisory locks for race-condition safety
- Added `check_insert_rate_limit` trigger on both `bookings` and `queue_tickets`
- Code audit: error handling on all Supabase queries, realtime cleanup on unmount
- Migrations around this date: `20260309022810_*.sql`

---

## 2026-03-08 — Core Application Build

### Landing & Auth
- Landing page with all sections (Hero, SocialProof, HowItWorks, Features, Pricing, Testimonials, CTA, Footer)
- Login form with email+password and phone OTP tabs
- Forgot password and password reset flows
- OTP verification UI (no backend)
- `AuthContext` with session management and role fetching
- `ProtectedRoute` role-based guard

### Onboarding
- 4-step wizard (name, business type, business details, services)
- Business slug generation
- Service suggestions by category
- Default business hours creation

### Business Public Page
- Slug-based routing (`/:slug`)
- Business header with cover, logo, rating, open status
- AppointmentFlow (4-step: service → datetime → details → confirmed)
- QueueFlow (service select → name/phone → ticket)
- TicketTracker with realtime position updates
- ReviewsSection display

### Dashboard
- `DashboardLayout` with sidebar, topbar, mobile bottom nav, queue badge
- Dashboard home with metrics and recent bookings
- `DashboardBookings` with filters, CRUD, WhatsApp actions
- `DashboardQueue` with two-column layout, realtime
- `DashboardServices` with CRUD, slider, toggle, name_ar
- `DashboardStaff` with CRUD, switches
- `DashboardSettings` with 6 tabs
- Settings tabs: `BusinessInfoTab`, `HoursTab`, `BookingPrefsTab`, `AccountTab`, `SubscriptionTab`

### Analytics
- Range picker (week / month / 3 months)
- Metrics cards with period comparison
- Daily bookings chart
- Peak hours heatmap grid
- Popular services ranking
- Booking history table

### Staff View
- `StaffView` page with queue stats, serving section, waiting list
- Status actions: call, complete, no-show, cancel

### Client Features
- `MyBookings` page with upcoming/past sections
- Review submission modal with star rating
- `BookingTrack` — anonymous booking tracking by token

### TV Display
- `QueueDisplay` — full-screen dark mode, large current ticket, next 5 tickets, clock, auto-hide cursor

### Utility Library
- `timeSlots.ts` — slot generation with 15-min increments, overlap detection, past-time filtering
- `slugify.ts` — URL-safe slug with random suffix
- `whatsapp.ts` — URL builders for booking confirmation, reminders, queue tickets, tracking
- `wilayas.ts` — all 58 Algerian wilayas
- `serviceSuggestions.ts` — default services by category

### Database
- All migrations created (10 migrations on this date)
  - `20260308071752_*.sql` through `20260308100802_*.sql`
- Tables: `profiles`, `user_roles`, `businesses`, `business_hours`, `services`, `staff_members`, `bookings`, `queue_counters`, `queue_tickets`, `reviews`
- View: `booking_availability`
- Functions: `handle_new_user()`, `has_role()`, `get_user_role()`, `check_booking_overlap()`, `check_insert_rate_limit()`, `generate_ticket_number()`
- Triggers: `on_auth_user_created`, `check_booking_overlap_trigger`, `check_insert_rate_limit_trigger`, `check_queue_rate_limit_trigger`
- RLS on all tables

### Design System
- `index.css` — CSS variables for light/dark themes, status badges, scrollbar styling
- `tailwind.config.ts` — font families, font sizes, colors, shadows, animations, keyframes

### shadcn/ui
- 49 UI components added (button, card, dialog, form, toast, tooltip, calendar, chart, etc.)
- `components.json` configuration

### Tests
- Vitest setup with jsdom
- Tests for: slugify, timeSlots, queue system, booking overlap, rate limiting

---

## Pre-2026-03-08 — Initial Scaffold

- Project initialized with `vite_react_shadcn_ts` template
- Supabase integration setup (`src/integrations/supabase/client.ts`, `types.ts`)
- Basic Vite + SWC + TypeScript configuration
