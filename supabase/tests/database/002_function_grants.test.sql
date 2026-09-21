-- =============================================================================
-- 002_function_grants.test.sql
-- pgTAP tests for function EXECUTE privileges (the RPC permission model).
--
-- Run via: supabase test db
-- =============================================================================

BEGIN;

SELECT plan(6);

-- -----------------------------------------------------------------------------
-- Public RPC: anon CAN execute join_queue
-- -----------------------------------------------------------------------------

SELECT is(
  has_function_privilege('anon', 'public.join_queue(uuid, uuid, text, text, uuid, int)', 'EXECUTE'),
  true,
  'anon can execute join_queue'
);

-- -----------------------------------------------------------------------------
-- Dashboard/staff PII RPCs: anon CANNOT execute
-- -----------------------------------------------------------------------------

SELECT is(
  has_function_privilege('anon', 'public.get_staff_queue(uuid, date)', 'EXECUTE'),
  false,
  'anon cannot execute get_staff_queue'
);

SELECT is(
  has_function_privilege('anon', 'public.get_dashboard_queue(uuid, date)', 'EXECUTE'),
  false,
  'anon cannot execute get_dashboard_queue'
);

SELECT is(
  has_function_privilege('anon', 'public.delete_my_account()', 'EXECUTE'),
  false,
  'anon cannot execute delete_my_account'
);

-- -----------------------------------------------------------------------------
-- Staff management RPC: authenticated CAN, anon CANNOT
-- -----------------------------------------------------------------------------

SELECT is(
  has_function_privilege('authenticated', 'public.create_staff_user(uuid, text, text)', 'EXECUTE'),
  true,
  'authenticated can execute create_staff_user'
);

SELECT is(
  has_function_privilege('anon', 'public.create_staff_user(uuid, text, text)', 'EXECUTE'),
  false,
  'anon cannot execute create_staff_user'
);

-- -----------------------------------------------------------------------------
-- Done
-- -----------------------------------------------------------------------------

SELECT * FROM finish();

ROLLBACK;
