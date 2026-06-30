# Environment Setup Guide

Complete guide for setting up Leenya in any environment.

## Required Services

| Service | Purpose |
|---------|---------|
| Supabase | Database, Auth, Realtime, Storage |

## Environment Variables

### `VITE_SUPABASE_URL`

- **What**: Your Supabase project REST API URL
- **Where to find**: Supabase Dashboard → Settings → API → Project URL
- **Format**: `https://<project-ref>.supabase.co`
- **Required**: Yes

### `VITE_SUPABASE_PUBLISHABLE_KEY`

- **What**: The anonymous (public) key for client-side access
- **Where to find**: Supabase Dashboard → Settings → API → `anon` `public` key
- **Format**: JWT string starting with `eyJ...`
- **Required**: Yes

### `VITE_SUPABASE_PROJECT_ID`

- **What**: The Supabase project reference ID
- **Where to find**: Supabase Dashboard → Settings → General → Reference ID
- **Format**: Alphanumeric string (e.g., `oqsxrnvfleaajeulyfnb`)
- **Required**: Yes

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase REST API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Anon/public key from Supabase API settings |
| `VITE_SUPABASE_PROJECT_ID` | ✅ Yes | Project reference ID (e.g., `oqsxrnvfleaajeulyfnb`) |
| `VITE_SENTRY_DSN` | ❌ No | Sentry DSN for error monitoring (skipped if absent) |
| `VITE_SUPPORT_PHONE` | ❌ No | WhatsApp support number (falls back to `213770000000`) |

## Supabase Configuration Checklist

- [x] Auth: Email/password sign-up enabled
- [ ] Auth: Phone OTP — **Disabled/Removed**. No Twilio configured.
- [x] Auth: Email confirmation — **Currently ON in Supabase Dashboard**. Frontend handles both states.
- [ ] **⚠️ Enable leaked password protection (HaveIBeenPwned)** in Supabase Auth settings
- [x] Storage: `business-assets` bucket created (public)
- [ ] **⚠️ Tighten storage bucket** — remove public SELECT policy so files can't be listed (individual URLs still work)
- [x] Realtime: Enabled on `bookings` and `queue_tickets` tables
- [x] RLS: Enabled on ALL tables (⚠️ PERMISSIVE mode — RESTRICTIVE is Phase 2b)
- [ ] Edge Functions: None deployed currently

### Phase 2a Security Changes (June 27)
- Anon direct table access revoked on `queue_tickets` and `bookings` — public data access via parameterized RPCs only
- SECURITY DEFINER EXECUTE restricted: anon can call exactly 7 public RPCs, not the full function list

### Latest DB Migrations Applied (June 30)
| Migration | Purpose |
|---|---|
| `add_queue_skip_checkin_features` | Added `checked_in_at` to queue_tickets, `is_queue_paused` to businesses, and new RPCs for skip/check-in/reassign |
| `fix_get_queue_ticket_add_checked_in` | Recreated `get_queue_ticket` RPC with `checked_in_at` and `staff_member_id` in return type |
| `fix_queue_position_conflicts` | Rewrote 3 RPCs to prevent 409 unique constraint violations on skip/send-back |

## Additional Services

| Service | Config | Notes |
|---|---|---|
| Sentry | `VITE_SENTRY_DSN` env var | Init in `src/main.tsx`, config in `src/lib/sentry.ts`. Skipped if DSN absent. |
| Playwright | `e2e/` directory | E2E tests: `npx playwright test`. CI runs via `.github/workflows/e2e.yml`. |
| CI/CD | `.github/workflows/ci.yml` | Runs eslint + tsc + vitest + build on PR/push. |

## i18n / Translation Notes

- 6 translation namespaces × 3 languages (fr/ar/en) in `src/i18n/locales/`
- Default language: French (Algeria) via `src/i18n/index.ts`
- To add a new language: create `src/i18n/locales/{lang}/` with all 6 namespace JSON files, add to `supportedLngs` in `src/i18n/index.ts`
- Arabic uses RTL layout (`dir="rtl"`) — mirrored Tailwind classes via `rtl:` variant in `tailwind.config.ts`

## Local Development Notes

- `src/integrations/supabase/client.ts` and `types.ts` are auto-generated — never edit them.
- DB schema is managed via `supabase/schema/MASTER_SCHEMA.sql` — run manually in Supabase SQL Editor.
- `.env` file is gitignored and was never committed.
- Build: `npm run build` (tsc + vite), Dev: `npm run dev`, Test: `npx vitest run`, E2E: `npx playwright test`
- Supabase MCP connected via OAuth for database inspection (uses linked project from `.env`).

## Common Setup Errors

### "Invalid API key" on page load

**Cause**: `VITE_SUPABASE_PUBLISHABLE_KEY` is missing or incorrect.
**Fix**: Copy the `anon` key from Supabase Dashboard → Settings → API.

### RLS policy errors (empty data, 403)

**Cause**: Row-Level Security is enabled but the user's role doesn't match any policy.
**Fix**: Ensure the user has a row in `user_roles` and the correct role for the operation.

### "relation does not exist"

**Cause**: Migrations haven't been applied.
**Fix**: Run `supabase/schema/MASTER_SCHEMA.sql` against your Supabase project.

### Realtime not updating

**Cause**: Table not added to the `supabase_realtime` publication.
**Fix**: Run `ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;` (and same for `queue_tickets`).
