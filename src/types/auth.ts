import type { AppRole } from "@/integrations/supabase/types";

/** User profile linked to a Supabase auth account */
export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_lang: string;
  created_at: string;
}

/** Role assignment linking a user to their system role */
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}
