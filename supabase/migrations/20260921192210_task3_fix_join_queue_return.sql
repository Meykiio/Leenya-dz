-- ============================================================
-- TASK 3 (fix 2): join_queue 400 — "tracking_token is ambiguous"
-- (RETURNING column collided with the output parameter name).
-- Also: grant anon SELECT on staff_services — the public staff-filter
-- query has been permission-denied since the July restore.
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

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
  v_returned_token UUID;
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
  RETURNING id, queue_tickets.tracking_token INTO v_ticket_id, v_returned_token;

  ticket_id := v_ticket_id;
  ticket_label := v_ticket_lbl;
  ticket_number := v_ticket_num;
  tracking_token := v_returned_token;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT) TO anon, authenticated;

GRANT SELECT ON TABLE public.staff_services TO anon;
