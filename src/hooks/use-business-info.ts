import { useCallback, useEffect, useMemo, useState } from "react";
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

const ADMIN_BUSINESS_KEY = "leenya_admin_business_id";

/**
 * Hook to fetch business info.
 * - Normal flow: looks up by owner_id, then staff member fallback.
 * - Superadmin override: if `leenya_admin_business_id` is set in localStorage,
 *   fetches that business directly (ignores ownership).
 */
export function useBusinessInfo() {
  const { user, role } = useAuth();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for admin business ID changes
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("leenya-admin-switch", handler);
    return () => window.removeEventListener("leenya-admin-switch", handler);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchBusiness = async () => {
      setLoading(true);

      // Superadmin override: fetch any business by ID from localStorage
      const adminBusinessId = localStorage.getItem(ADMIN_BUSINESS_KEY);
      if (role === "superadmin" && adminBusinessId) {
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, category, phone")
          .eq("id", adminBusinessId)
          .limit(1)
          .maybeSingle();

        if (data) {
          setBusiness(data as BusinessInfo);
          setLoading(false);
          return;
        }
        // Invalid override — clear it
        localStorage.removeItem(ADMIN_BUSINESS_KEY);
      }

      const { data: ownerBiz } = await supabase
        .from("businesses")
        .select("id, name, slug, category, phone")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

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
        .maybeSingle();

      if (staffBiz) {
        const biz = staffBiz.businesses as unknown as BusinessInfo;
        setBusiness(biz);
      } else {
        setBusiness(null);
      }
      setLoading(false);
    };

    fetchBusiness();
  }, [user, role, refreshKey]);

  return useMemo(() => ({ business, loading }), [business, loading]);
}

/** Set the admin business override. Reloads the page to pick up the change cleanly. */
export function setAdminBusinessId(businessId: string | null) {
  if (businessId) {
    localStorage.setItem(ADMIN_BUSINESS_KEY, businessId);
  } else {
    localStorage.removeItem(ADMIN_BUSINESS_KEY);
  }
  window.dispatchEvent(new CustomEvent("leenya-admin-switch"));
}

/** Get the current admin business ID from localStorage. */
export function getAdminBusinessId(): string | null {
  return localStorage.getItem(ADMIN_BUSINESS_KEY);
}

/** Clear the admin override. */
export function clearAdminBusinessId() {
  localStorage.removeItem(ADMIN_BUSINESS_KEY);
  window.dispatchEvent(new CustomEvent("leenya-admin-switch"));
}
