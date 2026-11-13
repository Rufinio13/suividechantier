// src/components/photos/PhotosTab.jsx
// Galerie de toutes les photos d'un chantier : photos des artisans (tâches, reprises NC)
// et photos du constructeur (contrôle qualité, comptes rendus).
// Les photos restent stockées dans leur source d'origine ; le lot choisi manuellement
// est enregistré dans l'objet photo lui-même (champs lot_id + lot_manuel).
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Image as ImageIcon, User, Layers, Calendar, ExternalLink, Download, CheckSquare, Check, X, Loader2 } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useReferentielCQ } from '@/context/ReferentielCQContext.jsx';
import { useCompteRendu } from '@/context/CompteRenduContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { StorageImage } from '@/components/StorageImage.jsx';
import { openStorageFile } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { enregistrerPhotos, enregistrerUnePhoto, choixDossierDisponible } from '@/lib/enregistrerPhotos';

export const GENERAL = '__general__';

const ORIGINES = {
  tache: { label: 'Tâche', className: 'bg-blue-100 text-blue-800' },
  reprise_nc: { label: 'Reprise NC', className: 'bg-green-100 text-green-800' },
  controle_qualite: { label: 'Contrôle qualité', className: 'bg-amber-100 text-amber-800' },
  compte_rendu: { label: 'Compte rendu', className: 'bg-purple-100 text-purple-800' },
  ajout_artisan: { label: 'Photo artisan', className: 'bg-orange-100 text-orange-800' },
};

const normaliserPhoto = (p) => (typeof p === 'string' ? { url: p } : p || {});
const datePhoto = (p) => p.uploaded_at || p.uploadedAt || null;

const nomSousTraitant = (st) =>
  st ? (st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan') : null;

const formatDate = (d) => {
  if (!d) return null;
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: fr }); } catch { return null; }
};

// Indexe les libellés (catégories, sous-catégories, points) par id, en parcourant n'importe quelle structure.
function indexerLibelles(source, index = {}) {
  if (!source || typeof source !== 'object') return index;
  if (Array.isArray(source)) {
    source.forEach((s) => indexerLibelles(s, index));
    return index;
  }
  if (source.id && (source.libelle || source.nom || source.titre)) {
    index[source.id] = source.libelle || source.nom || source.titre;
  }
  Object.values(source).forEach((v) => { if (v && typeof v === 'object') indexerLibelles(v, index); });
  return index;
}

// Une photo est "non vue" si elle a été ajoutée par quelqu'un d'autre après la dernière visite de l'onglet.
// Les anciennes photos sans date d'upload ne sont jamais signalées.
export function estPhotoNonVue(photo, vuAt, userId) {
  if (!photo.dateUpload) return false;
  if (userId && photo.auteurId === userId) return false;
  if (!vuAt) return true;
  return new Date(photo.dateUpload) > new Date(vuAt);
}

// Liste de toutes les photos d'un chantier (artisans + constructeur), triées de la plus récente à la plus ancienne.
export function usePhotosChantier(chantierId, photosLibres = []) {
  const { taches = [], lots = [], sousTraitants = [] } = useChantier();
  const { controles = [], modelesCQ = [] } = useReferentielCQ();
  const { getComptesRendusByChantier } = useCompteRendu();

  const tachesChantier = useMemo(
    () => taches.filter((t) => t.chantierid === chantierId),
    [taches, chantierId]
  );

  // Lots utilisés sur ce chantier (via les tâches), puis les autres lots
  const { lotsChantier, autresLots } = useMemo(() => {
    const ids = new Set(tachesChantier.map((t) => t.lotid).filter(Boolean));
    const tri = (a, b) => (a.lot || '').localeCompare(b.lot || '');
    return {
      lotsChantier: lots.filter((l) => ids.has(l.id)).sort(tri),
      autresLots: lots.filter((l) => !ids.has(l.id)).sort(tri),
    };
  }, [lots, tachesChantier]);

  const nomLot = (lotId) => lots.find((l) => l.id === lotId)?.lot || 'Lot inconnu';

  // Lot déduit pour un artisan : uniquement s'il n'a qu'un seul lot sur ce chantier
  const lotDeduitArtisan = (soustraitantId) => {
    if (!soustraitantId) return null;
    const lotIds = new Set(
      tachesChantier
        .filter((t) => t.assignetype === 'soustraitant' && t.assigneid === soustraitantId && t.lotid)
        .map((t) => t.lotid)
    );
    return lotIds.size === 1 ? [...lotIds][0] : null;
  };

  const auteurLabel = (photo, fallback) => {
    if (photo.auteur_nom) return photo.auteur_nom;
    return fallback;
  };

  // ============ CONSTRUCTION DE LA LISTE DES PHOTOS ============
  const photos = useMemo(() => {
    const liste = [];

    // 1. Photos des tâches (artisans)
    tachesChantier.forEach((tache) => {
      const st = tache.assignetype === 'soustraitant'
        ? sousTraitants.find((s) => s.id === tache.assigneid)
        : null;
      (tache.artisan_photos || []).forEach((raw, i) => {
        const photo = normaliserPhoto(raw);
        if (!photo.url) return;
        const entreprise = nomSousTraitant(st) || 'Artisan';
        liste.push({
          key: `tache-${tache.id}-${i}`,
          url: photo.url,
          origine: 'tache',
          detail: tache.nom || 'Tâche',
          entreprise,
          soustraitantId: st?.id || null,
          auteur: photo.auteur_nom ? `${photo.auteur_nom} (${entreprise})` : entreprise,
          auteurFiltre: entreprise,
          lotId: tache.lotid || null,
          lotModifiable: false,
          date: datePhoto(photo) || tache.artisan_termine_date || null,
          dateUpload: datePhoto(photo),
          auteurId: photo.auteur_id || null,
          ref: null,
        });
      });
    });

    // 2. Contrôle qualité : photos NC (constructeur) + photos de reprise (artisans)
    controles
      .filter((c) => c.chantier_id === chantierId)
      .forEach((controle) => {
        const modele = modelesCQ.find((m) => m.id === controle.modele_cq_id);
        const libelles = indexerLibelles([
          modele?.categories,
          controle.categories_specifiques,
          controle.sous_categories_specifiques,
          controle.points_specifiques,
        ]);
        const resultats = controle.resultats || {};

        Object.entries(resultats).forEach(([catId, sousCats]) => {
          Object.entries(sousCats || {}).forEach(([scId, points]) => {
            Object.entries(points || {}).forEach(([ptId, res]) => {
              if (!res) return;
              const nomPoint = libelles[ptId] || libelles[scId] || libelles[catId] || 'Point de contrôle';
              const st = res.soustraitant_id ? sousTraitants.find((s) => s.id === res.soustraitant_id) : null;
              const lotArtisan = lotDeduitArtisan(res.soustraitant_id);

              const ajouter = (champ, origine) => {
                (res[champ] || []).forEach((raw, i) => {
                  const photo = normaliserPhoto(raw);
                  if (!photo.url) return;
                  const estArtisan = origine === 'reprise_nc';
                  const entreprise = estArtisan ? (nomSousTraitant(st) || 'Artisan') : 'Constructeur';
                  const lotAuto = estArtisan ? lotArtisan : null;
                  liste.push({
                    key: `cq-${controle.id}-${catId}-${scId}-${ptId}-${champ}-${i}`,
                    url: photo.url,
                    origine,
                    detail: nomPoint,
                    entreprise,
                    soustraitantId: estArtisan ? (res.soustraitant_id || null) : null,
                    auteur: estArtisan
                      ? (photo.auteur_nom ? `${photo.auteur_nom} (${entreprise})` : entreprise)
                      : auteurLabel(photo, 'Constructeur (auteur non enregistré)'),
                    auteurFiltre: estArtisan ? entreprise : auteurLabel(photo, 'Constructeur (auteur non enregistré)'),
                    lotId: photo.lot_manuel ? (photo.lot_id || null) : lotAuto,
                    lotModifiable: true,
                    date: datePhoto(photo) || (estArtisan ? res.artisan_repris_date : null) || controle.date_controle || null,
                    dateUpload: datePhoto(photo),
                    auteurId: photo.auteur_id || null,
                    ref: { type: 'cq', controle, catId, scId, ptId, champ, url: photo.url },
                  });
                });
              };
              ajouter('photos', 'controle_qualite');
              ajouter('artisan_repris_photos', 'reprise_nc');
            });
          });
        });
      });

    // 3. Comptes rendus (constructeur)
    (getComptesRendusByChantier?.(chantierId) || []).forEach((cr) => {
      (cr.photos || []).forEach((raw, i) => {
        const photo = normaliserPhoto(raw);
        if (!photo.url) return;
        const auteur = auteurLabel(photo, 'Constructeur (auteur non enregistré)');
        liste.push({
          key: `cr-${cr.id}-${i}`,
          url: photo.url,
          origine: 'compte_rendu',
          detail: cr.titre || `Compte rendu du ${formatDate(cr.date) || ''}`,
          entreprise: 'Constructeur',
          auteur,
          auteurFiltre: auteur,
          description: photo.description || '',
          lotId: photo.lot_manuel ? (photo.lot_id || null) : null,
          lotModifiable: true,
          date: datePhoto(photo) || cr.date || null,
          dateUpload: datePhoto(photo),
          auteurId: photo.auteur_id || null,
          ref: { type: 'cr', cr, url: photo.url },
        });
      });
    });

    // 4. Photos ajoutées directement par les artisans (table photos_chantier)
    photosLibres.forEach((row) => {
      if (!row?.url) return;
      const st = row.soustraitant_id ? sousTraitants.find((x) => x.id === row.soustraitant_id) : null;
      const entreprise = nomSousTraitant(st) || 'Artisan';
      liste.push({
        key: `libre-${row.id}`,
        url: row.url,
        origine: 'ajout_artisan',
        detail: row.commentaire || 'Photo de chantier',
        entreprise,
        soustraitantId: row.soustraitant_id || null,
        auteur: row.auteur_nom ? `${row.auteur_nom} (${entreprise})` : entreprise,
        auteurFiltre: entreprise,
        description: row.commentaire || '',
        lotId: row.lot_id || null,
        lotModifiable: true,
        date: row.created_at,
        dateUpload: row.created_at,
        auteurId: row.auteur_id || null,
        ref: { type: 'libre', row },
      });
    });

    return liste.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tachesChantier, controles, modelesCQ, sousTraitants, getComptesRendusByChantier, chantierId, photosLibres]);

  return { photos, lots, lotsChantier, autresLots, nomLot };
}

export function PhotosTab({
  chantierId,
  vuAtPrecedent = null,
  notificationsActives = false,
  photosLibres = [],
  changerLotPhotoLibre = null,
}) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { saveControleFromModele } = useReferentielCQ();
  const { updateCompteRendu } = useCompteRendu();
  const { photos, lots, lotsChantier, autresLots, nomLot } = usePhotosChantier(chantierId, photosLibres);

  const [filtreLot, setFiltreLot] = useState('');
  const [filtreAuteur, setFiltreAuteur] = useState('');
  const [filtreOrigine, setFiltreOrigine] = useState('');
  const [photoOuverteKey, setPhotoOuverteKey] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  // Sélection pour enregistrement sur le PC
  const [modeSelection, setModeSelection] = useState(false);
  const [selection, setSelection] = useState(() => new Set());
  const [progression, setProgression] = useState(null); // { fait, total }

  const estNouvelle = (p) => notificationsActives && estPhotoNonVue(p, vuAtPrecedent, profile?.id);

  const photoOuverte = photoOuverteKey ? photos.find((p) => p.key === photoOuverteKey) || null : null;

  // ============ FILTRES ============
  const auteursDisponibles = useMemo(
    () => [...new Set(photos.map((p) => p.auteurFiltre))].sort((a, b) => a.localeCompare(b)),
    [photos]
  );
  const lotsPresents = useMemo(() => {
    const ids = new Set(photos.map((p) => p.lotId).filter(Boolean));
    return lots.filter((l) => ids.has(l.id)).sort((a, b) => (a.lot || '').localeCompare(b.lot || ''));
  }, [photos, lots]);

  const photosFiltrees = photos.filter((p) => {
    if (filtreLot === GENERAL && p.lotId) return false;
    if (filtreLot && filtreLot !== GENERAL && p.lotId !== filtreLot) return false;
    if (filtreAuteur && p.auteurFiltre !== filtreAuteur) return false;
    if (filtreOrigine && p.origine !== filtreOrigine) return false;
    return true;
  });

  // Regroupement par lot (Général en dernier)
  const groupes = useMemo(() => {
    const map = new Map();
    photosFiltrees.forEach((p) => {
      const k = p.lotId || GENERAL;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    return [...map.entries()]
      .map(([k, items]) => ({ key: k, titre: k === GENERAL ? 'Général' : nomLot(k), items }))
      .sort((a, b) => {
        if (a.key === GENERAL) return 1;
        if (b.key === GENERAL) return -1;
        return a.titre.localeCompare(b.titre);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosFiltrees, lots]);

  // ============ SÉLECTION ET ENREGISTREMENT SUR LE PC ============
  const basculer = (key) => setSelection((prev) => {
    const s = new Set(prev);
    if (s.has(key)) s.delete(key); else s.add(key);
    return s;
  });
  const basculerGroupe = (items) => setSelection((prev) => {
    const s = new Set(prev);
    const tous = items.every((p) => s.has(p.key));
    items.forEach((p) => (tous ? s.delete(p.key) : s.add(p.key)));
    return s;
  });
  const toutSelectionner = () => setSelection(new Set(photosFiltrees.map((p) => p.key)));
  const quitterSelection = () => { setModeSelection(false); setSelection(new Set()); };

  const nomLotPhoto = (p) => (p.lotId ? nomLot(p.lotId) : 'General');

  const enregistrerSelection = async () => {
    const choisies = photos.filter((p) => selection.has(p.key));
    if (choisies.length === 0) return;
    try {
      const res = await enregistrerPhotos(
        choisies.map((p) => ({ photo: p, nomLot: nomLotPhoto(p) })),
        (fait, total) => setProgression({ fait, total })
      );
      if (res.annule) return;
      if (res.erreurs === 0) {
        toast({ title: 'Photos enregistrées', description: `${res.ok} photo(s) enregistrée(s)${res.dossier ? ' dans le dossier choisi' : ' dans vos téléchargements'}.` });
        quitterSelection();
      } else {
        toast({ title: 'Enregistrement partiel', description: `${res.ok} photo(s) enregistrée(s), ${res.erreurs} en erreur.`, variant: 'destructive' });
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement photos :', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer les photos dans ce dossier", variant: 'destructive' });
    } finally {
      setProgression(null);
    }
  };

  const enregistrerPhotoOuverte = async () => {
    try {
      const ok = await enregistrerUnePhoto(photoOuverte, nomLotPhoto(photoOuverte));
      if (ok) toast({ title: 'Photo enregistrée' });
    } catch (error) {
      console.error('❌ Erreur enregistrement photo :', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la photo", variant: 'destructive' });
    }
  };

  // ============ MODIFICATION MANUELLE DU LOT ============
  const majPhoto = (photoRaw, url, lotId) => {
    const p = normaliserPhoto(photoRaw);
    if (p.url !== url) return photoRaw;
    return { ...p, lot_id: lotId || null, lot_manuel: true };
  };

  const changerLot = async (photo, valeur) => {
    const lotId = valeur === GENERAL ? null : valeur;
    setEnregistrement(true);
    try {
      if (photo.ref.type === 'libre') {
        if (!changerLotPhotoLibre) throw new Error('Modification non disponible');
        await changerLotPhotoLibre(photo.ref.row.id, lotId);
      } else if (photo.ref.type === 'cr') {
        const { cr, url } = photo.ref;
        await updateCompteRendu(cr.id, { photos: (cr.photos || []).map((p) => majPhoto(p, url, lotId)) });
      } else if (photo.ref.type === 'cq') {
        const { controle, catId, scId, ptId, champ, url } = photo.ref;
        const resultats = JSON.parse(JSON.stringify(controle.resultats || {}));
        const point = resultats?.[catId]?.[scId]?.[ptId];
        if (!point) throw new Error('Point de contrôle introuvable');
        point[champ] = (point[champ] || []).map((p) => majPhoto(p, url, lotId));
        await saveControleFromModele(chantierId, controle.modele_cq_id, resultats, controle.points_specifiques || {});
      }
      toast({ title: 'Lot mis à jour', description: lotId ? `Photo classée dans « ${nomLot(lotId)} »` : 'Photo classée dans « Général »' });
    } catch (error) {
      console.error('❌ Erreur changement de lot photo:', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le lot de la photo", variant: 'destructive' });
    } finally {
      setEnregistrement(false);
    }
  };

  // ============ RENDU ============
  const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

  const SelectLot = ({ photo }) => (
    <select
      className={`${selectClass} w-full`}
      value={photo.lotId || GENERAL}
      disabled={enregistrement}
      onChange={(e) => changerLot(photo, e.target.value)}
    >
      <option value={GENERAL}>Général (sans lot)</option>
      {lotsChantier.length > 0 && (
        <optgroup label="Lots du chantier">
          {lotsChantier.map((l) => <option key={l.id} value={l.id}>{l.lot}</option>)}
        </optgroup>
      )}
      {autresLots.length > 0 && (
        <optgroup label="Autres lots">
          {autresLots.map((l) => <option key={l.id} value={l.id}>{l.lot}</option>)}
        </optgroup>
      )}
    </select>
  );

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune photo sur ce chantier pour le moment</p>
          <p className="text-xs text-muted-foreground mt-1">
            Les photos des artisans (tâches, reprises) et du constructeur (contrôle qualité, comptes rendus) apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
        <select className={selectClass} value={filtreLot} onChange={(e) => setFiltreLot(e.target.value)}>
          <option value="">Tous les lots</option>
          {lotsPresents.map((l) => <option key={l.id} value={l.id}>{l.lot}</option>)}
          <option value={GENERAL}>Général (sans lot)</option>
        </select>
        <select className={selectClass} value={filtreAuteur} onChange={(e) => setFiltreAuteur(e.target.value)}>
          <option value="">Tous les auteurs</option>
          {auteursDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={selectClass} value={filtreOrigine} onChange={(e) => setFiltreOrigine(e.target.value)}>
          <option value="">Toutes les origines</option>
          {Object.entries(ORIGINES).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
        </select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {photosFiltrees.length} photo{photosFiltrees.length > 1 ? 's' : ''}
        </span>
        {!modeSelection && (
          <Button variant="outline" size="sm" onClick={() => setModeSelection(true)}>
            <CheckSquare className="mr-2 h-4 w-4" /> Sélectionner
          </Button>
        )}
      </div>

      {modeSelection && (
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center rounded-lg border bg-blue-50 border-blue-200 p-3">
          <span className="text-sm font-medium text-blue-900">
            {selection.size} photo{selection.size > 1 ? 's' : ''} sélectionnée{selection.size > 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={toutSelectionner} disabled={!!progression}>
              Tout sélectionner ({photosFiltrees.length})
            </Button>
            {selection.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSelection(new Set())} disabled={!!progression}>
                Tout désélectionner
              </Button>
            )}
            <Button size="sm" onClick={enregistrerSelection} disabled={selection.size === 0 || !!progression}>
              {progression
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {progression.fait}/{progression.total}</>
                : <><Download className="mr-2 h-4 w-4" /> Enregistrer sur mon PC</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={quitterSelection} disabled={!!progression}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
          </div>
          {!choixDossierDisponible() && (
            <p className="text-xs text-blue-800 w-full">
              Votre navigateur ne permet pas de choisir le dossier : les photos iront dans vos téléchargements.
              Utilisez Chrome ou Edge pour choisir l'emplacement.
            </p>
          )}
        </div>
      )}

      {groupes.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">Aucune photo ne correspond aux filtres.</p>
      )}

      {groupes.map((groupe) => (
        <div key={groupe.key} className="space-y-2">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {groupe.titre}
            <span className="text-xs font-normal text-muted-foreground">({groupe.items.length})</span>
            {groupe.items.some(estNouvelle) && (
              <span className="text-xs font-normal text-red-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {groupe.items.filter(estNouvelle).length} nouvelle{groupe.items.filter(estNouvelle).length > 1 ? 's' : ''}
              </span>
            )}
            {modeSelection && (
              <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-xs font-normal" onClick={() => basculerGroupe(groupe.items)}>
                {groupe.items.every((p) => selection.has(p.key)) ? 'Désélectionner le lot' : 'Sélectionner le lot'}
              </Button>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {groupe.items.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => (modeSelection ? basculer(p.key) : setPhotoOuverteKey(p.key))}
                aria-pressed={modeSelection ? selection.has(p.key) : undefined}
                className={`relative text-left rounded-lg border bg-white overflow-hidden hover:shadow-md transition ${
                  modeSelection && selection.has(p.key) ? 'ring-2 ring-blue-500 border-blue-500' : ''
                }`}
              >
                <StorageImage src={p.url} alt={p.detail} className="w-full h-32 object-cover" />
                {modeSelection && (
                  <span
                    className={`absolute top-2 left-2 h-5 w-5 rounded border-2 flex items-center justify-center ${
                      selection.has(p.key) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/90 border-slate-400'
                    }`}
                  >
                    {selection.has(p.key) && <Check className="h-3.5 w-3.5" />}
                  </span>
                )}
                {estNouvelle(p) && (
                  <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" title="Nouvelle photo" />
                )}
                <div className="p-2 space-y-1">
                  <Badge variant="outline" className={`${ORIGINES[p.origine].className} border-0 text-[10px] px-1.5 py-0`}>
                    {ORIGINES[p.origine].label}
                  </Badge>
                  <p className="text-xs font-medium truncate" title={p.auteur}>{p.auteur}</p>
                  <p className="text-[11px] text-muted-foreground truncate" title={p.detail}>{p.detail}</p>
                  {formatDate(p.date) && <p className="text-[11px] text-muted-foreground">{formatDate(p.date)}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Visionneuse */}
      <Dialog open={!!photoOuverte} onOpenChange={(open) => !open && setPhotoOuverteKey(null)}>
        <DialogContent className="max-w-3xl">
          {photoOuverte && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{photoOuverte.detail}</DialogTitle>
              </DialogHeader>
              <StorageImage src={photoOuverte.url} alt={photoOuverte.detail} className="w-full max-h-[60vh] object-contain rounded bg-slate-50" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span className="font-medium">Auteur :</span>{photoOuverte.auteur}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span className="font-medium">Date :</span>{formatDate(photoOuverte.date) || 'Non renseignée'}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${ORIGINES[photoOuverte.origine].className} border-0`}>{ORIGINES[photoOuverte.origine].label}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium shrink-0">Lot :</span>
                  {photoOuverte.lotModifiable
                    ? <SelectLot photo={photoOuverte} />
                    : <span>{photoOuverte.lotId ? nomLot(photoOuverte.lotId) : 'Général'}</span>}
                </div>
                {photoOuverte.description && (
                  <p className="sm:col-span-2 text-slate-600">{photoOuverte.description}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={enregistrerPhotoOuverte}>
                  <Download className="mr-2 h-4 w-4" /> Enregistrer sur mon PC
                </Button>
                <Button variant="outline" size="sm" onClick={() => openStorageFile(photoOuverte.url)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir en plein écran
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
