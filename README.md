# Leenya

**Booking & queue management for Algerian service businesses.**

Leenya helps salons, clinics, barbershops, and other walk-in service businesses replace paper waiting lists and phone-based scheduling with a real-time digital system. Customers join from their phone, staff serve from a dedicated view, and owners get analytics — no app install required.

## Features

### For Customers
- **Public business page** — services, hours, reviews, booking + queue tabs
- **Queue join** — take a ticket with a private tracking key, watch your position in real time
- **Online booking** — 5-step flow (service → staff → date/time → details → confirmation)
- **Ticket tracking** — live position, status changes, check-in, cancel — all via your private key
- **Booking tracking** — follow your reservation status, cancel online
- **WhatsApp integration** — every notification links to WhatsApp

### For Staff
- **Staff view** — see assigned tickets, call next, mark complete, no-show
- **Push notifications** — customers get notified when it's their turn

### For Owners
- **Dashboard** — bookings, queue, services, staff, analytics, settings
- **Realtime** — live queue positions, booking status updates via Supabase Realtime
- **Analytics** — bookings, queue flow, peak hours, popular services, revenue trends
- **Subscriptions** — free tier (100 bookings/mo, 300 tickets/mo, 3 staff) with upgrade path

---

## Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| **i18n** | i18next — English, French, Arabic (RTL) |
| **Testing** | Vitest (unit) + Playwright (E2E) + pgTAP (database) |
| **CI/CD** | GitHub Actions |
| **Deploy** | Vercel |

### Security Model

| Actor | What they can do | How |
|---|---|---|
| Anonymous visitors | Read public business info, join queue, book, track/cancel via private token | Scoped SECURITY DEFINER commands with capability tokens |
| Authenticated clients | See own bookings, submit reviews | RLS policies |
| Staff | See their queue, update ticket status | RLS + scoped RPCs |
| Owners | Full business management | RLS + scoped RPCs |
| Superadmin | Everything | RLS policies with `is_superadmin()` |

Every table has RLS enabled. Every privileged function has explicit authorization checks. Every anonymous write goes through a validated server command — no direct table access from the browser.

### Key Design Decisions
- **Single-file schema** — `supabase/schema/MASTER_SCHEMA.sql` is the source of truth
- **Capability tokens** — every customer ticket/booking gets a UUID token; tracking and actions are authorized by possession of the token, not by row IDs
- **DB-enforced state machines** — booking and queue status transitions are enforced at the database level
- **Advisory locks** — booking overlap check and queue position changes use per-business/date locks to prevent race conditions
- **Server-side push fanout** — push notifications are sent by the Edge Function, which looks up subscriptions from the database after verifying the caller's authorization

---

## Quick Start

### Prerequisites
- Node.js 22+
- A [Supabase](https://supabase.com) project

### Setup

```sh
git clone https://github.com/Meykiio/Leenya-dz.git
cd Leenya-dz
npm ci
```

Create `.env`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
VITE_SUPPORT_PHONE=<optional>
VITE_SENTRY_DSN=<optional>
VITE_VAPID_PUBLIC_KEY=<optional, for push notifications>
```

### Database

1. Open your Supabase project's SQL editor
2. Run `supabase/schema/MASTER_SCHEMA.sql`
3. Enable Realtime on: `queue_tickets`, `bookings`, `whatsapp_templates`, `businesses`
4. Create a `business-assets` storage bucket (public)

### Run

```sh
npm run dev          # → http://localhost:5173
npm run build        # Production build
npx tsc --noEmit     # Type-check only
npx vitest run       # Unit tests (42 tests)
npx playwright test  # E2E (50 tests, requires running app or PLAYWRIGHT_BASE_URL)
```

---

## Project Structure

```
src/
├── components/
│   ├── auth/           — Login, signup, forgot password, protected routes
│   ├── booking/        — AppointmentFlow, QueueFlow, TicketTracker, steps
│   ├── dashboard/      — Layout, analytics components, settings tabs
│   ├── landing/        — Hero, features, pricing, FAQ, footer
│   ├── onboarding/     — Business setup wizard
│   └── ui/             — shadcn/ui primitives (Radix-based)
├── contexts/           — AuthContext (session + role)
├── hooks/              — useBusinessInfo, useLanguage, useWebPush, useWhatsAppTemplates
├── i18n/               — 6 namespaces × 3 locales (EN/FR/AR)
├── lib/                — TimeSlots, WhatsApp URLs, Phone validation, Wilayas, Sentry
├── pages/              — Landing, BusinessPublic, QueuePublic, StaffView, dashboard/*
├── types/              — Booking, Business, Staff, Auth
└── integrations/supabase/ — Client singleton

supabase/
├── schema/MASTER_SCHEMA.sql   — Single source of truth
├── migrations/                — Applied, tracked changes
├── functions/send-push/       — Web Push Edge Function
├── tests/database/            — pgTAP RLS + function grant tests
└── config.toml
```

---

## Security

All tables use Row Level Security. Anonymous customers never access tables directly — they interact through SECURITY DEFINER functions that:

1. Validate every input (business existence, service/staff ownership, phone format, capacity limits)
2. Issue capability tokens for tracking/cancellation
3. Enforce business settings (paused queues, walk-ins disabled, capacity limits)
4. Serialize position mutations with advisory locks
5. Enforce per-plan usage limits (bookings/tickets/month)

See `supabase/tests/database/` for pgTAP tests that verify these guarantees.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Contact

- **GitHub:** [Meykiio](https://github.com/Meykiio)
- **Email:** sifeddine.meb96@gmail.com
