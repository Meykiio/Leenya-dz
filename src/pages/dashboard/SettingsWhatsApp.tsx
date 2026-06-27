import { useState } from 'react';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { useBusinessInfo } from '@/hooks/use-business-info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Edit, RotateCcw, Eye, MessageCircle } from 'lucide-react';
import { templatePreviews } from './whatsapp/templatePreviewData';
import TemplateEditDialog from './whatsapp/TemplateEditDialog';
import TemplatePreviewDialog from './whatsapp/TemplatePreviewDialog';

export default function SettingsWhatsApp() {
  const { business } = useBusinessInfo();
  const {
    templates,
    loading,
    getTemplate,
    updateTemplate,
    resetTemplate,
    initializeTemplates,
    compileMessage,
  } = useWhatsAppTemplates(business?.id ?? null);

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const handleEdit = (templateKey: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = getTemplate(templateKey as any);
    if (template) {
      setEditedContent(template.message_template);
      setEditingTemplate(templateKey);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const success = await updateTemplate(editingTemplate as any, {
      message_template: editedContent,
    });
    if (success) setEditingTemplate(null);
  };

  const handleReset = async (templateKey: string) => {
    if (!confirm('Reinitialiser ce modele aux valeurs par defaut ?')) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await resetTemplate(templateKey as any);
  };

  const handlePreview = (templateKey: string) => {
    setPreviewTemplate(templateKey);
    setShowPreview(true);
  };

  const handleInitialize = async () => {
    if (!confirm('Initialiser les modeles WhatsApp par defaut ?')) return;
    await initializeTemplates();
  };

  const compiledMessage = previewTemplate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? compileMessage(previewTemplate as any, templatePreviews[previewTemplate] || {})
    : null;

  const handleTestSend = () => {
    if (!compiledMessage) return;
    const phone = business?.phone ? `213${business.phone.replace(/\D/g, "").replace(/^0?213?/, "")}` : "";
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(compiledMessage)}` : `https://api.whatsapp.com/send/?text=${encodeURIComponent(compiledMessage)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Templates WhatsApp</CardTitle>
          <CardDescription>
            Personnalisez les messages WhatsApp envoyes a vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Aucun modele WhatsApp configure pour votre business.
            </p>
            <Button onClick={handleInitialize}>
              Initialiser les modeles par defaut
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Personnalisez les messages envoyes via WhatsApp
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleInitialize}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reinitialiser tous
        </Button>
      </div>

      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {template.name}
                  {template.is_active && (
                    <Badge variant="secondary" className="text-xs">Actif</Badge>
                  )}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/50 p-3">
              <pre className="text-xs whitespace-pre-wrap font-sans">
                {template.message_template}
              </pre>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Auto-envoi:</span>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={(checked) => {
                    updateTemplate(template.template_key, { is_active: checked });
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreview(template.template_key)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Apercu
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(template.template_key)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReset(template.template_key)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <TemplateEditDialog
        editingTemplate={editingTemplate}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSave={handleSave}
        onClose={() => setEditingTemplate(null)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables={getTemplate(editingTemplate as any)?.variables || []}
      />

      <TemplatePreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        compiledMessage={compiledMessage}
        onTestSend={handleTestSend}
      />
    </div>
  );
}
