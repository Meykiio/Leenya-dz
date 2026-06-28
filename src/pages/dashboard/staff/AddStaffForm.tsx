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
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("staff.add")}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("staff.form.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("bookings.form.fullName")} className="h-8 text-sm" />
            </div>

            <button
              type="button"
              onClick={() => setShowLogin(!showLogin)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showLogin ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {t("staff.form.enableLogin")}
            </button>

            {showLogin && (
              <div className="space-y-3 pl-2 border-l-2 border-border">
                <div className="space-y-1">
                  <Label className="text-xs">{t("staff.form.email")}</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("staff.form.emailPlaceholder")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("staff.form.password")}</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("staff.form.password")} className="h-8 text-sm" />
                </div>
              </div>
            )}
          </div>
          <Button type="submit" disabled={!name.trim() || loading || (showLogin && (!email.trim() || !password))} className="w-full h-8 text-sm">
            {loading ? t("staff.adding") : showLogin ? t("staff.addWithAccount") : t("staff.add")}
          </Button>
        </form>
      </div>
    </div>
  );
}
