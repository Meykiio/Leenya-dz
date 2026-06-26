import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  statusLabels: Record<string, string>;
}

export default function BookingFilters({ selectedDate, onDateChange, search, onSearchChange, statusFilter, onStatusFilterChange, statusLabels }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[180px] justify-start text-left font-normal h-8 text-xs")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {format(selectedDate, "d MMM yyyy", { locale: fr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && onDateChange(d)} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>

      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-2.5 py-1.5 text-xs h-8"
      >
        <option value="all">Tous les statuts</option>
        {Object.entries(statusLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
      </select>
    </div>
  );
}
