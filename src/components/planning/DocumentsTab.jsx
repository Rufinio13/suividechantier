import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, FileText, Download, Trash2, ChevronDown, ChevronRight,
  File, Folder, Package, Briefcase, Building, FileCheck, CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useChantier } from '@/context/ChantierContext';
import { DocumentUploadModal } from './DocumentUploadModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DOCUMENT_CATEGORIES = [
  { key: 'bon_commande', label: 'Bons de commande', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { key: 'plan', label: 'Plans', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { key: 'marche_travaux', label: 'Marchés de travaux', icon: Briefcase, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { key: 'etudes', label: 'Études', icon: FileCheck, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { key: 'permis_construire', label: 'Permis de construire', icon: Building, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  { key: 'autre', label: 'Autres documents', icon: File, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

export function DocumentsTab({ chantierId }) {
  const { toast } = useToast();
  const { sousTraitants = [] } = useChantier();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    bon_commande: true, plan: true, marche_travaux: true,
    etudes: true, permis_construire: true, autre: true,
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents_chantier')
        .select('*')
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chantierId) fetchDocuments();
  }, [chantierId]);

  const documentsByType = useMemo(() => {
    const grouped = {};
    DOCUMENT_CATEGORIES.forEach(cat => {
      grouped[cat.key] = documents.filter(doc => doc.type_document === cat.key);
    });
    return grouped;
  }, [documents]);

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }));
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Supprimer le document "${doc.nom_fichier}" ?`)) return;

    try {
      // Supprimer l'original du storage
      if (doc.storage_path) {
        await supabase.storage.from('documents-chantiers').remove([doc.storage_path]);
      }
      // ✅ Supprimer aussi le document signé si il existe
      if (doc.document_signe_url) {
        await supabase.storage.from('documents-chantiers').remove([doc.document_signe_url]);
      }

      const { error: dbError } = await supabase
        .from('documents_chantier')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({ title: 'Document supprimé ✅', description: `${doc.nom_fichier} a été supprimé` });
      fetchDocuments();
    } catch (error) {
      console.error('Erreur suppression document:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le document', variant: 'destructive' });
    }
  };

  // ✅ Télécharger le document signé si disponible, sinon l'original
  const handleDownloadDocument = async (doc) => {
    try {
      // ✅ Si signé → télécharger le PDF signé depuis le storage
      const pathToDownload = (doc.signature_statut === 'signe' && doc.document_signe_url)
        ? doc.document_signe_url
        : doc.storage_path;

      if (pathToDownload) {
        const { data, error } = await supabase.storage
          .from('documents-chantiers')
          .download(pathToDownload);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        // ✅ Nom de fichier avec suffixe _signé si applicable
        a.download = doc.signature_statut === 'signe'
          ? `signé_${doc.nom_fichier}`
          : doc.nom_fichier;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (doc.url_fichier) {
        // Fallback sur url_fichier
        window.open(doc.url_fichier, '_blank');
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast({ title: 'Erreur', description: 'Impossible de télécharger le document', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Chargement des documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Documents du chantier</h2>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      <div className="space-y-3">
        {DOCUMENT_CATEGORIES.map(category => {
          const categoryDocs = documentsByType[category.key] || [];
          const Icon = category.icon;
          const isExpanded = expandedCategories[category.key];

          if (categoryDocs.length === 0) return null;

          return (
            <Card key={category.key} className={`${category.borderColor}`}>
              <CardHeader
                className={`cursor-pointer ${category.bgColor} hover:opacity-80 transition`}
                onClick={() => toggleCategory(category.key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
                    <Icon className={`h-5 w-5 ${category.color}`} />
                    <CardTitle className="text-lg">
                      {category.label}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({categoryDocs.length})
                      </span>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {categoryDocs.map(doc => {
                      const artisan = doc.artisan_id
                        ? sousTraitants.find(st => st.id === doc.artisan_id)
                        : null;
                      const artisanNom = artisan
                        ? (artisan.nomsocieteST || `${artisan.PrenomST} ${artisan.nomST}`)
                        : null;

                      // ✅ Est-ce que ce doc a été signé ?
                      const estSigne = doc.necessite_signature && doc.signature_statut === 'signe';

                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition ${
                            estSigne ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Folder className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{doc.nom_fichier}</p>
                                {/* ✅ Badge signé visible côté constructeur */}
                                {estSigne && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded text-xs font-medium">
                                    <CheckCircle className="h-3 w-3" />
                                    Signé par l'artisan
                                  </span>
                                )}
                                {doc.necessite_signature && !estSigne && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                    ⏳ En attente de signature
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                <span>Ajouté le {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                                {doc.taille_fichier && <span>{(doc.taille_fichier / 1024).toFixed(0)} Ko</span>}
                                {artisanNom && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    👷 {artisanNom}
                                  </span>
                                )}
                                {/* ✅ Infos signature */}
                                {estSigne && doc.signature_artisan_date && (
                                  <span className="text-green-700 font-medium">
                                    ✓ Signé le {format(new Date(doc.signature_artisan_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                    {doc.signature_artisan_nom && ` par ${doc.signature_artisan_nom}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* ✅ Bouton télécharge le signé si disponible */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                              title={estSigne ? 'Télécharger le document signé' : 'Télécharger'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {documents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucun document</h3>
            <p className="text-muted-foreground mt-1 mb-4">Commencez par ajouter des documents à ce chantier</p>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un document
            </Button>
          </CardContent>
        </Card>
      )}

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        chantierId={chantierId}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}