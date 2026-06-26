import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HistoryRow {
  id: string;
  type: "booking" | "queue";
  date: string;
  time: string;
  client_name: string;
  client_phone: string;
  service_name: string | null;
  staff_name: string | null;
  status: string;
  label?: string;
}

const statusStyles: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  confirmed: { label: "Confirme", variant: "secondary" },
  arrived: { label: "Arrive", variant: "secondary" },
  in_service: { label: "En cours", variant: "default" },
  completed: { label: "Termine", variant: "default" },
  cancelled: { label: "Annule", variant: "destructive" },
  no_show: { label: "Absent", variant: "destructive" },
  waiting: { label: "En attente", variant: "outline" },
  called: { label: "Appele", variant: "secondary" },
};

const PAGE_SIZE = 12;

export default function BookingHistoryTable({ data }: { data: HistoryRow[] }) {
  const [filter, setFilter] = useState<"all" | "booking" | "queue">("all");
  const [page, setPage] = useState(0);

  const filtered = filter === "all" ? data : data.filter((r) => r.type === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const headers = "Type,Date,Heure,Client,Telephone,Service,Staff,Label,Statut\n";
    const rows = filtered.map((r) =>
      [
        r.type === "booking" ? "Reservation" : "File",
        r.date, r.time, r.client_name, r.client_phone,
        r.service_name || "", r.staff_name || "", r.label || "",
        statusStyles[r.status]?.label || r.status,
      ].join(",")
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activite-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Historique</CardTitle>
          <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden h-7">
            {(["all", "booking", "queue"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); }}
                className={cn(
                  "px-2.5 text-[10px] font-medium transition-colors",
                  filter === f
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {f === "all" ? "Toutes" : f === "booking" ? "Reservations" : "File"}
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 h-7 text-xs">
          <Download className="h-3 w-3" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead className="hidden lg:table-cell">Staff</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune activite pour cette periode
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((r) => {
                const st = statusStyles[r.status] || { label: r.status, variant: "outline" as const };
                return (
                  <TableRow key={`${r.type}-${r.id}`}>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] px-1.5 py-0",
                        r.type === "booking" ? "text-primary border-primary/30" : "text-warning border-warning/30"
                      )}>
                        {r.type === "booking" ? "RDV" : "File"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{format(parseISO(r.date), "d MMM", { locale: fr })}</div>
                      <div className="text-xs text-muted-foreground">{r.time?.slice(0, 5)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.client_name}</div>
                      <div className="text-xs text-muted-foreground">{r.client_phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{r.service_name || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{r.staff_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} sur {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
