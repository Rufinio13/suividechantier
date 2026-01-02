import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText, Download, Trash2, Users, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentUploadModal } from './DocumentUploadModal';

export function DocumentsTab({ chantierId }) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents_chantier')
        .select(`
          *,
          soustraitants (
            nomsocieteST,
            PrenomST,
            nomST
          )
        `)
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [chantierId]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.nom_fichier}" ?`)) return;

    try {
      const filePath = doc.url_fichier.split('/').pop();
      await supabase.storage.from('documents-chantiers').remove([`chantiers/${filePath}`]);
      await supabase.from('documents_chantier').delete().eq('id', doc.id);

      toast({ title: 'Document supprimé ✅' });
      loadDocuments();
    } catch (error) {
      toast({ title: 'Erreur ❌', variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} Ko` : `${mb.toFixed(1)} Mo`;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Documents du chantier</h2>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun document pour ce chantier</p>
            <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter le premier document
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                        {doc.taille_fichier && <span>{formatFileSize(doc.taille_fichier)}</span>}
                        <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {doc.partage_type === 'tous' ? (
                          <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            <Users className="h-3 w-3" />
                            Partagé avec tous les artisans
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                            <User className="h-3 w-3" />
                            Partagé avec {doc.soustraitants?.nomsocieteST || `${doc.soustraitants?.PrenomST} ${doc.soustraitants?.nomST}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => window.open(doc.url_fichier, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(doc)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        chantierId={chantierId}
        onSuccess={loadDocuments}
      />
    </div>
  );
}