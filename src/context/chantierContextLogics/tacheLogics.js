import { parseISO, addDays, format, getDay } from 'date-fns';

/**
 * Calcule la date de fin en ajoutant un nombre de jours OUVRÉS (sans weekends)
 * @param {string} dateDebut - Date de début au format 'yyyy-MM-dd'
 * @param {number} duree - Nombre de jours ouvrés
 * @returns {string|null} Date de fin au format 'yyyy-MM-dd'
 */
export const calculateDateFinLogic = (dateDebut, duree) => {
  if (!dateDebut || !duree || isNaN(parseInt(duree, 10))) return null;
  
  try {
    let currentDate = parseISO(dateDebut);
    let joursAjoutes = 0;
    
    // On ajoute des jours jusqu'à atteindre la durée en jours ouvrés
    while (joursAjoutes < parseInt(duree, 10)) {
      // getDay() retourne 0 (dimanche) à 6 (samedi)
      const dayOfWeek = getDay(currentDate);
      
      // Si c'est un jour ouvré (lundi=1 à vendredi=5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        joursAjoutes++;
      }
      
      // Si on n'a pas encore atteint la durée, on avance d'un jour
      if (joursAjoutes < parseInt(duree, 10)) {
        currentDate = addDays(currentDate, 1);
      }
    }
    
    return format(currentDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error calculating end date:", error);
    return null;
  }
};

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 * @param {string} dateDebut - Date de début au format 'yyyy-MM-dd'
 * @param {string} dateFin - Date de fin au format 'yyyy-MM-dd'
 * @returns {number} Nombre de jours ouvrés
 */
export const calculateDureeOuvree = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return 0;
  
  try {
    let currentDate = parseISO(dateDebut);
    const endDate = parseISO(dateFin);
    let joursOuvres = 0;
    
    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      
      // Si c'est un jour ouvré (lundi=1 à vendredi=5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        joursOuvres++;
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return joursOuvres;
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