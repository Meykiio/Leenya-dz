import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  service_name: string | null;
  staff_name: string | null;
  duration: number | null;
  price: number | null;
  status: string | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  confirmed: { label: "Confirmé", variant: "secondary" },
  arrived: { label: "Arrivé", variant: "secondary" },
  in_service: { label: "En cours", variant: "default" },
  completed: { label: "Terminé", variant: "default" },
  cancelled: { label: "Annulé", variant: "destructive" },
  no_show: { label: "Absent", variant: "destructive" },
};

const PAGE_SIZE = 10;

export default function BookingHistoryTable({ data }: { data: BookingRow[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const headers = "Date,Heure,Client,Téléphone,Service,Staff,Durée (min),Prix (DZD),Statut\n";
    const rows = data.map((r) =>
      [
        r.date, r.start_time, r.client_name, r.client_phone,
        r.service_name || "", r.staff_name || "", r.duration || "",
        r.price || "", statusLabels[r.status || ""]?.label || r.status
      ].join(",")
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Historique des réservations</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download className="h-3 w-3" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead className="hidden lg:table-cell">Staff</TableHead>
              <TableHead className="hidden md:table-cell">Prix</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune réservation pour cette période
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((r) => {
                const st = statusLabels[r.status || ""] || { label: r.status, variant: "outline" as const };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <div>{format(parseISO(r.date), "d MMM", { locale: fr })}</div>
                      <div className="text-xs text-muted-foreground">{r.start_time?.slice(0, 5)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.client_name}</div>
                      <div className="text-xs text-muted-foreground">{r.client_phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{r.service_name || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{r.staff_name || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {r.price ? `${r.price.toLocaleString("fr-DZ")} DZD` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
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
