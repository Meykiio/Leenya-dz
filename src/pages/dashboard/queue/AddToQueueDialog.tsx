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

export default function AddToQueueDialog({ open, onClose, name, phone, serviceId, staffId, services, staffMembers, loading, onChangeName, onChangePhone, onChangeService, onChangeStaff, onSubmit }: Props) {
  const { t } = useTranslation("dashboard");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("queue.title")}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("queue.form.name")}</Label>
            <Input value={name} onChange={(e) => onChangeName(e.target.value)} placeholder={t("queue.form.clientName")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("queue.form.phone")}</Label>
            <Input value={phone} onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ""))} placeholder={t("queue.form.phonePlaceholder")} className="h-8 text-sm" />
            <p className="text-[11px] text-muted-foreground/70">{t("common:validation.phone.hint")}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("queue.form.service")}</Label>
            <select value={serviceId} onChange={(e) => onChangeService(e.target.value)} className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm h-8">
              <option value="">{t("queue.form.selectService")}</option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("queue.form.team")}</Label>
            <select value={staffId} onChange={(e) => onChangeStaff(e.target.value)} className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm h-8">
              <option value="">{t("queue.form.noPreference")}</option>
              {staffMembers.map((s) => (<option key={s.id} value={s.id}>{s.display_name}</option>))}
            </select>
          </div>
        </div>
        <Button onClick={onSubmit} disabled={!name || !phone || loading} className="w-full h-8 text-sm">
          {loading ? t("queue.adding") : t("queue.generateTicket")}
        </Button>
      </div>
    </div>
  );
}
