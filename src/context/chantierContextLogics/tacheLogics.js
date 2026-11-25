import { parseISO, format } from 'date-fns';
import { MODE_OUVRES, dateFinTravaillee, countJoursTravailles } from '@/lib/joursOuvres';

/**
 * Calcule la date de fin en ajoutant un nombre de jours travaillés
 * @param {string} dateDebut - Date de début au format 'yyyy-MM-dd'
 * @param {number} duree - Nombre de jours travaillés
 * @param {string} mode - 'ouvres' (lun → ven hors fériés, défaut), 'lun_sam' ou 'tous'
 * @returns {string|null} Date de fin au format 'yyyy-MM-dd'
 */
export const calculateDateFinLogic = (dateDebut, duree, mode = MODE_OUVRES) => {
  const n = parseInt(duree, 10);
  if (!dateDebut || !n || isNaN(n)) return null;
  try {
    return format(dateFinTravaillee(parseISO(dateDebut), n, mode), 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error calculating end date:", error);
    return null;
  }
};

/**
 * Calcule le nombre de jours travaillés entre deux dates incluses
 * @param {string} dateDebut - Date de début au format 'yyyy-MM-dd'
 * @param {string} dateFin - Date de fin au format 'yyyy-MM-dd'
 * @param {string} mode - 'ouvres' (défaut), 'lun_sam' ou 'tous'
 * @returns {number} Nombre de jours travaillés
 */
export const calculateDureeOuvree = (dateDebut, dateFin, mode = MODE_OUVRES) => {
  if (!dateDebut || !dateFin) return 0;
  try {
    return countJoursTravailles(parseISO(dateDebut), parseISO(dateFin), mode);
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
};

export const addTacheLogic = (tache, contextState, uuidv4) => {
  const { taches, setTaches, toast } = contextState;
  let finalTache = { ...tache, id: uuidv4(), terminee: false };
  
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