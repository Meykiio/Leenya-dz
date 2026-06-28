import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/avatar";

interface StaffMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  staffMembers: StaffMember[];
  selectedStaff: StaffMember | null | "no_preference";
  onSelect: (s: StaffMember | "no_preference") => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function StepStaff({ staffMembers, selectedStaff, onSelect, onBack, onContinue }: Props) {
  return (
    <motion.div key="staff" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" /> Retour
      </button>
      <h2 className="text-[15px] font-semibold text-foreground mb-3.5">Choisir un membre de l'equipe</h2>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSelect("no_preference")}
          className={`flex items-center justify-between rounded-md border p-[14px_16px] text-left transition-all ${
            selectedStaff === "no_preference"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-foreground/20 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className={`text-[14px] font-medium ${selectedStaff === "no_preference" ? "text-primary" : "text-foreground"}`}>
                Pas de preference
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Le premier disponible</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 shrink-0 ${selectedStaff === "no_preference" ? "text-primary" : "text-muted-foreground"}`} />
        </button>
        {staffMembers.map((s) => {
          const isSelected = selectedStaff !== "no_preference" && selectedStaff?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={`flex items-center justify-between rounded-md border p-[14px_16px] text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/20 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ backgroundColor: getAvatarColor(s.display_name), color: "#1a1a2e" }}
                  >
                    {getInitials(s.display_name)}
                  </div>
                )}
                <div>
                  <p className={`text-[14px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {s.display_name}
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <Button className="w-full mt-5 h-[44px]" onClick={onContinue}>
        Continuer
      </Button>
    </motion.div>
  );
}
