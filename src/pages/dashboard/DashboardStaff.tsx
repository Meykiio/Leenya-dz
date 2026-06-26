import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, UserCheck } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import type { StaffMember } from "@/types";
import StaffRow from "./staff/StaffRow";
import AddStaffForm from "./staff/AddStaffForm";
import ServiceAssignmentDialog from "./staff/ServiceAssignmentDialog";

interface StaffWithServices extends StaffMember {
  avatar_url: string | null;
  services: { id: string; name: string }[];
}

interface ServiceOption {
  id: string;
  name: string;
}

const DashboardStaff = () => {
  const { business } = useBusinessInfo();
  const [staff, setStaff] = useState<StaffWithServices[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const fetchStaff = async () => {
    if (!business) return;
    const { data, error } = await supabase
      .from("staff_members")
      .select("id, display_name, is_active, accepts_bookings, avatar_url")
      .eq("business_id", business.id)
      .order("display_name");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setStaff(data || []);
    setInitialLoading(false);
  };

  const fetchServices = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("services")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("display_order");
    setServices(data || []);
  };

  const fetchStaffServices = async (staffId: string): Promise<string[]> => {
    const { data } = await supabase
      .from("staff_services")
      .select("service_id")
      .eq("staff_member_id", staffId);
    return (data || []).map((s) => s.service_id);
  };

  const loadServiceAssignments = async () => {
    if (!business) return;
    const { data: ssData } = await supabase
      .from("staff_services")
      .select("staff_member_id, service_id")
      .in("staff_member_id", (staff || []).map((s) => s.id));
    const { data: svcData } = await supabase
      .from("services")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("display_order");
    const svcMap = (svcData || []).reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>);
    const staffSvcMap: Record<string, { id: string; name: string }[]> = {};
    (ssData || []).forEach((ss) => {
      if (!staffSvcMap[ss.staff_member_id]) staffSvcMap[ss.staff_member_id] = [];
      if (svcMap[ss.service_id]) {
        staffSvcMap[ss.staff_member_id].push({ id: ss.service_id, name: svcMap[ss.service_id] });
      }
    });
    setStaff((prev) => prev.map((s) => ({ ...s, services: staffSvcMap[s.id] || [] })));
  };

  useEffect(() => { fetchStaff(); fetchServices(); }, [business]);
  useEffect(() => { if (staff.length > 0) loadServiceAssignments(); }, [staff.length]);

  const addStaff = async (name: string) => {
    if (!business) return;
    const { error } = await supabase.from("staff_members").insert({
      business_id: business.id,
      display_name: name,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Membre ajoute" });
    fetchStaff();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("staff_members").update({ is_active: !current }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    fetchStaff();
  };

  const toggleBookings = async (id: string, current: boolean) => {
    const { error } = await supabase.from("staff_members").update({ accepts_bookings: !current }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    fetchStaff();
  };

  const uploadAvatar = async (staffId: string, file: File) => {
    if (!business) return;
    const ext = file.name.split(".").pop();
    const path = `staff-avatars/${business.id}/${staffId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: "Erreur upload", description: uploadError.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("business-assets").getPublicUrl(path);
    const { error: updateError } = await supabase.from("staff_members").update({ avatar_url: publicUrl }).eq("id", staffId);
    if (updateError) { toast({ title: "Erreur", description: updateError.message, variant: "destructive" }); return; }
    toast({ title: "Avatar mis a jour" });
    fetchStaff();
  };

  const openServiceDialog = async (staffId: string) => {
    setEditStaffId(staffId);
    const assigned = await fetchStaffServices(staffId);
    setSelectedServices(assigned);
  };

  const saveServiceAssignment = async (selected: string[]) => {
    if (!editStaffId) return;
    const current = await fetchStaffServices(editStaffId);
    const toAdd = selected.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !selected.includes(id));
    if (toRemove.length > 0) {
      await supabase.from("staff_services").delete().eq("staff_member_id", editStaffId).in("service_id", toRemove);
    }
    if (toAdd.length > 0) {
      await supabase.from("staff_services").insert(toAdd.map((service_id) => ({ staff_member_id: editStaffId, service_id })));
    }
    toast({ title: "Services mis a jour" });
    loadServiceAssignments();
  };

  const editingMember = editStaffId ? staff.find((s) => s.id === editStaffId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Equipe</h2>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter un membre
          </Button>
        </div>

        {initialLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-default)] py-12 text-center">
            <UserCheck className="h-7 w-7 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-tertiary)]">Aucun membre d'equipe</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Ajoutez vos collaborateurs pour gerer les reservations</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-3 text-xs">Ajouter un membre</Button>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] divide-y divide-[var(--border-subtle)]">
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                member={s}
                onToggleActive={toggleActive}
                onToggleBookings={toggleBookings}
                onUploadAvatar={uploadAvatar}
                onOpenServices={openServiceDialog}
              />
            ))}
          </div>
        )}

        <AddStaffForm open={showForm} onClose={() => setShowForm(false)} onSave={addStaff} />

        <ServiceAssignmentDialog
          open={!!editStaffId}
          staffName={editingMember?.display_name || ""}
          services={services}
          selectedIds={selectedServices}
          onClose={() => setEditStaffId(null)}
          onSave={saveServiceAssignment}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardStaff;
