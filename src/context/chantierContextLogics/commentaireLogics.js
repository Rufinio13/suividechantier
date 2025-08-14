export const addCommentaireChantierLogic = (chantierId, titre, texte, contextState, uuidv4) => {
  const { chantiers, setChantiers, toast } = contextState;
  const newCommentaire = {
    id: uuidv4(),
    titre,
    texte,
    date: new Date().toISOString(),
    auteur: "Utilisateur Actuel", 
    prisEnCompte: false,
  };
  setChantiers(chantiers.map(c => 
    c.id === chantierId 
      ? { ...c, commentaires: [...(c.commentaires || []), newCommentaire] } 
      : c
  ));
  toast({ title: 'Commentaire ajouté', description: 'Votre commentaire a été enregistré.' });
};

export const deleteCommentaireChantierLogic = (chantierId, commentaireId, contextState) => {
  const { chantiers, setChantiers, toast } = contextState;
  setChantiers(chantiers.map(c => 
    c.id === chantierId 
      ? { ...c, commentaires: (c.commentaires || []).filter(com => com.id !== commentaireId) } 
      : c
  ));
  toast({ title: 'Commentaire supprimé', description: 'Le commentaire a été supprimé.' });
};

export const toggleCommentairePrisEnCompteLogic = (chantierId, commentaireId, contextState) => {
  const { chantiers, setChantiers } = contextState;
  setChantiers(chantiers.map(c => 
    c.id === chantierId 
      ? { 
          ...c, 
          commentaires: (c.commentaires || []).map(com => 
            com.id === commentaireId ? { ...com, prisEnCompte: !com.prisEnCompte } : com
          ) 
        } 
      : c
  ));
};