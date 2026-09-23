import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const categories = ["bug", "feature", "general"] as const;

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

export default function FeedbackSection() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      category,
      message: message.trim(),
      email: email.trim() || null,
      page_url: window.location.pathname,
    });
    setSending(false);
    if (error) {
      toast({ title: t("landing:feedback.error"), variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: t("landing:feedback.thanks") });
  };

  if (sent) {
    return (
      <section className="py-12 px-4 bg-[var(--bg-dim)]">
        <div className="max-w-md mx-auto text-center space-y-3">
          <h2 className="font-display text-xl font-extrabold text-foreground tracking-[-0.02em]">{t("landing:feedback.thanksTitle")}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{t("landing:feedback.thanksSubtitle")}</p>
          <Button variant="outline" size="sm" onClick={() => { setSent(false); setMessage(""); setCategory("general"); }}>
            {t("landing:feedback.sendAnother")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 bg-[var(--bg-dim)] border-t border-[var(--outline)]" id="feedback">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-xl font-extrabold text-foreground tracking-[-0.02em]">{t("landing:feedback.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t("landing:feedback.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("landing:feedback.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{t("landing:feedback.category." + c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("landing:feedback.message")} *</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required placeholder={t("landing:feedback.messagePlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>
              {t("landing:feedback.email")} <span className="normal-case tracking-normal text-[var(--text-secondary)]">{t("landing:feedback.optional")}</span>
            </Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("landing:feedback.emailPlaceholder")} />
          </div>
          <Button type="submit" disabled={sending || !message.trim()} className="w-full h-11">
            {sending ? t("landing:feedback.sending") : t("landing:feedback.send")}
          </Button>
        </form>
      </div>
    </section>
  );
}