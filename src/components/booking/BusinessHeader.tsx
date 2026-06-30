import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import PixelCover from "./PixelCover";
import { MapPin, Navigation, Phone } from "lucide-react";

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
  openStatus: { isOpen: boolean; closesAt: string | null } | null;
}

export default function BusinessHeader({ business, openStatus }: BusinessHeaderProps) {
  const { t } = useTranslation();
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

  const hasAddress = business.address || business.wilaya_name;
  const mapsUrl = hasAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([business.address, business.wilaya_name].filter(Boolean).join(", "))}`
    : null;

  return (
    <div>
      {/* Cover */}
      {business.cover_url ? (
        <div className="h-[140px] w-full overflow-hidden">
          <img src={business.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <PixelCover name={business.name} />
      )}

      {/* Info */}
      <div className="px-5 pb-5">
        {/* Logo */}
        <Avatar className="h-[52px] w-[52px] -mt-[26px] border-[3px] border-background shadow-sm">
          <AvatarImage src={business.logo_url || generatePixelAvatar(business.name, 52)} alt={business.name} />
          <AvatarFallback className="bg-muted" />
        </Avatar>

        {/* Business name */}
        <h1 className="text-lg font-bold mt-2.5">{business.name}</h1>

        {/* Category + location */}
        {locationParts.length > 0 && (
          <p className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {locationParts.join(" · ")}
          </p>
        )}

        {/* Phone */}
        {business.phone && (
          <p className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {business.phone}
          </p>
        )}

        {/* Open status + Take me there */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
            >
              <Navigation className="h-3.5 w-3.5" />
              {t("booking:businessPublic.takeMeThere")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
