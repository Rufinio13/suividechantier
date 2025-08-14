export const addLotLogic = (lot, contextState, uuidv4) => {
  const { lots, setLots, toast } = contextState;
  const newLot = { ...lot, id: uuidv4() };
  setLots([...lots, newLot]);
  toast({ title: 'Type de lot créé', description: `Le type de lot "${lot.nom}" a été créé.` });
  return newLot;
};

export const updateLotLogic = (id, updatedLot, contextState) => {
  const { lots, setLots, toast } = contextState;
  setLots(lots.map(l => l.id === id ? { ...l, ...updatedLot } : l));
  toast({ title: 'Type de lot mis à jour', description: 'Les informations du type de lot ont été mises à jour.' });
};

export const deleteLotLogic = (id, contextState) => {
  const { lots, setLots, taches, sousTraitants, fournisseurs, toast } = contextState; 
  const lotToDelete = lots.find(l => l.id === id);
  const isLotUsedInTaches = taches.some(t => t.lotId === id);
  const isLotAssignedToSousTraitant = sousTraitants.some(st => st.assignedLots && st.assignedLots.includes(id));
  const isLotAssignedToFournisseur = fournisseurs.some(f => f.assignedLots && f.assignedLots.includes(id));


  if (isLotUsedInTaches || isLotAssignedToSousTraitant || isLotAssignedToFournisseur) {
    toast({ title: 'Suppression impossible', description: `Le lot "${lotToDelete?.nom}" est utilisé (tâches, artisans ou fournisseurs).`, variant: 'destructive', duration: 7000 });
    return;
  }
  setLots(lots.filter(l => l.id !== id));
  toast({ title: 'Type de lot supprimé', description: `Le type de lot "${lotToDelete?.nom}" a été supprimé.` });
};