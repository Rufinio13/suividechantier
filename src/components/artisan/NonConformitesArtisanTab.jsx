import React, { useMemo, useState } from 'react';
import { useReferentielCQ } from '@/context/ReferentielCQContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Camera, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase, supabaseWithSessionCheck } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function NonConformitesArtisanTab({ chantierId, soustraitantId }) {
  const { modelesCQ, controles, saveControleFromModele } = useReferentielCQ();
  const { toast } = useToast();
  
  const [dateIntervention, setDateIntervention] = useState({});
  const [commentaireReprise, setCommentaireReprise] = useState({});
  const [photosReprise, setPhotosReprise] = useState({});
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState({});

  // Récupérer NC avec vérification des suppressions (inchangé)
  const mesNC = useMemo(() => {
    const points = [];
    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);

    controlesChantier.forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
      if (!modele) return;

      // 1️⃣ NC DU MODÈLE DE BASE
      if (ctrl.resultats) {
        Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
          const categorie = modele.categories?.find(c => c.id === categorieId);
          if (!categorie) return;

          const categoriesSupprimees = ctrl.controles_supprimes?.categories || [];
          if (categoriesSupprimees.includes(categorieId)) return;

          Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
            const sousCategorie = categorie.sousCategories?.find(sc => sc.id === sousCategorieId);
            if (!sousCategorie) return;

            const sousCategoriesSupprimees = ctrl.controles_supprimes?.sous_categories?.[categorieId] || [];
            if (sousCategoriesSupprimees.includes(sousCategorieId)) return;

            Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
              const pointsSupprimes = ctrl.controles_supprimes?.points?.[categorieId]?.[sousCategorieId] || [];
              if (pointsSupprimes.includes(pointControleId)) return;

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
      }

      // 2️⃣ NC DES POINTS SPÉCIFIQUES
      if (ctrl.points_specifiques) {
        Object.entries(ctrl.points_specifiques).forEach(([categorieId, categoriePoints]) => {
          const categorie = modele.categories?.find(c => c.id === categorieId);
          
          const categoriesSupprimees = ctrl.controles_supprimes?.categories || [];
          if (categoriesSupprimees.includes(categorieId)) return;
          
          Object.entries(categoriePoints).forEach(([sousCategorieKey, pointsMap]) => {
            const sousCategorie = sousCategorieKey === '_global' 
              ? { id: '_global', nom: 'Points spécifiques' }
              : categorie?.sousCategories?.find(sc => sc.id === sousCategorieKey);
            
            if (!sousCategorie) return;

            const sousCategoriesSupprimees = ctrl.controles_supprimes?.sous_categories?.[categorieId] || [];
            if (sousCategoriesSupprimees.includes(sousCategorieKey)) return;

            Object.entries(pointsMap).forEach(([pointControleId, pointData]) => {
              const pointsSupprimes = ctrl.controles_supprimes?.points?.[categorieId]?.[sousCategorieKey] || [];
              if (pointsSupprimes.includes(pointControleId)) return;

              const resultatPoint = ctrl.resultats?.[categorieId]?.[sousCategorieKey]?.[pointControleId];
              
              if (
                resultatPoint?.resultat === 'NC' && 
                resultatPoint.soustraitant_id === soustraitantId &&
                !resultatPoint.repriseValidee
              ) {
                points.push({
                  ...resultatPoint,
                  pointControleId,
                  libelle: pointData.libelle,
                  description: pointData.description,
                  modeleTitre: modele.titre,
                  categorieNom: categorie?.nom || 'Catégorie spécifique',
                  sousCategorieNom: sousCategorie.nom,
                  controleId: ctrl.id,
                  modeleId: modele.id,
                  categorieId,
                  sousCategorieId: sousCategorieKey,
                  isChantierSpecific: true,
                });
              }
            });
          });
        });
      }
    });

    return points.sort((a, b) => {
      const dateA = a.dateReprisePrevisionnelle ? parseISO(a.dateReprisePrevisionnelle) : new Date(0);
      const dateB = b.dateReprisePrevisionnelle ? parseISO(b.dateReprisePrevisionnelle) : new Date(0);
      return dateA - dateB;
    });
  }, [controles, modelesCQ, chantierId, soustraitantId]);

  const handleDownloadImage = (imageUrl, fileName = 'photo.jpg') => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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

  // Planifier l'intervention (saveControleFromModele est déjà protégé dans le Context)
  const handlePlanifier = async (nc) => {
    const ncKey = getNCKey(nc);
    const date = dateIntervention[ncKey];

    if (!date) {
      toast({
        title: 'Date requise',
        description: 'Veuillez sélectionner une date d\'intervention',
        variant: 'destructive',
      });
      return;
    }

    setSaving(prev => ({ ...prev, [ncKey]: true }));

    try {
      const controle = controles.find(c => c.id === nc.controleId);
      if (!controle) throw new Error('Contrôle non trouvé');

      const updatedResultats = { ...controle.resultats };
      
      if (updatedResultats[nc.categorieId]?.[nc.sousCategorieId]?.[nc.pointControleId]) {
        updatedResultats[nc.categorieId][nc.sousCategorieId][nc.pointControleId] = {
          ...updatedResultats[nc.categorieId][nc.sousCategorieId][nc.pointControleId],
          date_intervention_artisan: date,
        };
      }

      await saveControleFromModele(
        chantierId, 
        nc.modeleId, 
        updatedResultats, 
        controle.points_specifiques || {}
      );

      toast({
        title: 'Intervention planifiée',
        description: `Date : ${formatDateOnly(date)}`,
      });

      setDateIntervention(prev => ({ ...prev, [ncKey]: '' }));

    } catch (error) {
      console.error('Erreur planification:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de planifier l\'intervention',
        variant: 'destructive',
      });
    } finally {
      setSaving(prev => ({ ...prev, [ncKey]: false }));
    }
  };

  // ✅ Upload photos (AVEC wrapper)
  const handlePhotoUpload = async (ncKey, files) => {
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [ncKey]: true }));

    try {
      await supabaseWithSessionCheck(async () => {
        const uploadedUrls = [];

        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `nc_${chantierId}_${uuidv4()}.${fileExt}`;
          const filePath = fileName;

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

  // Marquer reprise (saveControleFromModele est déjà protégé dans le Context)
  const handleMarquerReprise = async (nc) => {
    const ncKey = getNCKey(nc);
    
    setSaving(prev => ({ ...prev, [ncKey]: true }));

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

      setCommentaireReprise(prev => ({ ...prev, [ncKey]: '' }));
      setPhotosReprise(prev => ({ ...prev, [ncKey]: [] }));

    } catch (error) {
      console.error('Erreur marquage reprise:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la reprise',
        variant: 'destructive',
      });
    } finally {
      setSaving(prev => ({ ...prev, [ncKey]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {mesNC.length > 0 ? (
        mesNC.map((pnc, idx) => {
          const ncKey = getNCKey(pnc);
          const estPlanifie = !!pnc.date_intervention_artisan;

          return (
            <Card 
              key={ncKey} 
              className={`${
                pnc.artisan_repris 
                  ? 'bg-yellow-50 border-yellow-300' 
                  : estPlanifie
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{pnc.libelle}</span>
                  {pnc.artisan_repris ? (
                    <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-normal">
                      <CheckCircle className="inline h-3 w-3 mr-1" />
                      En attente validation
                    </span>
                  ) : estPlanifie ? (
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-normal">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      Planifiée
                    </span>
                  ) : (
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-normal">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      À planifier
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {pnc.modeleTitre} &gt; {pnc.categorieNom} &gt; {pnc.sousCategorieNom}
                  {pnc.isChantierSpecific && (
                    <span className="ml-2 text-purple-600 font-medium">
                      [Point spécifique chantier]
                    </span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* INFORMATIONS NC */}
                <div className="p-3 bg-white rounded-md border space-y-2 text-sm">
                  <div className="font-medium text-slate-900">Informations</div>
                  
                  {pnc.explicationNC && (
                    <div>
                      <span className="text-xs font-medium text-slate-600">Explication NC :</span>
                      <p className="text-sm text-slate-700 mt-1">{pnc.explicationNC}</p>
                    </div>
                  )}

                  {pnc.dateReprisePrevisionnelle && (
                    <div>
                      <span className="text-xs font-medium text-slate-600">Date reprise prévisionnelle (constructeur) :</span>
                      <span className="text-sm text-orange-700 font-medium ml-2">
                        {formatDateOnly(pnc.dateReprisePrevisionnelle)}
                      </span>
                    </div>
                  )}

                  {pnc.date_intervention_artisan && (
                    <div>
                      <span className="text-xs font-medium text-slate-600">Date intervention prévue :</span>
                      <span className="text-sm text-blue-700 font-medium ml-2">
                        {formatDateOnly(pnc.date_intervention_artisan)}
                      </span>
                    </div>
                  )}

                  {pnc.photos && pnc.photos.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-600">Photos NC :</span>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {pnc.photos.map((photo, i) => {
                          const photoUrl = typeof photo === 'string' ? photo : photo?.url || photo;
                          return (
                            <img 
                              key={i} 
                              src={photoUrl} 
                              alt={`Photo NC ${i+1}`}
                              className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => handleDownloadImage(photoUrl, `photo_nc_${i+1}.jpg`)}
                              title="Cliquer pour télécharger"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pnc.plans && pnc.plans.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-600">Plans annotés :</span>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {pnc.plans.map((plan, i) => {
                          const planUrl = typeof plan === 'string' ? plan : plan?.url || plan;
                          return (
                            <img 
                              key={i} 
                              src={planUrl} 
                              alt={`Plan ${i+1}`}
                              className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => handleDownloadImage(planUrl, `plan_nc_${i+1}.jpg`)}
                              title="Cliquer pour télécharger"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* PLANIFIER L'INTERVENTION */}
                {!pnc.date_intervention_artisan && !pnc.artisan_repris && (
                  <div className="p-3 bg-white rounded-md border">
                    <div className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Planifier l'intervention
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`date-${ncKey}`} className="text-xs">
                          Date d'intervention prévue *
                        </Label>
                        <Input
                          id={`date-${ncKey}`}
                          type="date"
                          value={dateIntervention[ncKey] || ''}
                          onChange={(e) => setDateIntervention(prev => ({
                            ...prev,
                            [ncKey]: e.target.value
                          }))}
                          className="mt-2"
                        />
                      </div>

                      <Button 
                        onClick={() => handlePlanifier(pnc)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!dateIntervention[ncKey] || saving[ncKey]}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {saving[ncKey] ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* REPRISE MARQUÉE */}
                {pnc.artisan_repris && (
                  <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-yellow-700" />
                      <span className="text-sm font-semibold text-yellow-800">
                        Reprise marquée le {formatDateTime(pnc.artisan_repris_date)}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700">
                      En attente de validation par le constructeur
                    </p>

                    {pnc.artisan_repris_commentaire && (
                      <div className="mt-3 p-2 bg-white/50 rounded">
                        <p className="text-xs font-medium text-slate-700">💬 Commentaire :</p>
                        <p className="text-sm text-slate-800 mt-1">{pnc.artisan_repris_commentaire}</p>
                      </div>
                    )}

                    {pnc.artisan_repris_photos && pnc.artisan_repris_photos.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-slate-700 mb-2">📸 Photos de reprise :</p>
                        <div className="grid grid-cols-4 gap-2">
                          {pnc.artisan_repris_photos.map((photo, i) => (
                            <img 
                              key={i} 
                              src={photo.url || photo} 
                              alt={`Reprise ${i+1}`}
                              className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => handleDownloadImage(photo.url || photo, `reprise_${i+1}.jpg`)}
                              title="Cliquer pour télécharger"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TERMINER L'INTERVENTION */}
                {pnc.date_intervention_artisan && !pnc.artisan_repris && (
                  <div className="p-3 bg-white rounded-md border">
                    <div className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Terminer l'intervention
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`commentaire-${ncKey}`} className="text-xs">
                          Commentaire (obligatoire)
                        </Label>
                        <Textarea 
                          id={`commentaire-${ncKey}`}
                          placeholder="Décrivez l'intervention effectuée..."
                          rows={3}
                          value={commentaireReprise[ncKey] || ''}
                          onChange={(e) => setCommentaireReprise(prev => ({
                            ...prev,
                            [ncKey]: e.target.value
                          }))}
                          className="mt-2"
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
                          className="mt-2 text-sm"
                          disabled={uploading[ncKey]}
                        />
                        {photosReprise[ncKey] && photosReprise[ncKey].length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {photosReprise[ncKey].map((photo, i) => (
                              <img 
                                key={i} 
                                src={photo.url} 
                                alt={`Upload ${i+1}`}
                                className="h-20 w-20 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <Button 
                        onClick={() => handleMarquerReprise(pnc)}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!commentaireReprise[ncKey] || uploading[ncKey] || saving[ncKey]}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {saving[ncKey] ? 'Enregistrement...' : 'Marquer comme terminée'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucune non-conformité assignée pour le moment. Bravo ! 🎉
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}