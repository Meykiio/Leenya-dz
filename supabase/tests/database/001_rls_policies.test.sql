-- =============================================================================
-- 001_rls_policies.test.sql
-- pgTAP tests for the core Row Level Security model.
--
-- Run via: supabase test db
-- =============================================================================

BEGIN;

SELECT plan(11);

-- -----------------------------------------------------------------------------
-- Fixtures: create auth users, owner/staff roles, one active + one inactive
-- business, one staff record. Everything lives in one transaction and rolls
-- back afterwards, so no test data is ever left behind.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__rls_test_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin    UUID;
  v_staff    UUID;
  v_customer UUID;
  v_business UUID;
BEGIN
  -- auth.users rows (the on_auth_user_created trigger auto-creates profiles)
  INSERT INTO auth.users (id, email, encrypted_password, aud, role,
                          email_confirmed_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'rls-test-admin@example.test', 'x', 'authenticated', 'authenticated', now(), now(), now())
  RETURNING id INTO v_admin;

  INSERT INTO auth.users (id, email, encrypted_password, aud, role,
                          email_confirmed_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'rls-test-staff@example.test', 'x', 'authenticated', 'authenticated', now(), now(), now())
  RETURNING id INTO v_staff;

  INSERT INTO auth.users (id, email, encrypted_password, aud, role,
                          email_confirmed_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'rls-test-customer@example.test', 'x', 'authenticated', 'authenticated', now(), now(), now())
  RETURNING id INTO v_customer;

  PERFORM set_config('rls_test.admin_id',    v_admin::TEXT,    false);
  PERFORM set_config('rls_test.staff_id',    v_staff::TEXT,    false);
  PERFORM set_config('rls_test.customer_id', v_customer::TEXT, false);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin, 'superadmin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_staff, 'staff'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_customer, 'client'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- One active business owned by the admin
  INSERT INTO public.businesses (owner_id, name, slug, is_active)
  VALUES (v_admin, 'RLS Test Salon', 'rls-test-salon', true)
  RETURNING id INTO v_business;

  PERFORM set_config('rls_test.business_id', v_business::TEXT, false);

  -- One inactive business: anon must NOT see it
  INSERT INTO public.businesses (owner_id, name, slug, is_active)
  VALUES (v_admin, 'RLS Test Inactive', 'rls-test-inactive', false);

  -- Staff member record for the staff user
  INSERT INTO public.staff_members (business_id, profile_id, display_name, is_active)
  VALUES (v_business, v_staff, 'RLS Test Staff', true);
END;
$$;

SELECT public.__rls_test_setup();

-- -----------------------------------------------------------------------------
-- Helper: authenticate the current session as one of the fixture users.
-- Sets both the modern (request.jwt.claim.sub) and legacy (request.jwt.claims)
-- claim sources so auth.uid() resolves on any Supabase Postgres version.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__rls_test_become(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', p_user_id::TEXT, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"' || p_user_id::TEXT || '","role":"authenticated"}',
    true
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Anon can SELECT active businesses
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*) FROM public.businesses
   WHERE owner_id = current_setting('rls_test.admin_id')::uuid
     AND is_active = true),
  1::bigint,
  'anon sees the active fixture business'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = current_setting('rls_test.admin_id')::uuid
      AND is_active = false
  ),
  'anon cannot see inactive businesses'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 2. Anon CANNOT select from queue_tickets (table grant removed)
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT throws_ok(
  'SELECT count(*) FROM public.queue_tickets',
  'permission denied for table queue_tickets',
  'anon cannot SELECT queue_tickets (table grant revoked)'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 3. Anon CANNOT select from bookings (table grant removed)
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT throws_ok(
  'SELECT count(*) FROM public.bookings',
  'permission denied for table bookings',
  'anon cannot SELECT bookings (table grant revoked)'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 4. Anon CANNOT insert into queue_tickets (table grant removed)
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT throws_ok(
  format(
    'INSERT INTO public.queue_tickets
       (business_id, client_name, client_phone, ticket_number, ticket_label, queue_date, status)
     VALUES (%L::uuid, ''Anon Tester'', ''0555123456'', 999999, ''A-999999'', CURRENT_DATE, ''waiting'')',
    current_setting('rls_test.business_id')::uuid
  ),
  'permission denied for table queue_tickets',
  'anon cannot INSERT queue_tickets (table grant revoked)'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 5. Anon CANNOT insert into bookings (table grant removed)
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT throws_ok(
  format(
    'INSERT INTO public.bookings
       (business_id, client_name, client_phone, date, start_time, end_time)
     VALUES (%L::uuid, ''Anon Booked'', ''0555123456'',
             CURRENT_DATE + 7, ''10:00''::time, ''10:30''::time)',
    current_setting('rls_test.business_id')::uuid
  ),
  'permission denied for table bookings',
  'anon cannot INSERT bookings (table grant revoked)'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 6. Anon CAN insert into feedback
-- -----------------------------------------------------------------------------

SET LOCAL ROLE anon;

SELECT lives_ok(
  format(
    'INSERT INTO public.feedback (business_id, category, message)
     VALUES (%L::uuid, ''bug'', ''pgTAP anon feedback insert works'')',
    current_setting('rls_test.business_id')::uuid
  ),
  'anon can INSERT into feedback'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 7. Authenticated user can select own bookings
-- -----------------------------------------------------------------------------

SELECT public.__rls_test_become(current_setting('rls_test.staff_id')::uuid);

SELECT lives_ok(
  format(
    'INSERT INTO public.bookings
       (business_id, client_id, client_name, client_phone, date, start_time, end_time, status)
     VALUES (%L::uuid, %L::uuid, ''Own Booking'', ''0666123456'',
             CURRENT_DATE + 7, ''14:00''::time, ''14:30''::time, ''confirmed'')',
    current_setting('rls_test.business_id')::uuid,
    current_setting('rls_test.staff_id')::uuid
  ),
  'authenticated user can insert a booking as client'
);

SELECT is(
  (SELECT count(*) FROM public.bookings
   WHERE client_id = current_setting('rls_test.staff_id')::uuid),
  1::bigint,
  'authenticated user sees their own booking'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 8. Superadmin can see everything
-- -----------------------------------------------------------------------------

SELECT public.__rls_test_become(current_setting('rls_test.admin_id')::uuid);

SELECT is(
  (SELECT count(*) FROM public.businesses
   WHERE owner_id = current_setting('rls_test.admin_id')::uuid),
  2::bigint,
  'superadmin sees both active and inactive businesses'
);

SELECT lives_ok(
  'SELECT count(*) FROM public.queue_tickets',
  'superadmin can SELECT queue_tickets'
);

SELECT lives_ok(
  'SELECT count(*) FROM public.bookings',
  'superadmin can SELECT bookings'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- Done
-- -----------------------------------------------------------------------------

SELECT * FROM finish();

ROLLBACK;
