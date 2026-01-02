import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function DocumentsArtisanTab({ chantierId, soustraitantId }) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [chantierId, soustraitantId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents_chantier')
        .select('*')
        .eq('chantier_id', chantierId)
        .or(`partage_type.eq.tous,and(partage_type.eq.specifique,artisan_id.eq.${soustraitantId})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} Ko` : `${mb.toFixed(1)} Mo`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun document partagé pour ce chantier</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">{doc.nom_fichier}</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>{doc.type_fichier?.toUpperCase()}</span>
                    {doc.taille_fichier && (
                      <span>{formatFileSize(doc.taille_fichier)}</span>
                    )}
                    <span>
                      {format(new Date(doc.created_at), 'dd/MM/yyyy', {
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(doc.url_fichier, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}