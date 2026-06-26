export interface StaffMember {
  id: string;
  business_id: string;
  profile_id: string | null;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  accepts_bookings: boolean;
}

export interface StaffService {
  id: string;
  staff_member_id: string;
  service_id: string;
}
