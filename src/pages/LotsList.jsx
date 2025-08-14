import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, ListChecks, Info } from 'lucide-react';
import { LotFormModal } from '@/components/planning/LotFormModal'; 

export function LotsList() {
  const { lots, addLot, updateLot, deleteLot, loading, taches, sousTraitants } = useChantier();
  const [isLotFormOpen, setIsLotFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      const term = searchTerm.toLowerCase();
      return (
        lot.nom.toLowerCase().includes(term) ||
        (lot.description && lot.description.toLowerCase().includes(term))
      );
    }).sort((a,b) => a.nom.localeCompare(b.nom)); // Trier par nom
  }, [lots, searchTerm]);

  const handleOpenLotForm = (lot = null) => {
    setEditingLot(lot);
    setIsLotFormOpen(true);
  };

  const handleDeleteLot = (id) => {
    const lotToDelete = lots.find(l => l.id === id);
    const isLotUsedInTaches = taches.some(t => t.lotId === id);
    const isLotAssignedToSousTraitant = sousTraitants.some(st => st.assignedLots && st.assignedLots.includes(id));

    let confirmMessage = `Êtes-vous sûr de vouloir supprimer le type de lot "${lotToDelete?.nom}" ?`;
    if (isLotUsedInTaches || isLotAssignedToSousTraitant) {
        confirmMessage += "\n\nAttention : Ce lot est actuellement utilisé dans des tâches ou assigné à des sous-traitants. Sa suppression directe n'est pas recommandée. Veuillez d'abord le désassigner.";
        if(!window.confirm(confirmMessage)) return; // Si l'utilisateur annule après l'avertissement
    } else {
       if(!window.confirm(confirmMessage)) return;
    }
    deleteLot(id);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des types de lots...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalogue des Lots</h1>
          <p className="text-muted-foreground">Gérez les types de lots disponibles pour vos chantiers.</p>
        </div>
        <Button onClick={() => handleOpenLotForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Type de Lot
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un type de lot (nom, description...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 max-w-md"
        />
      </div>

      {filteredLots.length > 0 ? (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredLots.map(lot => (
            <Card key={lot.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{lot.nom}</CardTitle>
                  <div className="flex space-x-1">
                     <Button variant="ghost" size="icon" onClick={() => handleOpenLotForm(lot)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLot(lot.id)} className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm flex-grow">
                {lot.description ? (
                    <p className="text-muted-foreground">{lot.description}</p>
                ) : (
                    <p className="text-muted-foreground italic">Aucune description</p>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun type de lot trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm 
              ? "Aucun type de lot ne correspond à votre recherche." 
              : "Commencez par ajouter des types de lots."}
          </p>
          {!searchTerm && (
            <Button onClick={() => handleOpenLotForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un type de lot
            </Button>
          )}
        </div>
      )}

      <LotFormModal 
        isOpen={isLotFormOpen}
        onClose={() => setIsLotFormOpen(false)}
        lot={editingLot}
        addLot={addLot}
        updateLot={updateLot}
        isGlobalContext={true} // Indique que c'est pour les lots génériques
        // On ne passe plus chantiers, sousTraitants car non pertinents pour un lot générique
      />
    </div>
  );
}