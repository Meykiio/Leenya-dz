import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, email?: string, password?: string) => Promise<void>;
}

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

export default function AddStaffForm({ open, onClose, onSave }: Props) {
  const { t } = useTranslation("dashboard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onSave(name.trim(), email.trim() || undefined, password || undefined);
    setName("");
    setEmail("");
    setPassword("");
    setShowLogin(false);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(9,13,22,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-primary p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("staff.add")}</h3>
          <button onClick={onClose} aria-label={t("common:nav.close")}><X className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /></button>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className={labelClass}>{t("staff.form.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("bookings.form.fullName")} />
            </div>

            <button
              type="button"
              onClick={() => setShowLogin(!showLogin)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-foreground transition-colors"
            >
              {showLogin ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {t("staff.form.enableLogin")}
            </button>

            {showLogin && (
              <div className="space-y-3 ps-2 border-s-2 border-[var(--border-default)]">
                <div className="space-y-1">
                  <Label className={labelClass}>{t("staff.form.email")}</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("staff.form.emailPlaceholder")} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>{t("staff.form.password")}</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("staff.form.password")} />
                </div>
              </div>
            )}
          </div>
          <Button type="submit" disabled={!name.trim() || loading || (showLogin && (!email.trim() || !password))} className="w-full h-11">
            {loading ? t("staff.adding") : showLogin ? t("staff.addWithAccount") : t("staff.add")}
          </Button>
        </form>
      </div>
    </div>
  );
}