-- ============================================================
-- TASK 4: Concurrency safety
-- 1. Booking overlap: business+DATE lock (was exact start time),
--    SECURITY DEFINER, no-preference conflicts with any staff at overlap.
-- 2. Shared business/date lock for queue position mutations.
-- 3. add_walk_in_ticket: staff-side atomic join.
-- 4. State-machine trigger clears position when leaving waiting.
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id::text || NEW.date::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.business_id = NEW.business_id
      AND b.date = NEW.date
      AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.start_time < NEW.end_time
      AND b.end_time > NEW.start_time
      AND (NEW.staff_member_id IS NULL OR b.staff_member_id IS NULL OR b.staff_member_id = NEW.staff_member_id)
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé / This time slot is already booked';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.check_queue_ticket_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF OLD.status = NEW.status THEN
    IF NEW.status = 'waiting' AND NEW.position_in_queue IS NULL THEN
      RAISE EXCEPTION 'Waiting ticket lost its position' USING HINT = 'state_machine';
    END IF;
    RETURN NEW;
  END IF;
  CASE OLD.status
    WHEN 'waiting' THEN
      IF NEW.status NOT IN ('called', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'called' THEN
      IF NEW.status NOT IN ('in_service', 'completed', 'waiting', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'in_service' THEN
      IF NEW.status NOT IN ('completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'completed', 'cancelled', 'no_show' THEN
      RAISE EXCEPTION 'Status % is terminal and cannot be changed.', OLD.status USING HINT = 'state_machine';
    ELSE
      RAISE EXCEPTION 'Unknown source status: %', OLD.status USING HINT = 'state_machine';
  END CASE;
  IF NEW.status <> 'waiting' THEN
    NEW.position_in_queue := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

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
  v_returned_token UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || CURRENT_DATE::text, 1));

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
  RETURNING id, queue_tickets.tracking_token INTO v_ticket_id, v_returned_token;

  ticket_id := v_ticket_id;
  ticket_label := v_ticket_lbl;
  ticket_number := v_ticket_num;
  tracking_token := v_returned_token;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_walk_in_ticket(
  p_business_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id UUID DEFAULT NULL,
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
  v_capacity INT;
  v_active_count INT;
  v_existing_id UUID;
  v_returned_token UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id
      AND (owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
        OR EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.business_id = p_business_id AND sm.profile_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_client_name IS NULL OR length(trim(p_client_name)) < 1 OR length(trim(p_client_name)) > 80 THEN
    RAISE EXCEPTION 'Invalid name' USING HINT = 'invalid_name';
  END IF;
  IF p_client_phone IS NULL OR p_client_phone !~ '^0(5|6|7)[0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid phone' USING HINT = 'invalid_phone';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || CURRENT_DATE::text, 1));

  SELECT is_queue_paused, queue_capacity
  INTO v_is_paused, v_capacity
  FROM public.businesses WHERE id = p_business_id;
  IF v_is_paused THEN
    RAISE EXCEPTION 'Queue is paused' USING HINT = 'queue_paused';
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
    queue_date, status, position_in_queue, estimated_wait_minutes
  ) VALUES (
    p_business_id, p_service_id, p_staff_member_id,
    trim(p_client_name), p_client_phone,
    v_ticket_num, v_ticket_lbl,
    CURRENT_DATE, 'waiting', v_ticket_num, p_estimated_wait_minutes
  )
  RETURNING id, queue_tickets.tracking_token INTO v_ticket_id, v_returned_token;

  ticket_id := v_ticket_id;
  ticket_label := v_ticket_lbl;
  ticket_number := v_ticket_num;
  tracking_token := v_returned_token;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.add_walk_in_ticket(UUID, TEXT, TEXT, UUID, UUID, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_queue_positions(
  p_business_id UUID,
  p_queue_date DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || p_queue_date::text, 1));

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
