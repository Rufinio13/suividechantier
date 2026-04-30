import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, FileSignature } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';

// ✅ TYPES DE DOCUMENTS
const TYPES_DOCUMENTS = [
  { value: 'bon_commande', label: 'Bon de commande' },
  { value: 'plan', label: 'Plan' },
  { value: 'marche_travaux', label: 'Marché de travaux' },
  { value: 'etudes', label: 'Études' },
  { value: 'permis_construire', label: 'Permis de construire' },
  { value: 'autre', label: 'Autre' },
];

export function DocumentUploadModal({ isOpen, onClose, chantierId, onSuccess }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // ✅ MÊME DESTRUCTURATION QUE TacheFormModal
  const { taches = [], sousTraitants = [], lots = [] } = useChantier();
  
  const [file, setFile] = useState(null);
  const [typeDocument, setTypeDocument] = useState('autre');
  const [lotId, setLotId] = useState('');
  const [partageType, setPartageType] = useState('tous');
  const [artisanId, setArtisanId] = useState('');
  const [necessiteSignature, setNecessiteSignature] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ MÊME TRI QUE TacheFormModal (par "lot" pas "nom")
  const sortedLots = useMemo(() => {
    return [...lots].sort((a, b) => (a.lot || '').localeCompare(b.lot || ''));
  }, [lots]);

  // ✅ Artisans qui ont au moins 1 tâche sur ce chantier
  const artisansDuChantier = useMemo(() => {
    const tachesChantier = taches.filter(t => t.chantierid === chantierId && t.assignetype === 'soustraitant');
    const artisanIds = [...new Set(tachesChantier.map(t => t.assigneid))];
    return sousTraitants.filter(st => artisanIds.includes(st.id));
  }, [taches, sousTraitants, chantierId]);

  // ✅ MÊME LOGIQUE QUE TacheFormModal pour récupérer artisans par lot
  const artisansParLot = useMemo(() => {
    if (!lotId) return [];
    
    const lotObj = sortedLots.find(l => l.id === lotId);
    if (!lotObj) return [];
    
    const lotName = lotObj.lot; // ✅ Utiliser "lot" pas "nom"
    
    // ✅ Filtrer les artisans qui ont ce lot dans assigned_lots
    const artisansAvecLot = sousTraitants.filter(
      st => Array.isArray(st.assigned_lots) && st.assigned_lots.includes(lotName)
    );
    
    return artisansAvecLot.map(st => ({
      id: st.id,
      nom: st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan'
    })).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [lotId, sousTraitants, sortedLots]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleTypeDocumentChange = (newType) => {
    setTypeDocument(newType);
    setLotId('');
    setArtisanId('');
    setPartageType('tous');
    setNecessiteSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier', variant: 'destructive' });
      return;
    }

    if (typeDocument === 'marche_travaux') {
      if (!lotId) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner un lot pour le marché de travaux', variant: 'destructive' });
        return;
      }
      if (!artisanId) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner un artisan pour le marché de travaux', variant: 'destructive' });
        return;
      }
    }

    if (typeDocument !== 'marche_travaux') {
      if (partageType === 'specifique' && !artisanId) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner un artisan', variant: 'destructive' });
        return;
      }

      if (necessiteSignature) {
        if (partageType !== 'specifique' || !artisanId) {
          toast({ 
            title: 'Erreur', 
            description: 'Pour demander une signature, vous devez sélectionner un artisan spécifique', 
            variant: 'destructive' 
          });
          return;
        }
      }
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chantierId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chantiers/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents-chantiers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents-chantiers')
        .getPublicUrl(filePath);

      const documentData = {
        chantier_id: chantierId,
        nom_fichier: file.name,
        url_fichier: urlData.publicUrl,
        storage_path: filePath,
        type_fichier: fileExt,
        taille_fichier: file.size,
        type_document: typeDocument,
        lot_id: typeDocument === 'marche_travaux' ? lotId : null,
        partage_type: typeDocument === 'marche_travaux' ? 'specifique' : partageType,
        artisan_id: typeDocument === 'marche_travaux' ? artisanId : (partageType === 'specifique' ? artisanId : null),
        uploaded_by: user.id,
        necessite_signature: typeDocument === 'marche_travaux' ? true : necessiteSignature,
        artisan_assigne_signature: typeDocument === 'marche_travaux' ? artisanId : (necessiteSignature && partageType === 'specifique' ? artisanId : null),
        signature_statut: (typeDocument === 'marche_travaux' || necessiteSignature) ? 'en_attente' : 'non_requis',
      };

      const { data: insertedDoc, error: dbError } = await supabase
        .from('documents_chantier')
        .insert(documentData)
        .select()
        .single();

      if (dbError) throw dbError;

      if (typeDocument === 'marche_travaux' && insertedDoc) {
        const { error: marcheError } = await supabase
          .from('marches_travaux')
          .insert({
            chantier_id: chantierId,
            lot_id: lotId,
            soustraitant_id: artisanId,
            document_id: insertedDoc.id,
            date_envoi: new Date().toISOString(),
          });

        if (marcheError) {
          console.error('Erreur création marché travaux:', marcheError);
        }
      }

      toast({
        title: 'Document ajouté ✅',
        description: `${file.name} a été partagé${typeDocument === 'marche_travaux' ? ' (Marché de travaux)' : ''}`,
      });

      onSuccess?.();
      onClose();
      
      setFile(null);
      setTypeDocument('autre');
      setLotId('');
      setPartageType('tous');
      setArtisanId('');
      setNecessiteSignature(false);

    } catch (error) {
      console.error('Erreur upload:', error);
      toast({
        title: 'Erreur ❌',
        description: 'Impossible d\'uploader le document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Upload fichier */}
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, images...</p>
                  </>
                )}
              </div>
            </Label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
          </div>

          {/* ✅ TYPE DE DOCUMENT (SELECT NATIF comme TacheFormModal) */}
          <div>
            <Label htmlFor="type-document">Type de document</Label>
            <select
              id="type-document"
              value={typeDocument}
              onChange={(e) => handleTypeDocumentChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2"
            >
              {TYPES_DOCUMENTS.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ SI MARCHÉ DE TRAVAUX */}
          {typeDocument === 'marche_travaux' && (
            <>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                <p className="text-orange-800 font-medium">
                  📋 Marché de travaux : sélectionnez le lot et l'artisan concerné
                </p>
              </div>

              {/* ✅ Sélection du lot (SELECT NATIF) */}
              <div>
                <Label htmlFor="lot-marche">Lot concerné *</Label>
                <select
                  id="lot-marche"
                  value={lotId}
                  onChange={(e) => {
                    setLotId(e.target.value);
                    setArtisanId('');
                  }}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2"
                >
                  <option value="">Sélectionner un lot...</option>
                  {sortedLots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot}
                    </option>
                  ))}
                </select>
                {sortedLots.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Aucun lot disponible. Créez des lots dans le Planning.
                  </p>
                )}
              </div>

              {/* ✅ Sélection artisan lié au lot (SELECT NATIF) */}
              {lotId && (
                <div>
                  <Label htmlFor="artisan-marche">Artisan *</Label>
                  <select
                    id="artisan-marche"
                    value={artisanId}
                    onChange={(e) => setArtisanId(e.target.value)}
                    required
                    disabled={artisansParLot.length === 0}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                  >
                    <option value="">
                      {artisansParLot.length === 0 ? 'Aucun artisan disponible' : 'Sélectionner un artisan...'}
                    </option>
                    {artisansParLot.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.nom}
                      </option>
                    ))}
                  </select>
                  {artisansParLot.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Aucun artisan n'a de tâche sur ce lot
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ✅ SI PAS MARCHÉ DE TRAVAUX → PARTAGE CLASSIQUE */}
          {typeDocument !== 'marche_travaux' && (
            <>
              <div className="space-y-3">
                <Label>Partager avec :</Label>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="partage-tous"
                    value="tous"
                    checked={partageType === 'tous'}
                    onChange={(e) => setPartageType(e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="partage-tous" className="cursor-pointer font-normal">
                    Tous les artisans du chantier
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="partage-specifique"
                    value="specifique"
                    checked={partageType === 'specifique'}
                    onChange={(e) => setPartageType(e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="partage-specifique" className="cursor-pointer font-normal">
                    Un artisan spécifique
                  </Label>
                </div>
              </div>

              {partageType === 'specifique' && (
                <div>
                  <Label htmlFor="artisan-classique">Artisan</Label>
                  <select
                    id="artisan-classique"
                    value={artisanId}
                    onChange={(e) => setArtisanId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2"
                  >
                    <option value="">Sélectionner un artisan...</option>
                    {artisansDuChantier.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="necessite_signature"
                    checked={necessiteSignature}
                    onCheckedChange={setNecessiteSignature}
                    disabled={partageType === 'tous'}
                  />
                  <Label 
                    htmlFor="necessite_signature" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FileSignature className="h-4 w-4 text-orange-600" />
                    Ce document nécessite une signature électronique
                  </Label>
                </div>

                {necessiteSignature && artisanId && (
                  <div className="ml-6 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                    <p className="text-orange-800">
                      📝 L'artisan <strong>{artisansDuChantier.find(st => st.id === artisanId)?.nomsocieteST || 'sélectionné'}</strong> devra signer électroniquement ce document.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? 'Upload en cours...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}