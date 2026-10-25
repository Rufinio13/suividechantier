import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSAV } from '@/context/SAVContext';
import { useMonSousTraitantId } from '@/hooks/useMonSousTraitantId';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import { SAVArtisanCard } from '@/components/artisan/SAVArtisanCard.jsx';

export function SAVArtisanList() {
  const { demandesSAV, loading } = useSAV();

  const monSousTraitantId = useMonSousTraitantId();

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
          mesSAV.map((sav) => (
            <motion.div
              key={sav.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              layout
            >
              <SAVArtisanCard sav={sav} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
