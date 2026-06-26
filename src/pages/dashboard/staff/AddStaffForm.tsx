import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function AddStaffForm({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onSave(name.trim());
    setName("");
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Ajouter un membre</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="h-8 text-sm" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={!name.trim() || loading} className="w-full h-8 text-sm">
          {loading ? "Ajout..." : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
