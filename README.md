# Leenya

> Queue and appointment management platform for Algerian businesses.

## What is Leenya?

Leenya lets local businesses (barbershops, clinics, salons, etc.) manage walk-in queues and appointment bookings from a single dashboard. Clients join queues or book appointments through a public page—no app install required. Business owners get real-time visibility, analytics, and WhatsApp-based communication tools.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 18.3 / 5.8 |
| Build | Vite | 5.4 |
| Backend | Supabase (PostgreSQL, Realtime, Auth, Storage) | 2.98 |
| Styling | Tailwind CSS + shadcn/ui | 3.4 |
| Charts | Recharts | 2.15 |
| Animations | Framer Motion | 12.35 |
| Forms | React Hook Form + Zod | 7.61 / 3.25 |
| Icons | lucide-react | 0.462 |
| Fonts | Sora (display), JetBrains Mono (mono), IBM Plex Sans Arabic (Arabic) | — |
| Deployment | Lovable Cloud | — |

## Project Structure

```
src/
├── components/
│   ├── auth/           # Login form, OTP, password reset, ProtectedRoute
│   ├── booking/        # Appointment flow, queue flow, ticket tracker, reviews
│   ├── dashboard/      # Owner dashboard layout, analytics, settings tabs
│   ├── landing/        # Landing page sections (hero, pricing, testimonials)
│   ├── onboarding/     # Multi-step business setup wizard
│   └── ui/             # shadcn/ui primitives (button, card, dialog, etc.)
├── contexts/           # AuthContext (session, role, loading state)
├── hooks/              # useBusinessInfo, use-mobile, use-toast
├── lib/                # Utilities: slugify, timeSlots, whatsapp, wilayas
├── pages/
│   ├── dashboard/      # Dashboard sub-pages (bookings, queue, services, etc.)
│   └── *.tsx           # Top-level pages (Landing, Login, StaffView, etc.)
├── integrations/
│   └── supabase/       # Auto-generated client.ts and types.ts
└── test/               # Vitest test files
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```sh
git clone <YOUR_GIT_URL>
cd leenya
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

### Running Locally

```sh
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run test       # Run tests
npm run test:watch # Watch mode
```

### Database Setup

The database schema is managed via `supabase/schema/MASTER_SCHEMA.sql` (single source of truth). Run this on any fresh Supabase project to create all tables, indexes, RLS policies, triggers, and functions.

## Deployment

Open [Lovable](https://lovable.dev) → Share → Publish. The app is live at [leenya.lovable.app](https://leenya.lovable.app).

For custom domains: Project → Settings → Domains → Connect Domain.
