import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { WhatsAppTemplate, WhatsAppTemplateKey } from '@/types';
import { getDefaultTemplates } from '@/lib/whatsapp';

/**
 * Hook to manage WhatsApp message templates.
 * Provides CRUD operations and template compilation.
 * 
 * @param businessId - The business ID to fetch templates for
 */
export function useWhatsAppTemplates(businessId: string | null) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all templates for business
  const fetchTemplates = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('template_key');

    if (fetchError) {
      setError(fetchError.message);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modèles WhatsApp.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setTemplates(data || []);
    setLoading(false);
  }, [businessId]);

  // Get template by key
  const getTemplate = useCallback((key: WhatsAppTemplateKey) => {
    return templates.find(t => t.template_key === key);
  }, [templates]);

  // Update template
  const updateTemplate = useCallback(async (
    templateKey: WhatsAppTemplateKey,
    updates: Partial<Pick<WhatsAppTemplate, 'message_template' | 'is_active'>>
  ) => {
    if (!businessId) return;

    const { error: updateError } = await supabase
      .from('whatsapp_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('template_key', templateKey);

    if (updateError) {
      toast({
        title: 'Erreur',
        description: updateError.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Modèle enregistré',
      description: 'Le modèle a été mis à jour avec succès.',
    });

    fetchTemplates();
    return true;
  }, [businessId, fetchTemplates]);

  // Reset template to default
  const resetTemplate = useCallback(async (templateKey: WhatsAppTemplateKey) => {
    if (!businessId) return;

    const defaults = getDefaultTemplates();
    const defaultTemplate = defaults.find(t => t.template_key === templateKey);
    
    if (!defaultTemplate) return false;

    // First delete existing
    await supabase
      .from('whatsapp_templates')
      .delete()
      .eq('business_id', businessId)
      .eq('template_key', templateKey);

    // Then insert default
    const { error: resetError } = await supabase
      .from('whatsapp_templates')
      .insert({
        business_id: businessId,
        template_key: templateKey,
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        message_template: defaultTemplate.message_template,
        variables: defaultTemplate.variables,
      });

    if (resetError) {
      toast({
        title: 'Erreur',
        description: resetError.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Modèle réinitialisé',
      description: 'Le modèle a été réinitialisé aux valeurs par défaut.',
    });

    fetchTemplates();
    return true;
  }, [businessId, fetchTemplates]);

  // Initialize templates for new business (seed defaults)
  const initializeTemplates = useCallback(async () => {
    if (!businessId) return;

    const defaults = getDefaultTemplates();
    
    // Insert each template one by one, ignoring duplicates
    for (const t of defaults) {
      // Convert JavaScript array to PostgreSQL TEXT[] format: {item1,item2}
      const variablesString = '{' + t.variables.join(',') + '}';
      
      const insertData = {
        business_id: businessId,
        template_key: t.template_key,
        name: t.name,
        description: t.description || null,
        message_template: t.message_template,
        variables: variablesString,
      };
      
      const { error } = await supabase
        .from('whatsapp_templates')
        .insert(insertData)
        .select();
      
      if (error && !error.message.includes('duplicate key')) {
        if (import.meta.env.DEV) console.error('[WhatsApp Templates] Failed to insert template:', error);
        setError(error.message);
        toast({
          title: 'Erreur',
          description: `Template ${t.template_key}: ${error.message}`,
          variant: 'destructive',
        });
        return false;
      }
    }

    toast({
      title: 'Modèles initialisés',
      description: 'Les modèles WhatsApp par défaut ont été créés avec succès.',
    });

    fetchTemplates();
    return true;
  }, [businessId, fetchTemplates]);

  // Compile template with variables
  const compileMessage = useCallback((
    templateKey: WhatsAppTemplateKey,
    variables: Record<string, string>
  ): string | null => {
    const template = getTemplate(templateKey);
    if (!template) return null;

    let compiled = template.message_template;
    Object.entries(variables).forEach(([key, value]) => {
      compiled = compiled.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return compiled;
  }, [getTemplate]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    getTemplate,
    updateTemplate,
    resetTemplate,
    initializeTemplates,
    compileMessage,
    refetch: fetchTemplates,
  };
}
