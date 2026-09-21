-- ============================================================
-- TASK 2: Contain RPC execution + add missing authorization checks
-- Reverses the never-applied default PUBLIC EXECUTE grants, applies the
-- designed grant matrix, adds caller authorization to under-protected
-- functions, and recreates create_staff_user (missing from live DB).
-- Grants/revokes only — no data is touched. Fully reversible.
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

-- 1. Future functions must not be executable by default (prevents recurrence)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- 2. Blanket revoke (Postgres default EXECUTE TO PUBLIC was never revoked live)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- 3. Service role keeps full access (service/Edge paths)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 4. Public customer surface (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_ticket(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_context(UUID, DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_ticket_stats(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_queue(UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_ticket_service(UUID, UUID, UUID) TO anon, authenticated;

-- 5. Owner/staff surface (authenticated only)
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_owner_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, public.business_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_services(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_queue(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_queue_ticket(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_ticket_back_to_queue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_queue_positions(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_business_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ticket_number(UUID) TO authenticated;

-- 6. is_superadmin is evaluated inside RLS policies as the querying role,
--    so anon/authenticated must keep EXECUTE.
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon, authenticated;

-- 7. Trigger-only functions that exist live: EXECUTE is never checked for
--    trigger invocation; revoke from all client roles so REST cannot call them.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_booking_overlap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_insert_rate_limit() FROM PUBLIC, anon, authenticated;

-- 8. Leftover functions from another project: lock down + pin search_path
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.application_status_timestamps() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_invoice_number() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.application_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.status = 'withdrawn' AND OLD.status IS DISTINCT FROM 'withdrawn' THEN
    NEW.withdrawn_at = now();
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.invoice_number_seq');
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::TEXT, 7, '0');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  NEW.invoice_number := public.generate_invoice_number();
  RETURN NEW;
END;
$fn$;

-- 9. get_staff_queue: authorize the caller (that staff member themself,
--    the business owner, or a superadmin) before returning customer PII.
CREATE OR REPLACE FUNCTION public.get_staff_queue(
  p_staff_member_id UUID,
  p_queue_date DATE
)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status public.queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, estimated_wait_minutes INT,
  position_in_queue INT, queue_date DATE, created_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ, skip_count INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT sm.business_id INTO v_business_id
  FROM public.staff_members sm
  WHERE sm.id = p_staff_member_id;

  IF v_business_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM public.staff_members sm2 WHERE sm2.id = p_staff_member_id AND sm2.profile_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT qt.id, qt.ticket_label, qt.ticket_number, qt.status,
         qt.staff_member_id, qt.client_name, qt.client_phone,
         qt.service_id, s.name, qt.estimated_wait_minutes,
         qt.position_in_queue, qt.queue_date, qt.created_at,
         qt.called_at, qt.completed_at,
         qt.checked_in_at, qt.skip_count
  FROM public.queue_tickets qt
  LEFT JOIN public.services s ON s.id = qt.service_id
  WHERE qt.business_id = v_business_id
    AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service')
    AND (qt.staff_member_id IS NULL OR qt.staff_member_id = p_staff_member_id)
  ORDER BY qt.ticket_number ASC;
END;
$fn$;

-- 10. get_monthly_business_counts: restrict to the business owner, its staff, or superadmin.
CREATE OR REPLACE FUNCTION public.get_monthly_business_counts(p_business_id UUID)
RETURNS TABLE(booking_count INT, queue_count INT, staff_count INT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT c.booking_count, c.queue_count, c.staff_count
  FROM (
    SELECT
      (SELECT COUNT(*)::INT FROM public.bookings bk
        WHERE bk.business_id = p_business_id
          AND date_trunc('month', bk.created_at) = date_trunc('month', now())
          AND bk.status NOT IN ('cancelled', 'no_show')) AS booking_count,
      (SELECT COUNT(*)::INT FROM public.queue_tickets qt
        WHERE qt.business_id = p_business_id
          AND date_trunc('month', qt.created_at) = date_trunc('month', now())
          AND qt.status NOT IN ('cancelled', 'no_show')) AS queue_count,
      (SELECT COUNT(*)::INT FROM public.staff_members sm
        WHERE sm.business_id = p_business_id AND sm.is_active = true) AS staff_count
  ) c
  WHERE EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND (b.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'))
  ) OR EXISTS (
    SELECT 1 FROM public.staff_members sm2
    WHERE sm2.business_id = p_business_id AND sm2.profile_id = auth.uid()
  );
$fn$;

-- 11. recalculate_queue_positions: owner, staff of that business, or superadmin only.
CREATE OR REPLACE FUNCTION public.recalculate_queue_positions(
  p_business_id UUID,
  p_queue_date DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.business_id = p_business_id AND sm.profile_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.queue_tickets SET position_in_queue = NULL
  WHERE business_id = p_business_id AND queue_date = p_queue_date AND status != 'waiting';

  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ticket_number ASC) AS new_position
    FROM public.queue_tickets
    WHERE business_id = p_business_id AND queue_date = p_queue_date AND status = 'waiting'
  )
  UPDATE public.queue_tickets qt
  SET position_in_queue = numbered.new_position
  FROM numbered
  WHERE qt.id = numbered.id;
END;
$fn$;

-- 12. Recreate create_staff_user (present in repo schema but missing from the
--     live DB since the July restore — staff logins from the dashboard were broken).
CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_staff_id UUID,
  p_email TEXT,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_business_id UUID;
  v_existing_id UUID;
  v_user_id UUID;
BEGIN
  SELECT business_id INTO v_business_id FROM public.staff_members WHERE id = p_staff_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = v_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to create staff for this business';
  END IF;

  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.staff_members SET profile_id = v_existing_id WHERE id = p_staff_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_existing_id, 'staff'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN v_existing_id;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    aud, role,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    created_at, updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(), now(),
    'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    '', '', '', '',
    now(), now()
  );

  INSERT INTO auth.identities (user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false),
    'email', v_user_id::text,
    now(), now(), now()
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'staff'::public.app_role);

  UPDATE public.staff_members SET profile_id = v_user_id WHERE id = p_staff_id;

  RETURN v_user_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_staff_user(UUID, TEXT, TEXT) TO authenticated;
