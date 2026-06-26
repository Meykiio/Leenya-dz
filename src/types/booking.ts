import type { BookingStatus, QueueStatus } from "@/integrations/supabase/types";
import type { Service, Business } from "./business";
import type { StaffMember } from "./staff";

export interface Booking {
  id: string;
  business_id: string;
  service_id: string | null;
  staff_member_id: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  booking_token: string;
  reminder_sent: boolean;
  created_at: string;
  services?: Pick<Service, "name" | "price_dzd" | "duration_minutes"> | null;
  staff_members?: Pick<StaffMember, "display_name"> | null;
  businesses?: Pick<Business, "name"> | null;
}

export interface QueueTicket {
  id: string;
  business_id: string;
  service_id: string | null;
  staff_member_id: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  ticket_number: number;
  ticket_label: string;
  queue_date: string;
  position_in_queue: number | null;
  estimated_wait_minutes: number | null;
  status: QueueStatus;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  services?: Pick<Service, "name"> | null;
  staff_members?: Pick<StaffMember, "display_name"> | null;
}

export interface Review {
  id: string;
  business_id: string;
  booking_id: string | null;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface QueueCounter {
  id: string;
  business_id: string;
  counter_date: string;
  last_number: number;
}

export interface NewBookingForm {
  client_name: string;
  client_phone: string;
  service_id: string;
  staff_member_id: string;
  date: string;
  start_time: string;
  notes: string;
}

export interface NewQueueTicketForm {
  name: string;
  phone: string;
  service_id: string;
  staff_member_id?: string;
}

export interface BookingFilters {
  date: Date;
  status: string;
  search: string;
}
