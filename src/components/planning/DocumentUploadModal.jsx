import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, FileSignature, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { sendNotificationEmail, getArtisanEmailInfo } from '@/lib/sendNotificationEmail';
import { getSignedUrl, EMAIL_EXPIRES_IN } from '@/lib/storage';

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

export const TYPES_PLAN = [
  { value: 'fondation_go', label: 'Fondation / GO' },
  { value: 'menuiseries_facade', label: 'Menuiseries / Façade' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'cellule', label: 'Cellule' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'mob', label: 'MOB' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'revetement_sol', label: 'Revêtement de sol' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'toiture', label: 'Toiture' },
  { value: 'plan_masse', label: 'Plan Masse' },
  { value: 'vmc', label: 'VMC' },
  { value: 'etudes', label: 'Études' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'escalier', label: 'Escalier' },
  { value: 'fumisterie', label: 'Fumisterie' },
  { value: 'chauffage', label: 'Chauffage' },
];

export const TYPE_PLAN_LABELS = TYPES_PLAN.reduce((acc, t) => ({ ...acc, [t.value]: t.label }), {});

// Extensions acceptées (même liste que le sélecteur de fichiers)
const EXTENSIONS_ACCEPTEES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
const ACCEPT = EXTENSIONS_ACCEPTEES.map(e => '.' + e).join(',');
const extensionDe = (nom) => (nom.includes('.') ? nom.split('.').pop().toLowerCase() : '');

const formatTaille = (octets) => {
  if (!octets) return '';
  const mo = octets / (1024 * 1024);
  return mo < 1 ? `${Math.round(octets / 1024)} Ko` : `${mo.toFixed(1)} Mo`;
};

export function DocumentUploadModal({ isOpen, onClose, chantierId, onSuccess, initialFiles = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { taches = [], sousTraitants = [], lots = [], chantiers = [] } = useChantier();
  const { getConformite } = useSousTraitant();

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progression, setProgression] = useState(null); // { fait, total }
  const fileInputRef = useRef(null);
  const [typeDocument, setTypeDocument] = useState('autre');
  const [typePlan, setTypePlan] = useState('');
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
      .map(st => ({
        id: st.id,
        nom: st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan',
        aJour: getConformite(st.id).ok,
      }))
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [lotId, sousTraitants, sortedLots, getConformite]);

  // Décennale / URSSAF de l'artisan destinataire du marché
  const conformiteMarche = typeDocument === 'marche_travaux' && artisanId ? getConformite(artisanId) : null;

  // Ajoute des fichiers à la liste (sans doublon, extensions acceptées seulement)
  const ajouterFichiers = (liste) => {
    const nouveaux = Array.from(liste || []);
    const refuses = nouveaux.filter(f => !EXTENSIONS_ACCEPTEES.includes(extensionDe(f.name)));
    const acceptes = nouveaux.filter(f => EXTENSIONS_ACCEPTEES.includes(extensionDe(f.name)));
    if (refuses.length) {
      toast({
        title: `${refuses.length} fichier${refuses.length > 1 ? 's' : ''} ignoré${refuses.length > 1 ? 's' : ''}`,
        description: `Format non accepté : ${refuses.map(f => f.name).join(', ')}`,
        variant: 'destructive',
      });
    }
    setFiles(prev => {
      const cle = (f) => `${f.name}-${f.size}-${f.lastModified}`;
      const deja = new Set(prev.map(cle));
      return [...prev, ...acceptes.filter(f => !deja.has(cle(f)))];
    });
  };

  // Fichiers glissés sur l'onglet Documents avant l'ouverture de la fenêtre
  useEffect(() => {
    if (isOpen && initialFiles?.length) ajouterFichiers(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFiles]);

  const handleFileChange = (e) => {
    ajouterFichiers(e.target.files);
    e.target.value = ''; // permet de re-sélectionner le même fichier
  };

  const retirerFichier = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    ajouterFichiers(e.dataTransfer?.files);
  };

  const reinitialiser = () => {
    setFiles([]); setTypeDocument('autre'); setTypePlan(''); setLotId(''); setPartageType('tous');
    setArtisanId(''); setNecessiteSignature(false); setProgression(null); setIsDragging(false);
  };

  const handleClose = () => {
    if (uploading) return;
    reinitialiser();
    onClose();
  };

  const handleTypeDocumentChange = (newType) => {
    setTypeDocument(newType); setTypePlan(''); setLotId(''); setArtisanId(''); setPartageType('tous'); setNecessiteSignature(false);
  };

  const getExpediteurProfile = async () => {
    try {
      const { data } = await supabase.from('profiles')
        .select('nom, prenom, mail, tel, nomsociete, adresse, ville, code_postal')
        .eq('id', user.id).single();
      return data || null;
    } catch { return null; }
  };

  // Envoie un fichier : stockage + ligne documents_chantier (+ marché et email si marché de travaux)
  const envoyerFichier = async (file, expediteur) => {
    const fileExt = extensionDe(file.name);
    const fileName = `${chantierId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `chantiers/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('documents-chantiers').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('documents-chantiers').getPublicUrl(filePath);

    const documentData = {
      chantier_id: chantierId, nom_fichier: file.name, url_fichier: urlData.publicUrl,
      storage_path: filePath, type_fichier: fileExt, taille_fichier: file.size,
      type_document: typeDocument, type_plan: typeDocument === 'plan' ? typePlan : null,
      lot_id: typeDocument === 'marche_travaux' ? lotId : null,
      partage_type: typeDocument === 'marche_travaux' ? 'specifique' : partageType,
      artisan_id: typeDocument === 'marche_travaux' ? artisanId : (partageType === 'specifique' ? artisanId : null),
      uploaded_by: user.id,
      necessite_signature: typeDocument === 'marche_travaux' ? true : necessiteSignature,
      artisan_assigne_signature: typeDocument === 'marche_travaux' ? artisanId : (necessiteSignature && partageType === 'specifique' ? artisanId : null),
      signature_statut: (typeDocument === 'marche_travaux' || necessiteSignature) ? 'en_attente' : 'non_requis',
    };

    const { data: insertedDoc, error: dbError } = await supabase.from('documents_chantier').insert(documentData).select().single();
    if (dbError) {
      // Pas de fichier orphelin dans le stockage
      await supabase.storage.from('documents-chantiers').remove([filePath]).catch(() => {});
      throw dbError;
    }

    if (typeDocument === 'marche_travaux' && insertedDoc) {
      await supabase.from('marches_travaux').insert({
        chantier_id: chantierId, lot_id: lotId, soustraitant_id: artisanId,
        document_id: insertedDoc.id, date_envoi: new Date().toISOString(),
      });

      const artisan = sousTraitants.find(st => st.id === artisanId);
      const destinataire = await getArtisanEmailInfo(artisan, supabase);
      if (destinataire?.email) {
        await sendNotificationEmail('nouveau_document', destinataire.email, {
          nomFichier: file.name, chantierNom,
          typeDocument: TYPE_LABELS.marche_travaux,
          necessite_signature: true,
          urlFichier: await getSignedUrl(filePath, { bucket: 'documents-chantiers', expiresIn: EMAIL_EXPIRES_IN }).catch(() => null),
          expediteur,
          artisanPrenom: destinataire.prenom,
          aCompte: destinataire.aCompte,
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) { toast({ title: 'Erreur', description: 'Veuillez sélectionner au moins un fichier', variant: 'destructive' }); return; }
    if (typeDocument === 'plan' && !typePlan) { toast({ title: 'Erreur', description: 'Veuillez sélectionner le type de plan', variant: 'destructive' }); return; }
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

    if (conformiteMarche && !conformiteMarche.ok) {
      const nom = artisansParLot.find(st => st.id === artisanId)?.nom || 'Cet artisan';
      const ok = window.confirm(
        `⚠️ ${nom} n'est pas à jour :\n\n• ${conformiteMarche.motifs.join('\n• ')}\n\nEnvoyer ${files.length > 1 ? 'les marchés' : 'le marché'} quand même ?`
      );
      if (!ok) return;
    }

    setUploading(true);
    const total = files.length;
    const echecs = [];
    setProgression({ fait: 0, total });

    try {
      const expediteur = typeDocument === 'marche_travaux' ? await getExpediteurProfile() : null;

      // Un fichier après l'autre : un échec n'empêche pas les suivants
      for (let i = 0; i < total; i++) {
        try {
          await envoyerFichier(files[i], expediteur);
        } catch (error) {
          console.error('Erreur upload:', files[i].name, error);
          echecs.push(files[i]);
        }
        setProgression({ fait: i + 1, total });
      }

      const reussis = total - echecs.length;
      if (reussis > 0) onSuccess?.();

      if (echecs.length === 0) {
        toast({
          title: total > 1 ? `${total} documents ajoutés ✅` : 'Document ajouté ✅',
          description: total > 1 ? 'Tous les documents ont été partagés' : `${files[0].name} a été partagé`,
        });
        reinitialiser();
        onClose();
      } else {
        // On garde seulement les fichiers en échec pour pouvoir réessayer
        toast({
          title: `${echecs.length} document${echecs.length > 1 ? 's' : ''} non envoyé${echecs.length > 1 ? 's' : ''} ❌`,
          description: `${reussis} réussi${reussis > 1 ? 's' : ''}. Échec : ${echecs.map(f => f.name).join(', ')}. Vous pouvez réessayer.`,
          variant: 'destructive',
        });
        setFiles(echecs);
      }
    } finally {
      setUploading(false);
      setProgression(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter des documents</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            {/* Zone de dépôt : clic ou glisser-déposer, plusieurs fichiers */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                isDragging ? 'border-orange-500 bg-orange-50' : 'hover:bg-slate-50'
              }`}
            >
              <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">
                {isDragging ? 'Déposez vos fichiers ici' : 'Glissez vos fichiers ici ou cliquez pour les sélectionner'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Plusieurs fichiers possibles · PDF, DOCX, XLSX, images...</p>
            </div>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept={ACCEPT}
            />

            {files.length > 0 && (
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {files.map((f, index) => (
                  <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="flex-1 min-w-0 truncate" title={f.name}>{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTaille(f.size)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={uploading}
                      onClick={() => retirerFichier(index)} title="Retirer">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {files.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Les réglages ci-dessous s'appliquent aux {files.length} fichiers.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="type-document">Type de document</Label>
            <select id="type-document" value={typeDocument} onChange={(e) => handleTypeDocumentChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2">
              {TYPES_DOCUMENTS.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          {typeDocument === 'plan' && (
            <div>
              <Label htmlFor="type-plan">Type de plan *</Label>
              <select id="type-plan" value={typePlan} onChange={(e) => setTypePlan(e.target.value)} required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2">
                <option value="">Sélectionner un type de plan...</option>
                {TYPES_PLAN.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
          )}
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
                    {artisansParLot.map(st => <option key={st.id} value={st.id}>{st.nom}{st.aJour ? '' : ' ⚠️ non à jour'}</option>)}
                  </select>
                </div>
              )}
              {conformiteMarche && !conformiteMarche.ok && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-red-800">
                    <p className="font-medium">Cet artisan n'est pas à jour :</p>
                    <ul className="list-disc pl-5">
                      {conformiteMarche.motifs.map(m => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>Annuler</Button>
            <Button type="submit" disabled={files.length === 0 || uploading}>
              {uploading
                ? `Envoi ${progression ? `${progression.fait}/${progression.total}` : ''}...`
                : files.length > 1 ? `Ajouter les ${files.length} documents` : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}