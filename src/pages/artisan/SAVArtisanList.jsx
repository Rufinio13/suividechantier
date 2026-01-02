import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSAV } from '@/context/SAVContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function SAVArtisanList() {
  const { profile } = useAuth();
  const { demandesSAV, loading } = useSAV();
  const { sousTraitants } = useSousTraitant();

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
        // Trier par date d'ouverture décroissante
        return new Date(b.dateOuverture) - new Date(a.dateOuverture);
      });
  }, [demandesSAV, monSousTraitantId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getStatutBadge = (sav) => {
    if (sav.artisan_termine) {
      return (
        <Badge className="bg-yellow-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          En attente validation
        </Badge>
      );
    }
    if (sav.artisan_date_intervention) {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Calendar className="h-3 w-3 mr-1" />
          Intervention prévue
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <Clock className="h-3 w-3 mr-1" />
        À planifier
        </Badge>
    );
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
      {mesSAV.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune demande SAV assignée pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mesSAV.map((sav, index) => (
            <motion.div
              key={sav.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/artisan/sav/${sav.id}`}>
                <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${
                  sav.artisan_termine 
                    ? 'border-l-yellow-500' 
                    : 'border-l-orange-500'
                }`}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-1">
                        {sav.nomClient}
                      </CardTitle>
                      {getStatutBadge(sav)}
                    </div>
                    <CardDescription className="text-xs">
                      Ouvert le {formatDate(sav.dateOuverture)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="line-clamp-2 text-slate-700">
                        {sav.description}
                      </p>
                      
                      {sav.artisan_date_intervention && (
                        <div className="flex items-center gap-2 text-blue-600 pt-2 border-t">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            Intervention : {formatDate(sav.artisan_date_intervention)}
                          </span>
                        </div>
                      )}

                      {sav.artisan_termine && (
                        <div className="flex items-center gap-2 text-yellow-700 pt-2 border-t bg-yellow-50 -mx-6 px-6 -mb-6 pb-4 mt-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-semibold">
                            Terminé - En attente validation
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}