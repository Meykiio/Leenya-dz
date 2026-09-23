import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setAdminBusinessId } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, ArrowRight, Shield } from "lucide-react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  wilaya_name: string | null;
  owner_name: string | null;
}

const Admin = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBusinesses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, category, phone, address, wilaya_name, profiles!businesses_owner_id_fkey(full_name)")
        .order("name");

      if (error) {
        console.error("[Admin] fetch error:", error);
      } else if (data) {
        setBusinesses(data.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category,
          phone: b.phone,
          address: b.address,
          wilaya_name: b.wilaya_name,
          owner_name: b.profiles?.full_name ?? null,
        })));
      }
      setLoading(false);
    };

    fetchBusinesses();
  }, [user]);

  const handleManage = (businessId: string) => {
    setAdminBusinessId(businessId);
    navigate("/dashboard");
  };

  const filtered = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.owner_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-base)]">
        <div className="max-w-5xl mx-auto px-4 h-[60px] flex items-center gap-3">
          <Shield className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">Admin</h1>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--badge-blue-border)] px-2 py-1 rounded-[2px]">
            Superadmin
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("leenya_admin_business_id");
              navigate("/");
            }}
            className="text-xs text-[var(--text-secondary)]"
          >
            Back to app
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin:search") || "Search businesses..."}
            className="pl-9"
          />
        </div>

        <div className="grid gap-2">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              {t("admin:noResults") || "No businesses found"}
            </p>
          )}
          {filtered.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-card px-3 py-2.5 hover:border-primary transition-colors"
            >
              <img
                src={generatePixelAvatar(b.name, 32)}
                alt=""
                className="h-8 w-8 rounded-full shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {b.name}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {b.category && `${b.category}`}
                  {b.wilaya_name && ` · ${b.wilaya_name}`}
                  {b.owner_name && ` · ${b.owner_name}`}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleManage(b.id)}
                className="shrink-0 gap-1.5 text-xs"
              >
                Manage <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;