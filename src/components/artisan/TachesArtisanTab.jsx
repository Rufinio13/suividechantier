import React, { useMemo, useState } from 'react';
import { useChantier } from '@/context/ChantierContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks, CheckCircle, Camera, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export function TachesArtisanTab({ chantierId, soustraitantId }) {
  const { taches, lots, loadTaches } = useChantier();
  const { toast } = useToast();

  const [photos, setPhotos] = useState({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [commentaires, setCommentaires] = useState({});
  const [submitting, setSubmitting] = useState({});

  // Mes tâches sur ce chantier
  const mesTaches = useMemo(() => {
    return taches.filter(t => 
      t.chantierid === chantierId && 
      t.assignetype === 'soustraitant' && 
      t.assigneid === soustraitantId
    ).sort((a, b) => {
      const dateA = a.datedebut ? new Date(a.datedebut) : new Date(0);
      const dateB = b.datedebut ? new Date(b.datedebut) : new Date(0);
      return dateA - dateB;
    });
  }, [taches, chantierId, soustraitantId]);

  // Initialiser états avec données existantes
  React.useEffect(() => {
    const initialPhotos = {};
    const initialCommentaires = {};
    
    mesTaches.forEach(tache => {
      initialPhotos[tache.id] = tache.artisan_photos || [];
      initialCommentaires[tache.id] = tache.artisan_commentaire || '';
    });
    
    setPhotos(initialPhotos);
    setCommentaires(initialCommentaires);
  }, [mesTaches]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getTacheKey = (tacheId) => tacheId;

  const handlePhotoUpload = async (tacheId, files) => {
    if (!files || files.length === 0) return;

    setUploadingPhotos(prev => ({ ...prev, [tacheId]: true }));

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tacheId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `taches/${fileName}`; // ✅ Même chemin que modal

        const { data, error } = await supabase.storage
          .from('photos-taches')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('photos-taches')
          .getPublicUrl(filePath);

        uploadedUrls.push({
          url: urlData.publicUrl,
          name: file.name,
          uploaded_at: new Date().toISOString()
        });
      }

      setPhotos(prev => ({
        ...prev,
        [tacheId]: [...(prev[tacheId] || []), ...uploadedUrls]
      }));

      toast({
        title: 'Photos ajoutées',
        description: `${uploadedUrls.length} photo(s) ajoutée(s)`,
      });

    } catch (error) {
      console.error('❌ Erreur upload photos:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader les photos',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [tacheId]: false }));
    }
  };

  const handleRemovePhoto = (tacheId, photoIndex) => {
    setPhotos(prev => ({
      ...prev,
      [tacheId]: (prev[tacheId] || []).filter((_, i) => i !== photoIndex)
    }));
  };

  const handleMarquerTerminee = async (tache) => {
    const tacheId = tache.id;
    
    if (submitting[tacheId]) return;

    setSubmitting(prev => ({ ...prev, [tacheId]: true }));

    try {
      const { error } = await supabase
        .from('taches')
        .update({
          artisan_termine: true,
          artisan_termine_date: new Date().toISOString(),
          artisan_photos: photos[tacheId] || [],
          artisan_commentaire: commentaires[tacheId] || null
        })
        .eq('id', tacheId);

      if (error) throw error;

      toast({
        title: 'Tâche marquée terminée',
        description: 'Le constructeur sera notifié pour validation',
      });

      await loadTaches();

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la tâche comme terminée',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(prev => ({ ...prev, [tacheId]: false }));
    }
  };

  if (mesTaches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune tâche assignée sur ce chantier</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {mesTaches.map((tache) => {
        const tacheId = tache.id;
        const lot = lots.find(l => l.id === tache.lotid);
        const isDejaTermine = tache.artisan_termine || tache.constructeur_valide;

        return (
          <Card 
            key={tacheId} 
            className={`${
              tache.constructeur_valide
                ? 'bg-green-50 border-green-300'
                : tache.artisan_termine 
                  ? 'bg-yellow-50 border-yellow-300' 
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{tache.nom}</span>
                {tache.constructeur_valide ? (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-normal">
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    Validée
                  </span>
                ) : tache.artisan_termine ? (
                  <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-normal">
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    En attente validation
                  </span>
                ) : null}
              </CardTitle>
              {lot && (
                <CardDescription className="text-xs">
                  Lot : {lot.lot}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* INFORMATIONS */}
              <div className="p-3 bg-white rounded-md border space-y-2 text-sm">
                <div className="font-medium text-slate-900">Informations</div>
                
                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-slate-600">Début :</span>
                    <p className="text-sm font-medium text-slate-800">{formatDate(tache.datedebut)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-600">Fin :</span>
                    <p className="text-sm font-medium text-slate-800">{formatDate(tache.datefin)}</p>
                  </div>
                </div>

                {/* Description */}
                {tache.description && (
                  <div>
                    <span className="text-xs font-medium text-slate-600">Description :</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{tache.description}</p>
                  </div>
                )}
              </div>

              {/* STATUT TERMINÉ */}
              {isDejaTermine && (
                <div className={`p-3 rounded-md ${
                  tache.constructeur_valide 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-yellow-100 border border-yellow-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className={`h-4 w-4 ${tache.constructeur_valide ? 'text-green-700' : 'text-yellow-700'}`} />
                    <span className={`text-sm font-semibold ${tache.constructeur_valide ? 'text-green-800' : 'text-yellow-800'}`}>
                      {tache.constructeur_valide 
                        ? `Validée par le constructeur le ${formatDate(tache.constructeur_valide_date)}`
                        : `Marquée terminée le ${formatDate(tache.artisan_termine_date)}`
                      }
                    </span>
                  </div>
                  {!tache.constructeur_valide && (
                    <p className="text-xs text-yellow-700">
                      En attente de validation par le constructeur
                    </p>
                  )}

                  {/* Commentaire terminé */}
                  {commentaires[tacheId] && (
                    <div className="mt-3 p-2 bg-white/50 rounded">
                      <p className="text-xs font-medium text-slate-700">💬 Votre commentaire :</p>
                      <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{commentaires[tacheId]}</p>
                    </div>
                  )}

                  {/* Photos terminées */}
                  {photos[tacheId] && photos[tacheId].length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-700 mb-2">📸 Photos :</p>
                      <div className="grid grid-cols-4 gap-2">
                        {photos[tacheId].map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo.url} 
                            alt={`Photo ${i+1}`}
                            className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FORMULAIRE (si pas terminé) */}
              {!isDejaTermine && (
                <div className="p-3 bg-white rounded-md border space-y-4">
                  {/* Photos existantes */}
                  {photos[tacheId] && photos[tacheId].length > 0 && (
                    <div>
                      <Label className="text-xs">Photos ({photos[tacheId].length})</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {photos[tacheId].map((photo, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={photo.url} 
                              alt={`Photo ${index + 1}`}
                              className="h-20 w-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(tacheId, index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload photos */}
                  <div>
                    <Label htmlFor={`photo-${tacheId}`} className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-3 text-center hover:bg-slate-50 transition">
                        <Camera className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-medium">Ajouter des photos</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadingPhotos[tacheId] ? 'Upload en cours...' : 'Cliquez pour sélectionner'}
                        </p>
                      </div>
                    </Label>
                    <input
                      id={`photo-${tacheId}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(tacheId, Array.from(e.target.files))}
                      disabled={uploadingPhotos[tacheId]}
                    />
                  </div>

                  {/* Commentaire */}
                  <div>
                    <Label htmlFor={`commentaire-${tacheId}`} className="text-xs">
                      Commentaire (optionnel)
                    </Label>
                    <Textarea
                      id={`commentaire-${tacheId}`}
                      value={commentaires[tacheId] || ''}
                      onChange={(e) => setCommentaires(prev => ({
                        ...prev,
                        [tacheId]: e.target.value
                      }))}
                      placeholder="Ajoutez un commentaire sur cette tâche..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  {/* Bouton terminer */}
                  <Button 
                    onClick={() => handleMarquerTerminee(tache)}
                    disabled={submitting[tacheId]}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {submitting[tacheId] ? 'Enregistrement...' : 'Marquer comme terminée'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}