-- Phase 1: Fix skip logic to bounded position swap, add skip_count
-- See DOCS/CHANGELOG.md for full description

ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS skip_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.check_in_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE queue_tickets SET checked_in_at = NOW(), skip_count = 0 WHERE id = p_ticket_id;
$$;

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
BEGIN
  SELECT business_id, queue_date, position_in_queue
  INTO v_business_id, v_queue_date, v_current_pos
  FROM queue_tickets WHERE id = p_ticket_id;
  IF v_current_pos IS NULL THEN
    RAISE EXCEPTION 'Ticket has no position assigned' USING HINT = 'skip_no_position';
  END IF;
  UPDATE queue_tickets
  SET position_in_queue = NULL
  WHERE business_id = v_business_id
    AND queue_date = v_queue_date
    AND status != 'waiting';
  SELECT id, position_in_queue INTO v_next_ticket_id, v_next_pos
  FROM queue_tickets
  WHERE business_id = v_business_id
    AND queue_date = v_queue_date
    AND status = 'waiting'
    AND position_in_queue > v_current_pos
  ORDER BY position_in_queue ASC
  LIMIT 1;
  IF v_next_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Already last in queue, nothing to skip' USING HINT = 'skip_last_in_queue';
  END IF;
  UPDATE queue_tickets SET position_in_queue = v_next_pos WHERE id = p_ticket_id;
  UPDATE queue_tickets SET position_in_queue = v_current_pos WHERE id = v_next_ticket_id;
  UPDATE queue_tickets SET skip_count = skip_count + 1 WHERE id = p_ticket_id;
  RETURN QUERY SELECT position_in_queue FROM queue_tickets WHERE id = p_ticket_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_staff_queue(UUID, DATE);
CREATE OR REPLACE FUNCTION public.get_staff_queue(
  p_staff_member_id UUID, p_queue_date DATE
)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, estimated_wait_minutes INT,
  position_in_queue INT, queue_date DATE, created_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ, skip_count INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT qt.id, qt.ticket_label, qt.ticket_number, qt.status,
         qt.staff_member_id, qt.client_name, qt.client_phone,
         qt.service_id, s.name, qt.estimated_wait_minutes,
         qt.position_in_queue, qt.queue_date, qt.created_at,
         qt.called_at, qt.completed_at,
         qt.checked_in_at, qt.skip_count
  FROM queue_tickets qt
  LEFT JOIN services s ON s.id = qt.service_id
  WHERE qt.business_id = (SELECT business_id FROM staff_members WHERE id = p_staff_member_id)
    AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service')
    AND (qt.staff_member_id IS NULL OR qt.staff_member_id = p_staff_member_id)
  ORDER BY qt.ticket_number ASC;
$$;

DROP FUNCTION IF EXISTS public.get_dashboard_queue(UUID, DATE);
CREATE OR REPLACE FUNCTION public.get_dashboard_queue(
  p_business_id UUID, p_queue_date DATE
)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, staff_name TEXT,
  estimated_wait_minutes INT, position_in_queue INT,
  queue_date DATE, created_at TIMESTAMPTZ, called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ, skip_count INT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT qt.id, qt.ticket_label, qt.ticket_number, qt.status,
         qt.staff_member_id, qt.client_name, qt.client_phone,
         qt.service_id, s.name, sm.display_name,
         qt.estimated_wait_minutes, qt.position_in_queue,
         qt.queue_date, qt.created_at, qt.called_at, qt.completed_at,
         qt.checked_in_at, qt.skip_count
  FROM queue_tickets qt
  LEFT JOIN services s ON s.id = qt.service_id
  LEFT JOIN staff_members sm ON sm.id = qt.staff_member_id
  WHERE qt.business_id = p_business_id
    AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service', 'completed')
  ORDER BY qt.created_at ASC;
$$;

DROP FUNCTION IF EXISTS public.get_queue_ticket(UUID);
CREATE OR REPLACE FUNCTION public.get_queue_ticket(p_ticket_id UUID)
RETURNS TABLE(ticket_label TEXT, ticket_number INTEGER, status queue_status, position_in_queue INTEGER, estimated_wait_minutes INTEGER, service_id UUID, business_id UUID, queue_date DATE, checked_in_at TIMESTAMPTZ, staff_member_id UUID, skip_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT qt.ticket_label, qt.ticket_number, qt.status, qt.position_in_queue,
         qt.estimated_wait_minutes, qt.service_id, qt.business_id, qt.queue_date, qt.checked_in_at, qt.staff_member_id, qt.skip_count
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id
    AND qt.status IN ('waiting', 'called', 'in_service', 'completed');
$$;
