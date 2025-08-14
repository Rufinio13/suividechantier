import React from 'react';
import { Navigate } from 'react-router-dom';

// Ce fichier est conservé pour la compatibilité mais redirige maintenant.
// La logique de cette page a été déplacée vers SousTraitantDetails.jsx (pour les détails d'un ST spécifique au chantier)
// et SousTraitantsList.jsx (pour la liste globale des ST).
// Si la fonctionnalité originale "SousTraitants par chantier" n'est plus souhaitée, ce fichier peut être supprimé
// et les routes dans App.jsx ajustées.
// Pour l'instant, il redirige vers la liste globale des sous-traitants.
export function SousTraitants() {
  return <Navigate to="/sous-traitants-list" replace />;
}