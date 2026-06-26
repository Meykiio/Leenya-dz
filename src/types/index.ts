export type { Profile, UserRole } from "./auth";
export type { Business, Service, BusinessHour, BusinessTab } from "./business";
export type { StaffMember, StaffService } from "./staff";
export type {
  Booking, QueueTicket, Review, QueueCounter,
  NewBookingForm, NewQueueTicketForm, BookingFilters,
} from "./booking";

export interface MetricCard {
  label: string;
  value: number | string;
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  pulse?: boolean;
}

export type AnalyticsRange = "week" | "month" | "3months";

export type WhatsAppTemplateKey =
  | 'booking_new'
  | 'booking_accepted'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'queue_called'
  | 'queue_joined'
  | 'booking_completed';

export interface WhatsAppTemplate {
  id: string;
  business_id: string;
  template_key: WhatsAppTemplateKey;
  name: string;
  description: string;
  message_template: string;
  is_active: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface TemplateVariables {
  booking_new: {
    client_name: string;
    client_phone: string;
    date: string;
    time: string;
    service: string;
  };
  booking_accepted: {
    business_name: string;
    date: string;
    time: string;
    service: string;
    address: string;
  };
  booking_cancelled: {
    business_name: string;
    date: string;
    time: string;
    service: string;
  };
  booking_reminder: {
    business_name: string;
    date: string;
    time: string;
    service: string;
    business_phone: string;
  };
  queue_called: {
    business_name: string;
    ticket_label: string;
    service: string;
  };
  queue_joined: {
    business_name: string;
    ticket_label: string;
    service: string;
    wait_time: string;
  };
  booking_completed: {
    business_name: string;
    service: string;
    review_link: string;
  };
}
