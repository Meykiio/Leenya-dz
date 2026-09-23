import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { Service } from "@/types";

interface StaffMember {
  id: string;
  display_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  serviceId: string;
  staffId: string;
  services: Service[];
  staffMembers: StaffMember[];
  loading: boolean;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeService: (v: string) => void;
  onChangeStaff: (v: string) => void;
  onSubmit: () => void;
}

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

export default function AddToQueueDialog({ open, onClose, name, phone, serviceId, staffId, services, staffMembers, loading, onChangeName, onChangePhone, onChangeService, onChangeStaff, onSubmit }: Props) {
  const { t } = useTranslation("dashboard");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(9,13,22,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-primary p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("queue.title")}</h3>
          <button onClick={onClose} aria-label={t("common:nav.close")}><X className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className={labelClass}>{t("queue.form.name")}</Label>
            <Input value={name} onChange={(e) => onChangeName(e.target.value)} placeholder={t("queue.form.clientName")} />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>{t("queue.form.phone")}</Label>
            <Input value={phone} onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ""))} placeholder={t("queue.form.phonePlaceholder")} />
            <p className="text-[11px] text-muted-foreground/70">{t("common:validation.phone.hint")}</p>
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>{t("queue.form.service")}</Label>
            <select value={serviceId} onChange={(e) => onChangeService(e.target.value)} className="w-full rounded-[5px] border border-[var(--border-default)] bg-card px-3 py-1.5 text-sm h-11 text-[var(--text-primary)]">
              <option value="">{t("queue.form.selectService")}</option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>{t("queue.form.team")}</Label>
            <select value={staffId} onChange={(e) => onChangeStaff(e.target.value)} className="w-full rounded-[5px] border border-[var(--border-default)] bg-card px-3 py-1.5 text-sm h-11 text-[var(--text-primary)]">
              <option value="">{t("queue.form.noPreference")}</option>
              {staffMembers.map((s) => (<option key={s.id} value={s.id}>{s.display_name}</option>))}
            </select>
          </div>
        </div>
        <Button onClick={onSubmit} disabled={!name || !phone || loading} className="w-full h-11">
          {loading ? t("queue.adding") : t("queue.generateTicket")}
        </Button>
      </div>
    </div>
  );
}