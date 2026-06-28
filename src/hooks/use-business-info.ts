import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Summary data about the user's business fetched from the database. */
export interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  phone: string | null;
}

/**
 * Hook to fetch the current user's business info (name, slug, category, phone).
 * Returns the business data and a loading flag. Refetches when the user changes.
 */
export function useBusinessInfo() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("businesses")
      .select("id, name, slug, category, phone")
      .eq("owner_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        setBusiness(data as BusinessInfo | null);
        setLoading(false);
      });
  }, [user]);

  return { business, loading };
}
