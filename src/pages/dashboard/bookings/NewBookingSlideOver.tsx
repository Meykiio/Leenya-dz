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

export default function NewBookingSlideOver({ open, onClose, form, onChange, formErrors, services, staffMembers, loading, onSubmit }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--bg-base)] border-l border-[var(--border-default)] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Nouvelle réservation</h3>
            <button onClick={onClose}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du client *</Label>
              <Input value={form.client_name} onChange={(e) => onChange((prev) => ({ ...prev, client_name: e.target.value }))} placeholder="Nom complet" className="h-8 text-sm" />
              {formErrors.client_name && <p className="text-xs text-[var(--error)]">{formErrors.client_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone *</Label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-2.5 text-xs text-[var(--text-tertiary)] shrink-0 h-8">🇩🇿 +213</span>
                <Input value={form.client_phone} onChange={(e) => onChange((prev) => ({ ...prev, client_phone: e.target.value.replace(/\D/g, "") }))} placeholder="5 XX XX XX XX" maxLength={10} className="h-8 text-sm" />
              </div>
              {formErrors.client_phone && <p className="text-xs text-[var(--error)]">{formErrors.client_phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Service *</Label>
              <select value={form.service_id} onChange={(e) => onChange((prev) => ({ ...prev, service_id: e.target.value }))} className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-2.5 py-1.5 text-sm h-8">
                <option value="">Sélectionner</option>
                {services.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>))}
              </select>
              {formErrors.service_id && <p className="text-xs text-[var(--error)]">{formErrors.service_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Membre du personnel</Label>
              <select value={form.staff_member_id} onChange={(e) => onChange((prev) => ({ ...prev, staff_member_id: e.target.value }))} className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-2.5 py-1.5 text-sm h-8">
                <option value="">Sélectionner</option>
                {staffMembers.map((s) => (<option key={s.id} value={s.id}>{s.display_name}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.date} onChange={(e) => onChange((prev) => ({ ...prev, date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Heure</Label>
                <Input type="time" value={form.start_time} onChange={(e) => onChange((prev) => ({ ...prev, start_time: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => onChange((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes optionnelles..." className="text-sm" />
            </div>
          </div>

          <Button onClick={onSubmit} disabled={loading} className="w-full h-8 text-sm">
            {loading ? "Création..." : "Créer la réservation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
