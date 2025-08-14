import { parseISO, isValid, format, startOfDay, addDays } from 'date-fns';

const tryParseDate = (value) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
};

export const corrigerTachesPourGantt = (rawTaches) => {
  if (!Array.isArray(rawTaches)) {
    console.warn("corrigerTachesPourGantt a reçu une valeur non-array:", rawTaches);
    return [];
  }
  return rawTaches.map(tache => {
    let dateDebut = tryParseDate(tache.dateDebut);
    let dateFin = tryParseDate(tache.dateFin);

    if (!dateDebut && !dateFin) {
      console.warn("Tâche ignorée pour dates totalement invalides :", tache.nom);
      return null;
    }

    if (!dateDebut && dateFin) {
      dateDebut = addDays(dateFin, -1);
    }

    if (!dateFin && dateDebut) {
      dateFin = addDays(dateDebut, 1);
    }
    
    if (dateDebut > dateFin) {
        dateFin = addDays(dateDebut, 1);
    }

    return {
      ...tache,
      dateDebut: format(dateDebut, 'yyyy-MM-dd'),
      dateFin: format(dateFin, 'yyyy-MM-dd')
    };
  }).filter(Boolean);
};