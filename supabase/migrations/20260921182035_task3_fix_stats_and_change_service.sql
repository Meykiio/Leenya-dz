-- ============================================================
-- TASK 3 (fix): get_public_queue_stats returned 0 rows (missing RETURN NEXT)
-- and add token-based change-service (same-business validated).
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.update_ticket_service_by_token(
  p_tracking_token UUID,
  p_service_id UUID,
  p_staff_member_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_ticket RECORD;
BEGIN
  SELECT * INTO v_ticket FROM public.queue_tickets WHERE tracking_token = p_tracking_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING HINT = 'ticket_not_found';
  END IF;
  IF v_ticket.status <> 'waiting' THEN
    RAISE EXCEPTION 'Ticket is no longer waiting' USING HINT = 'ticket_not_waiting';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = p_service_id AND business_id = v_ticket.business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid service' USING HINT = 'invalid_service';
  END IF;

  IF p_staff_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = p_staff_member_id AND business_id = v_ticket.business_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid staff' USING HINT = 'invalid_staff';
  END IF;

  IF v_ticket.service_changed_at IS NOT NULL AND NOW() - v_ticket.service_changed_at < INTERVAL '30 seconds' THEN
    RAISE EXCEPTION 'Too many changes' USING HINT = 'rate_limited';
  END IF;

  UPDATE public.queue_tickets
  SET service_id = p_service_id,
      staff_member_id = p_staff_member_id,
      service_changed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_ticket.id;

  RETURN TRUE;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.update_ticket_service_by_token(UUID, UUID, UUID) TO anon, authenticated;
