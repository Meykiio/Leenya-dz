import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Copy, Upload, Check, X } from "lucide-react";
import { wilayas } from "@/lib/wilayas";

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
  { value: "beauty_salon", label: "Salon de beauté" },
  { value: "barbershop", label: "Barbershop" },
  { value: "clinic", label: "Clinique" },
  { value: "dental", label: "Dentiste" },
  { value: "physiotherapy", label: "Kinésithérapie" },
  { value: "veterinary", label: "Vétérinaire" },
  { value: "other", label: "Autre" },
];

interface BusinessInfoTabProps {
  businessId: string;
}

export default function BusinessInfoTab({ businessId }: BusinessInfoTabProps) {
  const [form, setForm] = useState({
    name: "", description: "", phone: "", address: "",
    wilaya_code: "", wilaya_name: "", category: "other",
    slug: "", logo_url: "", cover_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  useEffect(() => {
    supabase.from("businesses").select("*").eq("id", businessId).single().then(({ data, error }) => {
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
        });
      }
    });
  }, [businessId]);

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .neq("id", businessId)
      .limit(1);
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
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erreur upload", description: error.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("business-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, [`${type}_url`]: publicUrl }));
    toast({ title: `${type === "logo" ? "Logo" : "Photo de couverture"} mis à jour` });
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
      category: form.category as any,
      slug: form.slug,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
    }).eq("id", businessId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Informations enregistrées ✓" });
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/${form.slug}`);
    toast({ title: "Lien copié!" });
  };

  return (
    <div className="space-y-4">
      {/* Public link */}
      <Card>
        <CardHeader><CardTitle className="text-base">Votre lien public</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm text-primary truncate">
              {window.location.host}/{form.slug}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1 shrink-0">
              <Copy className="h-3 w-3" /> Copier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-16 w-16 rounded-full object-cover border" />
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" />
                <span>Changer le logo</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")} />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Photo de couverture</Label>
              {form.cover_url && (
                <img src={form.cover_url} alt="Cover" className="h-20 w-full rounded-md object-cover border" />
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" />
                <span>Changer la couverture</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "cover")} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de l'entreprise</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <div className="relative">
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
              {slugAvailable !== null && !slugChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugAvailable ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                </div>
              )}
            </div>
            {slugAvailable === false && (
              <p className="text-xs text-destructive">Ce slug est déjà pris</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre entreprise..." />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Wilaya</Label>
            <Select
              value={form.wilaya_code}
              onValueChange={(v) => {
                const w = wilayas.find((w) => w.code === v);
                setForm({ ...form, wilaya_code: v, wilaya_name: w?.name || "" });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionnez une wilaya" /></SelectTrigger>
              <SelectContent>
                {wilayas.map((w) => (
                  <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={loading || slugAvailable === false} className="w-full sm:w-auto">
        {loading ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </div>
  );
}
