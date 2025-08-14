export const addControleAdHocLogic = (controleData, contextState, uuidv4) => {
  const { controles, setControles, toast } = contextState;
  const newControle = { ...controleData, id: uuidv4(), date: new Date().toISOString(), type: 'ad-hoc' };
  setControles([...controles, newControle]);
  toast({ title: 'Contrôle qualité ad-hoc ajouté', description: 'Le contrôle a été enregistré.' });
  return newControle;
};

export const updateControleAdHocLogic = (id, updatedControleData, contextState) => {
  const { controles, setControles, toast } = contextState;
  setControles(controles.map(c => (c.id === id && c.type === 'ad-hoc') ? { ...c, ...updatedControleData } : c));
  toast({ title: 'Contrôle qualité ad-hoc mis à jour', description: 'Le contrôle a été mis à jour.' });
};

export const saveControleFromModeleLogic = (chantierId, modeleCQId, resultatsPointsControle, pointsSpecifiques, contextState, uuidv4) => {
  const { controles, setControles, toast } = contextState;
  const existingControleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleCQId && c.type === 'modele');
  let updatedControle;

  if (existingControleIndex > -1) {
    updatedControle = { 
      ...controles[existingControleIndex], 
      resultats: resultatsPointsControle, 
      pointsSpecifiques: pointsSpecifiques || controles[existingControleIndex].pointsSpecifiques || {},
      dateMiseAJour: new Date().toISOString() 
    };
    const newControles = [...controles];
    newControles[existingControleIndex] = updatedControle;
    setControles(newControles);
  } else {
    updatedControle = { 
      id: uuidv4(), 
      chantierId, 
      modeleCQId, 
      type: 'modele', 
      resultats: resultatsPointsControle, 
      pointsSpecifiques: pointsSpecifiques || {},
      dateCreation: new Date().toISOString(), 
      dateMiseAJour: new Date().toISOString() 
    };
    setControles(prevControles => [...prevControles, updatedControle]);
  }
  toast({ title: 'Contrôle Qualité (Modèle) enregistré', description: `Les résultats et points spécifiques ont été ${existingControleIndex > -1 ? 'mis à jour' : 'enregistrés'}.` });
  return updatedControle;
};

export const deleteControleLogic = (id, contextState) => {
  const { controles, setControles, toast } = contextState;
  setControles(controles.filter(c => c.id !== id));
  toast({ title: 'Contrôle qualité supprimé', description: 'Le contrôle a été supprimé.' });
};

export const updatePointControleRepriseLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointControleId, repriseData, contextState) => {
  const { controles, setControles, toast } = contextState;
  
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex === -1) {
    toast({ title: "Erreur", description: "Contrôle modèle non trouvé.", variant: "destructive" });
    return;
  }

  const controleModele = controles[controleModeleIndex];
  const resultats = controleModele.resultats || {};
  
  if (!resultats[domaineId] || !resultats[domaineId][sousCategorieId] || !resultats[domaineId][sousCategorieId][pointControleId]) {
     toast({ title: "Erreur", description: "Point de contrôle non trouvé dans les résultats.", variant: "destructive" });
     return;
  }

  const pointResultat = resultats[domaineId][sousCategorieId][pointControleId];

  const updatedPointResultat = {
    ...pointResultat,
    dateReprisePrevisionnelle: repriseData.dateReprisePrevisionnelle || pointResultat.dateReprisePrevisionnelle,
    repriseValidee: typeof repriseData.repriseValidee === 'boolean' ? repriseData.repriseValidee : pointResultat.repriseValidee,
  };

  const updatedResultats = {
    ...resultats,
    [domaineId]: {
      ...resultats[domaineId],
      [sousCategorieId]: {
        ...resultats[domaineId][sousCategorieId],
        [pointControleId]: updatedPointResultat
      }
    }
  };
  
  const newControles = [...controles];
  newControles[controleModeleIndex] = { ...controleModele, resultats: updatedResultats, dateMiseAJour: new Date().toISOString() };
  setControles(newControles);
  
  toast({ title: "Reprise mise à jour", description: "Les informations de reprise du point de contrôle ont été mises à jour." });
};

export const addPointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointData, contextState, uuidv4) => {
  const { controles, setControles } = contextState;
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex === -1) {
    const newControleModele = {
      id: uuidv4(),
      chantierId,
      modeleCQId: modeleId,
      type: 'modele',
      resultats: {},
      pointsSpecifiques: {
        [domaineId]: {
          [sousCategorieId || '_global']: {
            [pointData.id]: pointData
          }
        }
      },
      dateCreation: new Date().toISOString(),
      dateMiseAJour: new Date().toISOString()
    };
    setControles(prev => [...prev, newControleModele]);
  } else {
    const updatedControles = [...controles];
    const controleToUpdate = { ...updatedControles[controleModeleIndex] };
    controleToUpdate.pointsSpecifiques = controleToUpdate.pointsSpecifiques || {};
    controleToUpdate.pointsSpecifiques[domaineId] = controleToUpdate.pointsSpecifiques[domaineId] || {};
    controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'] = controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'] || {};
    controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'][pointData.id] = pointData;
    controleToUpdate.dateMiseAJour = new Date().toISOString();
    updatedControles[controleModeleIndex] = controleToUpdate;
    setControles(updatedControles);
  }
};

export const updatePointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointId, pointData, contextState) => {
  const { controles, setControles } = contextState;
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex !== -1) {
    const updatedControles = [...controles];
    const controleToUpdate = { ...updatedControles[controleModeleIndex] };
    if (controleToUpdate.pointsSpecifiques?.[domaineId]?.[sousCategorieId || '_global']?.[pointId]) {
      controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'][pointId] = {
        ...controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'][pointId],
        ...pointData
      };
      controleToUpdate.dateMiseAJour = new Date().toISOString();
      updatedControles[controleModeleIndex] = controleToUpdate;
      setControles(updatedControles);
    }
  }
};

export const deletePointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointId, contextState) => {
  const { controles, setControles } = contextState;
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex !== -1) {
    const updatedControles = [...controles];
    const controleToUpdate = { ...updatedControles[controleModeleIndex] };
    if (controleToUpdate.pointsSpecifiques?.[domaineId]?.[sousCategorieId || '_global']?.[pointId]) {
      delete controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'][pointId];
      controleToUpdate.dateMiseAJour = new Date().toISOString();
      updatedControles[controleModeleIndex] = controleToUpdate;
      setControles(updatedControles);
    }
  }
};