import { addDays, format, isWeekend } from 'date-fns';

// Liste des jours fériés 2025-2026
export const JOURS_FERIES = [
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29', '2025-06-09',
  '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25',
  '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
];

export const isJourFerie = (date) => JOURS_FERIES.includes(format(date, 'yyyy-MM-dd'));

export const isJourOuvre = (date) => !isWeekend(date) && !isJourFerie(date);

export const countJoursOuvres = (startDate, endDate) => {
  let count = 0;
  let current = startDate;
  while (current <= endDate) {
    if (isJourOuvre(current)) count++;
    current = addDays(current, 1);
  }
  return count;
};

// Avance (n > 0) ou recule (n < 0) une date de n jours OUVRÉS (week-ends et fériés ignorés)
export const addJoursOuvres = (date, n) => {
  let result = date;
  let remaining = Math.abs(n);
  const step = n >= 0 ? 1 : -1;
  while (remaining > 0) {
    result = addDays(result, step);
    if (isJourOuvre(result)) remaining--;
  }
  return result;
};

// Nombre de jours OUVRÉS séparant oldDate de newDate (signé : positif si newDate est après oldDate)
export const diffJoursOuvres = (oldDate, newDate) => {
  if (oldDate.getTime() === newDate.getTime()) return 0;
  const forward = newDate > oldDate;
  const step = forward ? 1 : -1;
  let count = 0;
  let current = oldDate;
  while (current.getTime() !== newDate.getTime()) {
    current = addDays(current, step);
    if (isJourOuvre(current)) count += step;
  }
  return count;
};
