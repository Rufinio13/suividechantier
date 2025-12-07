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

export const updateCommentaireChantierLogic = (chantierId, commentaireId, updatedData, contextState) => {
  const { chantiers, setChantiers, toast } = contextState;

  // Nettoyage / validation
  const titre = updatedData.titre?.trim();
  const texte = updatedData.texte?.trim();

  if (!titre || !texte) {
    toast({
      title: "Erreur",
      description: "Le titre et le texte du commentaire sont obligatoires.",
      variant: "destructive",
    });
    return;
  }

  setChantiers(prev =>
    prev.map(chantier => {
      if (chantier.id !== chantierId) return chantier;
      return {
        ...chantier,
        commentaires: (chantier.commentaires || []).map(commentaire =>
          commentaire.id === commentaireId
            ? {
                ...commentaire,
                titre,
                texte,
                modifieLe: new Date().toISOString(),
              }
            : commentaire
        )
      };
    })
  );

  toast({
    title: "Commentaire mis à jour",
    description: "Les modifications ont bien été enregistrées.",
  });
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


export const addSousTraitantLogic = (sousTraitant, contextState, uuidv4) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  const newSousTraitant = { ...sousTraitant, id: uuidv4(), assignedLots: sousTraitant.assignedLots || [] };
  setSousTraitants([...sousTraitants, newSousTraitant]);
  toast({ title: 'Sous-traitant ajouté', description: `Le sous-traitant "${newSousTraitant.nomsociete || `${newSousTraitant.prenomDirigeant} ${newSousTraitant.nomDirigeant}`.trim()}" a été ajouté.` });
  return newSousTraitant;
};

export const updateSousTraitantLogic = (id, updatedSousTraitant, contextState) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  setSousTraitants(sousTraitants.map(st => st.id === id ? { ...st, ...updatedSousTraitant, assignedLots: updatedSousTraitant.assignedLots || st.assignedLots || [] } : st));
  toast({ title: 'Sous-traitant mis à jour', description: 'Les informations du sous-traitant ont été mises à jour.' });
};

export const deleteSousTraitantLogic = (id, contextState) => {
  const { sousTraitants, setSousTraitants, taches, setTaches, toast } = contextState;
  const stToDelete = sousTraitants.find(st => st.id === id);
  setSousTraitants(sousTraitants.filter(st => st.id !== id));
  setTaches(taches.map(tache => (tache.assigneType === 'soustraitant' && tache.assigneId === id) ? { ...tache, assigneId: null, assigneType: null } : tache));
  toast({ title: 'Sous-traitant supprimé', description: `Le sous-traitant "${stToDelete?.nomsociete || `${stToDelete?.prenomDirigeant} ${stToDelete?.nomDirigeant}`.trim()}" a été supprimé.` });
};

export const assignLotsToSousTraitantLogic = (sousTraitantId, lotIdsToAssign, contextState) => {
  const { sousTraitants, setSousTraitants, toast } = contextState;
  setSousTraitants(sousTraitants.map(st => st.id === sousTraitantId ? { ...st, assignedLots: lotIdsToAssign } : st));
  toast({ title: 'Lots assignés', description: 'Les types de lots pour ce sous-traitant ont été mis à jour.' });
};

export const addFournisseurLogic = (fournisseur, contextState, uuidv4) => {
  const { fournisseurs, setFournisseurs, toast } = contextState;
  const newFournisseur = { ...fournisseur, id: uuidv4(), assignedLots: fournisseur.assignedLots || [] };
  setFournisseurs([...fournisseurs, newFournisseur]);
  toast({ title: 'Fournisseur ajouté', description: `Le fournisseur "${newFournisseur.nomsociete}" a été ajouté.` });
  return newFournisseur;
};

export const updateFournisseurLogic = (id, updatedFournisseur, contextState) => {
  const { fournisseurs, setFournisseurs, toast } = contextState;
  setFournisseurs(fournisseurs.map(f => f.id === id ? { ...f, ...updatedFournisseur, assignedLots: updatedFournisseur.assignedLots || f.assignedLots || [] } : f));
  toast({ title: 'Fournisseur mis à jour', description: 'Les informations du fournisseur ont été mises à jour.' });
};

export const deleteFournisseurLogic = (id, contextState) => {
  const { fournisseurs, setFournisseurs, taches, setTaches, toast } = contextState;
  const fToDelete = fournisseurs.find(f => f.id === id);
  setFournisseurs(fournisseurs.filter(f => f.id !== id));
  setTaches(taches.map(tache => (tache.assigneType === 'fournisseur' && tache.assigneId === id) ? { ...tache, assigneId: null, assigneType: null } : tache));
  toast({ title: 'Fournisseur supprimé', description: `Le fournisseur "${fToDelete?.nomsociete}" a été supprimé.` });
};


export const addLotLogic = (lot, contextState, uuidv4) => {
  const { lots, setLots, toast } = contextState;
  const newLot = { ...lot, id: uuidv4() };
  setLots([...lots, newLot]);
  toast({ title: 'Type de lot créé', description: `Le type de lot "${lot.nom}" a été créé.` });
  return newLot;
};

export const updateLotLogic = (id, updatedLot, contextState) => {
  const { lots, setLots, toast } = contextState;
  setLots(lots.map(l => l.id === id ? { ...l, ...updatedLot } : l));
  toast({ title: 'Type de lot mis à jour', description: 'Les informations du type de lot ont été mises à jour.' });
};

export const deleteLotLogic = (id, contextState) => {
  const { lots, setLots, taches, sousTraitants, fournisseurs, toast } = contextState; 
  const lotToDelete = lots.find(l => l.id === id);
  const isLotUsedInTaches = taches.some(t => t.lotId === id);
  const isLotAssignedToSousTraitant = sousTraitants.some(st => st.assignedLots && st.assignedLots.includes(id));
  const isLotAssignedToFournisseur = fournisseurs.some(f => f.assignedLots && f.assignedLots.includes(id));


  if (isLotUsedInTaches || isLotAssignedToSousTraitant || isLotAssignedToFournisseur) {
    toast({ title: 'Suppression impossible', description: `Le lot "${lotToDelete?.nom}" est utilisé (tâches, artisans ou fournisseurs).`, variant: 'destructive', duration: 7000 });
    return;
  }
  setLots(lots.filter(l => l.id !== id));
  toast({ title: 'Type de lot supprimé', description: `Le type de lot "${lotToDelete?.nom}" a été supprimé.` });
};

export const addTacheLogic = (tache, contextState, uuidv4) => {
  const { taches, setTaches, toast, calculateDateFin } = contextState;
  let finalTache = { ...tache, id: uuidv4() };
  if (tache.dateDebut && tache.duree) {
    finalTache.dateFin = calculateDateFin(tache.dateDebut, parseInt(tache.duree, 10));
  }
  setTaches([...taches, finalTache]);
  toast({ title: 'Tâche créée', description: `La tâche "${finalTache.nom}" a été créée.` });
  return finalTache;
};

export const updateTacheLogic = (id, updatedTache, contextState) => {
  const { taches, setTaches, toast, calculateDateFin } = contextState;
  let finalUpdatedTache = { ...updatedTache };
  if (updatedTache.dateDebut && updatedTache.duree) {
    finalUpdatedTache.dateFin = calculateDateFin(updatedTache.dateDebut, parseInt(updatedTache.duree, 10));
  }
  setTaches(taches.map(t => t.id === id ? { ...t, ...finalUpdatedTache } : t));
  toast({ title: 'Tâche mise à jour', description: 'La tâche a été mise à jour.' });
};

export const deleteTacheLogic = (id, contextState) => {
  const { taches, setTaches, toast } = contextState;
  const tacheToDelete = taches.find(t => t.id === id);
  setTaches(taches.filter(t => t.id !== id));
  toast({ title: 'Tâche supprimée', description: `La tâche "${tacheToDelete?.nom}" a été supprimée.` });
};


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

export const addModeleCQLogic = (modele, contextState, uuidv4) => {
  const { modelesCQ, setModelesCQ, toast } = contextState;
  const newModele = { 
    ...modele, 
    id: uuidv4(), 
    domaines: (modele.domaines || []).map(dom => ({
      ...dom,
      id: uuidv4(),
      sousCategories: (dom.sousCategories || []).map(sc => ({
        ...sc,
        id: uuidv4(),
        pointsControle: (sc.pointsControle || []).map(pc => ({ ...pc, id: uuidv4() }))
      }))
    }))
  };
  setModelesCQ([...modelesCQ, newModele]);
  toast({ title: 'Modèle CQ créé', description: `Le modèle "${modele.titre}" a été ajouté.` });
  return newModele;
};

export const updateModeleCQLogic = (id, updatedModele, contextState, uuidv4) => {
  const { modelesCQ, setModelesCQ, toast } = contextState;
  setModelesCQ(modelesCQ.map(m => (m.id === id ? { 
    ...m, 
    ...updatedModele,
    domaines: (updatedModele.domaines || []).map(dom => ({
      id: dom.id || uuidv4(),
      ...dom,
      sousCategories: (dom.sousCategories || []).map(sc => ({
        id: sc.id || uuidv4(),
        ...sc,
        pointsControle: (sc.pointsControle || []).map(pc => ({ id: pc.id || uuidv4(), ...pc }))
      }))
    }))
  } : m)));
  toast({ title: 'Modèle CQ mis à jour', description: 'Le modèle a été mis à jour.' });
};

export const deleteModeleCQLogic = (id, contextState) => {
  const { modelesCQ, setModelesCQ, controles, toast } = contextState;
  const isModeleUsed = controles.some(c => c.modeleCQId === id && c.type === 'modele');
  if (isModeleUsed) {
      toast({ title: "Suppression impossible", description: "Ce modèle est utilisé.", variant: "destructive", duration: 5000 });
      return;
  }
  setModelesCQ(modelesCQ.filter(m => m.id !== id));
  toast({ title: 'Modèle CQ supprimé', description: 'Le modèle a été supprimé.' });
};


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


export const addDocumentLogic = (document, contextState, uuidv4) => {
  const { documents, setDocuments, toast } = contextState;
  const newDocument = { ...document, id: uuidv4(), dateAjout: new Date().toISOString() };
  setDocuments([...documents, newDocument]);
  toast({ title: 'Document ajouté', description: `Le document "${document.nom}" a été ajouté.` });
  return newDocument;
};

export const updateDocumentLogic = (id, updatedDocument, contextState) => {
  const { documents, setDocuments, toast } = contextState;
  setDocuments(documents.map(d => d.id === id ? { ...d, ...updatedDocument } : d));
  toast({ title: 'Document mis à jour', description: 'Le document a été mis à jour.' });
};

export const deleteDocumentLogic = (id, contextState) => {
  const { documents, setDocuments, toast } = contextState;
  const docToDelete = documents.find(d => d.id === id);
  setDocuments(documents.filter(d => d.id !== id));
  toast({ title: 'Document supprimé', description: `Le document "${docToDelete?.nom}" a été supprimé.` });
};

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
  const { chantiers, setChantiers, toast } = contextState;
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

export const addDemandeSAVLogic = (demandeSAV, contextState, uuidv4) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  const newDemande = { ...demandeSAV, id: uuidv4() };
  setDemandesSAV([...demandesSAV, newDemande]);
  toast({ title: 'Demande SAV ajoutée', description: `La demande pour "${demandeSAV.nomClient}" a été enregistrée.` });
  return newDemande;
};

export const updateDemandeSAVLogic = (id, updatedDemandeSAV, contextState) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  setDemandesSAV(demandesSAV.map(d => d.id === id ? { ...d, ...updatedDemandeSAV } : d));
  toast({ title: 'Demande SAV mise à jour', description: 'Les informations de la demande SAV ont été mises à jour.' });
};

export const deleteDemandeSAVLogic = (id, contextState) => {
  const { demandesSAV, setDemandesSAV, toast } = contextState;
  const demandeToDelete = demandesSAV.find(d => d.id === id);
  setDemandesSAV(demandesSAV.filter(d => d.id !== id));
  toast({ title: 'Demande SAV supprimée', description: `La demande pour "${demandeToDelete?.nomClient}" a été supprimée.` });
};

// Logiques pour les points de contrôle spécifiques au chantier
export const addPointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointData, contextState, uuidv4) => {
  const { controles, setControles, toast } = contextState;
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex === -1) {
    // Créer un nouveau contrôle modèle s'il n'existe pas
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
  // toast({ title: "Point spécifique ajouté", description: `Le point "${pointData.libelle}" a été ajouté.` });
};

export const updatePointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointId, pointData, contextState) => {
  const { controles, setControles, toast } = contextState;
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
      // toast({ title: "Point spécifique mis à jour", description: `Le point "${pointData.libelle}" a été mis à jour.` });
    } else {
      // toast({ title: "Erreur", description: "Point spécifique non trouvé pour la mise à jour.", variant: "destructive" });
    }
  } else {
    // toast({ title: "Erreur", description: "Contrôle modèle non trouvé pour la mise à jour du point spécifique.", variant: "destructive" });
  }
};

export const deletePointControleChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, pointId, contextState) => {
  const { controles, setControles, toast } = contextState;
  const controleModeleIndex = controles.findIndex(c => c.chantierId === chantierId && c.modeleCQId === modeleId && c.type === 'modele');

  if (controleModeleIndex !== -1) {
    const updatedControles = [...controles];
    const controleToUpdate = { ...updatedControles[controleModeleIndex] };
    if (controleToUpdate.pointsSpecifiques?.[domaineId]?.[sousCategorieId || '_global']?.[pointId]) {
      delete controleToUpdate.pointsSpecifiques[domaineId][sousCategorieId || '_global'][pointId];
      controleToUpdate.dateMiseAJour = new Date().toISOString();
      updatedControles[controleModeleIndex] = controleToUpdate;
      setControles(updatedControles);
      // toast({ title: "Point spécifique supprimé", description: "Le point de contrôle spécifique a été supprimé." });
    } else {
      // toast({ title: "Erreur", description: "Point spécifique non trouvé pour la suppression.", variant: "destructive" });
    }
  } else {
    // toast({ title: "Erreur", description: "Contrôle modèle non trouvé pour la suppression du point spécifique.", variant: "destructive" });
  }
};

// export const updateNomCategorieChantierSpecificLogic = (chantierId, modeleId, domaineId, sousCategorieId, nouveauNom, contextState) => {
//   const { controles, setControles, toast } = contextState;
//   // Logique pour mettre à jour le nom d'un domaine ou d'une sous-catégorie spécifique au chantier
//   // Cela pourrait impliquer de stocker ces noms modifiés dans l'objet `pointsSpecifiques` ou une structure similaire.
//   // Pour l'instant, cette fonctionnalité est complexe à implémenter proprement sans refonte majeure de la structure de données.
//   console.log("Tentative de mise à jour du nom de catégorie (non implémenté dans la logique de persistance) :", chantierId, modeleId, domaineId, sousCategorieId, nouveauNom);
//   toast({ title: "Fonctionnalité en développement", description: "La modification des noms de catégories spécifiques au chantier n'est pas encore entièrement supportée pour la persistance." });
// };