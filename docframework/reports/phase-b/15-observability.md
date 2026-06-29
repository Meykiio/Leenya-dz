# Role 15 — Observability & Monitoring

**Date:** 2026-06-29  
**Auditor:** Role 15  

---

## Observability Stack Assessment

| Component | Status | Detail |
|---|---|---|
| Error tracking | BROKEN | Sentry v10.62.0 installed, initialized. But `VITE_SENTRY_DSN` absent from `.env`. Runtime no-op. |
| Unhandled rejection capture | MISSING | No `window.onunhandledrejection` or `window.onerror` handler. Promise rejections are silent. |
| React error boundary + Sentry | MISSING | `ErrorBoundary.tsx:26` only `console.error` in dev — does NOT call `Sentry.captureException`. |
| Uptime monitoring | MISSING | No Pingdom, Better Uptime, Checkly, or Vercel web analytics. |
| Edge Function errors | N/A | No Edge Functions deployed. |
| Alerting | MISSING | Zero alert rules — no error rate spikes, no auth failure spikes, no downtime alerts. |

---

## Silent Failure Inventory

1. **`AuthContext.tsx:59-61`** — `catch { setRole(null); }` — **No logging, no toast.** Auth silently degrades.
2. **`AppointmentFlow.tsx:201-208`** — Booking insert error → toast only. Error object discarded.
3. **`QueueFlow.tsx:221-225`** — `generate_ticket_number` RPC error → toast only. Error discarded.
4. **`QueueFlow.tsx:250-252`** — Queue ticket insert error → toast only.
5. **`BookingTrack.tsx:53-54`** — `cancel_booking_by_token` RPC error → toast only.
6. **`DashboardQueue.tsx:182-184`** — `generate_ticket_number` RPC error → toast only.
7. **`DashboardBookings.tsx:171-172`** — `updateStatus` error → toast only.
8. **`DashboardBookings.tsx:264-265`** — `createBooking` error → toast only.
9. **`StaffView.tsx:129-130`** — `updateTicketStatus` error → toast only.
10. **`StaffView.tsx:159-160`** — `updateBookingStatus` error → toast only.
11. **`DashboardServices.tsx:95-96`** — `deleteService` error → toast only.

All paths discard the error object after showing a user-facing toast.

---

## Logging Structure

| Aspect | Finding |
|---|---|
| Structured (JSON) | No — all `console.error("label:", error)` plain text |
| Timestamps | No — relying on browser console timestamp |
| Log levels | No — all `console.error` (no info/warn/debug) |
| Context metadata | No — no user ID, session ID, request ID in logs |
| PII-free | Yes — generic context labels only |
| Dev-only vs prod | Mixed — ~40% gated by `import.meta.env.DEV`, ~60% unconditional |

**76 total `console.*` calls.** 0 structured. 0 to log aggregator. 0 carry correlation IDs.

---

## Correlation: User Error → Log Entry?

**No.** No mechanism exists:
- No Sentry session ID (disabled)
- No request tracing
- No user-facing error reference
- `Sentry.setUser()` never called
- `Sentry.captureException()` never called

A user saying *"I got an error when booking"* provides zero actionable signal.

---

## Findings

| ID | Severity | Finding | File:Line |
|---|---|---|---|
| OBS-001 | **SEV-1** | Sentry installed but DSN not configured — runtime no-op | `src/lib/sentry.ts:13` |
| OBS-002 | **SEV-1** | `fetchRole` silently swallows errors — auth degrades invisibly | `AuthContext.tsx:59-61` |
| OBS-003 | **SEV-1** | Zero alerting rules configured | — |
| OBS-004 | **SEV-1** | No business event logging for transactions | — |
| OBS-005 | **SEV-1** | No way to correlate user reports to log entries | — |
| OBS-006 | **SEV-2** | ErrorBoundary does not call Sentry | `ErrorBoundary.tsx:26` |
| OBS-007 | **SEV-2** | `Sentry.captureException()` never called | — |
| OBS-008 | **SEV-2** | All 76 console logs unstructured plain text | All `console.*` |
| OBS-009 | **SEV-2** | Auth events never logged | `LoginForm.tsx` etc. |
| OBS-010 | **SEV-2** | 11+ catch blocks discard error object | See inventory |
| OBS-011 | **SEV-3** | ~40% console.error gated by DEV — silent in prod | Multiple files |
| OBS-012 | **SEV-3** | `ctx.resume().catch(() => {})` swallows audio resume failures | `QueueDisplay.tsx:36` |
