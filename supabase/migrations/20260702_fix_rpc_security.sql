-- ============================================================
-- Fix RPC Security: Revoke anon grants + add ownership checks
-- ============================================================
-- Issue: 6 RPCs had anon EXECUTE via PUBLIC grant drift.
-- Anon users could skip tickets, read PII, reassign staff, etc.
-- Also: cancel_queue_ticket had no ownership check.
-- Also: update_ticket_service walk-in bypass (client_id IS NULL).
-- ============================================================

-- STEP 1: Revoke PUBLIC EXECUTE on all affected functions
-- (PUBLIC includes anon role in Supabase's nested role model)
REVOKE EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_in_ticket(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reassign_queue_ticket(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_queue_positions(UUID, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_ticket_back_to_queue(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_ticket_service(UUID, UUID, UUID) FROM PUBLIC;

-- STEP 2: Re-grant per the intended security model
-- Anon-allowed (with UUID-based implicit auth or ownership check in function body)
GRANT EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_ticket_service(UUID, UUID, UUID) TO anon, authenticated;

-- Authenticated-only (staff/owner operations)
GRANT EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_queue_ticket(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_queue_positions(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_ticket_back_to_queue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) TO authenticated;

-- STEP 3: Redefine functions with ownership checks
-- cancel_queue_ticket: ticket owner OR business owner/staff (anon with UUID implicitly allowed)
CREATE OR REPLACE FUNCTION public.cancel_queue_ticket(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old_status queue_status;
  v_business_id UUID;
  v_client_id UUID;
BEGIN
  SELECT status, business_id, client_id
  INTO v_old_status, v_business_id, v_client_id
  FROM queue_tickets WHERE id = p_ticket_id;

  IF v_old_status IS NULL THEN RETURN FALSE; END IF;

  -- Authenticated users must own the ticket or be business owner/staff/superadmin
  -- Anonymous users: ticket UUID is implicit auth (same as original design)
  IF auth.uid() IS NOT NULL AND auth.uid() != v_client_id
     AND NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id AND owner_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM staff_members WHERE business_id = v_business_id AND profile_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_old_status NOT IN ('waiting', 'called') THEN RETURN FALSE; END IF;

  UPDATE queue_tickets SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_ticket_id AND status IN ('waiting', 'called');

  RETURN FOUND;
END;
$$;

-- check_in_ticket: only business owner, staff, or superadmin
CREATE OR REPLACE FUNCTION public.check_in_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_business_id UUID;
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT business_id INTO v_business_id FROM queue_tickets WHERE id = p_ticket_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') INTO v_is_superadmin;

  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM staff_members WHERE business_id = v_business_id AND profile_id = auth.uid())
    AND NOT v_is_superadmin
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE queue_tickets SET checked_in_at = NOW(), skip_count = 0 WHERE id = p_ticket_id;
END;
$$;

-- reassign_queue_ticket: only business owner, staff, or superadmin
CREATE OR REPLACE FUNCTION public.reassign_queue_ticket(p_ticket_id UUID, p_staff_member_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT business_id INTO v_business_id FROM queue_tickets WHERE id = p_ticket_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM staff_members WHERE business_id = v_business_id AND profile_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE queue_tickets SET staff_member_id = p_staff_member_id WHERE id = p_ticket_id;
END;
$$;

-- send_ticket_back_to_queue: only business owner, staff, or superadmin
CREATE OR REPLACE FUNCTION public.send_ticket_back_to_queue(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_business_id UUID;
  v_queue_date DATE;
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT business_id, queue_date INTO v_business_id, v_queue_date
  FROM queue_tickets WHERE id = p_ticket_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') INTO v_is_superadmin;

  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM staff_members WHERE business_id = v_business_id AND profile_id = auth.uid())
    AND NOT v_is_superadmin
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE queue_tickets SET status = 'waiting', called_at = NULL, position_in_queue = NULL WHERE id = p_ticket_id;
  PERFORM recalculate_queue_positions(v_business_id, v_queue_date);
END;
$$;

-- skip_queue_ticket: only business owner, staff, or superadmin
CREATE OR REPLACE FUNCTION public.skip_queue_ticket(p_ticket_id UUID)
RETURNS TABLE(new_position integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_business_id UUID;
  v_queue_date DATE;
  v_current_pos INTEGER;
  v_next_ticket_id UUID;
  v_next_pos INTEGER;
  v_is_superadmin BOOLEAN;
BEGIN
  SELECT business_id, queue_date, position_in_queue
  INTO v_business_id, v_queue_date, v_current_pos
  FROM queue_tickets WHERE id = p_ticket_id;
  IF v_business_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') INTO v_is_superadmin;

  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM staff_members WHERE business_id = v_business_id AND profile_id = auth.uid())
    AND NOT v_is_superadmin
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_business_id::text || v_queue_date::text));
  IF v_current_pos IS NULL THEN RAISE EXCEPTION 'Ticket has no position assigned' USING HINT = 'skip_no_position'; END IF;

  UPDATE queue_tickets SET position_in_queue = NULL WHERE business_id = v_business_id AND queue_date = v_queue_date AND status != 'waiting';

  SELECT id, position_in_queue INTO v_next_ticket_id, v_next_pos
  FROM queue_tickets
  WHERE business_id = v_business_id AND queue_date = v_queue_date
    AND status = 'waiting' AND position_in_queue > v_current_pos
  ORDER BY position_in_queue ASC LIMIT 1;

  IF v_next_ticket_id IS NULL THEN RAISE EXCEPTION 'Already last in queue, nothing to skip' USING HINT = 'skip_last_in_queue'; END IF;

  UPDATE queue_tickets SET position_in_queue = v_next_pos WHERE id = p_ticket_id;
  UPDATE queue_tickets SET position_in_queue = v_current_pos WHERE id = v_next_ticket_id;
  UPDATE queue_tickets SET skip_count = skip_count + 1 WHERE id = p_ticket_id;
  RETURN QUERY SELECT position_in_queue FROM queue_tickets WHERE id = p_ticket_id;
END;
$$;

-- get_dashboard_queue: only business owner, staff, or superadmin (contains PII)
CREATE OR REPLACE FUNCTION public.get_dashboard_queue(p_business_id UUID, p_queue_date DATE)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, staff_name TEXT,
  estimated_wait_minutes INT, position_in_queue INT,
  queue_date DATE, created_at TIMESTAMPTZ, called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ, checked_in_at TIMESTAMPTZ, skip_count INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.business_id = p_business_id AND sm.profile_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT qt.id, qt.ticket_label, qt.ticket_number, qt.status,
         qt.staff_member_id, qt.client_name, qt.client_phone,
         qt.service_id, s.name, sm.display_name,
         qt.estimated_wait_minutes, qt.position_in_queue,
         qt.queue_date, qt.created_at, qt.called_at, qt.completed_at,
         qt.checked_in_at, qt.skip_count
  FROM queue_tickets qt
  LEFT JOIN services s ON s.id = qt.service_id
  LEFT JOIN staff_members sm ON sm.id = qt.staff_member_id
  WHERE qt.business_id = p_business_id AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service', 'completed')
  ORDER BY qt.created_at ASC;
END;
$$;

-- update_ticket_service: walk-in bypass fix
CREATE OR REPLACE FUNCTION public.update_ticket_service(
  p_ticket_id UUID, p_service_id UUID, p_staff_member_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  SELECT qt.* INTO v_ticket FROM public.queue_tickets qt WHERE qt.id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found' USING HINT = 'ticket_not_found'; END IF;
  IF v_ticket.status != 'waiting' THEN RAISE EXCEPTION 'Ticket is no longer waiting' USING HINT = 'ticket_not_waiting'; END IF;

  -- Authenticated users: can only update their own ticket
  IF auth.uid() IS NOT NULL AND v_ticket.client_id IS NOT NULL AND auth.uid() != v_ticket.client_id THEN
    RAISE EXCEPTION 'Not your ticket' USING HINT = 'not_owner';
  END IF;

  -- Walk-in bypass fix: authenticated non-owner users must be business staff/owner/superadmin
  IF auth.uid() IS NOT NULL AND v_ticket.client_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_ticket.business_id AND owner_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.staff_members WHERE business_id = v_ticket.business_id AND profile_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_ticket.service_changed_at IS NOT NULL AND NOW() - v_ticket.service_changed_at < INTERVAL '30 seconds' THEN
    RAISE EXCEPTION 'Too many changes' USING HINT = 'rate_limited';
  END IF;

  UPDATE public.queue_tickets SET service_id = p_service_id, staff_member_id = p_staff_member_id, service_changed_at = NOW(), updated_at = NOW() WHERE id = p_ticket_id;
  RETURN TRUE;
END;
$$;
