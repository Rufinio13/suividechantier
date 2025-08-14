import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Calendar, Edit, Trash2, Search, FileText, Download, Share2, File, UploadCloud } from 'lucide-react';

const DocumentForm = ({ isOpen, onClose, onSubmit, documentData, setDocumentData, sousTraitantsDisponibles, formTitle, submitButtonText }) => {
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setDocumentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setDocumentData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simuler une URL ou stocker l'objet File pour une gestion future
      // Pour l'instant, on stocke juste le nom. Une vraie app nécessiterait un upload.
      setDocumentData(prev => ({ ...prev, url: file.name, fichier: file })); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{formTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="doc-nom">Nom du document <span className="text-red-500">*</span></Label>
            <Input id="doc-nom" name="nom" value={documentData.nom} onChange={handleFormChange} placeholder="Ex: Plan RDC V2" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea id="doc-description" name="description" value={documentData.description} onChange={handleFormChange} placeholder="Détails sur le document" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type <span className="text-red-500">*</span></Label>
              <Select name="type" value={documentData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                <SelectTrigger id="doc-type"><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plan">Plan</SelectItem>
                  <SelectItem value="Contrat">Contrat</SelectItem>
                  <SelectItem value="Facture">Facture</SelectItem>
                  <SelectItem value="Notice">Notice Technique</SelectItem>
                  <SelectItem value="Photo">Photo</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-sousTraitantId">Sous-traitant concerné (optionnel)</Label>
              <Select name="sousTraitantId" value={documentData.sousTraitantId} onValueChange={(value) => handleSelectChange('sousTraitantId', value)}>
                <SelectTrigger id="doc-sousTraitantId"><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {sousTraitantsDisponibles.map(st => (
                    <SelectItem key={st.id} value={st.id}>{st.nomSociete || st.nomDirigeant}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-file">Fichier</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="doc-file-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Cliquez pour choisir</span> ou glissez-déposez</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX, XLSX (MAX. 5MB)</p>
                    </div>
                    <input id="doc-file-input" type="file" className="hidden" onChange={handleFileChange} />
                </label>
            </div>
            {documentData.url && <p className="text-xs text-muted-foreground mt-1">Fichier sélectionné : {documentData.url}</p>}
            <p className="text-xs text-muted-foreground mt-1">La fonctionnalité de téléversement réel n'est pas implémentée. Le nom du fichier sera sauvegardé.</p>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{submitButtonText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DocumentCard = ({ document, sousTraitant, onEdit, onDelete, onDownload, onShare }) => {
  const formatDate = (dateString) => {
    try { return format(new Date(dateString), 'dd MMM yyyy', { locale: fr }); } 
    catch { return 'Date invalide'; }
  };

  const getDocumentIcon = (type) => {
    const commonClass = "h-5 w-5";
    switch (type) {
      case 'Plan': return <FileText className={commonClass + " text-blue-500"} />;
      case 'Contrat': return <FileText className={commonClass + " text-purple-500"} />;
      case 'Facture': return <FileText className={commonClass + " text-green-500"} />;
      case 'Notice': return <FileText className={commonClass + " text-yellow-500"} />;
      case 'Photo': return <FileText className={commonClass + " text-orange-500"} />; // Placeholder, could be ImageIcon
      default: return <File className={commonClass + " text-gray-500"} />;
    }
  };
  
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-hover">
      <Card className="h-full flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getDocumentIcon(document.type)}
              <CardTitle className="text-md leading-tight">{document.nom}</CardTitle>
            </div>
            <div className="flex space-x-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">Type: {document.type} | Ajouté: {formatDate(document.dateAjout)}</p>
        </CardHeader>
        <CardContent className="flex-grow py-3 space-y-1.5">
          {document.description && <p className="text-sm text-gray-600 line-clamp-2">{document.description}</p>}
          {sousTraitant && <p className="text-xs text-muted-foreground">Pour: {sousTraitant.nomSociete || sousTraitant.nomDirigeant}</p>}
        </CardContent>
        <div className="p-3 pt-2 mt-auto flex gap-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}><Download className="mr-1.5 h-4 w-4" />Télécharger</Button>
          <Button variant="outline" size="sm" onClick={onShare}><Share2 className="mr-1.5 h-4 w-4" />Partager</Button>
        </div>
      </Card>
    </motion.div>
  );
};


export function Documents() {
  const { id: chantierId } = useParams();
  const { chantiers, sousTraitants, documents, addDocument, updateDocument, deleteDocument, loading } = useChantier();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const initialFormData = { nom: '', description: '', type: 'Plan', sousTraitantId: '', url: '', fichier: null };
  const [formData, setFormData] = useState(initialFormData);

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);
  
  const documentsDuChantier = useMemo(() => 
    documents.filter(doc => doc.chantierId === chantierId), 
  [documents, chantierId]);

  const filteredDocuments = useMemo(() => {
    return documentsDuChantier.filter(doc => {
      const st = doc.sousTraitantId ? sousTraitants.find(s => s.id === doc.sousTraitantId) : null;
      const stName = st ? (st.nomSociete || st.nomDirigeant || '') : '';
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = doc.nom.toLowerCase().includes(searchLower) ||
                           (doc.description && doc.description.toLowerCase().includes(searchLower)) ||
                           stName.toLowerCase().includes(searchLower);
      const matchesType = typeFilter === '' || doc.type === typeFilter;
      return matchesSearch && matchesType;
    }).sort((a,b) => new Date(b.dateAjout) - new Date(a.dateAjout));
  }, [documentsDuChantier, searchTerm, typeFilter, sousTraitants]);


  const handleOpenForm = (docToEdit = null) => {
    if (docToEdit) {
      setEditingDocument(docToEdit);
      setFormData({
        nom: docToEdit.nom,
        description: docToEdit.description || '',
        type: docToEdit.type,
        sousTraitantId: docToEdit.sousTraitantId || '',
        url: docToEdit.url || '',
        fichier: null // Ne pas pré-remplir le champ fichier
      });
    } else {
      setEditingDocument(null);
      setFormData(initialFormData);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDocument(null);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData, chantierId };
    delete dataToSubmit.fichier; // Ne pas sauvegarder l'objet File dans localStorage

    if (editingDocument) {
      updateDocument(editingDocument.id, dataToSubmit);
    } else {
      addDocument(dataToSubmit);
    }
    handleCloseForm();
  };
  
  const handleDelete = (docId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
        deleteDocument(docId);
    }
  };

  const handleDownload = (doc) => {
    alert(`Simulation: Téléchargement de ${doc.nom}. URL: ${doc.url || 'Non spécifiée'}`);
    // Logique de téléchargement réelle irait ici
  };

  const handleShare = (doc) => {
    alert(`Simulation: Partage de ${doc.nom}.`);
    // Logique de partage réelle irait ici
  };


  if (loading) return <div className="flex justify-center items-center h-64">Chargement des documents...</div>;
  if (!chantier) return (
    <div className="text-center py-10">
      <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
      <Button asChild className="mt-4"><Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link to={`/chantiers/${chantierId}`}><ArrowLeft className="mr-2 h-4 w-4" />Retour au chantier</Link>
          </Button>
          <h1 className="text-3xl font-bold">Documents du Chantier</h1>
          <p className="text-muted-foreground">{chantier.nom}</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un document
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher (nom, description, sous-traitant...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Filtrer par type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les types</SelectItem>
              <SelectItem value="Plan">Plan</SelectItem>
              <SelectItem value="Contrat">Contrat</SelectItem>
              <SelectItem value="Facture">Facture</SelectItem>
              <SelectItem value="Notice">Notice Technique</SelectItem>
              <SelectItem value="Photo">Photo</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredDocuments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map(doc => (
            <DocumentCard 
              key={doc.id}
              document={doc}
              sousTraitant={doc.sousTraitantId ? sousTraitants.find(st => st.id === doc.sousTraitantId) : null}
              onEdit={() => handleOpenForm(doc)}
              onDelete={() => handleDelete(doc.id)}
              onDownload={() => handleDownload(doc)}
              onShare={() => handleShare(doc)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Aucun document trouvé</h3>
          <p className="text-muted-foreground mt-2">
            {searchTerm || typeFilter ? "Essayez d'ajuster vos filtres ou votre recherche." : "Commencez par ajouter des documents à ce chantier."}
          </p>
        </div>
      )}

      {isFormOpen && (
        <DocumentForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmitForm}
          documentData={formData}
          setDocumentData={setFormData}
          sousTraitantsDisponibles={sousTraitants}
          formTitle={editingDocument ? "Modifier le document" : "Ajouter un nouveau document"}
          submitButtonText={editingDocument ? "Mettre à jour" : "Ajouter le document"}
        />
      )}
    </div>
  );
}