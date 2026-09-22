# Leenya — Business Overview

*Last verified: 2026-09-22 after full remediation. This document describes the system as it exists today.*

## What This Is

Leenya is a web app that helps small businesses in Algeria manage appointments and walk-in queues. Think of it as a digital reception desk: customers can book time slots or join a queue, staff see who's next on their screen, and the business owner gets a dashboard with all the controls.

Three types of people use it:
- **Customers** — walk in or book online without creating an account
- **Staff** — see their assigned tickets, call customers forward, mark them done
- **Owners** — manage services, staff schedules, queue settings, and see analytics

There's also a **TV display mode** that shows the queue on a screen in the waiting area.

## What Changed on 2026-09-21-22 (Full Remediation)

The platform was hardened across 10 areas after a full audit found security, concurrency, and reliability gaps. Key improvements:

- **Customer data is no longer publicly readable.** Anonymous users interact only through validated server commands with private capability tokens.
- **Double-booking is now impossible.** A business/day-level lock serializes booking creation; the overlap check runs with full database visibility.
- **Queue operations are race-free.** Every position change takes a shared per-business/day lock; cancelled tickets automatically lose their position.
- **22 safety triggers restored** that were silently lost in a July database restore: plan limits, state machines, past-booking prevention, business-hours validation.
- **Push notifications are server-managed.** The Edge Function looks up stored subscriptions after verifying the caller is authorized; dead subscriptions are cleaned up automatically.
- **Uploads are capped** at 5 MB with image-only MIME types.
- **Service worker no longer caches authenticated responses**, preventing cross-user data leakage on shared devices.
- **Every public page has error/retry states.** Customers see what went wrong and can retry instead of staring at a blank screen.
- **Accessibility improvements**: form labels connected to inputs, tab roles, live regions for queue position changes, reduced-motion support, safe-area padding on mobile.

## Pricing Plans

| Plan | Monthly Price | Monthly Appointments | Monthly Queue Tickets | Staff Limit |
|---|---|---|---|---|
| Free | 0 DZD | 100 | 300 | 3 |
| Paid | 1,990 DZD | Unlimited | Unlimited | Unlimited |

New businesses get a 30-day trial with no limits. After trial, limits apply based on the plan. Payment integration is planned but not implemented.

## What Needs Attention Next

1. **Payment integration** — let businesses upgrade from free to paid
2. **Lazy-loaded locales** — reduce initial bundle size by loading only the active language
3. **Authenticated E2E fixtures** — test owner/staff flows with isolated test data
4. **Sentry verification** — confirm errors actually reach Sentry

## Live URLs

- **Production app:** https://leenya-dz.vercel.app
- **Repository:** https://github.com/Meykiio/Leenya-dz
- **Supabase project:** `ieuhknpdhjvuuwtpsguw` (EU-West-3)

## For AI Agents Reading This

If you're an AI agent working on this project, read `DOCS/ARCHITECTURE.md` for the full technical reference and `DOCS/DATABASE_BASELINE.md` for the current database state. This document reflects verified reality as of September 22, 2026.
