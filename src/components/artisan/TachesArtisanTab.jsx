import React, { useMemo } from 'react';
import { useChantier } from '@/context/ChantierContext';
import { Card, CardContent } from '@/components/ui/card';
import { TacheItem } from '@/components/planning/TacheItem';
import { ListChecks } from 'lucide-react';

export function TachesArtisanTab({ chantierId, soustraitantId }) {
  const { taches, lots } = useChantier();

  // Mes tâches sur ce chantier
  const mesTaches = useMemo(() => {
    return taches.filter(t => 
      t.chantierid === chantierId && 
      t.assignetype === 'soustraitant' && 
      t.assigneid === soustraitantId
    ).sort((a, b) => {
      // Trier par date de début
      const dateA = a.datedebut ? new Date(a.datedebut) : new Date(0);
      const dateB = b.datedebut ? new Date(b.datedebut) : new Date(0);
      return dateA - dateB;
    });
  }, [taches, chantierId, soustraitantId]);

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
    <div className="space-y-3">
      {mesTaches.map(tache => (
        <TacheItem 
          key={tache.id} 
          tache={tache}
          lots={lots}
          onEdit={() => {}} // ✅ Artisan ne peut pas éditer
          onDelete={() => {}} // ✅ Artisan ne peut pas supprimer
          conflicts={{}} // ✅ Pas de gestion conflits côté artisan
        />
      ))}
    </div>
  );
}