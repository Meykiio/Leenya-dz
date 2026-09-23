import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Copy, Upload, Check, X, Trash2 } from "lucide-react";
import { wilayas } from "@/lib/wilayas";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import PixelCover from "@/components/booking/PixelCover";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const categoryOptions = [
  { value: "beauty_salon", labelKey: "dashboard:settings.business.category.beautySalon" },
  { value: "barbershop", labelKey: "dashboard:settings.business.category.barbershop" },
  { value: "clinic", labelKey: "dashboard:settings.business.category.clinic" },
  { value: "dental", labelKey: "dashboard:settings.business.category.dental" },
  { value: "physiotherapy", labelKey: "dashboard:settings.business.category.physiotherapy" },
  { value: "veterinary", labelKey: "dashboard:settings.business.category.veterinary" },
  { value: "other", labelKey: "dashboard:settings.business.category.other" },
];

interface BusinessInfoTabProps {
  businessId: string;
}

export default function BusinessInfoTab({ businessId }: BusinessInfoTabProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "", description: "", phone: "", address: "",
    wilaya_code: "", wilaya_name: "", category: "other",
    slug: "", logo_url: "", cover_url: "",
    is_queue_paused: false,
  });
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  useEffect(() => {
    supabase.from("businesses").select("id, owner_id, name, slug, category, description, phone, address, wilaya_code, wilaya_name, logo_url, cover_url, is_active, accepts_walkins, accepts_appointments, advance_booking_days, plan, trial_ends_at, queue_capacity, is_queue_paused").eq("id", businessId).single().then(({ data, error }) => {
      if (error) {
        if (import.meta.env.DEV) console.error('[BusinessInfoTab] failed to fetch business:', error.message);
        return;
      }
      if (data) {
        setForm({
          name: data.name || "",
          description: data.description || "",
          phone: data.phone || "",
          address: data.address || "",
          wilaya_code: data.wilaya_code || "",
          wilaya_name: data.wilaya_name || "",
          category: data.category || "other",
          slug: data.slug || "",
          logo_url: data.logo_url || "",
          cover_url: data.cover_url || "",
          is_queue_paused: data.is_queue_paused ?? false,
        });
      }
    });
  }, [businessId]);

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .neq("id", businessId)
      .limit(1);
    if (error) { console.error("checkSlug:", error); setSlugChecking(false); return; }
    setSlugAvailable(!data || data.length === 0);
    setSlugChecking(false);
  }, [businessId]);

  useEffect(() => {
    const timer = setTimeout(() => checkSlug(form.slug), 500);
    return () => clearTimeout(timer);
  }, [form.slug, checkSlug]);

  const uploadFile = async (file: File, type: "logo" | "cover") => {
    const ext = file.name.split(".").pop();
    const path = `${businessId}/${type}.${ext}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true, cacheControl: "no-cache" });
    if (error) {       toast({ title: t("common:toast.error"), description: error.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("business-assets").getPublicUrl(path);
    const cacheBustedUrl = `${publicUrl}?cb=${Date.now()}`;
    const tKey = type === "logo" ? t("dashboard:settings.business.toast.logoUpdated") : t("dashboard:settings.business.toast.coverUpdated");
    toast({ title: tKey });
    const key = `${type}_url` as "logo_url" | "cover_url";
    setForm((f) => ({ ...f, [key]: cacheBustedUrl }));
    await supabase.from("businesses").update({ [key]: cacheBustedUrl }).eq("id", businessId);
  };

  const removeImage = async (type: "logo" | "cover") => {
    const key = `${type}_url` as "logo_url" | "cover_url";
    setForm((f) => ({ ...f, [key]: "" }));
    await supabase.from("businesses").update({ [key]: null }).eq("id", businessId);
    const tKey = type === "logo" ? t("dashboard:settings.business.toast.logoRemoved") : t("dashboard:settings.business.toast.coverRemoved");
    toast({ title: tKey });
  };

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("businesses").update({
      name: form.name,
      description: form.description || null,
      phone: form.phone || null,
      address: form.address || null,
      wilaya_code: form.wilaya_code || null,
      wilaya_name: form.wilaya_name || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: form.category as any,
      slug: form.slug,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      is_queue_paused: form.is_queue_paused,
    }).eq("id", businessId);
    if (error) { console.error("save business info:", error); toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" }); }
    else toast({ title: t("dashboard:settings.business.toast.saved") });
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/${form.slug}`);
    toast({ title: t("dashboard:nav.linkCopied") });
  };

  return (
    <div className="space-y-4">
      {/* Public link */}
      <section className="space-y-3">
        <div className="border-b border-[var(--border-default)] pb-2.5"><h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.business.publicLink")}</h3></div>
        <div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[5px] bg-muted px-3 py-2 font-mono text-sm text-primary truncate min-w-0">
              {window.location.host}/{form.slug}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1 shrink-0">
              <Copy className="h-3 w-3" /> {t("common:buttons.copy")}
            </Button>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="space-y-3">
        <div className="border-b border-[var(--border-default)] pb-2.5"><h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.business.images")}</h3></div>
        <div className="space-y-4">
          <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:items-start">
            <div className="space-y-2 text-center">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.logo")}</Label>
              <div className="relative inline-block">
                <Avatar className="h-16 w-16 border mx-auto">
                  <AvatarImage src={form.logo_url || generatePixelAvatar(form.name || " ", 64)} alt={t("dashboard:settings.business.logo")} />
                  <AvatarFallback className="bg-muted" />
                </Avatar>
                {form.logo_url && (
                  <button onClick={() => removeImage("logo")} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[var(--error)] text-white flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" />
                <span>{t("dashboard:settings.business.changeLogo")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")} />
              </label>
            </div>
            <div className="space-y-2 w-full max-w-full">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground text-center sm:text-left block">{t("dashboard:settings.business.cover")}</Label>
              <div className="relative h-[120px] sm:h-[140px] w-full rounded-[8px] overflow-hidden bg-muted">
                {form.cover_url ? (
                  <>
                    <img src={form.cover_url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removeImage("cover")} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[var(--error)] text-white flex items-center justify-center z-10">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <PixelCover name={form.name || " "} />
                )}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" />
                <span>{t("dashboard:settings.business.changeCover")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "cover")} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Business info */}
      <section className="space-y-3">
        <div className="border-b border-[var(--border-default)] pb-2.5"><h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.business.general")}</h3></div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.name")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.slug")}</Label>
            <div className="relative">
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
              {slugAvailable !== null && !slugChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugAvailable ? <Check className="h-4 w-4 text-[var(--success)]" /> : <X className="h-4 w-4 text-[var(--error)]" />}
                </div>
              )}
            </div>
            {slugAvailable === false && (
              <p className="text-xs text-[var(--error)]">{t("dashboard:settings.business.error.slugTaken")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.category")}</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.description")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("dashboard:settings.business.descriptionPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.phone")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.address")}</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.wilaya")}</Label>
            <Select
              value={form.wilaya_code}
              onValueChange={(v) => {
                const w = wilayas.find((w) => w.code === v);
                setForm({ ...form, wilaya_code: v, wilaya_name: w?.name || "" });
              }}
            >
              <SelectTrigger><SelectValue placeholder={t("common:labels.selectWilaya")} /></SelectTrigger>
              <SelectContent>
                {wilayas.map((w) => (
                  <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Queue settings */}
      <section className="space-y-3">
        <div className="border-b border-[var(--border-default)] pb-2.5"><h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.business.queueSettings")}</h3></div>
        <div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.business.pauseQueue")}</Label>
              <p className="text-xs text-muted-foreground">{t("dashboard:settings.business.pauseQueueHint")}</p>
            </div>
            <Switch checked={form.is_queue_paused} onCheckedChange={(v) => setForm({ ...form, is_queue_paused: v })} />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={loading || slugAvailable === false} className="w-full sm:w-auto">
        {loading ? t("common:buttons.saving") : t("dashboard:settings.business.save")}
      </Button>
    </div>
  );
}
