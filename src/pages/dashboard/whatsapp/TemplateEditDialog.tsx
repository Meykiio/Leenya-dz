import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  editingTemplate: string | null;
  editedContent: string;
  onContentChange: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
  variables: string[];
}

export default function TemplateEditDialog({
  editingTemplate,
  editedContent,
  onContentChange,
  onSave,
  onClose,
  variables,
}: Props) {
  const { t } = useTranslation("dashboard");
  return (
    <Dialog open={!!editingTemplate} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("settings.whatsapp.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("settings.whatsapp.editDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground mb-2 block">{t("settings.whatsapp.variables")}:</label>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <Badge key={v} variant="outline" className="text-xs font-mono">
                  {'{'}{v}{'}'}
                </Badge>
              ))}
            </div>
          </div>

          <Textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            placeholder={t("settings.whatsapp.templatePlaceholder")}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common:buttons.cancel")}
          </Button>
          <Button onClick={onSave}>
            {t("common:buttons.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
