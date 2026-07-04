-- ============================================================
-- LEENYA — MASTER SCHEMA
-- Consolidated from all migration files in chronological order.
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ============================================================
-- SCHEMA GRANTS (after DROP SCHEMA public CASCADE)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Per-table grants (replaces blanket GRANT ALL — Phase 4 security hardening)
-- anon: SELECT only on public-facing data
GRANT SELECT ON TABLE public.businesses TO anon;
GRANT SELECT ON TABLE public.services TO anon;
GRANT SELECT ON TABLE public.staff_members TO anon;
GRANT SELECT ON TABLE public.business_hours TO anon;
GRANT SELECT ON TABLE public.reviews TO anon;
GRANT INSERT ON TABLE public.reviews TO anon;
GRANT SELECT ON TABLE public.feedback TO anon;
-- No anon access to: bookings, queue_counters, profiles, user_roles, whatsapp_templates, staff_services
GRANT INSERT, SELECT ON TABLE public.queue_tickets TO anon;

-- authenticated: per-RLS access (SELECT/INSERT/UPDATE; DELETE only where required)
GRANT SELECT, INSERT, UPDATE ON TABLE public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.business_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.queue_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.queue_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.staff_services TO authenticated;
GRANT INSERT ON TABLE public.feedback TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.feedback TO authenticated;
-- service_role: full admin access (used by triggers and SECURITY DEFINER functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
-- NOTE: Per-function EXECUTE granted explicitly below.
-- DO NOT use GRANT ALL ON ALL FUNCTIONS — it would bypass SECURITY DEFINER restrictions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- TYPES / ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'staff', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.business_category AS ENUM ('beauty_salon', 'barbershop', 'clinic', 'dental', 'physiotherapy', 'veterinary', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'arrived', 'in_service', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.queue_status AS ENUM ('waiting', 'called', 'in_service', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- -----------------------------------------------------------
-- profiles
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT UNIQUE,
  preferred_lang TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- businesses
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category business_category DEFAULT 'other',
  description TEXT,
  phone TEXT,
  address TEXT,
  wilaya_code TEXT,
  wilaya_name TEXT,
  logo_url TEXT,
  cover_url TEXT,
  is_active BOOLEAN DEFAULT true,
  accepts_walkins BOOLEAN DEFAULT true,
  accepts_appointments BOOLEAN DEFAULT true,
  advance_booking_days INT DEFAULT 14,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business', 'paid')),
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  queue_capacity INT CHECK (queue_capacity IS NULL OR queue_capacity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_queue_paused BOOLEAN DEFAULT true
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- business_hours
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- services
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  price_dzd INT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- staff_members
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  accepts_bookings BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- staff_services
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(staff_member_id, service_id)
);

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- bookings
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  service_id UUID REFERENCES public.services(id),
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL CHECK (client_phone ~ '^0(5|6|7)[0-9]{8}$'),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status DEFAULT 'pending',
  notes TEXT,
  booking_token UUID DEFAULT gen_random_uuid(),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- queue_counters
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  counter_date DATE DEFAULT CURRENT_DATE,
  last_number INT DEFAULT 0,
  UNIQUE(business_id, counter_date)
);

ALTER TABLE public.queue_counters ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- queue_tickets
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  service_id UUID REFERENCES public.services(id),
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL CHECK (client_phone ~ '^0(5|6|7)[0-9]{8}$'),
  ticket_number INT NOT NULL,
  ticket_label TEXT NOT NULL,
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status queue_status DEFAULT 'waiting',
  estimated_wait_minutes INT,
  position_in_queue INT,
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  service_changed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  skip_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- reviews
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  client_id UUID REFERENCES public.profiles(id),
  ticket_id UUID REFERENCES public.queue_tickets(id),
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- feedback — landing page feedback form (anon-submittable)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id),
  email TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- whatsapp_templates
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, template_key)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- push_subscriptions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  queue_ticket_id UUID REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  locale TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_booking ON public.push_subscriptions(booking_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ticket ON public.push_subscriptions(queue_ticket_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Business owners can read their push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Business owners can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Staff can read push subscriptions for queue tickets"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT sm.business_id FROM public.staff_members sm WHERE sm.profile_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS push_subscriptions;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.booking_availability
WITH (security_invoker = on) AS
SELECT business_id, date, start_time, end_time, status, staff_member_id
FROM public.bookings;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- -----------------------------------------------------------
-- has_role — SECURITY DEFINER to avoid recursive RLS
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- -----------------------------------------------------------
-- get_user_role
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY
    CASE role
      WHEN 'superadmin' THEN 1
      WHEN 'owner' THEN 2
      WHEN 'staff' THEN 3
      WHEN 'client' THEN 4
      ELSE 5
    END
  LIMIT 1
$$;

-- -----------------------------------------------------------
-- generate_ticket_number — atomic counter via upsert
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_number(p_business_id UUID)
RETURNS TABLE(ticket_num INT, ticket_lbl TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_counter INT;
  v_label TEXT;
BEGIN
  INSERT INTO queue_counters (business_id, counter_date, last_number)
  VALUES (p_business_id, CURRENT_DATE, 1)
  ON CONFLICT (business_id, counter_date)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_counter;

  v_label := 'A-' || LPAD(v_counter::TEXT, 3, '0');

  ticket_num := v_counter;
  ticket_lbl := v_label;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ticket_number(UUID) TO anon, authenticated;

-- -----------------------------------------------------------
-- join_queue — atomic ticket creation (counter + insert) bypassing RLS
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_queue(
  p_business_id UUID,
  p_service_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_staff_member_id UUID DEFAULT NULL,
  p_estimated_wait_minutes INT DEFAULT NULL
)
RETURNS TABLE(ticket_id UUID, ticket_label TEXT, ticket_number INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
SET timezone = 'Africa/Algiers'
AS $$
DECLARE
  v_ticket_num INT;
  v_ticket_lbl TEXT;
  v_ticket_id UUID;
  v_is_paused BOOLEAN;
BEGIN
  SELECT is_queue_paused INTO v_is_paused FROM public.businesses WHERE id = p_business_id;
  IF v_is_paused THEN
    RAISE EXCEPTION 'Queue is paused' USING HINT = 'queue_paused';
  END IF;

  INSERT INTO queue_counters (business_id, counter_date, last_number)
  VALUES (p_business_id, CURRENT_DATE, 1)
  ON CONFLICT (business_id, counter_date)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_ticket_num;

  v_ticket_lbl := 'A-' || LPAD(v_ticket_num::TEXT, 3, '0');

  INSERT INTO queue_tickets (
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
  RETURNING id INTO v_ticket_id;

  ticket_id := v_ticket_id;
  ticket_label := v_ticket_lbl;
  ticket_number := v_ticket_num;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_queue(UUID, UUID, TEXT, TEXT, UUID, INT) TO anon, authenticated;

-- -----------------------------------------------------------
-- update_ticket_service — SECURITY DEFINER RPC bypassing RLS for anon
-- Allows users (anon or authenticated) to change their waiting ticket's service or staff member
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ticket_service(
  p_ticket_id UUID,
  p_service_id UUID,
  p_staff_member_id UUID DEFAULT NULL
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

  -- Rate limit: max 1 change per 30 seconds per ticket (walk-in gap mitigation)
  IF v_ticket.service_changed_at IS NOT NULL AND NOW() - v_ticket.service_changed_at < INTERVAL '30 seconds' THEN
    RAISE EXCEPTION 'Too many changes' USING HINT = 'rate_limited';
  END IF;

  UPDATE public.queue_tickets SET service_id = p_service_id, staff_member_id = p_staff_member_id, service_changed_at = NOW(), updated_at = NOW() WHERE id = p_ticket_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_ticket_service(UUID, UUID, UUID) TO anon, authenticated;

-- -----------------------------------------------------------
-- delete_my_account — SECURITY DEFINER RPC for account deletion
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_biz_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Superadmin accounts cannot be deleted';
  END IF;

  FOR v_biz_id IN SELECT id FROM businesses WHERE owner_id = v_user_id LOOP
    DELETE FROM reviews WHERE business_id = v_biz_id;
    DELETE FROM feedback WHERE business_id = v_biz_id;
    DELETE FROM queue_tickets WHERE business_id = v_biz_id;
    DELETE FROM bookings WHERE business_id = v_biz_id;
    DELETE FROM queue_counters WHERE business_id = v_biz_id;
  END LOOP;

  DELETE FROM businesses WHERE owner_id = v_user_id;
  DELETE FROM reviews WHERE client_id = v_user_id;
  DELETE FROM queue_tickets WHERE client_id = v_user_id;
  DELETE FROM bookings WHERE client_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- -----------------------------------------------------------
-- get_staff_queue — SECURITY DEFINER RPC bypassing RLS for staff
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_staff_queue(
  p_staff_member_id UUID,
  p_queue_date DATE
)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, estimated_wait_minutes INT,
  position_in_queue INT, queue_date DATE, created_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ, skip_count INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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

GRANT EXECUTE ON FUNCTION public.get_staff_queue(UUID, DATE) TO authenticated;

-- -----------------------------------------------------------
-- get_dashboard_queue — SECURITY DEFINER RPC bypassing RLS for owners
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_queue(
  p_business_id UUID,
  p_queue_date DATE
)
RETURNS TABLE(
  id UUID, ticket_label TEXT, ticket_number INT, status queue_status,
  staff_member_id UUID, client_name TEXT, client_phone TEXT,
  service_id UUID, service_name TEXT, staff_name TEXT,
  estimated_wait_minutes INT, position_in_queue INT,
  queue_date DATE, created_at TIMESTAMPTZ, called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ, skip_count INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Business owner, staff, or superadmin can access this (contains PII)
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
  WHERE qt.business_id = p_business_id
    AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service', 'completed')
  ORDER BY qt.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) TO authenticated;

-- -----------------------------------------------------------
-- cancel_queue_ticket — SECURITY DEFINER RPC for anon/authenticated
-- -----------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) TO anon, authenticated;

-- -----------------------------------------------------------
-- handle_new_user — auto-create profile on signup
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- check_booking_overlap — double-booking prevention with advisory lock
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.business_id::text || NEW.date::text || NEW.start_time::text
             || COALESCE(NEW.staff_member_id::text, 'no-staff'))
  );

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE business_id = NEW.business_id
      AND date = NEW.date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
      AND (
        (NEW.staff_member_id IS NOT NULL AND staff_member_id = NEW.staff_member_id)
        OR (NEW.staff_member_id IS NULL AND staff_member_id IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé / This time slot is already booked';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- check_insert_rate_limit — max 10 requests per phone per 10 minutes
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_insert_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rate_limit_' || NEW.client_phone));

  SELECT COUNT(*) INTO recent_count
  FROM (
    SELECT 1 FROM public.bookings
    WHERE client_phone = NEW.client_phone
      AND created_at > NOW() - INTERVAL '10 minutes'
    UNION ALL
    SELECT 1 FROM public.queue_tickets
    WHERE client_phone = NEW.client_phone
      AND created_at > NOW() - INTERVAL '10 minutes'
  ) combined;

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Trop de demandes. Veuillez réessayer plus tard.';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- get_monthly_business_counts — returns booking, queue, and staff counts
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_business_counts(p_business_id UUID)
RETURNS TABLE(booking_count INT, queue_count INT, staff_count INT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM bookings
     WHERE business_id = p_business_id
       AND date_trunc('month', created_at) = date_trunc('month', NOW())
       AND status NOT IN ('cancelled', 'no_show')),
    (SELECT COUNT(*)::INTEGER FROM queue_tickets
     WHERE business_id = p_business_id
       AND date_trunc('month', created_at) = date_trunc('month', NOW())
       AND status NOT IN ('cancelled', 'no_show')),
    (SELECT COUNT(*)::INTEGER FROM staff_members
     WHERE business_id = p_business_id AND is_active = true);
$$;

-- -----------------------------------------------------------
-- assign_owner_role — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'owner'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_owner_role() TO authenticated;

-- -----------------------------------------------------------
-- create_staff_user — SECURITY DEFINER to bypass RLS for staff account creation
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_staff_id UUID,
  p_email TEXT,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_business_id UUID;
  v_existing_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the business this staff member belongs to
  SELECT business_id INTO v_business_id FROM public.staff_members WHERE id = p_staff_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  -- Verify caller owns the business
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = v_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to create staff for this business';
  END IF;

  -- If auth user for this email already exists, just link staff to it
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.staff_members SET profile_id = v_existing_id WHERE id = p_staff_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_existing_id, 'staff'::app_role)
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

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'staff'::app_role);

  UPDATE public.staff_members SET profile_id = v_user_id WHERE id = p_staff_id;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_user(UUID, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------
-- upsert_profile — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_profile(p_full_name TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (auth.uid(), p_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile(TEXT) TO authenticated;

-- -----------------------------------------------------------
-- upsert_business — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_business(
  p_name TEXT,
  p_slug TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_wilaya_code TEXT,
  p_wilaya_name TEXT,
  p_category public.business_category
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id UUID;
  v_owner_id UUID := auth.uid();
BEGIN
  SELECT id INTO v_id FROM public.businesses WHERE owner_id = v_owner_id LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.businesses SET
      name = p_name,
      slug = p_slug,
      phone = p_phone,
      address = p_address,
      wilaya_code = p_wilaya_code,
      wilaya_name = p_wilaya_name,
      category = p_category
    WHERE id = v_id;
  ELSE
    INSERT INTO public.businesses (owner_id, name, slug, phone, address, wilaya_code, wilaya_name, category)
    VALUES (v_owner_id, p_name, p_slug, p_phone, p_address, p_wilaya_code, p_wilaya_name, p_category)
    RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.business_hours WHERE business_id = v_id;
  INSERT INTO public.business_hours (business_id, day_of_week, opens_at, closes_at, is_closed) VALUES
    (v_id, 0, NULL, NULL, true),
    (v_id, 1, '09:00', '18:00', false),
    (v_id, 2, '09:00', '18:00', false),
    (v_id, 3, '09:00', '18:00', false),
    (v_id, 4, '09:00', '18:00', false),
    (v_id, 5, '09:00', '18:00', false),
    (v_id, 6, '09:00', '18:00', false);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_business(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, public.business_category) TO authenticated;

-- -----------------------------------------------------------
-- insert_services — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_services(
  p_business_id UUID,
  p_services JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify services for this business';
  END IF;

  INSERT INTO public.services (business_id, name, duration_minutes, price_dzd, display_order)
  SELECT p_business_id, s.name, s.duration_minutes, s.price_dzd, s.display_order
  FROM jsonb_to_recordset(p_services) AS s(name TEXT, duration_minutes INT, price_dzd INT, display_order INT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_services(UUID, JSONB) TO authenticated;

-- -----------------------------------------------------------
-- Public RPCs (Phase 2a — anon can call, no PII returned)
-- -----------------------------------------------------------

-- get_queue_ticket — fetch a single queue ticket by ID
CREATE OR REPLACE FUNCTION public.get_queue_ticket(p_ticket_id UUID)
RETURNS TABLE(ticket_label TEXT, ticket_number INTEGER, status queue_status, position_in_queue INTEGER, estimated_wait_minutes INTEGER, service_id UUID, business_id UUID, queue_date DATE, checked_in_at TIMESTAMPTZ, staff_member_id UUID, skip_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT qt.ticket_label, qt.ticket_number, qt.status, qt.position_in_queue,
         qt.estimated_wait_minutes, qt.service_id, qt.business_id, qt.queue_date, qt.checked_in_at, qt.staff_member_id, qt.skip_count
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id
    AND qt.status IN ('waiting', 'called', 'in_service', 'completed');
$$;

-- get_business_queue — fetch all active queue tickets for a business on a date
CREATE OR REPLACE FUNCTION public.get_business_queue(
  p_business_id UUID,
  p_queue_date DATE
)
RETURNS TABLE(id UUID, ticket_label TEXT, status queue_status, ticket_number INTEGER, service_name TEXT, staff_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT qt.id, qt.ticket_label, qt.status, qt.ticket_number,
         s.name, sm.display_name
  FROM public.queue_tickets qt
  LEFT JOIN public.services s ON s.id = qt.service_id
  LEFT JOIN public.staff_members sm ON sm.id = qt.staff_member_id
  WHERE qt.business_id = p_business_id
    AND qt.queue_date = p_queue_date
    AND qt.status IN ('waiting', 'called', 'in_service')
  ORDER BY qt.ticket_number ASC;
$$;

-- get_completed_ticket_stats — average wait time and active staff count
CREATE OR REPLACE FUNCTION public.get_completed_ticket_stats(
  p_business_id UUID,
  p_service_id UUID DEFAULT NULL::UUID
)
RETURNS TABLE(avg_wait_minutes INTEGER, staff_count INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_avg_min integer;
  v_staff_count integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (called_at - created_at)) / 60))::integer, 0)
  INTO v_avg_min
  FROM public.queue_tickets
  WHERE business_id = p_business_id
    AND status = 'completed'
    AND called_at IS NOT NULL
    AND created_at IS NOT NULL
    AND queue_date >= CURRENT_DATE - 30
    AND (p_service_id IS NULL OR service_id = p_service_id);

  SELECT COUNT(DISTINCT sm.id)::integer
  INTO v_staff_count
  FROM public.staff_members sm
  WHERE sm.business_id = p_business_id
    AND sm.is_active = true
    AND (p_service_id IS NULL OR EXISTS (
      SELECT 1 FROM public.staff_services ss WHERE ss.staff_member_id = sm.id AND ss.service_id = p_service_id
    ));

  IF v_staff_count = 0 THEN v_staff_count := 1; END IF;

  RETURN QUERY SELECT v_avg_min, v_staff_count;
END;
$$;

-- get_queue_context — ticket position and current serving label
CREATE OR REPLACE FUNCTION public.get_queue_context(
  p_business_id UUID,
  p_queue_date DATE,
  p_ticket_number INTEGER
)
RETURNS TABLE(ticket_label TEXT, status queue_status, ticket_number INTEGER, current_serving_label TEXT, waiting_ahead INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_serving_label text;
  v_ahead integer;
  v_my_position integer;
BEGIN
  SELECT qt.position_in_queue INTO v_my_position
  FROM public.queue_tickets qt
  WHERE qt.business_id = p_business_id
    AND qt.queue_date = p_queue_date
    AND qt.ticket_number = p_ticket_number;

  SELECT q.ticket_label INTO v_serving_label
  FROM public.queue_tickets q
  WHERE q.business_id = p_business_id
    AND q.queue_date = p_queue_date
    AND q.status IN ('called', 'in_service')
  ORDER BY q.ticket_number ASC
  LIMIT 1;

  IF v_my_position IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_ahead
    FROM public.queue_tickets q
    WHERE q.business_id = p_business_id
      AND q.queue_date = p_queue_date
      AND q.status = 'waiting'
      AND q.position_in_queue < v_my_position;
  ELSE
    v_ahead := 0;
  END IF;

  RETURN QUERY
  SELECT q.ticket_label, q.status, q.ticket_number,
         v_serving_label, v_ahead
  FROM public.queue_tickets q
  WHERE q.business_id = p_business_id
    AND q.queue_date = p_queue_date
    AND q.status IN ('waiting', 'called', 'in_service')
  ORDER BY q.ticket_number ASC;
END;
$$;

-- get_booking_by_token — fetch a booking by its token (no auth required)
CREATE OR REPLACE FUNCTION public.get_booking_by_token(p_token UUID)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'id', b.id,
    'business_id', b.business_id,
    'client_name', b.client_name,
    'client_phone', b.client_phone,
    'date', b.date::text,
    'start_time', b.start_time::text,
    'end_time', b.end_time::text,
    'status', b.status::text,
    'notes', b.notes,
    'booking_token', b.booking_token,
    'created_at', b.created_at,
    'services', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('name', s.name) ELSE NULL END,
    'businesses', CASE WHEN biz.id IS NOT NULL THEN jsonb_build_object('name', biz.name, 'address', biz.address, 'phone', biz.phone) ELSE NULL END
  )
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.businesses biz ON biz.id = b.business_id
  WHERE b.booking_token = p_token;
$$;

-- cancel_booking_by_token — cancel a booking using its token (no auth required)
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(
  p_booking_id UUID,
  p_token UUID
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = p_booking_id
    AND booking_token = p_token
    AND status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- -----------------------------------------------------------
-- check_in_ticket — staff marks customer as arrived, resets skip counter
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- reassign_queue_ticket — staff reassigns ticket to another staff member
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reassign_queue_ticket(
  p_ticket_id UUID,
  p_staff_member_id UUID
)
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

-- -----------------------------------------------------------
-- recalculate_queue_positions — renumber waiting tickets 1..N (handles stale positions)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_queue_positions(
  p_business_id UUID,
  p_queue_date DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE queue_tickets
  SET position_in_queue = NULL
  WHERE business_id = p_business_id
    AND queue_date = p_queue_date
    AND status != 'waiting';

  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ticket_number ASC) AS new_position
    FROM queue_tickets
    WHERE business_id = p_business_id
      AND queue_date = p_queue_date
      AND status = 'waiting'
  )
  UPDATE queue_tickets qt
  SET position_in_queue = numbered.new_position
  FROM numbered
  WHERE qt.id = numbered.id;
END;
$$;

-- -----------------------------------------------------------
-- send_ticket_back_to_queue — staff puts a ticket back to waiting
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- skip_queue_ticket — bound one-position swap with the next waiting ticket
-- -----------------------------------------------------------
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
  FROM queue_tickets WHERE business_id = v_business_id AND queue_date = v_queue_date AND status = 'waiting' AND position_in_queue > v_current_pos
  ORDER BY position_in_queue ASC LIMIT 1;

  IF v_next_ticket_id IS NULL THEN RAISE EXCEPTION 'Already last in queue, nothing to skip' USING HINT = 'skip_last_in_queue'; END IF;

  UPDATE queue_tickets SET position_in_queue = v_next_pos WHERE id = p_ticket_id;
  UPDATE queue_tickets SET position_in_queue = v_current_pos WHERE id = v_next_ticket_id;
  UPDATE queue_tickets SET skip_count = skip_count + 1 WHERE id = p_ticket_id;

  RETURN QUERY SELECT position_in_queue FROM queue_tickets WHERE id = p_ticket_id;
END;
$$;

-- Revoke PUBLIC on all RPCs first, then selectively grant per security model
REVOKE EXECUTE ON FUNCTION public.get_queue_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_queue_ticket(UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_staff_queue(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_queue(UUID, DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_queue(UUID, DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_business_queue(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_queue(UUID, DATE) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_completed_ticket_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_completed_ticket_stats(UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_queue_context(UUID, DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_queue_context(UUID, DATE, INTEGER) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_booking_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_by_token(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_queue_ticket(UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_default_whatsapp_templates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_default_whatsapp_templates() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_in_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reassign_queue_ticket(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_queue_ticket(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_queue_positions(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_queue_positions(UUID, DATE) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.send_ticket_back_to_queue(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_ticket_back_to_queue(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.skip_queue_ticket(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Authenticated-only RPCs
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_business_counts(UUID) TO authenticated;

-- Revoke PUBLIC EXECUTE on trigger-only functions (REST API shouldn't call them directly)
REVOKE EXECUTE ON FUNCTION public.check_business_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_staff_plan_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_booking_overlap() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_booking_service_business() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_business_hours() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_past_booking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_insert_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_queue_ticket_state_transition() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_booking_state_transition() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- -----------------------------------------------------------
-- check_business_limits — enforces per-plan monthly caps with trial support
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_business_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_trial_ends_at TIMESTAMPTZ;
  v_booking_count INT;
  v_queue_count INT;
  v_max_bookings INT;
  v_max_queue INT;
BEGIN
  SELECT plan, trial_ends_at INTO v_plan, v_trial_ends_at FROM businesses WHERE id = NEW.business_id;

  -- During trial, no limits apply
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN NEW;
  END IF;

  CASE v_plan
    WHEN 'free' THEN v_max_bookings := 100; v_max_queue := 300;
    WHEN 'paid' THEN v_max_bookings := 5000; v_max_queue := 5000;
    ELSE v_max_bookings := 100; v_max_queue := 300;
  END CASE;

  SELECT COUNT(*) INTO v_booking_count
  FROM bookings
  WHERE business_id = NEW.business_id
    AND date_trunc('month', created_at) = date_trunc('month', NOW())
    AND status NOT IN ('cancelled', 'no_show');

  SELECT COUNT(*) INTO v_queue_count
  FROM queue_tickets
  WHERE business_id = NEW.business_id
    AND date_trunc('month', created_at) = date_trunc('month', NOW())
    AND status NOT IN ('cancelled', 'no_show');

  IF TG_TABLE_NAME = 'bookings' AND v_booking_count >= v_max_bookings THEN
    RAISE EXCEPTION 'Limite de reservering atteinte. Passez a un forfait superieur.';
  END IF;

  IF TG_TABLE_NAME = 'queue_tickets' AND v_queue_count >= v_max_queue THEN
    RAISE EXCEPTION 'Limite de tickets de file atteinte. Passez a un forfait superieur.';
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- check_staff_plan_limit — enforces per-plan staff caps with trial support
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_staff_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_trial_ends_at TIMESTAMPTZ;
  v_staff_count INT;
  v_max_staff INT;
BEGIN
  SELECT plan, trial_ends_at INTO v_plan, v_trial_ends_at FROM businesses WHERE id = NEW.business_id;

  -- During trial, no limits apply
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN NEW;
  END IF;

  CASE v_plan
    WHEN 'free' THEN v_max_staff := 3;
    WHEN 'paid' THEN RETURN NEW;
    ELSE v_max_staff := 3;
  END CASE;

  SELECT COUNT(*) INTO v_staff_count
  FROM staff_members
  WHERE business_id = NEW.business_id AND is_active = true;

  IF v_staff_count >= v_max_staff THEN
    RAISE EXCEPTION 'Limite d''employes atteinte pour votre forfait.';
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- check_booking_service_business — validates service/staff belong to the business
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_service_business()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- -----------------------------------------------------------
-- check_business_hours — validates booking is within operating hours
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_business_hours()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

-- -----------------------------------------------------------
-- check_past_booking — prevents creating bookings in the past
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_past_booking()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF (NEW.date < CURRENT_DATE) OR (NEW.date = CURRENT_DATE AND NEW.start_time <= CURRENT_TIME) THEN
    RAISE EXCEPTION 'Cannot create a booking in the past.' USING HINT = 'past_booking';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- check_queue_ticket_state_transition — enforces queue_ticket state machine
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_queue_ticket_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

-- -----------------------------------------------------------
-- check_booking_state_transition — enforces booking state machine
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_booking_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

-- -----------------------------------------------------------
-- get_default_whatsapp_templates — returns built-in template rows
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_default_whatsapp_templates()
RETURNS TABLE (
  template_key TEXT,
  name TEXT,
  description TEXT,
  message_template TEXT,
  variables TEXT[]
) LANGUAGE sql STABLE SET search_path = 'public' AS $$
  VALUES
    (
      'booking_new'::TEXT,
      'Nouvelle réservation'::TEXT,
      'Notification envoyée au business quand un client réserve'::TEXT,
      '✨ Nouvelle demande de réservation
👤 Client: {client_name}
📞 {client_phone}
📅 {date} à {time}
💆 Service: {service}

En attente de votre confirmation.'::TEXT,
      ARRAY['client_name', 'client_phone', 'date', 'time', 'service']::TEXT[]
    ),
    (
      'booking_accepted'::TEXT,
      'Réservation acceptée'::TEXT,
      'Notification envoyée au client quand sa réservation est acceptée'::TEXT,
      '✅ Réservation acceptée
{business_name}
📅 {date} à {time}
💆 Service: {service}
📍 {address}

Merci de votre confiance!'::TEXT,
      ARRAY['business_name', 'date', 'time', 'service', 'address']::TEXT[]
    ),
    (
      'booking_cancelled'::TEXT,
      'Réservation annulée'::TEXT,
      'Notification envoyée au client quand sa réservation est annulée'::TEXT,
      'ℹ️ Réservation annulée
{business_name}
📅 {date} à {time}
💆 Service: {service}

N''hésitez pas à réserver à nouveau.'::TEXT,
      ARRAY['business_name', 'date', 'time', 'service']::TEXT[]
    ),
    (
      'booking_reminder'::TEXT,
      'Rappel de rendez-vous'::TEXT,
      'Rappel envoyé au client avant son rendez-vous'::TEXT,
      '⏰ Rappel de rendez-vous
{business_name}
📅 {date} à {time}
💆 Service: {service}

À bientôt!
📞 {business_phone}'::TEXT,
      ARRAY['business_name', 'date', 'time', 'service', 'business_phone']::TEXT[]
    ),
    (
      'queue_called'::TEXT,
      'C''est votre tour'::TEXT,
      'Notification envoyée au client quand son ticket est appelé'::TEXT,
      '🔔 C''est votre tour!
Ticket {ticket_label}
{business_name}
💆 Service: {service}

Présentez-vous maintenant.'::TEXT,
      ARRAY['business_name', 'ticket_label', 'service']::TEXT[]
    ),
    (
      'queue_joined'::TEXT,
      'Ticket de file d''attente'::TEXT,
      'Confirmation envoyée au client quand il rejoint la file'::TEXT,
      '🎫 Ticket {ticket_label}
{business_name}
💆 Service: {service}

Temps d''attente estimé: {wait_time}'::TEXT,
      ARRAY['business_name', 'ticket_label', 'service', 'wait_time']::TEXT[]
    ),
    (
      'booking_completed'::TEXT,
      'Merci de votre visite'::TEXT,
      'Message de remerciement après le service'::TEXT,
      '⭐ Merci de votre visite!
{business_name}
💆 Service: {service}

Laissez-nous un avis: {review_link}'::TEXT,
      ARRAY['business_name', 'service', 'review_link']::TEXT[]
    )
$$;

-- -----------------------------------------------------------
-- update_updated_at_column — auto-set updated_at on row change
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Double-booking prevention
DROP TRIGGER IF EXISTS trg_check_booking_overlap ON public.bookings;
CREATE TRIGGER trg_check_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap();

-- Rate limit on bookings
DROP TRIGGER IF EXISTS trg_rate_limit_bookings ON public.bookings;
CREATE TRIGGER trg_rate_limit_bookings
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- Rate limit on queue tickets
DROP TRIGGER IF EXISTS trg_rate_limit_queue ON public.queue_tickets;
CREATE TRIGGER trg_rate_limit_queue
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- Business limits on bookings
DROP TRIGGER IF EXISTS check_plan_limit_trigger ON public.bookings;
CREATE TRIGGER check_plan_limit_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_business_limits();

-- Business limits on queue tickets
DROP TRIGGER IF EXISTS check_plan_limit_queue_trigger ON public.queue_tickets;
CREATE TRIGGER check_plan_limit_queue_trigger
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_business_limits();

-- Staff plan limit
DROP TRIGGER IF EXISTS check_staff_plan_limit_trigger ON public.staff_members;
CREATE TRIGGER check_staff_plan_limit_trigger
  BEFORE INSERT ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.check_staff_plan_limit();

-- Service/staff business ownership check
DROP TRIGGER IF EXISTS check_booking_service_business_trigger ON public.bookings;
CREATE TRIGGER check_booking_service_business_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_service_business();

-- Business hours validation
DROP TRIGGER IF EXISTS check_business_hours_trigger ON public.bookings;
CREATE TRIGGER check_business_hours_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_business_hours();

-- Past booking prevention
DROP TRIGGER IF EXISTS check_past_booking_trigger ON public.bookings;
CREATE TRIGGER check_past_booking_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_past_booking();

-- Queue ticket state machine
DROP TRIGGER IF EXISTS check_queue_ticket_state_transition_trigger ON public.queue_tickets;
CREATE TRIGGER check_queue_ticket_state_transition_trigger
  BEFORE UPDATE OF status ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_queue_ticket_state_transition();

-- Booking state machine
DROP TRIGGER IF EXISTS check_booking_state_transition_trigger ON public.bookings;
CREATE TRIGGER check_booking_state_transition_trigger
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_state_transition();

-- Auto-update updated_at on row modification
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

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- -----------------------------------------------------------
-- profiles
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);



-- -----------------------------------------------------------
-- businesses
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active businesses" ON public.businesses;
CREATE POLICY "Public can view active businesses" ON public.businesses
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their business" ON public.businesses;
CREATE POLICY "Owners can delete their business" ON public.businesses
  FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can view own business" ON public.businesses;
CREATE POLICY "Owners can view own business" ON public.businesses
  FOR SELECT USING (auth.uid() = owner_id);

-- -----------------------------------------------------------
-- business_hours
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Public can view business hours" ON public.business_hours;
CREATE POLICY "Public can view business hours" ON public.business_hours
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage business hours" ON public.business_hours;
CREATE POLICY "Owners can manage business hours" ON public.business_hours
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- -----------------------------------------------------------
-- services
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services" ON public.services
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage services" ON public.services;
CREATE POLICY "Owners can manage services" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- -----------------------------------------------------------
-- staff_members
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active staff" ON public.staff_members;
CREATE POLICY "Public can view active staff" ON public.staff_members
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage staff" ON public.staff_members;
CREATE POLICY "Owners can manage staff" ON public.staff_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can view own record" ON public.staff_members;
CREATE POLICY "Staff can view own record" ON public.staff_members
  FOR SELECT USING (auth.uid() = profile_id);

-- -----------------------------------------------------------
-- staff_services
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "owners_manage_staff_services" ON public.staff_services;
CREATE POLICY "owners_manage_staff_services"
ON public.staff_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.businesses b ON sm.business_id = b.id
    WHERE sm.id = staff_services.staff_member_id
    AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "public_read_staff_services" ON public.staff_services;
CREATE POLICY "public_read_staff_services"
ON public.staff_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.businesses b ON sm.business_id = b.id
    WHERE sm.id = staff_services.staff_member_id
    AND b.is_active = true
  )
);

-- -----------------------------------------------------------
-- bookings
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
CREATE POLICY "Clients can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can insert bookings" ON public.bookings;
CREATE POLICY "Clients can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Business owners can view bookings" ON public.bookings;
CREATE POLICY "Business owners can view bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can manage bookings" ON public.bookings;
CREATE POLICY "Business owners can manage bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can insert bookings" ON public.bookings;
CREATE POLICY "Business owners can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = bookings.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view business bookings" ON public.bookings;
CREATE POLICY "Staff can view business bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      JOIN public.businesses b ON b.id = sm.business_id
      WHERE sm.profile_id = auth.uid()
      AND b.id = business_id
      AND (bookings.staff_member_id IS NULL OR bookings.staff_member_id = sm.id)
    )
  );

DROP POLICY IF EXISTS "Staff can update business bookings" ON public.bookings;
CREATE POLICY "Staff can update business bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
      AND sm.business_id = bookings.business_id
      AND (bookings.staff_member_id IS NULL OR bookings.staff_member_id = sm.id)
    )
  );

DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
CREATE POLICY "Public can insert bookings" ON public.bookings
  FOR INSERT TO anon WITH CHECK (client_id IS NULL);

DROP POLICY IF EXISTS "Anon can view booking by token" ON public.bookings;
CREATE POLICY "Anon can view booking by token"
  ON public.bookings FOR SELECT TO anon
  USING (booking_token IS NOT NULL AND client_id IS NULL);

DROP POLICY IF EXISTS "Anon can cancel booking by token" ON public.bookings;
CREATE POLICY "Anon can cancel booking by token"
  ON public.bookings FOR UPDATE TO anon
  USING (booking_token IS NOT NULL AND client_id IS NULL)
  WITH CHECK (status = 'cancelled');

-- -----------------------------------------------------------
-- queue_tickets
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Clients can view own tickets" ON public.queue_tickets;
CREATE POLICY "Clients can view own tickets" ON public.queue_tickets
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can insert tickets" ON public.queue_tickets;
CREATE POLICY "Clients can insert tickets" ON public.queue_tickets
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Business owners can view queue" ON public.queue_tickets;
CREATE POLICY "Business owners can view queue" ON public.queue_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can manage queue" ON public.queue_tickets;
CREATE POLICY "Business owners can manage queue" ON public.queue_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can insert queue tickets" ON public.queue_tickets;
CREATE POLICY "Business owners can insert queue tickets"
  ON public.queue_tickets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = queue_tickets.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view business queue" ON public.queue_tickets;
CREATE POLICY "Staff can view business queue" ON public.queue_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
      AND sm.business_id = queue_tickets.business_id
      AND (queue_tickets.staff_member_id IS NULL OR queue_tickets.staff_member_id = sm.id)
    )
  );

DROP POLICY IF EXISTS "Staff can update business queue" ON public.queue_tickets;
CREATE POLICY "Staff can update business queue" ON public.queue_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
      AND sm.business_id = queue_tickets.business_id
      AND (queue_tickets.staff_member_id IS NULL OR queue_tickets.staff_member_id = sm.id)
    )
  );

DROP POLICY IF EXISTS "Public can insert queue tickets" ON public.queue_tickets;
CREATE POLICY "Public can insert queue tickets" ON public.queue_tickets
  FOR INSERT TO anon WITH CHECK (client_id IS NULL);

DROP POLICY IF EXISTS "Authenticated users can insert queue tickets" ON public.queue_tickets;
CREATE POLICY "Authenticated users can insert queue tickets" ON public.queue_tickets
  FOR INSERT TO authenticated
  WITH CHECK ((client_id IS NULL) OR (auth.uid() = client_id));

-- Fixed: scoped to active statuses only (replaces the old open USING (true))
DROP POLICY IF EXISTS "Anon can view own ticket by id" ON public.queue_tickets;
CREATE POLICY "Anon can view own ticket by id"
  ON public.queue_tickets FOR SELECT TO anon
  USING (status IN ('waiting', 'called', 'in_service'));

DROP POLICY IF EXISTS "Anon can cancel own ticket" ON public.queue_tickets;
CREATE POLICY "Anon can cancel own ticket"
  ON public.queue_tickets
  FOR UPDATE TO anon
  USING (client_id IS NULL)
  WITH CHECK (client_id IS NULL AND status = 'cancelled');

DROP POLICY IF EXISTS "Authenticated users can view own ticket" ON public.queue_tickets;
CREATE POLICY "Authenticated users can view own ticket" ON public.queue_tickets
  FOR SELECT TO authenticated
  USING (status IN ('waiting', 'called', 'in_service', 'completed'));

DROP POLICY IF EXISTS "Authenticated users can cancel own ticket" ON public.queue_tickets;
CREATE POLICY "Authenticated users can cancel own ticket" ON public.queue_tickets
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid() AND status = 'cancelled');

-- -----------------------------------------------------------
-- queue_counters
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Business owners can manage counters" ON public.queue_counters;
CREATE POLICY "Business owners can manage counters" ON public.queue_counters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can read counters" ON public.queue_counters;
CREATE POLICY "Staff can read counters" ON public.queue_counters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_counters.business_id
    )
  );

DROP POLICY IF EXISTS "Public can read queue counters" ON public.queue_counters;
CREATE POLICY "Public can read queue counters" ON public.queue_counters
  FOR SELECT TO anon USING (true);

-- -----------------------------------------------------------
-- reviews
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (client_id IS NULL AND ticket_id IS NOT NULL)
    OR
    (auth.uid() = client_id)
  );

DROP POLICY IF EXISTS "Clients can update own reviews" ON public.reviews;
CREATE POLICY "Clients can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = client_id);

-- -----------------------------------------------------------
-- feedback
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can delete feedback" ON public.feedback;
CREATE POLICY "Owners can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = feedback.business_id AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can view their feedback" ON public.feedback;
CREATE POLICY "Owners can view their feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = feedback.business_id AND owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- whatsapp_templates
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Business owners can view templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can view templates"
  ON public.whatsapp_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can insert templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can insert templates"
  ON public.whatsapp_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can update templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can update templates"
  ON public.whatsapp_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can delete templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can delete templates"
  ON public.whatsapp_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE POLICIES (storage.objects)
-- ============================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- H-010 FIXED: Removed public SELECT policy on storage.objects.
-- Public URLs still work without listing permission.

-- Path-scoped: the uploaded file's folder path must contain a business ID
-- that belongs to the authenticated owner. ANY(foldername) matches both:
--   {businessId}/logo.png          → foldername[1] = businessId
--   staff-avatars/{businessId}/...  → foldername[2] = businessId
DROP POLICY IF EXISTS "Owners can upload business assets" ON storage.objects;
CREATE POLICY "Owners can upload business assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = auth.uid()
    AND id::text = ANY(storage.foldername(name))
  )
);

DROP POLICY IF EXISTS "Owners can update business assets" ON storage.objects;
CREATE POLICY "Owners can update business assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete business assets" ON storage.objects;
CREATE POLICY "Owners can delete business assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- BASE PRIVILEGES — required for REST API access
-- Without these, RLS policies never get evaluated (403 error)
-- Per-table only (no blanket grants — Phase 4 security hardening)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon: SELECT only on public-facing data
GRANT SELECT ON TABLE public.businesses TO anon;
GRANT SELECT ON TABLE public.services TO anon;
GRANT SELECT ON TABLE public.staff_members TO anon;
GRANT SELECT ON TABLE public.business_hours TO anon;
GRANT SELECT ON TABLE public.reviews TO anon;
GRANT INSERT ON TABLE public.reviews TO anon;
GRANT SELECT ON TABLE public.feedback TO anon;

-- authenticated: per-RLS access (SELECT/INSERT/UPDATE; DELETE only where required)
GRANT SELECT, INSERT, UPDATE ON TABLE public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.business_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.queue_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.queue_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.staff_services TO authenticated;
GRANT INSERT ON TABLE public.feedback TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.feedback TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- INDEXES
-- ============================================================

-- Performance indexes (migration 20260308085830)
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON public.bookings (business_id, date);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_business_date_status ON public.queue_tickets (business_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.reviews (business_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_business ON public.business_hours (business_id);

-- Booking token lookup (migration 20260308094618)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_token ON public.bookings (booking_token);

-- WhatsApp templates (migration 20260327)
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_business_id ON public.whatsapp_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_template_key ON public.whatsapp_templates(template_key);

-- Missing indexes (migration 20260626_3)
CREATE INDEX IF NOT EXISTS idx_bookings_phone_created ON public.bookings(client_phone, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_phone_created ON public.queue_tickets(client_phone, created_at);
CREATE INDEX IF NOT EXISTS idx_services_business_active ON public.services(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_members_business ON public.staff_members(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON public.staff_services(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON public.staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);

-- Concurrency indexes (migration phase_3_concurrency_fixes)
CREATE INDEX IF NOT EXISTS idx_bookings_overlap_check ON public.bookings (business_id, date, status, start_time, end_time, staff_member_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_business_date_ticket ON public.queue_tickets (business_id, queue_date, ticket_number);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date ON public.bookings (business_id, staff_member_id, date);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_staff_date ON public.queue_tickets (business_id, staff_member_id, queue_date);

-- Unique position constraint (prevents duplicate queue positions)
CREATE UNIQUE INDEX IF NOT EXISTS queue_tickets_position_unique
  ON public.queue_tickets (business_id, queue_date, position_in_queue)
  WHERE position_in_queue IS NOT NULL;

-- Double-queue-join prevention (2026-06-26)
-- Only one active ticket per phone per day at the same business
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_ticket_per_phone
  ON public.queue_tickets (business_id, client_phone, queue_date)
  WHERE status IN ('waiting', 'called', 'in_service');

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
-- Ensure owner has staff_member record (migration ensure_owner_staff_member)
INSERT INTO staff_members (business_id, profile_id, display_name, is_active, accepts_bookings)
SELECT 
  b.id,
  b.owner_id,
  COALESCE(p.full_name, 'Owner'),
  true,
  true
FROM businesses b
JOIN profiles p ON p.id = b.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm
  WHERE sm.profile_id = b.owner_id AND sm.business_id = b.id
);

-- Link the owner-staff to all active services
INSERT INTO staff_services (staff_member_id, service_id)
SELECT 
  sm.id,
  s.id
FROM staff_members sm
JOIN businesses b ON b.id = sm.business_id
JOIN services s ON s.business_id = b.id AND s.is_active = true
WHERE sm.profile_id = b.owner_id
  AND NOT EXISTS (
    SELECT 1 FROM staff_services ss
    WHERE ss.staff_member_id = sm.id AND ss.service_id = s.id
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_templates;

-- ============================================================
-- SUPERADMIN ROLE (migration add_superadmin_enum_value)
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- ============================================================
-- SUPERADMIN HELPER (migration create_superadmin_helper)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

-- ============================================================
-- SUPERADMIN RLS POLICIES (migration superadmin_rls_policies)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON public.profiles;
CREATE POLICY "Superadmin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_superadmin());

-- User roles
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_superadmin());

-- Businesses
DROP POLICY IF EXISTS "Owners can view own business" ON public.businesses;
CREATE POLICY "Owners can view own business" ON public.businesses
  FOR SELECT USING (auth.uid() = owner_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Owners can delete their business" ON public.businesses;
CREATE POLICY "Owners can delete their business" ON public.businesses
  FOR DELETE USING (auth.uid() = owner_id OR public.is_superadmin());

-- Business hours
DROP POLICY IF EXISTS "Owners can manage business hours" ON public.business_hours;
CREATE POLICY "Owners can manage business hours" ON public.business_hours
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

-- Services
DROP POLICY IF EXISTS "Owners can manage services" ON public.services;
CREATE POLICY "Owners can manage services" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

-- Staff members
DROP POLICY IF EXISTS "Owners can manage staff" ON public.staff_members;
CREATE POLICY "Owners can manage staff" ON public.staff_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

-- Staff services
DROP POLICY IF EXISTS "owners_manage_staff_services" ON public.staff_services;
CREATE POLICY "owners_manage_staff_services"
ON public.staff_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    JOIN public.businesses b ON sm.business_id = b.id
    WHERE sm.id = staff_services.staff_member_id
    AND b.owner_id = auth.uid()
  )
  OR public.is_superadmin()
);

-- Bookings
DROP POLICY IF EXISTS "Business owners can view bookings" ON public.bookings;
CREATE POLICY "Business owners can view bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can manage bookings" ON public.bookings;
CREATE POLICY "Business owners can manage bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can insert bookings" ON public.bookings;
CREATE POLICY "Business owners can insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = bookings.business_id
      AND businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

-- Queue tickets
DROP POLICY IF EXISTS "Business owners can view queue" ON public.queue_tickets;
CREATE POLICY "Business owners can view queue" ON public.queue_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can manage queue" ON public.queue_tickets;
CREATE POLICY "Business owners can manage queue" ON public.queue_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can insert queue tickets" ON public.queue_tickets;
CREATE POLICY "Business owners can insert queue tickets"
  ON public.queue_tickets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = queue_tickets.business_id
      AND businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

-- Queue counters
DROP POLICY IF EXISTS "Business owners can manage counters" ON public.queue_counters;
CREATE POLICY "Business owners can manage counters" ON public.queue_counters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

-- Feedback
DROP POLICY IF EXISTS "Owners can delete feedback" ON public.feedback;
CREATE POLICY "Owners can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = feedback.business_id AND owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Owners can view their feedback" ON public.feedback;
CREATE POLICY "Owners can view their feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = feedback.business_id AND owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

-- WhatsApp templates
DROP POLICY IF EXISTS "Business owners can view templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can view templates"
  ON public.whatsapp_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can insert templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can insert templates"
  ON public.whatsapp_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can update templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can update templates"
  ON public.whatsapp_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Business owners can delete templates" ON public.whatsapp_templates;
CREATE POLICY "Business owners can delete templates"
  ON public.whatsapp_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.whatsapp_templates.business_id
      AND public.businesses.owner_id = auth.uid()
    )
    OR public.is_superadmin()
  );

-- Reviews
DROP POLICY IF EXISTS "Owners can view their reviews" ON public.reviews;
CREATE POLICY "Owners can view their reviews" ON public.reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Owners can reply to reviews" ON public.reviews;
CREATE POLICY "Owners can reply to reviews" ON public.reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
    OR public.is_superadmin()
  );

-- Migration M-025: Add service_changed_at column for rate limit
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS service_changed_at TIMESTAMPTZ;
