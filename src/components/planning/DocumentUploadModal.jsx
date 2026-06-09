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
import { sendNotificationEmail, getArtisanEmailInfo } from '@/lib/sendNotificationEmail';

const TYPES_DOCUMENTS = [
  { value: 'bon_commande', label: 'Bon de commande' },
  { value: 'plan', label: 'Plan' },
  { value: 'marche_travaux', label: 'Marché de travaux' },
  { value: 'etudes', label: 'Études' },
  { value: 'permis_construire', label: 'Permis de construire' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_LABELS = {
  bon_commande: 'Bon de commande', plan: 'Plan', marche_travaux: 'Marché de travaux',
  etudes: 'Études', permis_construire: 'Permis de construire', autre: 'Autre',
};

export function DocumentUploadModal({ isOpen, onClose, chantierId, onSuccess }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { taches = [], sousTraitants = [], lots = [], chantiers = [] } = useChantier();

  const [file, setFile] = useState(null);
  const [typeDocument, setTypeDocument] = useState('autre');
  const [lotId, setLotId] = useState('');
  const [partageType, setPartageType] = useState('tous');
  const [artisanId, setArtisanId] = useState('');
  const [necessiteSignature, setNecessiteSignature] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sortedLots = useMemo(() => [...lots].sort((a, b) => (a.lot || '').localeCompare(b.lot || '')), [lots]);

  const chantierNom = useMemo(() => {
    const chantier = chantiers.find(c => c.id === chantierId);
    return chantier?.nomchantier || 'Chantier';
  }, [chantiers, chantierId]);

  const artisansDuChantier = useMemo(() => {
    const tachesChantier = taches.filter(t => t.chantierid === chantierId && t.assignetype === 'soustraitant');
    const artisanIds = [...new Set(tachesChantier.map(t => t.assigneid))];
    return sousTraitants.filter(st => artisanIds.includes(st.id));
  }, [taches, sousTraitants, chantierId]);

  const artisansParLot = useMemo(() => {
    if (!lotId) return [];
    const lotObj = sortedLots.find(l => l.id === lotId);
    if (!lotObj) return [];
    const lotName = lotObj.lot;
    return sousTraitants.filter(st => Array.isArray(st.assigned_lots) && st.assigned_lots.includes(lotName))
      .map(st => ({ id: st.id, nom: st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan' }))
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [lotId, sousTraitants, sortedLots]);

  const handleFileChange = (e) => { const f = e.target.files?.[0]; if (f) setFile(f); };

  const handleTypeDocumentChange = (newType) => {
    setTypeDocument(newType); setLotId(''); setArtisanId(''); setPartageType('tous'); setNecessiteSignature(false);
  };

  const getExpediteurProfile = async () => {
    try {
      const { data } = await supabase.from('profiles')
        .select('nom, prenom, mail, tel, nomsociete, adresse, ville, code_postal')
        .eq('id', user.id).single();
      return data || null;
    } catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier', variant: 'destructive' }); return; }
    if (typeDocument === 'marche_travaux') {
      if (!lotId) { toast({ title: 'Erreur', description: 'Veuillez sélectionner un lot', variant: 'destructive' }); return; }
      if (!artisanId) { toast({ title: 'Erreur', description: 'Veuillez sélectionner un artisan', variant: 'destructive' }); return; }
    }
    if (typeDocument !== 'marche_travaux') {
      if (partageType === 'specifique' && !artisanId) { toast({ title: 'Erreur', description: 'Veuillez sélectionner un artisan', variant: 'destructive' }); return; }
      if (necessiteSignature && (partageType !== 'specifique' || !artisanId)) {
        toast({ title: 'Erreur', description: 'Pour demander une signature, sélectionnez un artisan spécifique', variant: 'destructive' }); return;
      }
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chantierId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chantiers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents-chantiers').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents-chantiers').getPublicUrl(filePath);
      const urlFichier = urlData.publicUrl;

      const documentData = {
        chantier_id: chantierId, nom_fichier: file.name, url_fichier: urlFichier,
        storage_path: filePath, type_fichier: fileExt, taille_fichier: file.size,
        type_document: typeDocument, lot_id: typeDocument === 'marche_travaux' ? lotId : null,
        partage_type: typeDocument === 'marche_travaux' ? 'specifique' : partageType,
        artisan_id: typeDocument === 'marche_travaux' ? artisanId : (partageType === 'specifique' ? artisanId : null),
        uploaded_by: user.id,
        necessite_signature: typeDocument === 'marche_travaux' ? true : necessiteSignature,
        artisan_assigne_signature: typeDocument === 'marche_travaux' ? artisanId : (necessiteSignature && partageType === 'specifique' ? artisanId : null),
        signature_statut: (typeDocument === 'marche_travaux' || necessiteSignature) ? 'en_attente' : 'non_requis',
      };

      const { data: insertedDoc, error: dbError } = await supabase.from('documents_chantier').insert(documentData).select().single();
      if (dbError) throw dbError;

      if (typeDocument === 'marche_travaux' && insertedDoc) {
        await supabase.from('marches_travaux').insert({
          chantier_id: chantierId, lot_id: lotId, soustraitant_id: artisanId,
          document_id: insertedDoc.id, date_envoi: new Date().toISOString(),
        });
      }

      if (typeDocument === 'marche_travaux') {
        const expediteur = await getExpediteurProfile();
        const artisan = sousTraitants.find(st => st.id === artisanId);
        const destinataire = await getArtisanEmailInfo(artisan, supabase);
        if (destinataire?.email) {
          await sendNotificationEmail('nouveau_document', destinataire.email, {
            nomFichier: file.name, chantierNom,
            typeDocument: TYPE_LABELS.marche_travaux,
            necessite_signature: true,
            urlFichier, expediteur,
            artisanPrenom: destinataire.prenom,
            aCompte: destinataire.aCompte,
          });
        }
      }

      toast({ title: 'Document ajouté ✅', description: `${file.name} a été partagé` });
      onSuccess?.(); onClose();
      setFile(null); setTypeDocument('autre'); setLotId(''); setPartageType('tous'); setArtisanId(''); setNecessiteSignature(false);
    } catch (error) {
      console.error('Erreur upload:', error);
      toast({ title: 'Erreur ❌', description: 'Impossible d\'uploader le document', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">{file.name}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); setFile(null); }}><X className="h-4 w-4" /></Button>
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
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" />
          </div>
          <div>
            <Label htmlFor="type-document">Type de document</Label>
            <select id="type-document" value={typeDocument} onChange={(e) => handleTypeDocumentChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2">
              {TYPES_DOCUMENTS.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          {typeDocument === 'marche_travaux' && (
            <>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                <p className="text-orange-800 font-medium">📋 Sélectionnez le lot et l'artisan concerné</p>
              </div>
              <div>
                <Label htmlFor="lot-marche">Lot concerné *</Label>
                <select id="lot-marche" value={lotId} onChange={(e) => { setLotId(e.target.value); setArtisanId(''); }} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2">
                  <option value="">Sélectionner un lot...</option>
                  {sortedLots.map(lot => <option key={lot.id} value={lot.id}>{lot.lot}</option>)}
                </select>
              </div>
              {lotId && (
                <div>
                  <Label htmlFor="artisan-marche">Artisan *</Label>
                  <select id="artisan-marche" value={artisanId} onChange={(e) => setArtisanId(e.target.value)} required disabled={artisansParLot.length === 0}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2">
                    <option value="">{artisansParLot.length === 0 ? 'Aucun artisan disponible' : 'Sélectionner un artisan...'}</option>
                    {artisansParLot.map(st => <option key={st.id} value={st.id}>{st.nom}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          {typeDocument !== 'marche_travaux' && (
            <>
              <div className="space-y-3">
                <Label>Partager avec :</Label>
                <div className="flex items-center space-x-2">
                  <input type="radio" id="partage-tous" value="tous" checked={partageType === 'tous'} onChange={(e) => setPartageType(e.target.value)} className="h-4 w-4" />
                  <Label htmlFor="partage-tous" className="cursor-pointer font-normal">Tous les artisans du chantier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="radio" id="partage-specifique" value="specifique" checked={partageType === 'specifique'} onChange={(e) => setPartageType(e.target.value)} className="h-4 w-4" />
                  <Label htmlFor="partage-specifique" className="cursor-pointer font-normal">Un artisan spécifique</Label>
                </div>
              </div>
              {partageType === 'specifique' && (
                <div>
                  <Label htmlFor="artisan-classique">Artisan</Label>
                  <select id="artisan-classique" value={artisanId} onChange={(e) => setArtisanId(e.target.value)} required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2">
                    <option value="">Sélectionner un artisan...</option>
                    {artisansDuChantier.map(st => <option key={st.id} value={st.id}>{st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}</option>)}
                  </select>
                </div>
              )}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="necessite_signature" checked={necessiteSignature} onCheckedChange={setNecessiteSignature} disabled={partageType === 'tous'} />
                  <Label htmlFor="necessite_signature" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-orange-600" />
                    Ce document nécessite une signature électronique
                  </Label>
                </div>
                {necessiteSignature && artisanId && (
                  <div className="ml-6 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                    <p className="text-orange-800">📝 L'artisan <strong>{artisansDuChantier.find(st => st.id === artisanId)?.nomsocieteST || 'sélectionné'}</strong> devra signer ce document.</p>
                  </div>
                )}
              </div>
            </>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
            <Button type="submit" disabled={!file || uploading}>{uploading ? 'Upload en cours...' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}