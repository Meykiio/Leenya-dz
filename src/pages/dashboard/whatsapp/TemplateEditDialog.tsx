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
  return (
    <Dialog open={!!editingTemplate} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editer le modele</DialogTitle>
          <DialogDescription>
            Modifiez le message template. Utilisez {'{variable}'} pour inserer des variables dynamiques.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Variables disponibles:</label>
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
            placeholder="Message template..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
