// Informations sur l'auteur d'une photo, enregistrées dans l'objet photo au moment de l'upload.
export function auteurPhoto(profile) {
  if (!profile) return {};
  const nom = `${profile.prenom || ''} ${profile.nom || ''}`.trim();
  return {
    auteur_id: profile.id || null,
    auteur_nom: nom || profile.mail || null,
    auteur_type: profile.user_type || null,
  };
}
