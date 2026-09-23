import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Bug, Lightbulb, Send, CheckCircle2 } from "lucide-react";
import type { FeedbackCategory } from "@/types";

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

const DashboardFeedback = () => {
  const { t } = useTranslation();
  const categories: { value: FeedbackCategory; label: string; icon: typeof Bug }[] = [
    { value: "bug", label: t("dashboard:feedback.category.bug"), icon: Bug },
    { value: "feature", label: t("dashboard:feedback.category.feature"), icon: Lightbulb },
    { value: "general", label: t("dashboard:feedback.category.general"), icon: MessageSquare },
  ];
  const [category, setCategory] = useState<FeedbackCategory>("general");
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
      toast({ title: t("dashboard:feedback.error"), description: t("dashboard:feedback.errorDesc"), variant: "destructive" });
      return;
    }

    setSent(true);
    toast({ title: t("dashboard:feedback.thanks"), description: t("dashboard:feedback.thanksDesc") });
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
          </div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:feedback.thanksTitle")}</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            {t("dashboard:feedback.thanksSubtitle")}
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSent(false); setMessage(""); setEmail(""); }}>
            {t("dashboard:feedback.sendAnother")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">{t("dashboard:feedback.title")}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t("dashboard:feedback.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className={labelClass}>{t("dashboard:feedback.category")}</Label>
          <div className="flex gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-1.5 rounded-[5px] border px-3 py-2 text-xs font-medium transition-all ${
                  category === c.value
                    ? "bg-[var(--accent-light)] border-primary text-[var(--accent)]"
                    : "bg-[var(--bg-muted)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                }`}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className={labelClass}>
            {t("dashboard:feedback.message")}
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("dashboard:feedback.messagePlaceholder")}
            rows={5}
            required
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>
            {t("dashboard:feedback.email")} <span className="text-[var(--text-secondary)]">{t("dashboard:feedback.optional")}</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("dashboard:feedback.emailPlaceholder")}
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            {t("dashboard:feedback.emailHint")}
          </p>
        </div>

        <Button type="submit" disabled={!message.trim() || sending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {sending ? t("dashboard:feedback.sending") : t("dashboard:feedback.send")}
        </Button>
      </form>
    </div>
  );
};

export default DashboardFeedback;