import type { AppRole } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_lang: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}
