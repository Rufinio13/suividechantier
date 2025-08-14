export const addChantierLogic = (chantierData, contextState, uuidv4) => {
  const { chantiers, setChantiers, toast } = contextState;
  const newChantier = { 
    id: uuidv4(), 
    nom: chantierData.nom || '',
    adresse: chantierData.adresse || '',
    statut: chantierData.statut || 'Planifié',
    description: chantierData.description || '',
    nomClient: chantierData.nomClient || '',
    prenomClient: chantierData.prenomClient || '',
    telClient: chantierData.telClient || '',
    mailClient: chantierData.mailClient || '',
    commentaires: [],
  };
  setChantiers([...chantiers, newChantier]);
  toast({ title: 'Chantier créé', description: `Le chantier "${newChantier.nom}" a été créé.` });
  return newChantier;
};

export const updateChantierLogic = (id, updatedChantierData, contextState) => {
  const { chantiers, setChantiers, toast } = contextState;
  setChantiers(chantiers.map(c => 
    c.id === id 
      ? { 
          ...c, 
          nom: updatedChantierData.nom ?? c.nom,
          adresse: updatedChantierData.adresse ?? c.adresse,
          statut: updatedChantierData.statut ?? c.statut,
          description: updatedChantierData.description ?? c.description,
          nomClient: updatedChantierData.nomClient ?? c.nomClient,
          prenomClient: updatedChantierData.prenomClient ?? c.prenomClient,
          telClient: updatedChantierData.telClient ?? c.telClient,
          mailClient: updatedChantierData.mailClient ?? c.mailClient,
          commentaires: c.commentaires || [],
        } 
      : c
  ));
  toast({ title: 'Chantier mis à jour', description: `Le chantier a été mis à jour.` });
};

export const deleteChantierLogic = (id, contextState) => {
  const { chantiers, setChantiers, taches, setTaches, controles, setControles, comptesRendus, setComptesRendus, documents, setDocuments, toast } = contextState;
  const chantierToDelete = chantiers.find(c => c.id === id);
  setChantiers(chantiers.filter(c => c.id !== id));
  setTaches(taches.filter(t => t.chantierId !== id));
  setControles(controles.filter(c => c.chantierId !== id));
  setComptesRendus(comptesRendus.filter(cr => cr.chantierId !== id));
  setDocuments(documents.filter(d => d.chantierId !== id));
  toast({ title: 'Chantier supprimé', description: `Le chantier "${chantierToDelete?.nom}" a été supprimé.` });
};