# Leenya — Queue Management & Appointments

**Leenya** is a SaaS platform for queue management and appointment scheduling tailored to Algerian service businesses (salons, clinics, barbers, etc.).

---

## Features

- **🌐 Multilingual i18n** — French, Arabic, English. ~590 keys per language. RTL support for Arabic.
- **Public business page** — Business info, hours, booking or queue join.
- **Online booking** — Service, staff (optional), time slot, WhatsApp confirmation.
- **Queue system** — Real-time ticket, position, ETA, status.
- **Owner dashboard** — Bookings (filters, Accept/Decline, WhatsApp), live queue, CRUD services/staff, settings, analytics.
- **Subscriptions** — 3 tiers (Free/Pro/Business) with server-enforced limits + 30-day trial.
- **Staff view** — Simplified interface with email/password login.
- **WhatsApp templates** — 7 customizable message types.
- **TV display** — Full-screen queue status display.
- **Client page** — History, cancellation, reviews.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS v3 + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animations | Framer Motion |
| i18n | react-i18next (6 namespaces × 3 languages) |
| Monitoring | Sentry |
| Testing | Vitest (unit) + Playwright (E2E) |
| CI/CD | GitHub Actions |
| Fonts | Sora, JetBrains Mono, IBM Plex Sans Arabic |

---

## Project structure

```
src/
├── components/
│   ├── auth/           — Login, signup, forgot password
│   ├── booking/        — Booking flow, queue, ticket tracking
│   ├── dashboard/      — Layout, analytics, settings tabs
│   ├── landing/        — Marketing landing page
│   ├── onboarding/     — Business setup wizard
│   └── ui/             — shadcn/ui components
├── contexts/           — AuthContext (session, role)
├── hooks/              — Custom React hooks
├── lib/                — Utilities (slots, WhatsApp, wilayas, avatar)
├── pages/
│   ├── dashboard/
│   │   ├── bookings/   — Bookings (PendingApprovals, filters)
│   │   ├── queue/      — Queue (lists, dialogs)
│   │   ├── staff/      — Staff (card, form, service assignment)
│   │   └── whatsapp/   — WhatsApp templates (edit, preview)
│   └── *.tsx           — Top-level pages
└── test/               — Vitest tests
```

---

## Getting started

### Prerequisites

- Node.js 18+
- npm or bun
- A Supabase project (free tier works)

### Installation

```sh
git clone <your-repo>
cd leenya
npm install
```

### Environment variables

Create a `.env` file at the root:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

### Database

Run `supabase/schema/MASTER_SCHEMA.sql` in your Supabase project's SQL editor. This file contains all tables, indexes, RLS policies, triggers, and functions — the single source of truth.

### Development

```sh
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build
npx tsc --noEmit     # TypeScript check only
npx vitest run       # Unit tests
npx playwright test  # E2E tests
```

---

## Documentation

All project documentation lives in the `DOCS/` folder:

| File | Content |
|---------|---------|
| `AI_CONTEXT.md` | Full AI overview — file map, DB, design, sessions |
| `ARCHITECTURE.md` | Stack, structure, data flow, auth, routing, schema |
| `CLAUDE.md` | Quick onboarding for new developers/AI |
| `DESIGN.md` | Design system — colors, typography, spacing, components |
| `ENVIRONMENT.md` | Setup, env vars, Supabase checklist |
| `FEATURES.md` | All features — status, files, notes |
| `NEXT.md` | Upcoming steps by priority (P0 → P5) |
| `PROJECT_STATUS.md` | % completion by domain, flows, tech debt |
| `SYSTEM_INSTRUCTIONS.md` | Conventions, rules, build, DB, AI behavior |

---

## Contact

WhatsApp support: configurable via `VITE_SUPPORT_PHONE` (fallback `213770000000`)
Email: sifeddine.meb96@gmail.com

## License

Private project — All rights reserved.
