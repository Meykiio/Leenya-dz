import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X, Save, Wrench } from "lucide-react";

interface ServiceOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  staffName: string;
  services: ServiceOption[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (selected: string[]) => Promise<void>;
}

export default function ServiceAssignmentDialog({ open, staffName, services, selectedIds, onClose, onSave }: Props) {
  const { t } = useTranslation("dashboard");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(selectedIds);
  }, [open, selectedIds]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[rgba(9,13,22,0.7)]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-primary p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-[var(--text-primary)] flex items-center gap-2 tracking-[-0.015em]">
            <Wrench className="h-4 w-4 text-[var(--accent)]" />
            {staffName}
          </h3>
          <button onClick={onClose} aria-label={t("common:nav.close")}><X className="h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /></button>
        </div>
        <p className="text-xs text-[var(--text-secondary)] -mt-2">{t("staff.serviceDialog.title")}</p>
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {services.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("staff.serviceDialog.empty")}</p>
          ) : (
            services.map((svc) => {
              const checked = selected.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className="flex items-center gap-3 rounded-[8px] border border-[var(--border-default)] px-3 py-2 cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelected((prev) =>
                        checked ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                      );
                    }}
                    className="h-4 w-4 rounded border-[var(--border-default)] accent-primary"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{svc.name}</span>
                </label>
              );
            })
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? t("common:buttons.saving") : t("common:buttons.save")}
        </Button>
      </div>
    </div>
  );
}