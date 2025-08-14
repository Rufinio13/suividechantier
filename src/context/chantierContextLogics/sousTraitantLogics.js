export const addSousTraitantLogic = (sousTraitant, contextState, uuidv4) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  const newSousTraitant = { ...sousTraitant, id: uuidv4(), assignedLots: sousTraitant.assignedLots || [] };
  setSousTraitants([...sousTraitants, newSousTraitant]);
  toast({ title: 'Sous-traitant ajouté', description: `Le sous-traitant "${newSousTraitant.nomSociete || `${newSousTraitant.prenomDirigeant} ${newSousTraitant.nomDirigeant}`.trim()}" a été ajouté.` });
  return newSousTraitant;
};

export const updateSousTraitantLogic = (id, updatedSousTraitant, contextState) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  setSousTraitants(sousTraitants.map(st => st.id === id ? { ...st, ...updatedSousTraitant, assignedLots: updatedSousTraitant.assignedLots || st.assignedLots || [] } : st));
  toast({ title: 'Sous-traitant mis à jour', description: 'Les informations du sous-traitant ont été mises à jour.' });
};

export const deleteSousTraitantLogic = (id, contextState) => {
  const { sousTraitants, setSousTraitants, taches, setTaches, toast } = contextState;
  const stToDelete = sousTraitants.find(st => st.id === id);
  setSousTraitants(sousTraitants.filter(st => st.id !== id));
  setTaches(taches.map(tache => (tache.assigneType === 'soustraitant' && tache.assigneId === id) ? { ...tache, assigneId: null, assigneType: null } : tache));
  toast({ title: 'Sous-traitant supprimé', description: `Le sous-traitant "${stToDelete?.nomSociete || `${stToDelete?.prenomDirigeant} ${stToDelete?.nomDirigeant}`.trim()}" a été supprimé.` });
};

export const assignLotsToSousTraitantLogic = (sousTraitantId, lotIdsToAssign, contextState) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  setSousTraitants(sousTraitants.map(st => st.id === sousTraitantId ? { ...st, assignedLots: lotIdsToAssign } : st));
  toast({ title: 'Lots assignés', description: 'Les types de lots pour ce sous-traitant ont été mis à jour.' });
};