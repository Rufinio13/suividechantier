import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, X, CheckCircle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { supabase, supabaseWithSessionCheck } from '@/lib/supabaseClient';

export function TacheDetailModalArtisan({ 
  isOpen, 
  onClose, 
  tache, 
  lot,
  chantier,
  onSuccess 
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState(tache?.artisan_photos || []);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const [commentaire, setCommentaire] = useState(tache?.artisan_commentaire || '');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  // ✅ Upload photo (AVEC wrapper)
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhotos(prev => [...prev, ...files.map(f => f.name)]);

    try {
      await supabaseWithSessionCheck(async () => {
        const uploadedUrls = [];

        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${tache.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `taches/${fileName}`;

          // Upload vers Supabase Storage
          const { data, error } = await supabase.storage
            .from('photos-taches')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            console.error('❌ Erreur upload:', error);
            throw error;
          }

          // Récupérer URL publique
          const { data: urlData } = supabase.storage
            .from('photos-taches')
            .getPublicUrl(filePath);

          uploadedUrls.push({
            url: urlData.publicUrl,
            name: file.name,
            uploaded_at: new Date().toISOString()
          });
        }

        setPhotos(prev => [...prev, ...uploadedUrls]);

        toast({
          title: "Photos ajoutées ✅",
          description: `${uploadedUrls.length} photo(s) ajoutée(s)`,
        });
      });
    } catch (error) {
      console.error('❌ Erreur upload photos:', error);
      toast({
        title: "Erreur ❌",
        description: "Impossible d'uploader les photos",
        variant: "destructive"
      });
    } finally {
      setUploadingPhotos([]);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ Marquer terminée (AVEC wrapper)
  const handleMarquerTerminee = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await supabaseWithSessionCheck(async () => {
        const { error } = await supabase
          .from('taches')
          .update({
            artisan_termine: true,
            artisan_termine_date: new Date().toISOString(),
            artisan_photos: photos,
            artisan_commentaire: commentaire || null
          })
          .eq('id', tache.id);

        if (error) throw error;

        toast({
          title: "Tâche marquée terminée ✅",
          description: "Le constructeur sera notifié pour validation",
        });

        onSuccess?.();
        onClose();
      });
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast({
        title: "Erreur ❌",
        description: error.message || "Impossible de marquer la tâche comme terminée",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tache) return null;

  const isDejaTermine = tache.artisan_termine || tache.constructeur_valide;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Infos tâche */}
          <div>
            {chantier && (
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Chantier : {chantier.nomchantier}
              </h2>
            )}
            <h3 className="text-lg font-semibold">{tache.nom}</h3>
            {lot && <p className="text-sm text-muted-foreground">Lot : {lot.lot}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Début</Label>
              <p className="font-medium">{formatDate(tache.datedebut)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Fin</Label>
              <p className="font-medium">{formatDate(tache.datefin)}</p>
            </div>
          </div>

          {/* Description */}
          {tache.description && (
            <div>
              <Label className="text-sm text-muted-foreground">Description</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{tache.description}</p>
            </div>
          )}

          {/* Statut */}
          {isDejaTermine && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  {tache.constructeur_valide 
                    ? '✅ Tâche validée par le constructeur'
                    : '✅ Tâche marquée terminée (en attente de validation)'}
                </span>
              </div>
              {tache.artisan_termine_date && (
                <p className="text-xs text-green-700 mt-1">
                  Terminée le {formatDate(tache.artisan_termine_date)}
                </p>
              )}
            </div>
          )}

          {/* Photos existantes */}
          {photos.length > 0 && (
            <div>
              <Label>Photos ({photos.length})</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo.url} 
                      alt={photo.name || `Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    {!isDejaTermine && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload photos */}
          {!isDejaTermine && (
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Ajouter des photos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadingPhotos.length > 0 
                      ? `Upload en cours... (${uploadingPhotos.length})`
                      : 'Cliquez pour sélectionner'}
                  </p>
                </div>
              </Label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhotos.length > 0}
              />
            </div>
          )}

          {/* Commentaire artisan */}
          {!isDejaTermine && (
            <div>
              <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
              <Textarea
                id="commentaire"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajoutez un commentaire sur cette tâche..."
                rows={3}
                className="mt-2"
              />
            </div>
          )}

          {/* Afficher commentaire existant */}
          {isDejaTermine && commentaire && (
            <div>
              <Label className="text-sm text-muted-foreground">Votre commentaire</Label>
              <div className="mt-2 p-3 bg-slate-50 border rounded-md">
                <p className="text-sm whitespace-pre-wrap">{commentaire}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
          
          {!isDejaTermine && (
            <Button 
              onClick={handleMarquerTerminee}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Enregistrement...' : 'Marquer comme terminée'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}