-- ============================================================
-- TASK 2 (cont.): Restore safety systems lost in the July 2026 restore
-- Recreates 8 guard functions and their triggers that existed in the
-- pre-restore database but were dropped and never re-applied:
--   plan limits, staff plan limit, cross-business validation,
--   business-hours validation, past-booking prevention,
--   booking + queue state machines, updated_at maintenance.
-- Also fixes create_staff_user anon access (platform default grant).
-- Applied to production 2026-09-21 via MCP.
-- ============================================================

-- 1. create_staff_user must be authenticated-only (platform default grant slipped through)
REVOKE EXECUTE ON FUNCTION public.create_staff_user(UUID, TEXT, TEXT) FROM PUBLIC, anon;

-- 2. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. check_business_limits — per-plan monthly caps with trial support
CREATE OR REPLACE FUNCTION public.check_business_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_plan TEXT;
  v_trial_ends_at TIMESTAMPTZ;
  v_booking_count INT;
  v_queue_count INT;
  v_max_bookings INT;
  v_max_queue INT;
BEGIN
  SELECT plan, trial_ends_at INTO v_plan, v_trial_ends_at FROM public.businesses WHERE id = NEW.business_id;

  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN NEW;
  END IF;

  CASE v_plan
    WHEN 'free' THEN v_max_bookings := 100; v_max_queue := 300;
    WHEN 'paid' THEN v_max_bookings := 5000; v_max_queue := 5000;
    ELSE v_max_bookings := 100; v_max_queue := 300;
  END CASE;

  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE business_id = NEW.business_id
    AND date_trunc('month', created_at) = date_trunc('month', NOW())
    AND status NOT IN ('cancelled', 'no_show');

  SELECT COUNT(*) INTO v_queue_count
  FROM public.queue_tickets
  WHERE business_id = NEW.business_id
    AND date_trunc('month', created_at) = date_trunc('month', NOW())
    AND status NOT IN ('cancelled', 'no_show');

  IF TG_TABLE_NAME = 'bookings' AND v_booking_count >= v_max_bookings THEN
    RAISE EXCEPTION 'Limite de reservations atteinte. Passez a un forfait superieur.';
  END IF;

  IF TG_TABLE_NAME = 'queue_tickets' AND v_queue_count >= v_max_queue THEN
    RAISE EXCEPTION 'Limite de tickets de file atteinte. Passez a un forfait superieur.';
  END IF;

  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_business_limits() FROM PUBLIC, anon, authenticated;

-- 4. check_staff_plan_limit — per-plan staff caps with trial support
CREATE OR REPLACE FUNCTION public.check_staff_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_plan TEXT;
  v_trial_ends_at TIMESTAMPTZ;
  v_staff_count INT;
  v_max_staff INT;
BEGIN
  SELECT plan, trial_ends_at INTO v_plan, v_trial_ends_at FROM public.businesses WHERE id = NEW.business_id;

  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN NEW;
  END IF;

  CASE v_plan
    WHEN 'free' THEN v_max_staff := 3;
    WHEN 'paid' THEN RETURN NEW;
    ELSE v_max_staff := 3;
  END CASE;

  SELECT COUNT(*) INTO v_staff_count
  FROM public.staff_members
  WHERE business_id = NEW.business_id AND is_active = true;

  IF v_staff_count >= v_max_staff THEN
    RAISE EXCEPTION 'Limite d''employes atteinte pour votre forfait.';
  END IF;

  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_staff_plan_limit() FROM PUBLIC, anon, authenticated;

-- 5. check_booking_service_business — service/staff must belong to the business
CREATE OR REPLACE FUNCTION public.check_booking_service_business()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = NEW.service_id AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Le service sélectionné n''appartient pas à ce commerce';
  END IF;

  IF NEW.staff_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE id = NEW.staff_member_id AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Le membre du personnel n''appartient pas à ce commerce';
  END IF;

  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_booking_service_business() FROM PUBLIC, anon, authenticated;

-- 6. check_business_hours — booking must be inside operating hours
CREATE OR REPLACE FUNCTION public.check_business_hours()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $fn$
DECLARE
  v_day_of_week integer;
  v_opens_at time;
  v_closes_at time;
  v_is_closed boolean;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM NEW.date::timestamp)::integer;
  SELECT opens_at, closes_at, is_closed
  INTO v_opens_at, v_closes_at, v_is_closed
  FROM public.business_hours
  WHERE business_id = NEW.business_id AND day_of_week = v_day_of_week;
  IF v_opens_at IS NULL OR v_is_closed THEN
    RAISE EXCEPTION 'Business is closed on this day.' USING HINT = 'business_hours';
  END IF;
  IF NEW.start_time < v_opens_at THEN
    RAISE EXCEPTION 'Booking time is before opening time.' USING HINT = 'business_hours';
  END IF;
  IF NEW.end_time > v_closes_at THEN
    RAISE EXCEPTION 'Booking time exceeds closing time.' USING HINT = 'business_hours';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_business_hours() FROM PUBLIC, anon, authenticated;

-- 7. check_past_booking — no bookings in the past
CREATE OR REPLACE FUNCTION public.check_past_booking()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF (NEW.date < CURRENT_DATE) OR (NEW.date = CURRENT_DATE AND NEW.start_time <= CURRENT_TIME) THEN
    RAISE EXCEPTION 'Cannot create a booking in the past.' USING HINT = 'past_booking';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_past_booking() FROM PUBLIC, anon, authenticated;

-- 8. Queue ticket state machine
CREATE OR REPLACE FUNCTION public.check_queue_ticket_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
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
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_queue_ticket_state_transition() FROM PUBLIC, anon, authenticated;

-- 9. Booking state machine
CREATE OR REPLACE FUNCTION public.check_booking_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('arrived', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'arrived' THEN
      IF NEW.status NOT IN ('in_service', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'in_service' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status USING HINT = 'state_machine';
      END IF;
    WHEN 'completed', 'cancelled', 'no_show' THEN
      RAISE EXCEPTION 'Status % is terminal and cannot be changed.', OLD.status USING HINT = 'state_machine';
    ELSE
      RAISE EXCEPTION 'Unknown source status: %', OLD.status USING HINT = 'state_machine';
  END CASE;
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.check_booking_state_transition() FROM PUBLIC, anon, authenticated;

-- 10. Triggers (idempotent: drop + create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_check_booking_overlap ON public.bookings;
CREATE TRIGGER trg_check_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap();

DROP TRIGGER IF EXISTS trg_rate_limit_bookings ON public.bookings;
CREATE TRIGGER trg_rate_limit_bookings
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

DROP TRIGGER IF EXISTS trg_rate_limit_queue ON public.queue_tickets;
CREATE TRIGGER trg_rate_limit_queue
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

DROP TRIGGER IF EXISTS check_plan_limit_trigger ON public.bookings;
CREATE TRIGGER check_plan_limit_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_business_limits();

DROP TRIGGER IF EXISTS check_plan_limit_queue_trigger ON public.queue_tickets;
CREATE TRIGGER check_plan_limit_queue_trigger
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_business_limits();

DROP TRIGGER IF EXISTS check_staff_plan_limit_trigger ON public.staff_members;
CREATE TRIGGER check_staff_plan_limit_trigger
  BEFORE INSERT ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.check_staff_plan_limit();

DROP TRIGGER IF EXISTS check_booking_service_business_trigger ON public.bookings;
CREATE TRIGGER check_booking_service_business_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_service_business();

DROP TRIGGER IF EXISTS check_business_hours_trigger ON public.bookings;
CREATE TRIGGER check_business_hours_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_business_hours();

DROP TRIGGER IF EXISTS check_past_booking_trigger ON public.bookings;
CREATE TRIGGER check_past_booking_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_past_booking();

DROP TRIGGER IF EXISTS check_queue_ticket_state_transition_trigger ON public.queue_tickets;
CREATE TRIGGER check_queue_ticket_state_transition_trigger
  BEFORE UPDATE OF status ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_queue_ticket_state_transition();

DROP TRIGGER IF EXISTS check_booking_state_transition_trigger ON public.bookings;
CREATE TRIGGER check_booking_state_transition_trigger
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_state_transition();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_business_hours_updated_at ON public.business_hours;
CREATE TRIGGER trg_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_staff_members_updated_at ON public.staff_members;
CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_queue_tickets_updated_at ON public.queue_tickets;
CREATE TRIGGER trg_queue_tickets_updated_at
  BEFORE UPDATE ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER trg_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
