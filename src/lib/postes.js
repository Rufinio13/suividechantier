// Postes des comptes constructeur (colonne profiles.poste, contrôlée en base)
export const POSTES = [
  { value: 'gerant', label: 'Gérant' },
  { value: 'conducteur_travaux', label: 'Conducteur de travaux' },
  { value: 'be', label: 'Bureau d\'études (BE)' },
  { value: 'admin', label: 'Administratif' },
];

export const isGerant = (profile) =>
  profile?.user_type === 'constructeur' && profile?.poste === 'gerant';
