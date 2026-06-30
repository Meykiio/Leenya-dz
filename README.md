# Leenya

**Queue management & appointment scheduling for Algerian service businesses.**

Leenya helps salons, clinics, barbers, and other service businesses replace paper waiting lists and phone-based booking with a real-time digital system. Customers join from their phone, staff serve from a dedicated view, and owners get analytics — no app install required.

---

## Features

### For Business Owners
- **Dashboard** — Real-time overview of bookings, queue, revenue, and staff activity with analytics and trend charts
- **Booking management** — Accept/decline pending bookings, reschedule, cancel, WhatsApp integration for each action
- **Queue management** — Live waiting list, call next, skip, send back to queue, check-in tracking, pause queue
- **Service catalog** — CRUD services with duration, price, display order, active/inactive toggle
- **Staff management** — Add staff with email/password login, assign services, manage avatars
- **Settings** — Business info, hours (per-day with open/close), booking preferences, subscription, WhatsApp templates
- **Subscriptions** — 3-tier (Free/Pro/Business) with server-enforced limits and 30-day trial

### For Staff
- **Staff view** — Simplified interface: see assigned/shop queue, call customers, mark complete, skip, check-in
- **Status actions** — Call, start service, complete, no-show, send back to queue
- **Ticket tracking** — See estimated wait, customer name, service, check-in indicator

### For Customers
- **Public business page** — Business info, hours, reviews, active announcements
- **Queue join** — Select service, optionally pick staff, enter name/phone, get ticket with live position
- **Online booking** — 5-step flow: service → staff → date/time → details → confirmation via WhatsApp
- **Ticket tracker** — Live position, queue state (waiting/called/in_service/done), ETA, check-in button
- **Booking tracker** — Track booking by token, cancel online, submit reviews after service
- **TV display** — Full-screen queue status for waiting areas

### Cross-Cutting
- **Multilingual** — French (default), Arabic (full RTL), English. ~992 keys per language across 6 namespaces
- **Realtime** — Queue positions, ticket status, booking updates pushed instantly via Supabase Realtime
- **WhatsApp templates** — 7 customizable message types (booking confirmation, reminders, queue ticket, etc.)
- **Security** — Row-level security on all tables, SECURITY DEFINER RPCs for public access, rate limiting, state machine enforcement at DB level

---

## Tech Stack

| Category | Choice |
|---|---|
| **Framework** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS v3 + shadcn/ui (~50 components) |
| **Backend** | Supabase (PostgreSQL 15, Auth, Realtime, Storage) |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **i18n** | react-i18next (6 namespaces × 3 locales) |
| **Monitoring** | Sentry |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel |
| **Fonts** | Sora, JetBrains Mono, IBM Plex Sans Arabic |

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser     │────▶│  Vite + React    │────▶│  Supabase       │
│  (Desktop/   │     │  PWA-ready       │     │  PostgreSQL     │
│   Mobile)    │     │                  │     │  Auth           │
└─────────────┘     │  i18n (fr/ar/en)  │     │  Realtime       │
                    │  shadcn/ui        │     │  Storage        │
                    └──────────────────┘     └─────────────────┘
```

### Key Design Decisions
- **Single-file schema** — `supabase/schema/MASTER_SCHEMA.sql` is the single source of truth. Run this on any fresh Supabase project to reproduce the full database.
- **RLS-first security** — Every table has row-level security. Public data exposed through SECURITY DEFINER RPCs that never leak PII.
- **DB-enforced state machines** — Booking and queue ticket state transitions are enforced at the database level (triggers prevent invalid transitions).
- **Concurrency-safe** — Advisory locks prevent race conditions on booking overlap, rate limits, and plan limits.

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project ([free tier](https://supabase.com))

### Setup

```sh
git clone https://github.com/your-org/leenya
cd leenya
npm install
```

Create `.env`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
VITE_SENTRY_DSN=<optional>
VITE_SUPPORT_PHONE=<optional, default 213770000000>
```

### Database

1. Open your Supabase project's SQL editor
2. Run the contents of `supabase/schema/MASTER_SCHEMA.sql`
3. Enable Realtime on these tables: `bookings`, `queue_tickets`, `businesses`, `whatsapp_templates`
4. Create a `business-assets` storage bucket (public)

### Run

```sh
npm run dev          # → http://localhost:5173
npm run build        # Production build
npx tsc --noEmit     # Type-check only
npx vitest run       # Unit tests (32+ tests)
```

---

## Project Structure

```
src/
├── components/
│   ├── auth/           — Login, signup, forgot password
│   ├── booking/        — AppointmentFlow, TicketTracker, QueueFlow
│   ├── dashboard/      — DashboardLayout, StatsCards, sub-pages
│   ├── landing/        — Hero, Features, Pricing, Testimonials, Footer
│   ├── onboarding/     — 4-step business setup wizard
│   └── ui/             — shadcn/ui (~50 Radix-based components)
├── contexts/
│   └── AuthContext.tsx  — Session, role, refresh, sign-out
├── hooks/              — useBusinessInfo, useWhatsAppTemplates, useLanguage
├── i18n/
│   ├── locales/
│   │   ├── en/         — 6 JSON namespace files
│   │   ├── fr/         — 6 JSON namespace files
│   │   └── ar/         — 6 JSON namespace files (RTL)
│   └── index.ts
├── lib/                — Time slots, WhatsApp URLs, wilayas, avatar gen
├── pages/
│   ├── dashboard/
│   │   ├── bookings/   — PendingApprovals, BookingRow, filters
│   │   ├── queue/      — WaitingList, ServingSection, dialogs
│   │   ├── staff/      — StaffCard, ServiceAssignmentDialog
│   │   └── whatsapp/   — Template editor, preview, test send
│   ├── BookingTrack.tsx
│   ├── MyBookings.tsx
│   ├── QueueDisplay.tsx
│   ├── StaffView.tsx
│   └── ...page components
├── types/              — booking.ts, business.ts, staff.ts, auth.ts
└── integations/supabase/client.ts

supabase/
├── schema/
│   └── MASTER_SCHEMA.sql   — Single source of truth (tables, RLS, functions, triggers)
├── seed/
│   └── seed.sql            — Demo data
├── tests/
│   └── rls_policies.sql    — Security assertion tests
└── config.toml             — CLI-managed config
```

---

## Docs

All documentation lives in `DOCS/`:

| File | What it covers |
|---|---|
| `ARCHITECTURE.md` | Stack, data flow, auth flow, routing, full schema overview |
| `AI_CONTEXT.md` | Full project context for AI sessions — file map, DB, design, session history |
| `CLAUDE.md` | 30-second onboarding for new developers |
| `DESIGN.md` | Design tokens: colors, typography, spacing, dark mode, component patterns |
| `ENVIRONMENT.md` | Full setup guide, env vars, DB migrations, Supabase checklist |
| `FEATURES.md` | Every feature with status, files, and implementation notes |
| `NEXT.md` | Priority-ordered roadmap (P0–P5) |
| `PROJECT_STATUS.md` | % completion by domain, flow, and tech debt |
| `SYSTEM_INSTRUCTIONS.md` | Dev conventions, build rules, DB patterns |
| `CHANGELOG.md` | Full session-by-session changelog |

---

## Deployment

### Vercel (recommended)

```sh
npm i -g vercel
vercel --prod
```

Set all `VITE_*` environment variables in the Vercel project dashboard.

### Supabase Checklist

Before going live:
- [ ] Enable email confirmation in Auth settings (production)
- [ ] Rate limits: adjust `check_insert_rate_limit` trigger defaults if needed
- [ ] Storage: `business-assets` bucket created and public
- [ ] Realtime: enabled for `bookings`, `queue_tickets`, `businesses`, `whatsapp_templates`
- [ ] Review RLS policies in MASTER_SCHEMA.sql (all tables should have RLS enabled)
- [ ] Set `VITE_SENTRY_DSN` for error monitoring

---

## Contributing

This is a private project. For bug reports or feature requests, contact the maintainer.

---

## Contact

- **Email:** sifeddine.meb96@gmail.com
- **Support WhatsApp:** configurable via `VITE_SUPPORT_PHONE`

---

## License

Private — All rights reserved.
