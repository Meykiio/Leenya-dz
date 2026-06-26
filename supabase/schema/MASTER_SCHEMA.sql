-- ============================================================
-- LEENYA — MASTER SCHEMA
-- Consolidated from all migration files in chronological order.
-- Idempotent — safe to run multiple times.
-- ============================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
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
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  is_closed BOOLEAN DEFAULT false
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
  display_order INT DEFAULT 0
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
  accepts_bookings BOOLEAN DEFAULT true
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
  staff_member_id UUID REFERENCES public.staff_members(id),
  client_id UUID REFERENCES public.profiles(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status DEFAULT 'pending',
  notes TEXT,
  booking_token UUID DEFAULT gen_random_uuid(),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  staff_member_id UUID REFERENCES public.staff_members(id),
  client_id UUID REFERENCES public.profiles(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  ticket_number INT NOT NULL,
  ticket_label TEXT NOT NULL,
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status queue_status DEFAULT 'waiting',
  estimated_wait_minutes INT,
  position_in_queue INT,
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- reviews
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  client_id UUID REFERENCES public.profiles(id) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

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
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- -----------------------------------------------------------
-- get_user_role
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
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
-- get_monthly_booking_count
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_booking_count(p_business_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    (SELECT COUNT(*)::INTEGER
     FROM bookings
     WHERE business_id = p_business_id
       AND date_trunc('month', created_at) = date_trunc('month', NOW())
       AND status NOT IN ('cancelled', 'no_show'))
    +
    (SELECT COUNT(*)::INTEGER
     FROM queue_tickets
     WHERE business_id = p_business_id
       AND date_trunc('month', created_at) = date_trunc('month', NOW())
       AND status NOT IN ('cancelled', 'no_show'))
  )::INTEGER;
$$;

-- -----------------------------------------------------------
-- assign_owner_role — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_owner_role(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'owner'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_owner_role(UUID) TO authenticated;

-- -----------------------------------------------------------
-- upsert_profile — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_profile(p_id UUID, p_full_name TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (p_id, p_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------
-- upsert_business — SECURITY DEFINER to bypass RLS for onboarding
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_business(
  p_owner_id UUID,
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
BEGIN
  SELECT id INTO v_id FROM public.businesses WHERE owner_id = p_owner_id LIMIT 1;

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
    VALUES (p_owner_id, p_name, p_slug, p_phone, p_address, p_wilaya_code, p_wilaya_name, p_category)
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

GRANT EXECUTE ON FUNCTION public.upsert_business(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, public.business_category) TO authenticated;

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
  INSERT INTO public.services (business_id, name, duration_minutes, price_dzd, display_order)
  SELECT p_business_id, s.name, s.duration_minutes, s.price_dzd, s.display_order
  FROM jsonb_to_recordset(p_services) AS s(name TEXT, duration_minutes INT, price_dzd INT, display_order INT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_services(UUID, JSONB) TO authenticated;

-- -----------------------------------------------------------
-- check_plan_booking_limit — enforces free-plan 30-booking monthly cap
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_plan_booking_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM businesses WHERE id = NEW.business_id;

  IF v_plan = 'free' THEN
    v_limit := 30;

    SELECT (
      (SELECT COUNT(*) FROM bookings
       WHERE business_id = NEW.business_id
         AND date_trunc('month', created_at) = date_trunc('month', NOW())
         AND status NOT IN ('cancelled', 'no_show'))
      +
      (SELECT COUNT(*) FROM queue_tickets
       WHERE business_id = NEW.business_id
         AND date_trunc('month', created_at) = date_trunc('month', NOW())
         AND status NOT IN ('cancelled', 'no_show'))
    ) INTO v_count;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Limite atteinte. Passez au plan Pro pour continuer à accepter des réservations ce mois-ci.';
    END IF;
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
-- get_default_whatsapp_templates — returns built-in template rows
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_default_whatsapp_templates()
RETURNS TABLE (
  template_key TEXT,
  name TEXT,
  description TEXT,
  message_template TEXT,
  variables TEXT[]
) LANGUAGE sql STABLE AS $$
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

-- Plan limit on bookings
DROP TRIGGER IF EXISTS check_plan_limit_trigger ON public.bookings;
CREATE TRIGGER check_plan_limit_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_plan_booking_limit();

-- Plan limit on queue tickets
DROP TRIGGER IF EXISTS check_plan_limit_queue_trigger ON public.queue_tickets;
CREATE TRIGGER check_plan_limit_queue_trigger
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_plan_booking_limit();

-- Service/staff business ownership check
DROP TRIGGER IF EXISTS check_booking_service_business_trigger ON public.bookings;
CREATE TRIGGER check_booking_service_business_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_service_business();

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

DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
      WHERE sm.profile_id = auth.uid() AND b.id = business_id
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
      WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_tickets.business_id
    )
  );

DROP POLICY IF EXISTS "Staff can update business queue" ON public.queue_tickets;
CREATE POLICY "Staff can update business queue" ON public.queue_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid() AND sm.business_id = queue_tickets.business_id
    )
  );

DROP POLICY IF EXISTS "Public can insert queue tickets" ON public.queue_tickets;
CREATE POLICY "Public can insert queue tickets" ON public.queue_tickets
  FOR INSERT TO anon WITH CHECK (client_id IS NULL);

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

DROP POLICY IF EXISTS "Clients can insert reviews" ON public.reviews;
CREATE POLICY "Clients can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update own reviews" ON public.reviews;
CREATE POLICY "Clients can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = client_id);

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

DROP POLICY IF EXISTS "Public can view business assets" ON storage.objects;
CREATE POLICY "Public can view business assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'business-assets');

-- Fixed: uses ANY(foldername(name)) so it works at any folder depth
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
    AND id::text = ANY(storage.foldername(name))
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
    AND id::text = ANY(storage.foldername(name))
  )
);

-- ============================================================
-- BASE PRIVILEGES — required for REST API access
-- Without these, RLS policies never get evaluated (403 error)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
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

-- Double-queue-join prevention (2026-06-26)
-- Only one active ticket per phone per day at the same business
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_ticket_per_phone
  ON public.queue_tickets (business_id, client_phone, queue_date)
  WHERE status IN ('waiting', 'called', 'in_service');

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_templates;
