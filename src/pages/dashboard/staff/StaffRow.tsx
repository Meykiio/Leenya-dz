import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Camera, Wrench } from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/avatar";

interface StaffWithServices {
  id: string;
  display_name: string;
  is_active: boolean;
  accepts_bookings: boolean;
  avatar_url: string | null;
  services: { id: string; name: string }[];
}

interface Props {
  member: StaffWithServices;
  onToggleActive: (id: string, current: boolean) => void;
  onToggleBookings: (id: string, current: boolean) => void;
  onUploadAvatar: (id: string, file: File) => void;
  onOpenServices: (id: string) => void;
}

export default function StaffRow({ member, onToggleActive, onToggleBookings, onUploadAvatar, onOpenServices }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors">
      <div className="relative shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: getAvatarColor(member.display_name), color: "#1a1a2e" }}
          >
            {getInitials(member.display_name)}
          </div>
        )}
        <label className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-base)] border border-[var(--border-default)] shadow-sm">
          <Camera className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onUploadAvatar(member.id, e.target.files[0]); }}
          />
        </label>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.display_name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {member.services && member.services.length > 0 ? (
            member.services.map((svc) => (
              <Badge key={svc.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {svc.name}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-[var(--text-tertiary)]">Aucun service</span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={member.is_active
          ? "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success-border)] text-[11px]"
          : "text-[var(--text-tertiary)] text-[11px]"
        }
      >
        {member.is_active ? "Actif" : "Inactif"}
      </Badge>
      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => onOpenServices(member.id)}>
          <Wrench className="h-3 w-3" />
          {member.services?.length || 0} services
        </Button>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="hidden sm:inline">Actif</span>
          <Switch checked={member.is_active} onCheckedChange={() => onToggleActive(member.id, member.is_active)} />
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="hidden sm:inline">Reservations</span>
          <Switch checked={member.accepts_bookings} onCheckedChange={() => onToggleBookings(member.id, member.accepts_bookings)} />
        </label>
      </div>
    </div>
  );
}
