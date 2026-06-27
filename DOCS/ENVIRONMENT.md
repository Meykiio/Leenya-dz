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

## Supabase Configuration Checklist

- [x] Auth: Email/password sign-up enabled
- [ ] Auth: Phone OTP — **Disabled/Removed**. No Twilio configured. Phone tab deleted from LoginForm.
- [x] Auth: Email confirmation — **Currently ON in Supabase Dashboard**. Frontend handles both states (auto-login when OFF).
- [ ] **⚠️ Phase 2b:** Enable leaked password protection (HaveIBeenPwned check) in Supabase Auth settings
- [x] Storage: `business-assets` bucket created (public)
- [ ] **⚠️ Phase 2b:** Tighten storage bucket — remove public SELECT policy (files still accessible via public URLs)
- [x] Realtime: Enabled on `bookings` and `queue_tickets` tables
- [x] RLS: Enabled on ALL tables (⚠️ PERMISSIVE mode — RESTRICTIVE is Phase 2b)
- [ ] Edge Functions: None deployed currently

### Phase 2a Security Changes
- Anon direct table access revoked on `queue_tickets` and `bookings` — public data access via parameterized RPCs only
- SECURITY DEFINER EXECUTE restricted: anon can call exactly 7 public RPCs, not the full function list

## Local Development Notes

- `src/integrations/supabase/client.ts` and `types.ts` are auto-generated — never edit them.
- DB schema is managed via `supabase/schema/MASTER_SCHEMA.sql` — run manually against your Supabase project.
- `.env` file is committed to repo (contains real anon key — public by design but should be gitignored). ⚠️ Phase 2b: purge from git history with BFG.

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
