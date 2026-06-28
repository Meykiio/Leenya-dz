import type { BusinessCategory } from "@/integrations/supabase/types";

/** A business registered on the platform */
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

/** A service offered by a business (e.g. haircut, consultation) */
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

/** Operating hours for a business on a specific day of the week */
export interface BusinessHour {
  id?: string;
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

/** Active tab in the business detail view: appointment booking or queue */
export type BusinessTab = "appointment" | "queue";
