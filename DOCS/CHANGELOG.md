# Changelog

*Condensed session history. Each entry covers what changed and why from a business perspective.*

---

## 2026-07-02 — Full Project Audit + Documentation Rebuild

**What happened:** Every factual claim in every doc was checked against the live database, Vercel deployment, and source code. Found and fixed contradictions, removed dead code, and rebuilt DOCS/ from scratch.

| What changed | Why |
|---|---|
| Removed 5 unused packages | `@hookform/resolvers`, `geist`, `zod`, `@tailwindcss/typography`, `@testing-library/react` were imported nowhere |
| Added missing database trigger for role updates | `user_roles` table wasn't auto-updating its timestamp |
| Added 4 missing security policies | Anon users couldn't look up or cancel their own bookings/queue tickets |
| Added staff avatar cache fix | Staff photos weren't set to `cacheControl: "no-cache"` like business logos |
| Added phone number to local `.env` | The floating WhatsApp button was broken in local development |
| Reduced 16 doc files to 3 | Old docs had contradictions (key counts, package status, env history, font names) |
| Created AUDIT_FINDINGS.md | Full log of every claim and how it was verified, for future reference |

---

## 2026-07-01 — Bugfix Round 3

| What changed | Why |
|---|---|
| Fixed CSP manifest-src | `'self'` was dropped when `vercel.com` was added — browsers blocked the manifest |
| Created `update_ticket_service` RPC | Anon users getting 403 errors when changing their queue ticket's service |
| Fixed queue timezone drift | Tickets created after midnight Algeria time were getting wrong dates |
| Fixed auth redirect | Added fallback if session resolves before role is set in the database |
| Fixed ambiguous column in `get_queue_context` | Query had ambiguous `ticket_number` between function param and table column |

---

## 2026-06-30 — State Stability, Queue Edge Cases, Schema Backport

| What changed | Why |
|---|---|
| Auth token refresh no longer resets dashboard | Switching accounts caused a full page unmount |
| Profile name from database | Dashboard was showing email prefix instead of the real name |
| Time-of-day greetings | Dashboard now shows "Good morning/afternoon/evening" in 3 languages |
| Cover preview in settings | Business cover images now show the same size as profile photos |
| Revenue from queue tickets | Analytics now counts completed queue tickets' services revenue |
| Cache busting on uploads | Browser wasn't refreshing business images after upload |
| Seeded gradient covers | Replaced pixel-art avatars with SVG gradients for a cleaner look |
| Remove cover/logo button | Owners can now delete their uploaded images |
| Staff picker in the change-service dialog | Changing service also lets you change the assigned staff member |
| Skip button removed | It was moving tickets one position instead of to the end — replaced with "Send back to queue" |
| Check-in button | Staff can mark customers as arrived; customers see a green checkmark |
| Queue pause toggle | Owners can pause the queue; customers see an amber notice |
| StatCard ref warning fixed | Renamed `ref` to `sectionRef` to avoid React warning |
| Staff onboarding redirect | New staff were sent to onboarding instead of the correct page |
| Schema backport from live DB | 5 missing RPCs and 2 missing columns added to MASTER_SCHEMA.sql |
| Full doc audit against code | Fixed wrong table names, missing columns, wrong routes, stale descriptions |

---

## 2026-06-29 — Queue Management Overhaul

| What changed | Why |
|---|---|
| Join queue includes paused check | Customers can't join when the queue is paused |
| Skip + Send Back 409 conflict fixed | 3 RPCs rewritten to handle stale positions before renumbering |
| Recalculate queue positions | Atomic renumbering 1..N after any status change |
| Skip is now a bounded swap with next waiting ticket | Replaced the broken move-to-end implementation |

---

## 2026-06-28 — Analytics & Dashboard

| What changed | Why |
|---|---|
| Full analytics section built | Charts, CSV export, peak hours grid, staff performance |
| French analytics translations missing | 55 keys not translated — gap identified |
| Booking flow stabilized | Multi-step appointment wizard with time slot generation |

---

## 2026-06-27 — Pricing & Plan Enforcement

| What changed | Why |
|---|---|
| Pricing changed: Free (100/300/3), Pro 4,900 DZD, Business 8,900 DZD | Adjusted for market |
| Plan limits enforced via triggers | Monthly caps on bookings, queue tickets, and staff |
| Trial window added | 30-day free trial with no limits |
| WhatsApp templates (7 types) | Auto-generated booking confirmations, reminders, queue alerts |

---

## 2026-06-26 — Queue & Auth Hardening

| What changed | Why |
|---|---|
| Double-queue-join prevention | Customers couldn't join the same queue twice in one day |
| Missing indexes added | 8 performance indexes for booking/queue queries |
| Storage path scoping | Files upload to business-specific paths only |
| Landing page feedback form | Users can submit bug reports and feature requests |
| ESLint suppressions reduced | 36 `no-explicit-any` violations fixed |

---

## 2026-06-25 — Full Audit & Fix

| What changed | Why |
|---|---|
| Storage RLS policies fixed | Anyone could read all uploaded files |
| Plan enforcement missing | No limits were being applied |
| PII leak in queue_tickets | Anon users could see all waiting tickets |
| 2 CRITICAL, 5 HIGH findings resolved | Production security audit |
| `@tanstack/react-query` removed | Unused package — eliminated from deps |

---

## 2026-06-24 — Core Queue & Booking

| What changed | Why |
|---|---|
| Queue flow (join, call, complete, cancel) | Walk-in customers can join and track their place |
| Staff view with ticket management | Staff see only their assigned customers |
| Booking flow (multi-step wizard) | Customers can book online by service/staff/datetime |
| Business public page | Each business gets a public profile with services and booking |

---

## 2026-06-23 — Auth & Setup

| What changed | Why |
|---|---|
| Supabase auth integrated | Email/password login with magic link support |
| User roles (owner, staff, client) | Role-based access control |
| Onboarding wizard | New owners guided through business setup in 5 steps |
| Dashboard shell with sidebar | Owner dashboard with navigation |

---

## 2026-03-08 — Foundation

| What changed | Why |
|---|---|
| Vite + React project scaffolded | Project creation |
| shadcn/ui components installed | UI component library |
| i18n framework set up | French, English, Arabic support |
| Tailwind CSS configured | Styling foundation |


---

## 2026-07-03 � Full Repositioning

| What changed | Why |
|---|---|
| Pricing collapsed from 3 tiers to 2 (Free + 1,990 DZD/mo) | Simpler choice, better value. Pro and Business tiers removed � now one paid plan covers everything |
| Bookings now open by default on the public page | Clinics and salons rely on appointments first. Queue moved to a secondary tab |
| Dashboard nav reordered | Bookings now appear before Queue in the sidebar and mobile nav |
| WhatsApp floating button on every business page | Visitors can message the business directly from their bio-link page |
| Landing page copy rewritten English-primary | New hero: &quot;Your booking page. In your bio.&quot; Focus on no-show reduction and appointments |
| All pricing and subscription text updated in French and Arabic | Translations match the new 2-tier model
