import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useArtisanPreview } from '@/context/ArtisanPreviewContext';
import { useIndicateursArtisan } from '@/hooks/useIndicateursArtisan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, X, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Filtres accessibles depuis les tuiles de l'accueil (?filtre=...)
const FILTRES = {
  taches: {
    label: 'Chantiers avec des tâches à faire',
    garder: (i) => i.tachesAFaireCount > 0,
    onglet: 'taches',
  },
  retard: {
    label: 'Chantiers avec des tâches en retard',
    garder: (i) => i.tachesEnRetardCount > 0,
    onglet: 'taches',
  },
  documents: {
    label: 'Chantiers avec des documents non vus',
    garder: (i) => i.nouveauxCount > 0,
    onglet: 'documents',
  },
  marches: {
    label: 'Chantiers avec un marché de travaux à signer',
    garder: (i) => i.marchesASignerCount > 0,
    onglet: 'documents',
  },
  nc: {
    label: 'Chantiers avec des non-conformités',
    garder: (i) => i.ncCount > 0,
    onglet: 'nc',
  },
};

const INDICATEURS_VIDES = {
  nouveauxCount: 0, marchesASignerCount: 0, autresASignerCount: 0, ncCount: 0,
  tachesCount: 0, tachesAFaireCount: 0, tachesEnRetardCount: 0,
};

export function MesChantiersArtisan() {
  const preview = useArtisanPreview();
  const basePath = preview?.basePath || '/artisan';
  const { monSousTraitantId, mesChantiers, parChantier, loading } = useIndicateursArtisan();
  const [searchParams, setSearchParams] = useSearchParams();

  const filtre = FILTRES[searchParams.get('filtre')] || null;

  const chantiersAffiches = useMemo(() => {
    if (!filtre) return mesChantiers;
    return mesChantiers.filter(c => filtre.garder(parChantier[c.id] || INDICATEURS_VIDES));
  }, [mesChantiers, parChantier, filtre]);

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mes Chantiers</h1>
        <p className="text-muted-foreground mt-2">
          Liste des chantiers où vous avez des tâches assignées
        </p>
      </div>

      {/* Bandeau du filtre actif */}
      {filtre && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm font-medium text-orange-900">
            {filtre.label} ({chantiersAffiches.length})
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 bg-white"
            onClick={() => setSearchParams({})}
          >
            <X className="mr-1 h-4 w-4" />
            Tout voir
          </Button>
        </div>
      )}

      {/* Liste des chantiers */}
      {chantiersAffiches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filtre ? 'Aucun chantier concerné : tout est à jour 👍' : 'Aucun chantier assigné pour le moment'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chantiersAffiches.map((chantier, index) => {
            const ind = parChantier[chantier.id] || INDICATEURS_VIDES;
            const aSignerCount = ind.marchesASignerCount + ind.autresASignerCount;
            const hasAlerts = ind.ncCount > 0 || aSignerCount > 0 || ind.nouveauxCount > 0;
            const lien = `${basePath}/chantiers/${chantier.id}${filtre ? `?onglet=${filtre.onglet}` : ''}`;

            return (
              <motion.div
                key={chantier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={lien}>
                  <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${
                    ind.ncCount > 0 || ind.tachesEnRetardCount > 0 ? 'border-l-red-500' : 'border-l-orange-500'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between">
                        <span className="line-clamp-2">{chantier.nomchantier}</span>
                        <Building2 className="h-5 w-5 text-orange-500 flex-shrink-0 ml-2" />
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
                      <div className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Client</span>
                            <span className="font-medium">
                              {chantier.client_prenom} {chantier.client_nom}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Mes tâches</span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-orange-600">{ind.tachesCount}</span>
                              {ind.tachesEnRetardCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                                  <Clock className="h-3 w-3" />
                                  {ind.tachesEnRetardCount} en retard
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {hasAlerts && (
                          <div className="pt-3 border-t space-y-2">
                            {ind.ncCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center">
                                  {ind.ncCount}
                                </Badge>
                                <span className="text-xs font-medium text-red-700">Non-conformités</span>
                              </div>
                            )}

                            {ind.marchesASignerCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge className="h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center bg-orange-500 hover:bg-orange-600">
                                  {ind.marchesASignerCount}
                                </Badge>
                                <span className="text-xs font-medium text-orange-700">Marché de travaux à signer</span>
                              </div>
                            )}

                            {ind.autresASignerCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge className="h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center bg-orange-500 hover:bg-orange-600">
                                  {ind.autresASignerCount}
                                </Badge>
                                <span className="text-xs font-medium text-orange-700">Documents à signer</span>
                              </div>
                            )}

                            {ind.nouveauxCount > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge className="h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center bg-blue-500 hover:bg-blue-600">
                                  {ind.nouveauxCount}
                                </Badge>
                                <span className="text-xs font-medium text-blue-700">Nouveaux documents</span>
                              </div>
                            )}
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
