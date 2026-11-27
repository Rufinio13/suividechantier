// Tâche terminée : validée / clôturée par le constructeur, ou déclarée terminée par l'artisan.
// Une tâche terminée n'est plus signalée en conflit ni en indisponibilité artisan.
export const estTacheFinie = (t) => !!(t && (t.constructeur_valide || t.terminee || t.artisan_termine));
