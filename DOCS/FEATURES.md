# Features — Leenya

---

## Landing Page

- **Status:** Done
- **User story:** As a prospective business owner, I can visit the landing page and understand what Leenya does, see its features, pricing, and sign up.
- **Files:**
  - `src/pages/Landing.tsx` — Composes all sections
  - `src/components/landing/HeroSection.tsx` — Nav, hero headline, CTA, dashboard mockup
  - `src/components/landing/SocialProofBar.tsx` — Trust metrics bar
  - `src/components/landing/HowItWorks.tsx` — 3-step explanation
  - `src/components/landing/FeaturesSection.tsx` — Feature grid
  - `src/components/landing/PricingSection.tsx` — 3-tier pricing (Gratuit/Pro/Business)
  - `src/components/landing/TestimonialsSection.tsx` — Testimonial cards (placeholder data)
  - `src/components/landing/CtaBanner.tsx` — Final CTA section
  - `src/components/landing/Footer.tsx` — Footer with links
- **Notes:** Static content, no database queries. Testimonials use hardcoded placeholder data. All CTAs link to `/login`.

---

## Email/Password Authentication

- **Status:** Done
- **User story:** As a user, I can sign up with my email and password, receive a confirmation email, log in, and reset my password if I forget it.
- **Files:**
  - `src/contexts/AuthContext.tsx` — Session management, role fetching
  - `src/components/auth/LoginForm.tsx` — Login/signup form (email only — phone tab removed)
  - `src/components/auth/ForgotPassword.tsx` — Password reset email request
  - `src/pages/Login.tsx` — Login page wrapper
  - `src/pages/ResetPassword.tsx` — New password entry page
  - `src/components/auth/ProtectedRoute.tsx` — Route guard
- **Notes:** Email confirmation can be toggled on/off in Supabase Auth settings (currently ON in dashboard). When OFF, signup auto-logs in and redirects to onboarding. Password reset flow uses `PASSWORD_RECOVERY` event listener.

---

## Phone OTP Authentication

- **Status:** Removed
- **User story:** Previously allowed login via phone number + SMS code.
- **Files:**
  - `src/components/auth/OtpVerification.tsx` — **Deleted**
  - `src/components/auth/LoginForm.tsx` — Phone tab removed
- **Notes:** Phone OTP was broken (no Twilio configured). The phone tab was the default tab and showed a dead-end toast. Removed entirely in 2026-06-25 session. Login now uses email/password only.

---

## Onboarding Wizard

- **Status:** Done
- **User story:** As a new user (after login), I can complete a 4-step wizard to set up my business profile and services.
- **Files:**
  - `src/components/onboarding/OnboardingWizard.tsx` — Step orchestrator with progress indicator
  - `src/components/onboarding/StepName.tsx` — Step 1: full name input + creates profile and user_role (owner)
  - `src/components/onboarding/StepBusinessType.tsx` — Step 2: business category selection (icon grid)
  - `src/components/onboarding/StepBusinessDetails.tsx` — Step 3: name, phone, address, wilaya, slug generation
  - `src/components/onboarding/StepServices.tsx` — Step 4: select or create services
  - `src/components/onboarding/WelcomeModal.tsx` — Completion modal with public link copy/share
  - `src/pages/Onboarding.tsx` — Page wrapper
- **Notes:** Creates profile, role, business, business_hours (default open Mon-Sat 9-18), and services in one flow. Redirects if user already has a role.

---

## Public Business Page

- **Status:** Done
- **User story:** As a visitor, I can view a business's public page using a short URL (`/:slug`) and see their info, hours, ratings, and book an appointment or join a queue.
- **Files:**
  - `src/pages/BusinessPublic.tsx` — Fetches business, services, hours, reviews by slug. Renders header + tabs + reviews
  - `src/components/booking/BusinessHeader.tsx` — Cover image, logo, name, category, rating, open status
  - `src/components/booking/ReviewsSection.tsx` — Star ratings with "show more"
- **Notes:** Handles: business not found (redirects to 404), business inactive ("temporarily closed"), no services, no hours. Tab bar is sticky. Reads `?tab=queue` URL param to default to queue tab. Max width 480px.

---

## Appointment Booking Flow

- **Status:** Done
- **User story:** As a visitor, I can book an appointment by selecting a service, optionally choosing a staff member, picking a date/time, entering my name and phone, and receiving a confirmation with a tracking link.
- **Files:**
  - `src/components/booking/AppointmentFlow.tsx` — Multi-step flow (service → staff → datetime → details → confirmed)
  - `src/lib/timeSlots.ts` — Time slot generation (15-min increments, overlap filtering, past-time removal)
  - `src/lib/whatsapp/urls.ts` — WhatsApp URL builders for confirmation, tracking, notification
  - `src/lib/whatsapp/index.ts` — Message builder re-exports
- **Notes:** 5-step flow with framer-motion AnimatePresence when staff are available; 4-step flow when no staff assigned to the selected service. "Pas de préférence" pre-selected by default. Staff step queries `staff_services` junction table. Time slots filtered by selected staff member's existing bookings. Edge cases: closed days disabled, past times hidden if today, duration clamped at 23:59 max. Rate limit (10/phone/10min) applied server-side via trigger. Overlap prevention via advisory lock. Google Calendar link + WhatsApp share on confirmation.

---

## Queue (Walk-in) Flow

- **Status:** Done
- **User story:** As a visitor, I can join a business's walk-in queue by selecting a service, entering my name and phone, getting a ticket number, and tracking my position in real time.
- **Files:**
  - `src/components/booking/QueueFlow.tsx` — Service selection + name/phone + ticket generation
  - `src/components/booking/TicketTracker.tsx` — Real-time ticket status display (uses `get_queue_ticket`, `get_completed_ticket_stats`, `get_queue_context` RPCs)
- **Notes:** Shows live stats (waiting count, estimated wait, current serving) with realtime subscription. Ticket number generated via `generate_ticket_number()` RPC (atomic UPSERT). TicketTracker stores state in localStorage for resilience. Shows different screens for waiting/called/completed/cancelled. "Called" has a pulsing animation. **Data access via RPC** — anon direct table queries revoked for security. Cancel button removed for anonymous users (C-003 fix).
- **Queue double-join prevention:** Partial unique index `idx_one_active_ticket_per_phone` on `queue_tickets(business_id, client_phone, queue_date) WHERE status IN ('waiting', 'called', 'in_service')` prevents the same phone from having multiple active tickets at the DB level. Additional app-level pre-insert check in QueueFlow.tsx and DashboardQueue.tsx queries for existing active tickets on same phone+date+business before generation — defense in depth.
- **Skip + Send Back (2026-06-30):** Skip moves ticket to end of queue (NULL position → renumber others → set to MAX+1). Send Back moves called tickets back to waiting. Both clear stale positions on non-waiting tickets first to prevent 409 unique constraint violations. UI buttons in StaffView + DashboardQueue.
- **Check-in (2026-06-30):** "I'm here" button in TicketTracker sets `checked_in_at` timestamp. Staff see green checkmark indicator in waiting lists. No state machine change — lightweight timestamp only.
- **Queue pause toggle (2026-06-30):** Dashboard settings switch sets `is_queue_paused` on businesses table. QueueFlow fetches on mount, shows amber notice, hides join form when paused.
- **Position calculation (2026-06-30):** `get_queue_context` uses `position_in_queue` instead of `ticket_number` for `waiting_ahead` count — accurate even after skip/send-back operations.

---

## TV Queue Display

- **Status:** Done
- **User story:** As a business owner, I can open a full-screen TV display showing the current queue for my waiting room.
- **Files:**
  - `src/pages/QueueDisplay.tsx` — Full-screen dark display, shows current ticket (large), next 5 tickets, clock (uses `get_business_queue` RPC)
- **Notes:** URL format: `/display/:slug`. Auto-hides cursor after 3s of inactivity. Shows clock and watermark. Realtime updates via Supabase subscription. Dark background (#0C0C0A). **Data access via RPC** — no direct table query.

---

## Owner Dashboard — Overview

- **Status:** Done
- **User story:** As a business owner, I can see a dashboard overview of today's activity: metrics, recent bookings, quick actions.
- **Files:**
  - `src/pages/dashboard/Dashboard.tsx` — Metric cards (today's bookings, revenue, wait count, pending count), recent bookings list, quick actions (copy public link, nav to queue/bookings)
  - `src/hooks/use-business-info.ts` — Fetches business.id, name, slug, category for current user
- **Notes:** Shows total appointments, total revenue, waiting in queue, **pending bookings count** (replaces old no-show rate). Pending stat pulses when > 0. Recent bookings limited to 5. Greeting with user's name.

---

## Owner Dashboard — Booking Management

- **Status:** Done
- **User story:** As a business owner, I can view all bookings for a given date, filter by status, search by name/phone, create bookings, update statuses, and send WhatsApp messages.
- **Files:**
  - `src/pages/dashboard/DashboardBookings.tsx` — Full booking management table with filters, slide-over create form, real-time subscription
  - `src/pages/dashboard/bookings/PendingApprovals.tsx` — Pending bookings section (future dates, capped at 10 with overflow message)
  - `src/pages/dashboard/bookings/NewBookingSlideOver.tsx` — Create booking slide-over panel
  - `src/pages/dashboard/bookings/BookingRow.tsx` — Single booking row component
  - `src/pages/dashboard/bookings/BookingFilters.tsx` — Date picker + status filter + search
- **Notes:** Date picker (calendar popover), status filter dropdown, text search. Status actions: accept (pending→confirmed + WhatsApp), reject (pending→cancelled), arrived, in_service, complete, no-show, cancel. WhatsApp: send confirmation, reminder, accept notification. Slide-over "new booking" form with date, time, service, staff selection. **PendingApprovals** section at top shows all future bookings with pending status. **Sidebar badge** shows live pending count next to "Reservations" nav item. Real-time subscription auto-refreshes on status changes.

---

## Owner Dashboard — Queue Management

- **Status:** Done
- **User story:** As a business owner, I can manage today's queue in real time: call, serve, complete, no-show, or cancel tickets, add clients manually, and open TV display.
- **Files:**
  - `src/pages/dashboard/DashboardQueue.tsx` — Two-column layout (waiting / serving), realtime updates
- **Notes:** Realtime subscription. Conditional optimistic updates (only call if status is still "waiting"). Stats strip (waiting, serving, completed counts). Current ticket highlighted with accent border. WhatsApp call notification opens automatically on "call". TV display button opens `/display/:slug`.

---

## Owner Dashboard — Services CRUD

- **Status:** Done
- **User story:** As a business owner, I can add, edit, delete, and toggle services with name (French + Arabic), duration (slider), price, and active status.
- **Files:**
  - `src/pages/dashboard/DashboardServices.tsx` — Service list with inline switches, modal for add/edit
- **Notes:** Shows `name_ar` (Arabic) if available. Drag handle icon present but no drag-and-drop implemented. Delete shows confirmation dialog; catches foreign key errors with user-friendly message. Duration slider (15-180 min, 15 min steps). Supports hard DELETE from database.

---

## Owner Dashboard — Staff CRUD

- **Status:** Done
- **User story:** As a business owner, I can add and manage staff members with active/accepts-bookings toggles, avatar upload, and service assignments.
- **Files:**
  - `src/pages/dashboard/DashboardStaff.tsx` — Staff list with avatar (initials or uploaded image), toggle switches, service assignment dialog
- **Notes:** Simple name-only input for staff creation (no profile linking UI). Two toggles: active (visible) and accepts_bookings (available for appointments). Avatar upload to Supabase Storage `business-assets/staff-avatars/`. Deterministic color for initials based on name hash. Service assignment via checkbox dialog: diff-compare on save, INSERT new + DELETE removed from `staff_services`. Error handling with toasts on all operations.

---

## Owner Dashboard — Settings

- **Status:** Partially built
- **User story:** As a business owner, I can update my business information, hours, booking preferences, WhatsApp templates, account settings, and view subscription plan.
- **Files:**
  - `src/pages/dashboard/DashboardSettings.tsx` — Tabs container (business, hours, prefs, whatsapp, account, subscription)
  - `src/components/dashboard/settings/BusinessInfoTab.tsx` — Business name, logo/cover upload, description, address, wilaya, phone
  - `src/components/dashboard/settings/HoursTab.tsx` — Weekly hours editor (open/close times per day, closed toggle)
  - `src/components/dashboard/settings/BookingPrefsTab.tsx` — Accept appointments/walkins toggles, advance booking days slider
  - `src/components/dashboard/settings/AccountTab.tsx` — Profile name, phone, language preference
  - `src/components/dashboard/settings/SubscriptionTab.tsx` — Plan display cards, upgrade buttons (no payment)
- **Notes:** Logo/cover upload uses Supabase Storage (`business-assets` bucket). Subscription tab shows plan features but has no payment integration.

---

## Owner Dashboard — Analytics

- **Status:** Done
- **User story:** As a business owner, I can view analytics for my business: booking trends, peak hours, popular services, and booking history.
- **Files:**
  - `src/pages/dashboard/DashboardAnalytics.tsx` — Analytics page with range picker (week/month/3months)
  - `src/components/dashboard/analytics/MetricCards.tsx` — Cards: total bookings, revenue, no-show rate, avg rating
  - `src/components/dashboard/analytics/BookingsChart.tsx` — Daily bookings bar chart (Recharts)
  - `src/components/dashboard/analytics/PeakHoursGrid.tsx` — Weekly heatmap of booking density by hour
  - `src/components/dashboard/analytics/PopularServices.tsx` — Service popularity ranking table
  - `src/components/dashboard/analytics/BookingHistoryTable.tsx` — Detailed booking list
- **Notes:** Compares to previous period for deltas. Charts use Recharts library. Heatmap shows 7 rows × 24h.

---

## WhatsApp Template Management

- **Status:** Done
- **User story:** As a business owner, I can view, edit, reset, and preview WhatsApp message templates sent to clients.
- **Files:**
  - `src/pages/dashboard/SettingsWhatsApp.tsx` — Template list with edit/preview/reset, initialization
  - `src/pages/dashboard/whatsapp/TemplateEditDialog.tsx` — Edit dialog with variable badges
  - `src/pages/dashboard/whatsapp/TemplatePreviewDialog.tsx` — Preview with sample data compilation
  - `src/hooks/useWhatsAppTemplates.ts` — CRUD operations, compilation, initialization
  - `src/lib/whatsapp/` — Default templates (7 types), URL builders, message builders
- **Notes:** 7 template types: booking_new, booking_accepted, booking_cancelled, booking_reminder, queue_called, queue_joined, booking_completed. Edit dialog shows available variables as badges. Preview compiles with sample data. Reset restores defaults (delete + re-insert via `get_default_whatsapp_templates` SQL function + app-layer insert). Variable insertion uses string replacement for Postgres array format (potential bug).

---

## Staff View

- **Status:** Done
- **User story:** As a staff member, I can view today's queue and bookings, manage ticket statuses (call, complete, no-show), and send WhatsApp messages from a simplified interface.
- **Files:**
  - `src/pages/StaffView.tsx` — Staff interface with tabbed view (Queue + Bookings), queue stats, serving section, waiting list
- **Notes:** Identity linked via `staff_members.profile_id` → `auth.uid()`. Shows stats cards (waiting, serving). "In service" cards get accent border. `called_at` conflict detection prevents double-calling. WhatsApp call notification on "call". Sign out button in header.

---

## Client Bookings Page

- **Status:** Done
- **User story:** As a logged-in client, I can view my upcoming and past bookings, cancel upcoming ones, and leave reviews for completed bookings.
- **Files:**
  - `src/pages/MyBookings.tsx` — Upcoming/past sections, cancel button, review modal with star rating
- **Notes:** Protected route (client role only). Bookings fetched with joined `services` and `businesses`. Cancel updates status to 'cancelled'. Review modal has 5-star rating (clickable stars) + comment textarea.

---

## Anonymous Booking Tracker

- **Status:** Done
- **User story:** As any visitor with a tracking token URL, I can view my booking details and cancel it without logging in.
- **Files:**
  - `src/pages/BookingTrack.tsx` — Booking display by token, cancel with confirmation dialog (uses `get_booking_by_token` and `cancel_booking_by_token` RPCs)
- **Notes:** URL format: `/booking/track/:token`. Shows booking status as badge. Cancel only allowed for pending/confirmed statuses. Shows business address and phone. No auth required. **Data access via RPC** — anon direct table queries revoked for security (see doctor audit).

---

## 404 Page

- **Status:** Done
- **User story:** As any visitor, if I navigate to a non-existent route, I see a 404 page with a link back to home.
- **Files:**
  - `src/pages/NotFound.tsx` — 404 page with error logging
- **Notes:** Logs the attempted path to console. Links back to `/`.

---

## Floating Help Button

- **Status:** Done
- **User story:** As a user, I can click a floating WhatsApp button to get help.
- **Files:**
  - `src/components/FloatingHelp.tsx`
- **Notes:** Uses `import.meta.env.VITE_SUPPORT_PHONE` (env var) with fallback `213770000000`. Always renders. Set `VITE_SUPPORT_PHONE` in production to the real support number.

---

## Staff Auth Login

- **Status:** Done
- **User story:** As a business owner, I can create a login account (email + password) for staff members so they can access the staff view.
- **Files:**
  - `supabase/schema/MASTER_SCHEMA.sql` — `create_staff_user` RPC function (SECURITY DEFINER)
  - `src/pages/dashboard/staff/AddStaffForm.tsx` — Collapsible email/password fields
  - `src/pages/dashboard/DashboardStaff.tsx` — Calls RPC after staff member insert
- **Notes:** Uses SECURITY DEFINER function to insert into auth.users + auth.identities + user_roles. Sets all 36 auth.users columns to match GoTrue expected format exactly (instance_id=all-zeros UUID, aud/role='authenticated', raw_app_meta_data={provider:"email"}, raw_user_meta_data with sub+email_verified, confirmation_token/recovery_token='', bcrypt cost 10). Trigger `on_auth_user_created` auto-creates profile row. If email already exists, links staff to existing auth user (ON CONFLICT DO NOTHING on user_roles). Duplicate email handled gracefully.

---

## Staff-Service Assignment

- **Status:** Done
- **User story:** As a business owner, I can assign which services each staff member can provide.
- **Files:**
  - `supabase/schema/MASTER_SCHEMA.sql` — `staff_services` table definition with RLS
  - `src/pages/dashboard/DashboardStaff.tsx` — Assignment dialog with checkboxes
  - `src/types/index.ts` — `StaffService` interface
- **Notes:** Junction table `staff_services` with `UNIQUE(staff_member_id, service_id)`. RLS: owner manages (FOR ALL), public reads for booking flow. Dashboard shows "N services" button → checkbox dialog → diff-save. Booking flow skips staff step if no staff assigned to the selected service.

---

## Subscription Plan Display & Enforcement

- **Status:** Done (display + server-side enforcement)
- **User story:** As a business owner, I can see available subscription plans, their features, usage progress, and trial status. Plans are enforced server-side.
- **Files:**
  - `src/components/landing/PricingSection.tsx` — Landing page pricing cards
  - `src/components/dashboard/settings/SubscriptionTab.tsx` — Settings subscription tab with real-time counts
  - `supabase/schema/MASTER_SCHEMA.sql` — `check_business_limits` + `check_staff_plan_limit` triggers
- **Notes:**
   - **Plans:** Gratuit (0 DZD, 100 bookings/300 queue/3 staff), Pro (4,900 DZD/mo, 500/1000/7), Business (8,900 DZD/mo, 2000/2000/unlimited)
  - **Server-side enforcement:** `check_business_limits` trigger blocks INSERT when plan limit reached. `check_staff_plan_limit` blocks staff creation. Both skip during 30-day trial (`trial_ends_at` column).
  - **No payment processing** — plans are enforced but no way to upgrade yet (Pro shows "Coming soon")
  - **Staff limit frontend enforcement:** Add button disabled when at limit with i18n message
  - **Real-time subscriptions** on SubscriptionTab re-fetch counts on booking/queue changes

---

## Unit Tests

- **Status:** Partially built
- **User story:** As a developer, I can run tests to verify core business logic.
- **Files:**
  - `src/test/setup.ts` — Test environment setup (jsdom + vitest)
  - `src/test/example.test.ts` — Placeholder test
  - `src/test/slugify.test.ts` — Slug generation tests
  - `src/test/timeSlots.test.ts` — Time slot generation tests
  - `src/test/queueSystem.test.ts` — Queue system logic tests (likely RPC/function tests)
  - `src/test/bookingOverlap.test.ts` — Booking overlap detection tests
  - `src/test/rateLimiting.test.ts` — Rate limiting tests
- **Notes:** Tests exist but coverage is minimal. Some test files may be testing database functions via Supabase client (integration tests that require a live DB). Run via `npx vitest run`.

---

## Wallet/Queue-Counter Daily Reset

- **Status:** Done (database level)
- **User story:** Queue ticket numbers reset daily and are unique per business per day.
- **Files:**
  - `supabase/schema/MASTER_SCHEMA.sql` — `generate_ticket_number()` function definition
- **Notes:** Implemented as a PostgreSQL function. Atomic via `INSERT ... ON CONFLICT DO UPDATE`. Counter date uses `CURRENT_DATE`.

---

## Booking Overlap Prevention

- **Status:** Done (database level)
- **User story:** Two clients cannot book the same staff member at the same time.
- **Files:**
  - `supabase/schema/MASTER_SCHEMA.sql` — `check_booking_overlap()` trigger function with advisory lock
- **Notes:** Uses `pg_advisory_xact_lock()` hashed from business_id + date + start_time + staff_member_id to prevent race conditions. Skips check for cancelled/no_show statuses. Supporting index `idx_bookings_overlap_check` added in Phase 3b.

---

## Rate Limiting

- **Status:** Done (database level)
- **User story:** A phone number cannot make more than 10 bookings/tickets in 10 minutes.
- **Files:**
  - `supabase/schema/MASTER_SCHEMA.sql` — `check_insert_rate_limit()` trigger function (shared between bookings and queue_tickets)
- **Notes:** Counts both bookings AND queue_tickets combined for the same phone. Uses `pg_advisory_xact_lock()` (Phase 3b) to serialize per-phone checks. Returns "Trop de demandes" error in French.
