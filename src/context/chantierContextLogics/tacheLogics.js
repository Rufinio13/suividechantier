import { parseISO, addDays, format } from 'date-fns';

export const calculateDateFinLogic = (dateDebut, duree) => {
  if (!dateDebut || !duree || isNaN(parseInt(duree, 10))) return null;
  try {
    const startDate = parseISO(dateDebut);
    const endDate = addDays(startDate, parseInt(duree, 10) - 1); 
    return format(endDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error calculating end date:", error);
    return null;
  }
};

export const addTacheLogic = (tache, contextState, uuidv4) => {
  const { taches, setTaches, toast } = contextState;
  let finalTache = { ...tache, id: uuidv4(), terminee: false }; // Initialiser terminee à false
  if (tache.dateDebut && tache.duree) {
    finalTache.dateFin = calculateDateFinLogic(tache.dateDebut, parseInt(tache.duree, 10));
  }
  setTaches([...taches, finalTache]);
  toast({ title: 'Tâche créée', description: `La tâche "${finalTache.nom}" a été créée.` });
  return finalTache;
};

export const updateTacheLogic = (id, updatedTache, contextState) => {
  const { taches, setTaches, toast } = contextState;
  let finalUpdatedTache = { ...updatedTache };
  if (updatedTache.dateDebut && updatedTache.duree) {
    finalUpdatedTache.dateFin = calculateDateFinLogic(updatedTache.dateDebut, parseInt(updatedTache.duree, 10));
  }
  // Assurer que 'terminee' est bien un booléen
  if (typeof finalUpdatedTache.terminee === 'undefined') {
    const originalTache = taches.find(t => t.id === id);
    finalUpdatedTache.terminee = originalTache ? originalTache.terminee : false;
  } else {
     finalUpdatedTache.terminee = !!finalUpdatedTache.terminee;
  }


  setTaches(taches.map(t => t.id === id ? { ...t, ...finalUpdatedTache } : t));
  toast({ title: 'Tâche mise à jour', description: 'La tâche a été mise à jour.' });
};

export const deleteTacheLogic = (id, contextState) => {
  const { taches, setTaches, toast } = contextState;
  const tacheToDelete = taches.find(t => t.id === id);
  setTaches(taches.filter(t => t.id !== id));
  toast({ title: 'Tâche supprimée', description: `La tâche "${tacheToDelete?.nom}" a été supprimée.` });
};