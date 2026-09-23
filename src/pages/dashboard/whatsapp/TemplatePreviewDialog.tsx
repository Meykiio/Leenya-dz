import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  compiledMessage: string | null;
  onTestSend: () => void;
}

export default function TemplatePreviewDialog({
  open,
  onClose,
  compiledMessage,
  onTestSend,
}: Props) {
  const { t } = useTranslation("dashboard");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.whatsapp.previewTitle")}</DialogTitle>
          <DialogDescription>
            {t("settings.whatsapp.previewDesc")}
          </DialogDescription>
        </DialogHeader>

        {compiledMessage && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-muted)] p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {compiledMessage}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onTestSend}>
                <Send className="h-4 w-4 mr-2" />
                {t("settings.whatsapp.testSend")}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
