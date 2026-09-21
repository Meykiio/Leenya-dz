-- ============================================================
-- TASK 3 (phase 1): Capability tokens + safe public commands
-- Additive only. Applied to production 2026-09-21 via MCP.
-- Adds queue_tickets.tracking_token (unique, defaulted), join_queue v2
-- (server-side validation + token), and the public command surface:
-- get_public_queue_stats, get/cancel/check_in_ticket_by_token,
-- submit_public_review, get_public_booking_slots, create_public_booking.
-- ============================================================

ALTER TABLE public.queue_tickets
  ADD COLUMN IF NOT EXISTS tracking_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_tickets_tracking_token
  ON public.queue_tickets (tracking_token);

DROP FUNCTION IF EXISTS public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT);

CREATE OR REPLACE FUNCTION public.join_queue(
  p_business_id UUID,
  p_service_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_staff_member_id UUID DEFAULT NULL,
  p_estimated_wait_minutes INT DEFAULT NULL
)
RETURNS TABLE(ticket_id UUID, ticket_label TEXT, ticket_number INT, tracking_token UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
SET timezone = 'Africa/Algiers'
AS $fn$
DECLARE
  v_ticket_num INT;
  v_ticket_lbl TEXT;
  v_ticket_id UUID;
  v_is_paused BOOLEAN;
  v_walkins BOOLEAN;
  v_capacity INT;
  v_active_count INT;
  v_existing_id UUID;
BEGIN
  SELECT is_queue_paused, accepts_walkins, queue_capacity
  INTO v_is_paused, v_walkins, v_capacity
  FROM public.businesses WHERE id = p_business_id;

  IF v_is_paused THEN
    RAISE EXCEPTION 'Queue is paused' USING HINT = 'queue_paused';
  END IF;

  IF v_walkins IS NOT TRUE THEN
    RAISE EXCEPTION 'Walk-ins disabled' USING HINT = 'walkins_disabled';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.queue_tickets
  WHERE business_id = p_business_id
    AND client_phone = p_client_phone
    AND queue_date = CURRENT_DATE
    AND status IN ('waiting', 'called', 'in_service')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate active ticket' USING HINT = 'already_in_queue';
  END IF;

  IF p_service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = p_service_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid service' USING HINT = 'invalid_service';
  END IF;

  IF p_staff_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = p_staff_member_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid staff' USING HINT = 'invalid_staff';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.queue_tickets
    WHERE business_id = p_business_id
      AND queue_date = CURRENT_DATE
      AND status IN ('waiting', 'called', 'in_service');
    IF v_active_count >= v_capacity THEN
      RAISE EXCEPTION 'Queue is full' USING HINT = 'queue_full';
    END IF;
  END IF;

  INSERT INTO public.queue_counters (business_id, counter_date, last_number)
  VALUES (p_business_id, CURRENT_DATE, 1)
  ON CONFLICT (business_id, counter_date)
  DO UPDATE SET last_number = public.queue_counters.last_number + 1
  RETURNING last_number INTO v_ticket_num;

  v_ticket_lbl := 'A-' || LPAD(v_ticket_num::TEXT, 3, '0');

  INSERT INTO public.queue_tickets (
    business_id, service_id, staff_member_id,
    client_name, client_phone,
    ticket_number, ticket_label,
    queue_date, status, position_in_queue, estimated_wait_minutes,
    client_id
  ) VALUES (
    p_business_id, p_service_id, p_staff_member_id,
    p_client_name, p_client_phone,
    v_ticket_num, v_ticket_lbl,
    CURRENT_DATE, 'waiting', v_ticket_num, p_estimated_wait_minutes,
    auth.uid()
  )
  RETURNING id, tracking_token INTO v_ticket_id, tracking_token;

  ticket_id := v_ticket_id;
  ticket_label := v_ticket_lbl;
  ticket_number := v_ticket_num;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_queue_stats(
  p_business_id UUID,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE(waiting_count INT, current_serving_label TEXT, estimated_wait_minutes INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_waiting INT;
  v_avg_wait NUMERIC;
  v_staff_count INT;
  v_fallback NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_waiting
  FROM public.queue_tickets
  WHERE business_id = p_business_id
    AND queue_date = CURRENT_DATE
    AND status = 'waiting';

  SELECT qt.ticket_label INTO current_serving_label
  FROM public.queue_tickets qt
  WHERE qt.business_id = p_business_id
    AND qt.queue_date = CURRENT_DATE
    AND qt.status IN ('called', 'in_service')
  ORDER BY qt.ticket_number ASC
  LIMIT 1;

  SELECT AVG(EXTRACT(EPOCH FROM (called_at - created_at)) / 60)
  INTO v_avg_wait
  FROM public.queue_tickets
  WHERE business_id = p_business_id
    AND status = 'completed'
    AND called_at IS NOT NULL
    AND created_at IS NOT NULL
    AND queue_date >= CURRENT_DATE - INTERVAL '30 days'
    AND (p_service_id IS NULL OR service_id = p_service_id);

  IF v_avg_wait IS NULL OR v_avg_wait <= 0 THEN
    SELECT COALESCE(duration_minutes, 10) * 1.5 INTO v_fallback
    FROM public.services WHERE id = p_service_id;
    IF v_fallback IS NULL THEN v_fallback := 15; END IF;
    v_avg_wait := v_fallback;
  END IF;

  v_staff_count := 1;
  IF p_service_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_staff_count
    FROM public.staff_members sm
    WHERE sm.business_id = p_business_id
      AND sm.is_active = true
      AND EXISTS (
        SELECT 1 FROM public.staff_services ss
        WHERE ss.staff_member_id = sm.id AND ss.service_id = p_service_id
      );
    IF v_staff_count = 0 THEN v_staff_count := 1; END IF;
  END IF;

  waiting_count := v_waiting;
  estimated_wait_minutes := CEILING((v_waiting / GREATEST(v_staff_count, 1)) * v_avg_wait)::INT;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_public_queue_stats(UUID, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_queue_ticket_by_token(p_token UUID)
RETURNS TABLE(
  ticket_label TEXT, ticket_number INT, status public.queue_status,
  position_in_queue INT, estimated_wait_minutes INT,
  service_id UUID, business_id UUID, queue_date DATE,
  checked_in_at TIMESTAMPTZ, staff_member_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT qt.ticket_label, qt.ticket_number, qt.status,
         qt.position_in_queue, qt.estimated_wait_minutes,
         qt.service_id, qt.business_id, qt.queue_date,
         qt.checked_in_at, qt.staff_member_id
  FROM public.queue_tickets qt
  WHERE qt.tracking_token = p_token;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_queue_ticket_by_token(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_queue_ticket_by_token(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_id UUID;
  v_status public.queue_status;
BEGIN
  SELECT id, status INTO v_id, v_status
  FROM public.queue_tickets WHERE tracking_token = p_token;

  IF v_id IS NULL THEN RETURN FALSE; END IF;
  IF v_status NOT IN ('waiting', 'called') THEN RETURN FALSE; END IF;

  UPDATE public.queue_tickets
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_id AND status IN ('waiting', 'called');

  RETURN FOUND;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.cancel_queue_ticket_by_token(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_in_ticket_by_token(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_id UUID;
  v_status public.queue_status;
  v_checked TIMESTAMPTZ;
BEGIN
  SELECT id, status, checked_in_at INTO v_id, v_status, v_checked
  FROM public.queue_tickets WHERE tracking_token = p_token;

  IF v_id IS NULL THEN RETURN FALSE; END IF;
  IF v_status <> 'waiting' THEN RETURN FALSE; END IF;
  IF v_checked IS NOT NULL THEN RETURN TRUE; END IF;

  UPDATE public.queue_tickets
  SET checked_in_at = NOW(), updated_at = NOW()
  WHERE id = v_id;

  RETURN TRUE;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.check_in_ticket_by_token(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_review(
  p_tracking_token UUID,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_ticket_id UUID;
  v_business_id UUID;
  v_status public.queue_status;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating' USING HINT = 'invalid_rating';
  END IF;
  IF p_comment IS NOT NULL AND length(p_comment) > 500 THEN
    RAISE EXCEPTION 'Comment too long' USING HINT = 'invalid_comment';
  END IF;

  SELECT id, business_id, status INTO v_ticket_id, v_business_id, v_status
  FROM public.queue_tickets WHERE tracking_token = p_tracking_token;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found' USING HINT = 'ticket_not_found';
  END IF;
  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Visit not completed' USING HINT = 'not_completed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE ticket_id = v_ticket_id) THEN
    RAISE EXCEPTION 'Already reviewed' USING HINT = 'already_reviewed';
  END IF;

  INSERT INTO public.reviews (business_id, ticket_id, rating, comment, client_id)
  VALUES (v_business_id, v_ticket_id, p_rating, NULLIF(trim(p_comment), ''), NULL);

  RETURN TRUE;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.submit_public_review(UUID, INT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_booking_slots(
  p_business_id UUID,
  p_date DATE,
  p_staff_member_id UUID DEFAULT NULL
)
RETURNS TABLE(start_time TIME, end_time TIME)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT b.start_time, b.end_time
  FROM public.bookings b
  WHERE b.business_id = p_business_id
    AND b.date = p_date
    AND b.status NOT IN ('cancelled', 'no_show')
    AND (p_staff_member_id IS NULL OR b.staff_member_id = p_staff_member_id)
  ORDER BY b.start_time ASC;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_slots(UUID, DATE, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id UUID,
  p_service_id UUID,
  p_staff_member_id UUID DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(booking_id UUID, booking_token UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_booking_id UUID;
  v_booking_token UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND is_active = true AND accepts_appointments = true
  ) THEN
    RAISE EXCEPTION 'Business unavailable' USING HINT = 'business_unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = p_service_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid service' USING HINT = 'invalid_service';
  END IF;

  IF p_staff_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = p_staff_member_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid staff' USING HINT = 'invalid_staff';
  END IF;

  IF p_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Missing schedule' USING HINT = 'invalid_schedule';
  END IF;
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Invalid schedule' USING HINT = 'invalid_schedule';
  END IF;

  IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 OR length(trim(p_client_name)) > 80 THEN
    RAISE EXCEPTION 'Invalid name' USING HINT = 'invalid_name';
  END IF;

  IF p_client_phone IS NULL OR p_client_phone !~ '^0(5|6|7)[0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid phone' USING HINT = 'invalid_phone';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 500 THEN
    RAISE EXCEPTION 'Notes too long' USING HINT = 'invalid_notes';
  END IF;

  INSERT INTO public.bookings (
    business_id, service_id, staff_member_id,
    date, start_time, end_time,
    client_name, client_phone, notes, status
  ) VALUES (
    p_business_id, p_service_id, p_staff_member_id,
    p_date, p_start_time, p_end_time,
    trim(p_client_name), p_client_phone, NULLIF(trim(p_notes), ''), 'pending'
  )
  RETURNING id, booking_token INTO v_booking_id, v_booking_token;

  booking_id := v_booking_id;
  booking_token := v_booking_token;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) TO anon, authenticated;
