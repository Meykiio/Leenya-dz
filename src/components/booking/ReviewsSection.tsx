import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
}

export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (reviews.length === 0) return null;

  const visible = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="px-5 py-6 space-y-4">
      <h2 className="text-[15px] font-semibold text-foreground">{t("booking:businessPublic.reviewsSection.title")}</h2>
      <div className="space-y-2">
        {visible.map((r) => (
          <div key={r.id} className="rounded-md border border-border p-4 space-y-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                />
              ))}
            </div>
            {r.comment && <p className="text-[13px] text-foreground leading-relaxed">{r.comment}</p>}
            {r.created_at && (
              <p className="text-[12px] text-muted-foreground">
                {format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </div>
        ))}
      </div>
      {reviews.length > 3 && !showAll && (
        <Button variant="ghost" size="sm" className="w-full text-[13px]" onClick={() => setShowAll(true)}>
          {t("booking:businessPublic.reviewsSection.seeMore", { count: reviews.length - 3 })}
        </Button>
      )}
    </div>
  );
}
