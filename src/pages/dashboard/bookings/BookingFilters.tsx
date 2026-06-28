import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CalendarIcon, Search, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";

interface Props {
  filterMode: "upcoming" | "date";
  onFilterModeChange: (m: "upcoming" | "date") => void;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  statusLabels: Record<string, string>;
}

export default function BookingFilters({ filterMode, onFilterModeChange, selectedDate, onDateChange, search, onSearchChange, statusFilter, onStatusFilterChange, statusLabels }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("fr") ? fr : i18n.language?.startsWith("ar") ? ar : enUS;
  return (
    <div className="flex flex-wrap gap-2.5 items-center">
      <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden h-8">
        <button
          onClick={() => onFilterModeChange("upcoming")}
          className={cn(
            "px-3 text-xs font-medium transition-colors",
            filterMode === "upcoming"
              ? "bg-accent text-white"
              : "bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          )}
        >
          {t("dashboard:bookings.filterUpcoming")}
        </button>
        <button
          onClick={() => onFilterModeChange("date")}
          className={cn(
            "px-3 text-xs font-medium transition-colors",
            filterMode === "date"
              ? "bg-accent text-white"
              : "bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          )}
        >
          {t("dashboard:bookings.filterByDate")}
        </button>
      </div>

      {filterMode === "date" ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[180px] justify-start text-left font-normal h-8 text-xs")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(selectedDate, "d MMM yyyy", { locale: dateLocale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && onDateChange(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => onDateChange(new Date())}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {t("dashboard:bookings.filterToday")}
        </Button>
      )}

      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)] rtl:left-auto rtl:right-2.5" />
        <Input placeholder={t("common:labels.search")} value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-8 h-8 text-xs rtl:pl-0 rtl:pr-8" />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-2.5 py-1.5 text-xs h-8"
      >
        <option value="all">{t("dashboard:bookings.filterStatus")}</option>
        {Object.entries(statusLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
      </select>
    </div>
  );
}
