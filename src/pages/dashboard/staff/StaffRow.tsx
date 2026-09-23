import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Camera, Wrench, Trash2, Pencil, Check, X } from "lucide-react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function StaffRow({ member, onToggleActive, onToggleBookings, onUploadAvatar, onOpenServices, onDelete, onRename }: Props) {
  const { t } = useTranslation("dashboard");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(member.display_name);

  const row = (
    <>
      <div className="relative shrink-0">
        <img
          src={member.avatar_url || generatePixelAvatar(member.display_name, 40)}
          alt=""
          className="h-10 w-10 rounded-full object-cover"
        />
        <label className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-card border border-[var(--border-default)] shadow-sm">
          <Camera className="h-2.5 w-2.5 text-[var(--text-secondary)]" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onUploadAvatar(member.id, e.target.files[0]); }}
          />
        </label>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm max-w-[160px]" autoFocus />
            <button onClick={() => { onRename(member.id, editName.trim()); setEditing(false); }} className="text-[var(--success)] p-0.5"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => { setEditing(false); setEditName(member.display_name); }} className="text-[var(--error)] p-0.5"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.display_name}</p>
            <button onClick={() => { setEditName(member.display_name); setEditing(true); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"><Pencil className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {member.services && member.services.length > 0 ? (
            member.services.map((svc) => (
              <Badge key={svc.id} variant="outline" className="px-1.5 py-0">
                {svc.name}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-[var(--text-secondary)]">{t("staff.badge.noService")}</span>
          )}
        </div>
      </div>

      <Badge
        variant="outline"
        className={member.is_active
          ? "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success-border)] shrink-0"
          : "text-[var(--text-secondary)] shrink-0"
        }
      >
        {member.is_active ? t("staff.toggle.active") : t("common:statuses.inactive")}
      </Badge>

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => onOpenServices(member.id)}>
          <Wrench className="h-3 w-3" />
          {t("staff.badge.services", { count: member.services?.length || 0 })}
        </Button>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="hidden sm:inline">{t("staff.toggle.active")}</span>
          <Switch checked={member.is_active} onCheckedChange={() => onToggleActive(member.id, member.is_active)} />
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="hidden sm:inline">{t("staff.toggle.bookings")}</span>
          <Switch checked={member.accepts_bookings} onCheckedChange={() => onToggleBookings(member.id, member.accepts_bookings)} />
        </label>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[var(--error)]">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("staff.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("staff.deleteDesc", { name: member.display_name })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(member.id)} className="bg-[var(--error)] text-white">{t("common:buttons.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop row */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-muted)] transition-colors">
        {row}
      </div>

      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 hover:bg-[var(--bg-muted)] transition-colors">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <img
              src={member.avatar_url || generatePixelAvatar(member.display_name, 40)}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <label className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-card border border-[var(--border-default)] shadow-sm">
              <Camera className="h-2.5 w-2.5 text-[var(--text-secondary)]" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUploadAvatar(member.id, e.target.files[0]); }} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-1">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm max-w-[160px]" autoFocus />
                <button onClick={() => { onRename(member.id, editName.trim()); setEditing(false); }} className="text-[var(--success)] p-0.5"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setEditing(false); setEditName(member.display_name); }} className="text-[var(--error)] p-0.5"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.display_name}</p>
                  <button onClick={() => { setEditName(member.display_name); setEditing(true); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"><Pencil className="h-3 w-3" /></button>
                </div>
                <Badge
                  variant="outline"
                  className={member.is_active
                    ? "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success-border)] shrink-0"
                    : "text-[var(--text-secondary)] shrink-0"
                  }
                >
                  {member.is_active ? t("staff.toggle.active") : t("common:statuses.inactive")}
                </Badge>
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {member.services && member.services.length > 0
                ? member.services.map((svc) => (
                    <Badge key={svc.id} variant="outline" className="px-1.5 py-0">
                      {svc.name}
                    </Badge>
                  ))
                : <span className="text-[10px] text-[var(--text-secondary)]">{t("staff.badge.noService")}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => onOpenServices(member.id)}>
            <Wrench className="h-3 w-3" />
            {t("staff.badge.services", { count: member.services?.length || 0 })}
          </Button>
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
            <span className="text-[11px] text-[var(--text-secondary)]">{t("staff.toggle.active")}</span>
            <Switch checked={member.is_active} onCheckedChange={() => onToggleActive(member.id, member.is_active)} />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[11px] text-[var(--text-secondary)]">{t("staff.toggle.bookings")}</span>
            <Switch checked={member.accepts_bookings} onCheckedChange={() => onToggleBookings(member.id, member.accepts_bookings)} />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[var(--error)]">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("staff.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("staff.deleteDesc", { name: member.display_name })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(member.id)} className="bg-[var(--error)] text-white">{t("common:buttons.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}