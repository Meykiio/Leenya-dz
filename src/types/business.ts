import type { BusinessCategory } from "@/integrations/supabase/types";

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BusinessCategory | null;
  phone: string | null;
  address: string | null;
  wilaya_code: string | null;
  wilaya_name: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_active: boolean | null;
  accepts_appointments: boolean | null;
  accepts_walkins: boolean | null;
  advance_booking_days: number | null;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  duration_minutes: number;
  price_dzd: number | null;
  display_order: number;
  is_active: boolean;
}

export interface BusinessHour {
  id?: string;
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export type BusinessTab = "appointment" | "queue";
