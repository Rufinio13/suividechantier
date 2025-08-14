export const addDemandeSAVLogic = (demandeSAV, contextState, uuidv4) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  const newDemande = { 
    ...demandeSAV, 
    id: uuidv4(),
    dateValidationReprise: demandeSAV.repriseValidee && !demandeSAV.dateValidationReprise ? new Date().toISOString() : demandeSAV.dateValidationReprise 
  };
  setDemandesSAV([...demandesSAV, newDemande]);
  toast({ title: 'Demande SAV ajoutée', description: `La demande pour "${demandeSAV.nomClient}" a été enregistrée.` });
  return newDemande;
};

export const updateDemandeSAVLogic = (id, updatedDemandeSAV, contextState) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  setDemandesSAV(demandesSAV.map(d => {
    if (d.id === id) {
      const newValues = { ...d, ...updatedDemandeSAV };
      if (newValues.repriseValidee && !newValues.dateValidationReprise) {
        newValues.dateValidationReprise = new Date().toISOString();
      } else if (!newValues.repriseValidee) {
        newValues.dateValidationReprise = null;
      }
      return newValues;
    }
    return d;
  }));
  toast({ title: 'Demande SAV mise à jour', description: 'Les informations de la demande SAV ont été mises à jour.' });
};

export const deleteDemandeSAVLogic = (id, contextState) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  const demandeToDelete = demandesSAV.find(d => d.id === id);
  setDemandesSAV(demandesSAV.filter(d => d.id !== id));
  toast({ title: 'Demande SAV supprimée', description: `La demande pour "${demandeToDelete?.nomClient}" a été supprimée.` });
};