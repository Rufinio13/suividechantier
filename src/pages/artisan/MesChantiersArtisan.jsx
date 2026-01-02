import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { useReferentielCQ } from '@/context/ReferentielCQContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, MapPin, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MesChantiersArtisan() {
  const { profile } = useAuth();
  const { chantiers, taches, loading } = useChantier();
  const { sousTraitants } = useSousTraitant();
  const { modelesCQ, controles } = useReferentielCQ();

  // Trouver l'ID du sous-traitant correspondant à l'artisan connecté
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  // Mes chantiers (où j'ai au moins une tâche)
  const mesChantiers = useMemo(() => {
    if (!monSousTraitantId) return [];
    
    const tachesArtisan = taches.filter(t => 
      t.assignetype === 'soustraitant' && 
      t.assigneid === monSousTraitantId
    );
    
    const chantierIds = [...new Set(tachesArtisan.map(t => t.chantierid))];
    return chantiers.filter(c => chantierIds.includes(c.id));
  }, [taches, chantiers, monSousTraitantId]);

  // Compter les tâches par chantier
  const countTaches = (chantierId) => {
    return taches.filter(t => 
      t.chantierid === chantierId && 
      t.assignetype === 'soustraitant' && 
      t.assigneid === monSousTraitantId
    ).length;
  };

  // ✅ NOUVEAU : Compter les NC assignées non validées par chantier
  const countNC = (chantierId) => {
    if (!monSousTraitantId) return 0;
    
    let count = 0;
    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);

    controlesChantier.forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
      if (!modele || !ctrl.resultats) return;

      Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
        Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
          Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
            if (
              resultatPoint.resultat === 'NC' && 
              resultatPoint.soustraitant_id === monSousTraitantId &&
              !resultatPoint.repriseValidee
            ) {
              count++;
            }
          });
        });
      });
    });

    return count;
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
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Compte artisan non lié</h2>
        <p className="text-muted-foreground">
          Votre compte n'est pas encore lié à un sous-traitant. Contactez votre constructeur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes Chantiers</h1>
        <p className="text-muted-foreground mt-2">
          Liste des chantiers où vous avez des tâches assignées
        </p>
      </div>

      {/* Liste des chantiers */}
      {mesChantiers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun chantier assigné pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mesChantiers.map((chantier, index) => {
            const nbNC = countNC(chantier.id);
            
            return (
              <motion.div
                key={chantier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/artisan/chantiers/${chantier.id}`}>
                  <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${
                    nbNC > 0 ? 'border-l-red-500' : 'border-l-orange-500'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between">
                        <span className="line-clamp-2">{chantier.nomchantier}</span>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <Building2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                          {/* ✅ Badge NC */}
                          {nbNC > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {nbNC} NC
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">
                            {chantier.ville || 'Ville non renseignée'}
                          </span>
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Client</span>
                          <span className="font-medium">
                            {chantier.client_prenom} {chantier.client_nom}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Mes tâches</span>
                          <span className="font-semibold text-orange-600">
                            {countTaches(chantier.id)}
                          </span>
                        </div>
                        {nbNC > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-red-100">
                            <span className="text-red-700 font-medium text-xs">⚠️ Non-conformités</span>
                            <span className="font-semibold text-red-600">
                              {nbNC}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}