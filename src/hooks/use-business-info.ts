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
 * First checks `businesses` by owner_id, then falls back to `staff_members` join.
 * Returns the business data and a loading flag. Refetches when the user changes.
 */
export function useBusinessInfo() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBusiness = async () => {
      setLoading(true);

      const { data: ownerBiz } = await supabase
        .from("businesses")
        .select("id, name, slug, category, phone")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (ownerBiz) {
        setBusiness(ownerBiz as BusinessInfo);
        setLoading(false);
        return;
      }

      const { data: staffBiz } = await supabase
        .from("staff_members")
        .select("businesses!inner(id, name, slug, category, phone)")
        .eq("profile_id", user.id)
        .limit(1)
        .single();

      if (staffBiz) {
        const biz = staffBiz.businesses as unknown as BusinessInfo;
        setBusiness(biz);
      } else {
        setBusiness(null);
      }
      setLoading(false);
    };

    fetchBusiness();
  }, [user]);

  return { business, loading };
}
