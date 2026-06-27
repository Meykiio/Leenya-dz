-- RLS Policy Integration Tests
-- Run these against a test database to verify RLS is working correctly.
-- Expected: all queries return 0 rows (access blocked for anon/roles as appropriate).

-- 1. Anon cannot SELECT from businesses table directly
SET ROLE anon;
SELECT * FROM businesses LIMIT 1;
RESET ROLE;

-- 2. Anon cannot INSERT into bookings table
SET ROLE anon;
INSERT INTO bookings (business_id, service_id, client_name, client_phone, start_time, end_time, date)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'test', '0555000000', now(), now() + interval '1 hour', CURRENT_DATE);
RESET ROLE;

-- 3. Anon cannot UPDATE staff_members
SET ROLE anon;
UPDATE staff_members SET name = 'hacker' WHERE name IS NOT NULL;
RESET ROLE;

-- 4. Anon cannot DELETE services
SET ROLE anon;
DELETE FROM services WHERE true;
RESET ROLE;

-- 5. Anon cannot LIST storage buckets
SET ROLE anon;
SELECT * FROM storage.buckets;
RESET ROLE;

-- 6. Authenticated user without business_id cannot see other businesses
SET ROLE authenticated;
SELECT * FROM businesses LIMIT 1;
RESET ROLE;

-- 7. Owner can SELECT their own business (expected: succeeds)
-- This test needs a real auth.uid() to work — run from authenticated context.
-- SELECT * FROM businesses WHERE id = auth_uid();
