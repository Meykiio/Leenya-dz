-- ============================================================
-- TASK 4 (fix): create_public_booking — "booking_token is ambiguous"
-- (RETURNING/variable collision). Applied to production 2026-09-21.
-- ============================================================

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
  v_returned_token UUID;
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
  RETURNING id, bookings.booking_token INTO v_booking_id, v_returned_token;

  booking_id := v_booking_id;
  booking_token := v_returned_token;
  RETURN NEXT;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) TO anon, authenticated;
