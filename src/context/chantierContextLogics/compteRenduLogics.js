export const addCompteRenduLogic = (compteRendu, contextState, uuidv4) => {
  const { comptesRendus, setComptesRendus, toast } = contextState;
  const newCompteRendu = { ...compteRendu, id: uuidv4(), date: new Date().toISOString(), photos: compteRendu.photos || [] };
  setComptesRendus([...comptesRendus, newCompteRendu]);
  toast({ title: 'Compte rendu créé', description: 'Le compte rendu a été enregistré.' });
  return newCompteRendu;
};

export const updateCompteRenduLogic = (id, updatedCompteRendu, contextState) => {
  const { comptesRendus, setComptesRendus, toast } = contextState;
  setComptesRendus(comptesRendus.map(cr => cr.id === id ? { ...cr, ...updatedCompteRendu } : cr));
  toast({ title: 'Compte rendu mis à jour', description: 'Le compte rendu a été mis à jour.' });
};

export const deleteCompteRenduLogic = (id, contextState) => {
  const { comptesRendus, setComptesRendus, toast } = contextState;
  setComptesRendus(comptesRendus.filter(cr => cr.id !== id));
  toast({ title: 'Compte rendu supprimé', description: 'Le compte rendu a été supprimé.' });
};