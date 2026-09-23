import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import type { Service, StaffMember, NewBookingForm } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  form: NewBookingForm;
  onChange: (cb: (prev: NewBookingForm) => NewBookingForm) => void;
  formErrors: Record<string, string>;
  services: Service[];
  staffMembers: StaffMember[];
  loading: boolean;
  onSubmit: () => void;
}

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

export default function NewBookingSlideOver({ open, onClose, form, onChange, formErrors, services, staffMembers, loading, onSubmit }: Props) {
  const { t } = useTranslation("dashboard");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end rtl:justify-start">
      <div className="absolute inset-0 bg-[rgba(9,13,22,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-[var(--border-default)] overflow-y-auto rtl:border-r rtl:border-l-0" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("bookings.new")}</h3>
            <button onClick={onClose} aria-label={t("common:nav.close")}><X className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /></button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("bookings.form.clientName")}</Label>
              <Input value={form.client_name} onChange={(e) => onChange((prev) => ({ ...prev, client_name: e.target.value }))} placeholder={t("bookings.form.fullName")} />
              {formErrors.client_name && <p className="text-xs text-[var(--error)]">{formErrors.client_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("bookings.form.phone")}</Label>
              <div className="flex gap-2">
                <span className="flex h-11 items-center rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-muted)] px-2.5 text-xs text-[var(--text-secondary)] shrink-0">🇩🇿 +213</span>
                <Input value={form.client_phone} onChange={(e) => onChange((prev) => ({ ...prev, client_phone: e.target.value.replace(/\D/g, "") }))} placeholder="5 XX XX XX XX" maxLength={10} />
              </div>
              {formErrors.client_phone && <p className="text-xs text-[var(--error)]">{formErrors.client_phone}</p>}
              {!formErrors.client_phone && <p className="text-[11px] text-muted-foreground/70">{t("common:validation.phone.hint")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("bookings.form.service")}</Label>
              <select value={form.service_id} onChange={(e) => onChange((prev) => ({ ...prev, service_id: e.target.value }))} className="w-full rounded-[5px] border border-[var(--border-default)] bg-card px-2.5 py-1.5 text-sm h-11 text-[var(--text-primary)]">
                <option value="">{t("bookings.form.selectService")}</option>
                {services.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>))}
              </select>
              {formErrors.service_id && <p className="text-xs text-[var(--error)]">{formErrors.service_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("bookings.form.staff")}</Label>
              <select value={form.staff_member_id} onChange={(e) => onChange((prev) => ({ ...prev, staff_member_id: e.target.value }))} className="w-full rounded-[5px] border border-[var(--border-default)] bg-card px-2.5 py-1.5 text-sm h-11 text-[var(--text-primary)]">
                <option value="">{t("bookings.form.selectStaff")}</option>
                {staffMembers.map((s) => (<option key={s.id} value={s.id}>{s.display_name}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("bookings.form.date")}</Label>
                <Input type="date" value={form.date} onChange={(e) => onChange((prev) => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("bookings.form.time")}</Label>
                <Input type="time" value={form.start_time} onChange={(e) => onChange((prev) => ({ ...prev, start_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("bookings.form.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => onChange((prev) => ({ ...prev, notes: e.target.value }))} placeholder={t("bookings.form.notesPlaceholder")} />
            </div>
          </div>

          <Button onClick={onSubmit} disabled={loading} className="w-full h-11">
            {loading ? t("bookings.form.submitting") : t("bookings.form.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}