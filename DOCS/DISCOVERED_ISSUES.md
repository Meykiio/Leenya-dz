# Discovered Issues — OpenCode Audit Session
Started: 2026-06-30

## Doc Contradictions

| ID | Description | Finding | Resolution |
|----|-------------|---------|------------|
| DC-01 | Avatar upload: AUDIT.md says FIXED, NEXT.md says "dropped" | Upload RLS policy EXISTS (authenticated owners can INSERT into business-assets), but lacks path scoping (any owner can write to any path). NEXT.md "dropped" is stale — basic upload works. AUDIT.md "FIXED" is slightly overstated (no path validation). | Phase 2: NEXT.md → update status |
| DC-02 | Pricing: FEATURES.md says 2,990/5,990 DZD, target is 4,900/8,900 DZD | Confirmed old values in FEATURES.md:298 | Phase 4 |
| DC-03 | Primary color: AI_CONTEXT.md says blue, DESIGN.md says purple | `--primary: 260 97% 61%` = purple. Both `--primary` and `--accent` are the same purple value. AI_CONTEXT.md is wrong. | Phase 2: fix AI_CONTEXT.md |
| DC-04 | @tanstack/react-query unused but still in package.json | Confirmed: zero imports in src/ of react-query, useQuery, useMutation, QueryClient, @tanstack. Dead weight. | Phase 3: npm uninstall |
| DC-05 | ResetPassword flow — FEATURES.md says wired, NEXT.md says needs verify | Fully wired: ForgotPassword → resetPasswordForEmail with /reset-password redirect. ResetPassword → PASSWORD_RECOVERY listener → updateUser → navigate /login. ✓ | No action needed — mark NEXT.md as verified |

## Supabase Audit
- 13 tables confirmed, all RLS-enabled (profiles, user_roles, businesses, business_hours, services, staff_members, staff_services, bookings, queue_counters, queue_tickets, reviews, feedback, whatsapp_templates)
- 46 RLS policies listed, all PERMISSIVE mode
- 5 queue RPCs confirmed: check_in_ticket, reassign_queue_ticket, recalculate_queue_positions, send_ticket_back_to_queue, skip_queue_ticket
- checked_in_at on queue_tickets ✓, is_queue_paused on businesses ✓
- Storage bucket `business-assets` public, INSERT policy for authenticated owners exists

## ESLint Suppressions (4 files)
- src\pages\Admin.tsx:52 — no-explicit-any
- src\pages\QueueDisplay.tsx:22 — no-explicit-any
- src\pages\QueueDisplay.tsx:85 — no-explicit-any
- src\pages\ResetPassword.tsx:40 — no-explicit-any
- ESLint run with --max-warnings 0 passes clean (no errors, no warnings).

## Security Findings
(Phase 6)
