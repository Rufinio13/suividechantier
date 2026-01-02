import React, { useMemo, useState } from 'react';
import { useReferentielCQ } from '@/context/ReferentielCQContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Camera, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function NonConformitesArtisanTab({ chantierId, soustraitantId }) {
  const { modelesCQ, controles, saveControleFromModele } = useReferentielCQ();
  const { toast } = useToast();
  
  const [expandedNC, setExpandedNC] = useState(null);
  const [commentaireReprise, setCommentaireReprise] = useState({});
  const [photosReprise, setPhotosReprise] = useState({});
  const [uploading, setUploading] = useState({});

  // Récupérer uniquement les NC assignées à cet artisan
  const mesNC = useMemo(() => {
    const points = [];
    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);

    controlesChantier.forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
      if (!modele || !ctrl.resultats) return;

      Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
        const categorie = modele.categories?.find(c => c.id === categorieId);
        if (!categorie) return;

        Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
          const sousCategorie = categorie.sousCategories?.find(sc => sc.id === sousCategorieId);
          if (!sousCategorie) return;

          Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
            // ✅ Afficher les NC assignées non validées OU en attente de validation constructeur
            if (
              resultatPoint.resultat === 'NC' && 
              resultatPoint.soustraitant_id === soustraitantId &&
              !resultatPoint.repriseValidee
            ) {
              const pointControle = sousCategorie.pointsControle?.find(pc => pc.id === pointControleId);
              if (pointControle) {
                points.push({
                  ...resultatPoint,
                  pointControleId,
                  libelle: pointControle.libelle,
                  modeleTitre: modele.titre,
                  categorieNom: categorie.nom,
                  sousCategorieNom: sousCategorie.nom,
                  controleId: ctrl.id,
                  modeleId: modele.id,
                  categorieId,
                  sousCategorieId,
                });
              }
            }
          });
        });
      });
    });

    return points.sort((a, b) => {
      const dateA = a.dateReprisePrevisionnelle ? parseISO(a.dateReprisePrevisionnelle) : new Date(0);
      const dateB = b.dateReprisePrevisionnelle ? parseISO(b.dateReprisePrevisionnelle) : new Date(0);
      return dateA - dateB;
    });
  }, [controles, modelesCQ, chantierId, soustraitantId]);

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  const getNCKey = (nc) => `${nc.modeleId}-${nc.categorieId}-${nc.sousCategorieId}-${nc.pointControleId}`;

  const handlePhotoUpload = async (ncKey, files) => {
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [ncKey]: true }));

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${chantierId}_${uuidv4()}.${fileExt}`;
        const filePath = `nc-reprise/${fileName}`;

        const { data, error } = await supabase.storage
          .from('photos-reprises')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('photos-reprises')
          .getPublicUrl(filePath);

        uploadedUrls.push({ url: urlData.publicUrl, name: file.name });
      }

      setPhotosReprise(prev => ({
        ...prev,
        [ncKey]: [...(prev[ncKey] || []), ...uploadedUrls]
      }));

      toast({
        title: 'Photos ajoutées',
        description: `${uploadedUrls.length} photo(s) uploadée(s)`,
      });
    } catch (error) {
      console.error('Erreur upload photos:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader les photos',
        variant: 'destructive',
      });
    } finally {
      setUploading(prev => ({ ...prev, [ncKey]: false }));
    }
  };

  const handleMarquerReprise = async (nc) => {
    const ncKey = getNCKey(nc);
    
    try {
      const controle = controles.find(c => c.id === nc.controleId);
      if (!controle) {
        toast({ title: 'Erreur', description: 'Contrôle non trouvé', variant: 'destructive' });
        return;
      }

      const updatedResultats = { ...controle.resultats };
      
      if (updatedResultats[nc.categorieId]?.[nc.sousCategorieId]?.[nc.pointControleId]) {
        updatedResultats[nc.categorieId][nc.sousCategorieId][nc.pointControleId] = {
          ...updatedResultats[nc.categorieId][nc.sousCategorieId][nc.pointControleId],
          artisan_repris: true,
          artisan_repris_date: new Date().toISOString(),
          artisan_repris_commentaire: commentaireReprise[ncKey] || '',
          artisan_repris_photos: photosReprise[ncKey] || [],
        };
      }

      await saveControleFromModele(
        chantierId, 
        nc.modeleId, 
        updatedResultats, 
        controle.points_specifiques || {}
      );

      toast({
        title: 'Reprise marquée',
        description: 'Le constructeur sera notifié',
      });

      // Reset
      setCommentaireReprise(prev => ({ ...prev, [ncKey]: '' }));
      setPhotosReprise(prev => ({ ...prev, [ncKey]: [] }));
      setExpandedNC(null);

    } catch (error) {
      console.error('Erreur marquage reprise:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la reprise',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-red-500" /> 
          Mes Non-Conformités
        </CardTitle>
        <CardDescription>
          Liste des non-conformités qui vous sont assignées et en attente de reprise
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mesNC.length > 0 ? (
          <ul className="space-y-3">
            {mesNC.map((pnc, idx) => {
              const ncKey = getNCKey(pnc);
              const isExpanded = expandedNC === ncKey;

              return (
                <li key={ncKey} className={`p-3 border rounded-md ${
                  pnc.artisan_repris 
                    ? 'bg-yellow-50 border-yellow-300' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div>
                    <p className="font-medium text-sm text-red-700">{pnc.libelle}</p>
                    <p className="text-xs text-slate-500">
                      {pnc.modeleTitre} &gt; {pnc.categorieNom} &gt; {pnc.sousCategorieNom}
                    </p>
                    {pnc.explicationNC && (
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium">Explication :</span> {pnc.explicationNC}
                      </p>
                    )}
                  </div>

                  {/* ✅ STATUT ARTISAN REPRIS */}
                  {pnc.artisan_repris && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-yellow-700" />
                      <span className="text-xs font-semibold text-yellow-800">
                        ✅ Marquée reprise le {formatDateTime(pnc.artisan_repris_date)} - En attente validation constructeur
                      </span>
                    </div>
                  )}

                  {/* Photos NC originales */}
                  {pnc.photos && pnc.photos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-600 mb-1">Photos NC :</p>
                      <div className="flex gap-2 flex-wrap">
                        {pnc.photos.map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo} 
                            alt={`Photo ${i+1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plans NC originaux */}
                  {pnc.plans && pnc.plans.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-600 mb-1">Plans annotés :</p>
                      <div className="flex gap-2 flex-wrap">
                        {pnc.plans.map((plan, i) => (
                          <img 
                            key={i} 
                            src={plan} 
                            alt={`Plan ${i+1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(plan, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos reprise artisan */}
                  {pnc.artisan_repris_photos && pnc.artisan_repris_photos.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-700 mb-1">📸 Photos de reprise :</p>
                      <div className="flex gap-2 flex-wrap">
                        {pnc.artisan_repris_photos.map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo.url || photo} 
                            alt={`Reprise ${i+1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url || photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commentaire reprise artisan */}
                  {pnc.artisan_repris_commentaire && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-700 mb-1">💬 Commentaire de reprise :</p>
                      <p className="text-sm text-green-800">{pnc.artisan_repris_commentaire}</p>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-red-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-slate-600">Date reprise prév. : </span> 
                      {pnc.dateReprisePrevisionnelle ? (
                        <span className="text-orange-700 font-medium">
                          {formatDateOnly(pnc.dateReprisePrevisionnelle)}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Non définie</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">Statut : </span> 
                      {pnc.artisan_repris ? (
                        <span className="text-yellow-600 font-semibold">En attente validation</span>
                      ) : (
                        <span className="text-red-600 font-semibold">À reprendre</span>
                      )}
                    </div>
                  </div>

                  {/* ✅ BOUTON MARQUER REPRISE */}
                  {!pnc.artisan_repris && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      {!isExpanded ? (
                        <Button 
                          size="sm" 
                          onClick={() => setExpandedNC(ncKey)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marquer comme reprise
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Commentaire (optionnel)</Label>
                            <Textarea 
                              placeholder="Décrivez la reprise effectuée..."
                              rows={2}
                              value={commentaireReprise[ncKey] || ''}
                              onChange={(e) => setCommentaireReprise(prev => ({
                                ...prev,
                                [ncKey]: e.target.value
                              }))}
                              className="mt-1 text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs flex items-center gap-2">
                              <Camera className="h-3 w-3" />
                              Photos de reprise (optionnel)
                            </Label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handlePhotoUpload(ncKey, Array.from(e.target.files))}
                              className="mt-1 text-sm"
                              disabled={uploading[ncKey]}
                            />
                            {photosReprise[ncKey] && photosReprise[ncKey].length > 0 && (
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {photosReprise[ncKey].map((photo, i) => (
                                  <img 
                                    key={i} 
                                    src={photo.url} 
                                    alt={`Upload ${i+1}`}
                                    className="h-16 w-16 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setExpandedNC(null);
                                setCommentaireReprise(prev => ({ ...prev, [ncKey]: '' }));
                                setPhotosReprise(prev => ({ ...prev, [ncKey]: [] }));
                              }}
                              className="flex-1"
                            >
                              Annuler
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleMarquerReprise(pnc)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={uploading[ncKey]}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmer la reprise
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Aucune non-conformité assignée pour le moment. Bravo ! 🎉
          </p>
        )}
      </CardContent>
    </Card>
  );
}