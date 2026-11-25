import { addDays, format, getDay, isWeekend, parseISO } from 'date-fns';

// Liste des jours fériés 2025-2026
export const JOURS_FERIES = [
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29', '2025-06-09',
  '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25',
  '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
];

export const isJourFerie = (date) => JOURS_FERIES.includes(format(date, 'yyyy-MM-dd'));

export const isJourOuvre = (date) => !isWeekend(date) && !isJourFerie(date);

// ─── Jours travaillés d'une tâche ────────────────────────────────────────────
// 'ouvres'  : lundi → vendredi, hors fériés (par défaut)
// 'lun_sam' : lundi → samedi, hors dimanches et fériés
// 'tous'    : tous les jours, week-ends et fériés compris
export const MODE_OUVRES = 'ouvres';
export const MODES_JOURS_TRAVAILLES = [
  { value: 'ouvres', label: 'Lun → Ven hors fériés' },
  { value: 'lun_sam', label: 'Lun → Sam hors fériés' },
  { value: 'tous', label: 'Tous les jours (week-ends et fériés compris)' },
];

export const modeTache = (tache) => tache?.jours_travailles || MODE_OUVRES;

export const isJourTravaille = (date, mode = MODE_OUVRES) => {
  if (mode === 'tous') return true;
  if (mode === 'lun_sam') return getDay(date) !== 0 && !isJourFerie(date);
  return isJourOuvre(date);
};

// Une tâche occupe-t-elle ce jour (dans sa plage de dates ET un jour travaillé de son mode) ?
export const tacheTravailleLe = (tache, date) => isJourTravaille(date, modeTache(tache));

export const countJoursTravailles = (startDate, endDate, mode = MODE_OUVRES) => {
  let count = 0;
  let current = startDate;
  while (current <= endDate) {
    if (isJourTravaille(current, mode)) count++;
    current = addDays(current, 1);
  }
  return count;
};

// Date de fin (incluse) d'une tâche de `duree` jours travaillés commençant à `startDate`
export const dateFinTravaillee = (startDate, duree, mode = MODE_OUVRES) => {
  let current = startDate;
  let comptes = 0;
  while (comptes < duree) {
    if (isJourTravaille(current, mode)) comptes++;
    if (comptes < duree) current = addDays(current, 1);
  }
  return current;
};

// Avance (n > 0) ou recule (n < 0) une date de n jours travaillés
export const addJoursTravailles = (date, n, mode = MODE_OUVRES) => {
  let result = date;
  let remaining = Math.abs(n);
  const step = n >= 0 ? 1 : -1;
  while (remaining > 0) {
    result = addDays(result, step);
    if (isJourTravaille(result, mode)) remaining--;
  }
  return result;
};

// Nombre de jours travaillés séparant oldDate de newDate (signé : positif si newDate est après oldDate)
export const diffJoursTravailles = (oldDate, newDate, mode = MODE_OUVRES) => {
  if (oldDate.getTime() === newDate.getTime()) return 0;
  const forward = newDate > oldDate;
  const step = forward ? 1 : -1;
  let count = 0;
  let current = oldDate;
  while (current.getTime() !== newDate.getTime()) {
    current = addDays(current, step);
    if (isJourTravaille(current, mode)) count += step;
  }
  return count;
};

// Le jour de début choisi n'est pas travaillé dans ce mode : renvoie le mode à proposer
// (samedi → 'lun_sam', dimanche ou férié → 'tous'), sinon null.
export const modeSuggerePourDebut = (dateDebutStr, mode = MODE_OUVRES) => {
  if (!dateDebutStr) return null;
  const date = parseISO(dateDebutStr);
  if (isNaN(date.getTime()) || isJourTravaille(date, mode)) return null;
  if (getDay(date) === 6 && !isJourFerie(date)) return 'lun_sam';
  return 'tous';
};

// ─── Versions « jours ouvrés » (lun → ven hors fériés), conservées pour l'existant ──
export const countJoursOuvres = (startDate, endDate) => countJoursTravailles(startDate, endDate, MODE_OUVRES);
export const addJoursOuvres = (date, n) => addJoursTravailles(date, n, MODE_OUVRES);
export const diffJoursOuvres = (oldDate, newDate) => diffJoursTravailles(oldDate, newDate, MODE_OUVRES);
