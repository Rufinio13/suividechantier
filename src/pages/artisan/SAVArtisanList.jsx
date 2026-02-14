import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSAV } from '@/context/SAVContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Wrench, Calendar, CheckCircle, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export function SAVArtisanList() {
  const { profile } = useAuth();
  const { demandesSAV, toggleDescriptionLigne, updateSAV, loading } = useSAV();
  const { sousTraitants } = useSousTraitant();
  const { toast } = useToast();

  const [datesIntervention, setDatesIntervention] = useState({});

  // Trouver l'ID du sous-traitant
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  // Mes SAV (assignés et non validés par constructeur)
  const mesSAV = useMemo(() => {
    if (!monSousTraitantId) return [];
    
    return demandesSAV
      .filter(sav => 
        sav.soustraitant_id === monSousTraitantId &&
        !sav.constructeur_valide
      )
      .sort((a, b) => {
        if (!a.datePrevisionnelle && !b.datePrevisionnelle) {
          return new Date(b.dateOuverture) - new Date(a.dateOuverture);
        }
        if (!a.datePrevisionnelle) return 1;
        if (!b.datePrevisionnelle) return -1;
        return new Date(a.datePrevisionnelle) - new Date(b.datePrevisionnelle);
      });
  }, [demandesSAV, monSousTraitantId]);

  // ✅ Synchroniser les dates depuis demandesSAV
  React.useEffect(() => {
    const initialDates = {};
    mesSAV.forEach(sav => {
      if (sav.artisan_date_intervention) {
        initialDates[sav.id] = format(parseISO(sav.artisan_date_intervention), 'yyyy-MM-dd');
      }
    });
    setDatesIntervention(initialDates);
  }, [mesSAV]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  // ✅ Enregistrement automatique à chaque changement de date
  const handleDateChange = async (savId, newDate) => {
    // Mettre à jour le state local immédiatement
    setDatesIntervention(prev => ({
      ...prev,
      [savId]: newDate
    }));

    // Sauvegarder automatiquement dans la base
    if (newDate) {
      try {
        await updateSAV(savId, {
          artisan_date_intervention: newDate,
        });

        toast({
          title: 'Date enregistrée',
          description: 'Date d\'intervention sauvegardée automatiquement',
        });
      } catch (error) {
        console.error('Erreur sauvegarde date:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de sauvegarder la date',
          variant: 'destructive',
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!monSousTraitantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Compte artisan non lié</h2>
        <p className="text-muted-foreground">
          Votre compte n'est pas encore lié à un sous-traitant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes Demandes SAV</h1>
        <p className="text-muted-foreground mt-2">
          Liste des interventions SAV qui vous sont assignées
        </p>
      </div>

      {/* Liste des SAV */}
      <div className="space-y-4">
        {mesSAV.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune demande SAV assignée pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          mesSAV.map((sav) => {
            let descriptions = [];
            try {
              descriptions = typeof sav.description === 'string' 
                ? JSON.parse(sav.description) 
                : sav.description;
            } catch {
              descriptions = [{ texte: sav.description || '', checked: false }];
            }

            const nbCoches = descriptions.filter(d => d.checked).length;
            const nbTotal = descriptions.length;
            const toutCoche = nbCoches === nbTotal;

            return (
              <motion.div 
                key={sav.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                layout
              >
                <Card className={`hover:shadow-md transition-shadow border-2 ${
                  sav.artisan_termine
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
                    : toutCoche
                      ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                      : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300'
                }`}>
                  <CardHeader className="pb-2 flex flex-row justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{sav.nomClient}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ouvert le {formatDate(sav.dateOuverture)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 bg-white/50 px-2 py-1 rounded">
                        {nbCoches}/{nbTotal} cochés
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                        className="h-8 w-8"
                      >
                        <Link to={`/artisan/sav/${sav.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    {/* DESCRIPTIONS AVEC CHECKBOXES */}
                    <div>
                      <p className="font-semibold mb-2">Descriptions:</p>
                      <ul className="space-y-2">
                        {descriptions.map((desc, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Checkbox
                              id={`desc-${sav.id}-${index}`}
                              checked={desc.checked}
                              onCheckedChange={() => toggleDescriptionLigne(sav.id, index)}
                              className="mt-0.5"
                              disabled={sav.artisan_termine}
                            />
                            <label
                              htmlFor={`desc-${sav.id}-${index}`}
                              className={`flex-1 text-sm cursor-pointer ${
                                toutCoche ? 'text-green-800' : 'text-blue-800'
                              }`}
                            >
                              {desc.texte}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* DATES SUR LA MÊME LIGNE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                      {/* Date prévisionnelle constructeur */}
                      {sav.datePrevisionnelle && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-600" />
                          <div className="text-xs">
                            <span className="font-medium">Date prévisionnelle:</span>
                            <p className="text-slate-700">{formatDate(sav.datePrevisionnelle)}</p>
                          </div>
                        </div>
                      )}

                      {/* ✅ Planifier intervention (artisan) - ENREGISTREMENT AUTO */}
                      {!sav.artisan_termine && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <Label htmlFor={`date-${sav.id}`} className="text-xs font-medium">
                              Ma date d'intervention:
                            </Label>
                            <Input
                              id={`date-${sav.id}`}
                              type="date"
                              value={datesIntervention[sav.id] || ''}
                              onChange={(e) => handleDateChange(sav.id, e.target.value)}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Affichage date intervention planifiée */}
                      {sav.artisan_date_intervention && sav.artisan_termine && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <div className="text-xs">
                            <span className="font-medium">Intervention planifiée:</span>
                            <p className="text-blue-700">{formatDate(sav.artisan_date_intervention)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Statut artisan terminé */}
                    {sav.artisan_termine && (
                      <div className="p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                        <p className="flex items-center gap-2 text-yellow-800 font-semibold text-xs">
                          <CheckCircle className="h-4 w-4" />
                          Intervention terminée le {formatDateTime(sav.artisan_termine_date)}
                        </p>
                        {sav.artisan_commentaire && (
                          <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">
                            <strong>Commentaire:</strong> {sav.artisan_commentaire}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Photos artisan */}
                    {sav.artisan_photos && sav.artisan_photos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">📸 Photos intervention :</p>
                        <div className="flex gap-2 flex-wrap">
                          {sav.artisan_photos.map((photo, i) => (
                            <img 
                              key={i} 
                              src={photo.url} 
                              alt={`SAV ${i+1}`}
                              className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(photo.url, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}