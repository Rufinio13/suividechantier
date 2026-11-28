// Points des notes Bureau d'Études : importance, date prévisionnelle et commentaire
// (stockés dans chaque point du JSON `texte` de commentaires_chantier)
export const IMPORTANCES = [
  { value: 'haute', label: 'Haute', pastille: 'bg-red-50 text-red-700', point: 'bg-red-500', ordre: 0 },
  { value: 'normale', label: 'Normale', pastille: 'bg-amber-50 text-amber-700', point: 'bg-amber-500', ordre: 1 },
  { value: 'basse', label: 'Basse', pastille: 'bg-slate-100 text-slate-600', point: 'bg-slate-400', ordre: 2 },
];

export const importanceDe = (valeur) => IMPORTANCES.find(i => i.value === valeur) || null;

// Date du jour au format AAAA-MM-JJ (heure locale)
export const aujourdhuiISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// AAAA-MM-JJ → JJ/MM/AAAA
export const formatDatePrevue = (iso) => {
  const [a, m, j] = String(iso || '').split('-');
  return a && m && j ? `${j}/${m}/${a}` : '';
};

// Nombre de jours de retard (0 si pas en retard)
export const joursDeRetard = (ligne) => {
  if (!estEnRetard(ligne)) return 0;
  const [a, m, j] = ligne.date_prevue.split('-').map(Number);
  const prevue = new Date(a, m - 1, j);
  const now = new Date();
  const jour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((jour - prevue) / 86400000);
};

// Filtre « Aujourd'hui » : tâches prévues aujourd'hui, en retard (non terminées) ou sans date
export const estPourAujourdhui = (ligne) =>
  !ligne?.date_prevue || ligne.date_prevue === aujourdhuiISO() || estEnRetard(ligne);

export const estEnRetard = (ligne) =>
  !!ligne?.date_prevue && !ligne.checked && ligne.date_prevue < aujourdhuiISO();
