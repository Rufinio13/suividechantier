// src/components/artisan/PhotosArtisanTab.jsx
// Onglet Photos de l'espace artisan : l'artisan ajoute ses photos de chantier (avec le lot)
// et retrouve toutes celles qu'il a prises sur ce chantier (tâches, reprises NC, ajouts directs).
import React, { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Image as ImageIcon, Layers, Calendar, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';
import { usePhotosLibres } from '@/hooks/usePhotosLibres';
import { usePhotosChantier, GENERAL } from '@/components/photos/PhotosTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { StorageImage } from '@/components/StorageImage.jsx';
import { openStorageFile } from '@/lib/storage';

const ORIGINE_LABEL = {
  ajout_artisan: { label: 'Photo de chantier', className: 'bg-orange-100 text-orange-800' },
  tache: { label: 'Tâche', className: 'bg-blue-100 text-blue-800' },
  reprise_nc: { label: 'Reprise NC', className: 'bg-green-100 text-green-800' },
};

const formatDate = (d) => {
  if (!d) return null;
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return null; }
};

export function PhotosArtisanTab({ chantierId, soustraitantId }) {
  const { toast } = useToast();
  const { taches = [], lots = [] } = useChantier();
  const { photosLibres, ajouterPhotos, changerLotPhotoLibre, supprimerPhotoLibre } = usePhotosLibres(chantierId);
  const { photos } = usePhotosChantier(chantierId, photosLibres);
  const { confirm, ConfirmDialog } = useConfirm();

  // Lots de l'artisan sur ce chantier (via ses tâches)
  const mesLots = useMemo(() => {
    const ids = new Set(
      taches
        .filter((t) => t.chantierid === chantierId && t.assignetype === 'soustraitant' && t.assigneid === soustraitantId && t.lotid)
        .map((t) => t.lotid)
    );
    return lots.filter((l) => ids.has(l.id)).sort((a, b) => (a.lot || '').localeCompare(b.lot || ''));
  }, [taches, lots, chantierId, soustraitantId]);

  const [lotChoisi, setLotChoisi] = useState('');
  const lotParDefaut = mesLots.length === 1 ? mesLots[0].id : '';
  const lotUpload = lotChoisi || lotParDefaut;
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [photoOuverteKey, setPhotoOuverteKey] = useState(null);
  const inputRef = useRef(null);

  const mesPhotos = useMemo(
    () => photos.filter((p) => p.soustraitantId === soustraitantId),
    [photos, soustraitantId]
  );
  const photoOuverte = photoOuverteKey ? mesPhotos.find((p) => p.key === photoOuverteKey) || null : null;

  const nomLot = (lotId) => lots.find((l) => l.id === lotId)?.lot || 'Général';

  const handleFichiers = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    if (mesLots.length > 1 && !lotUpload) {
      toast({ title: 'Lot à préciser', description: 'Choisissez le lot concerné avant d’ajouter les photos.', variant: 'destructive' });
      return;
    }
    setEnvoi(true);
    try {
      const ajoutees = await ajouterPhotos(files, {
        soustraitantId,
        lotId: lotUpload && lotUpload !== GENERAL ? lotUpload : null,
        commentaire: commentaire.trim(),
      });
      setCommentaire('');
      toast({ title: 'Photos ajoutées', description: `${ajoutees.length} photo(s) envoyée(s) au constructeur.` });
    } catch (error) {
      console.error('❌ Erreur ajout photos chantier :', error);
      toast({ title: 'Erreur', description: "Impossible d'ajouter les photos", variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  const handleChangerLot = async (photo, valeur) => {
    try {
      await changerLotPhotoLibre(photo.ref.row.id, valeur === GENERAL ? null : valeur);
      toast({ title: 'Lot mis à jour' });
    } catch (error) {
      console.error('❌ Erreur changement lot :', error);
      toast({ title: 'Erreur', description: 'Impossible de modifier le lot', variant: 'destructive' });
    }
  };

  const handleSupprimer = async (photo) => {
    const ok = await confirm('La photo sera supprimée définitivement. Continuer ?', 'Supprimer la photo');
    if (!ok) return;
    try {
      await supprimerPhotoLibre(photo.ref.row);
      setPhotoOuverteKey(null);
      toast({ title: 'Photo supprimée' });
    } catch (error) {
      console.error('❌ Erreur suppression photo :', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la photo', variant: 'destructive' });
    }
  };

  const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

  return (
    <div className="space-y-6">
      {/* Ajout */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Camera className="h-5 w-5 text-orange-500" /> Ajouter des photos</CardTitle>
          <CardDescription>Les photos sont visibles par le constructeur dans le dossier Photos du chantier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="photo-lot">Lot concerné</Label>
              {mesLots.length === 1 ? (
                <p className="h-10 flex items-center text-sm font-medium">{mesLots[0].lot}</p>
              ) : (
                <select id="photo-lot" className={selectClass} value={lotUpload} onChange={(e) => setLotChoisi(e.target.value)}>
                  <option value="">— Choisir le lot —</option>
                  {mesLots.map((l) => <option key={l.id} value={l.id}>{l.lot}</option>)}
                  <option value={GENERAL}>Général (sans lot)</option>
                </select>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="photo-commentaire">Commentaire (facultatif)</Label>
              <Input
                id="photo-commentaire"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ex : réseaux avant fermeture des cloisons"
              />
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFichiers} />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={envoi}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
          >
            {envoi
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours…</>
              : <><Camera className="mr-2 h-4 w-4" /> Prendre ou choisir des photos</>}
          </Button>
        </CardContent>
      </Card>

      {/* Galerie */}
      {mesPhotos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Vous n'avez pas encore de photo sur ce chantier</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">Mes photos sur ce chantier ({mesPhotos.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {mesPhotos.map((p) => {
              const o = ORIGINE_LABEL[p.origine] || ORIGINE_LABEL.ajout_artisan;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPhotoOuverteKey(p.key)}
                  className="text-left rounded-lg border bg-white overflow-hidden hover:shadow-md transition"
                >
                  <StorageImage src={p.url} alt={p.detail} className="w-full h-32 object-cover" />
                  <div className="p-2 space-y-1">
                    <Badge variant="outline" className={`${o.className} border-0 text-[10px] px-1.5 py-0`}>{o.label}</Badge>
                    <p className="text-xs font-medium truncate">{p.lotId ? nomLot(p.lotId) : 'Général'}</p>
                    <p className="text-[11px] text-muted-foreground truncate" title={p.detail}>{p.detail}</p>
                    {formatDate(p.date) && <p className="text-[11px] text-muted-foreground">{formatDate(p.date)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /><span className="font-medium">Date :</span>{formatDate(photoOuverte.date) || 'Non renseignée'}
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium shrink-0">Lot :</span>
                  {photoOuverte.ref?.type === 'libre' ? (
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={photoOuverte.lotId || GENERAL}
                      onChange={(e) => handleChangerLot(photoOuverte, e.target.value)}
                    >
                      <option value={GENERAL}>Général (sans lot)</option>
                      {mesLots.map((l) => <option key={l.id} value={l.id}>{l.lot}</option>)}
                    </select>
                  ) : (
                    <span>{photoOuverte.lotId ? nomLot(photoOuverte.lotId) : 'Général'}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {photoOuverte.ref?.type === 'libre' && (
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleSupprimer(photoOuverte)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openStorageFile(photoOuverte.url)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir en plein écran
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
