import { useState, useEffect } from "react";
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
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--accent)]" />
            {staffName}
          </h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] -mt-2">Choisir les services de ce membre</p>
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {services.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">Aucun service disponible</p>
          ) : (
            services.map((svc) => {
              const checked = selected.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className="flex items-center gap-3 rounded-md border border-[var(--border-default)] px-3 py-2 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
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
        <Button onClick={handleSave} disabled={saving} className="w-full h-8 text-sm gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
