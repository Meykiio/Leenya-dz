import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BusinessHeaderProps {
  business: {
    name: string;
    category: string | null;
    address: string | null;
    wilaya_name: string | null;
    phone: string | null;
    logo_url: string | null;
    cover_url: string | null;
  };
  avgRating: number | null;
  reviewCount: number;
  openStatus: { isOpen: boolean; closesAt: string | null } | null;
}

export default function BusinessHeader({ business, avgRating, reviewCount, openStatus }: BusinessHeaderProps) {
  const { t } = useTranslation();
  const initials = business.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const categoryLabel = business.category
    ? ({
        beauty_salon: t("booking:businessPublic.category.beautySalon"),
        barbershop: t("booking:businessPublic.category.barbershop"),
        clinic: t("booking:businessPublic.category.clinic"),
        dental: t("booking:businessPublic.category.dental"),
        physiotherapy: t("booking:businessPublic.category.physiotherapy"),
        veterinary: t("booking:businessPublic.category.veterinary"),
        other: t("booking:businessPublic.category.other"),
      } as Record<string, string>)[business.category] ?? business.category
    : null;
  const locationParts = [categoryLabel, business.wilaya_name].filter(Boolean);

  return (
    <div>
      {/* Cover */}
      {business.cover_url ? (
        <div className="h-[140px] w-full overflow-hidden">
          <img src={business.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-[140px] w-full bg-muted" />
      )}

      {/* Info */}
      <div className="px-5 pb-5">
        {/* Logo */}
        <Avatar className="h-[52px] w-[52px] -mt-[26px] border-[3px] border-background shadow-sm">
          {business.logo_url && <AvatarImage src={business.logo_url} alt={business.name} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-base font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <h1 className="text-[19px] font-bold text-foreground tracking-tight mt-2.5">
          {business.name}
        </h1>

        {/* Category + location */}
        {locationParts.length > 0 && (
          <p className="text-[13px] text-muted-foreground mt-1">
            {locationParts.join(" · ")}
          </p>
        )}

        {/* Rating + open status row */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {avgRating !== null && (
            <span className="text-[13px]">
              <span className="font-mono font-medium text-amber-500">★ {avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground"> · {t("booking:businessPublic.reviewCount", { count: reviewCount })}</span>
            </span>
          )}

          {openStatus && (
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span
                className={`h-[5px] w-[5px] rounded-full ${
                  openStatus.isOpen ? "bg-green-500" : "bg-destructive"
                }`}
              />
              {openStatus.isOpen ? (
                <span>
                  {t("booking:businessPublic.openStatus.open")}{openStatus.closesAt ? ` · ${t("booking:businessPublic.openStatus.closesAt", { time: openStatus.closesAt })}` : ""}
                </span>
              ) : (
                <span>{t("booking:businessPublic.openStatus.closed")}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
