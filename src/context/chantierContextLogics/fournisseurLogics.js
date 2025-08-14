export const addFournisseurLogic = (fournisseur, contextState, uuidv4) => {
  const { fournisseurs, setFournisseurs, toast } = contextState;
  const newFournisseur = { ...fournisseur, id: uuidv4(), assignedLots: fournisseur.assignedLots || [] };
  setFournisseurs([...fournisseurs, newFournisseur]);
  toast({ title: 'Fournisseur ajouté', description: `Le fournisseur "${newFournisseur.nomSociete}" a été ajouté.` });
  return newFournisseur;
};

export const updateFournisseurLogic = (id, updatedFournisseur, contextState) => {
  const { fournisseurs, setFournisseurs, toast } = contextState;
  setFournisseurs(fournisseurs.map(f => f.id === id ? { ...f, ...updatedFournisseur, assignedLots: updatedFournisseur.assignedLots || f.assignedLots || [] } : f));
  toast({ title: 'Fournisseur mis à jour', description: 'Les informations du fournisseur ont été mises à jour.' });
};

export const deleteFournisseurLogic = (id, contextState) => {
  const { fournisseurs, setFournisseurs, taches, setTaches, toast } = contextState;
  const fToDelete = fournisseurs.find(f => f.id === id);
  setFournisseurs(fournisseurs.filter(f => f.id !== id));
  setTaches(taches.map(tache => (tache.assigneType === 'fournisseur' && tache.assigneId === id) ? { ...tache, assigneId: null, assigneType: null } : tache));
  toast({ title: 'Fournisseur supprimé', description: `Le fournisseur "${fToDelete?.nomSociete}" a été supprimé.` });
};