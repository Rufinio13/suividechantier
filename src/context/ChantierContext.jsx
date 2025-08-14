import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { 
  loadDataFromLocalStorage, 
  saveDataToLocalStorage,
  calculateDateFinLogic
} from '@/context/chantierContextUtils';
import { 
  addChantierLogic, updateChantierLogic, deleteChantierLogic,
  addSousTraitantLogic, updateSousTraitantLogic, deleteSousTraitantLogic, assignLotsToSousTraitantLogic,
  addFournisseurLogic, updateFournisseurLogic, deleteFournisseurLogic,
  addLotLogic, updateLotLogic, deleteLotLogic,
  addTacheLogic, updateTacheLogic, deleteTacheLogic,
  addControleAdHocLogic, updateControleAdHocLogic, saveControleFromModeleLogic, deleteControleLogic,
  addModeleCQLogic, updateModeleCQLogic, deleteModeleCQLogic,
  addCompteRenduLogic, updateCompteRenduLogic, deleteCompteRenduLogic,
  addDocumentLogic, updateDocumentLogic, deleteDocumentLogic,
  addCommentaireChantierLogic, deleteCommentaireChantierLogic, toggleCommentairePrisEnCompteLogic, 
  updatePointControleRepriseLogic,
  addDemandeSAVLogic, updateDemandeSAVLogic, deleteDemandeSAVLogic,
  addPointControleChantierSpecificLogic, updatePointControleChantierSpecificLogic, deletePointControleChantierSpecificLogic,
  // --- AJOUT ---
  updateCommentaireChantierLogic
  // -------------
} from '@/context/chantierContextLogics';

const ChantierContext = createContext();

export const useChantier = () => useContext(ChantierContext);

export const ChantierProvider = ({ children }) => {
  const [chantiers, setChantiers] = useState([]);
  const [sousTraitants, setSousTraitants] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [lots, setLots] = useState([]);
  const [taches, setTaches] = useState([]);
  const [controles, setControles] = useState([]);
  const [modelesCQ, setModelesCQ] = useState([]);
  const [comptesRendus, setComptesRendus] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [demandesSAV, setDemandesSAV] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const contextState = {
    chantiers, setChantiers,
    sousTraitants, setSousTraitants,
    fournisseurs, setFournisseurs,
    lots, setLots,
    taches, setTaches,
    controles, setControles,
    modelesCQ, setModelesCQ,
    comptesRendus, setComptesRendus,
    documents, setDocuments,
    demandesSAV, setDemandesSAV,
    toast,
    calculateDateFin: calculateDateFinLogic
  };

  useEffect(() => {
    loadDataFromLocalStorage(contextState, setLoading, uuidv4);
  }, []);

  useEffect(() => {
    if (!loading) {
      saveDataToLocalStorage(contextState);
    }
  }, [chantiers, sousTraitants, fournisseurs, lots, taches, controles, modelesCQ, comptesRendus, documents, demandesSAV, loading]);

  const value = {
    chantiers, sousTraitants, fournisseurs, lots, taches, controles, modelesCQ, comptesRendus, documents, demandesSAV, loading,

    // Chantiers
    addChantier: (data) => addChantierLogic(data, contextState, uuidv4),
    updateChantier: (id, data) => updateChantierLogic(id, data, contextState),
    deleteChantier: (id) => deleteChantierLogic(id, contextState),
    
    // Sous-traitants
    addSousTraitant: (data) => addSousTraitantLogic(data, contextState, uuidv4),
    updateSousTraitant: (id, data) => updateSousTraitantLogic(id, data, contextState),
    deleteSousTraitant: (id) => deleteSousTraitantLogic(id, contextState),
    assignLotsToSousTraitant: (stId, lotIds) => assignLotsToSousTraitantLogic(stId, lotIds, contextState),

    // Fournisseurs
    addFournisseur: (data) => addFournisseurLogic(data, contextState, uuidv4),
    updateFournisseur: (id, data) => updateFournisseurLogic(id, data, contextState),
    deleteFournisseur: (id) => deleteFournisseurLogic(id, contextState),

    // Lots
    addLot: (data) => addLotLogic(data, contextState, uuidv4),
    updateLot: (id, data) => updateLotLogic(id, data, contextState),
    deleteLot: (id) => deleteLotLogic(id, contextState),
    
    // Tâches
    addTache: (data) => addTacheLogic(data, contextState, uuidv4),
    updateTache: (id, data) => updateTacheLogic(id, data, contextState),
    deleteTache: (id) => deleteTacheLogic(id, contextState),
    
    // Contrôles qualité
    addControleAdHoc: (data) => addControleAdHocLogic(data, contextState, uuidv4),
    updateControleAdHoc: (id, data) => updateControleAdHocLogic(id, data, contextState),
    saveControleFromModele: (chId, modId, results, pointsSpecifiques) => saveControleFromModeleLogic(chId, modId, results, pointsSpecifiques, contextState, uuidv4),
    deleteControle: (id) => deleteControleLogic(id, contextState),
    
    // Modèles CQ
    addModeleCQ: (data) => addModeleCQLogic(data, contextState, uuidv4),
    updateModeleCQ: (id, data) => updateModeleCQLogic(id, data, contextState, uuidv4),
    deleteModeleCQ: (id) => deleteModeleCQLogic(id, contextState),
    
    // Comptes-rendus
    addCompteRendu: (data) => addCompteRenduLogic(data, contextState, uuidv4),
    updateCompteRendu: (id, data) => updateCompteRenduLogic(id, data, contextState),
    deleteCompteRendu: (id) => deleteCompteRenduLogic(id, contextState),
    
    // Documents
    addDocument: (data) => addDocumentLogic(data, contextState, uuidv4),
    updateDocument: (id, data) => updateDocumentLogic(id, data, contextState),
    deleteDocument: (id) => deleteDocumentLogic(id, contextState),

    // Commentaires chantier
    addCommentaireChantier: (chantierId, titre, texte) => addCommentaireChantierLogic(chantierId, titre, texte, contextState, uuidv4),
    deleteCommentaireChantier: (chantierId, commentaireId) => deleteCommentaireChantierLogic(chantierId, commentaireId, contextState),
    toggleCommentairePrisEnCompte: (chantierId, commentaireId) => toggleCommentairePrisEnCompteLogic(chantierId, commentaireId, contextState),
    // --- AJOUT : mise à jour d’un commentaire
    updateCommentaireChantier: (chantierId, commentaireId, data) =>
      updateCommentaireChantierLogic(chantierId, commentaireId, data, contextState),
    // ----------------------------------------

    // Reprise sur points de contrôle
    updatePointControleReprise: (chantierId, modeleId, domaineId, sousCategorieId, pointControleId, repriseData) =>
      updatePointControleRepriseLogic(chantierId, modeleId, domaineId, sousCategorieId, pointControleId, repriseData, contextState),

    // SAV
    addDemandeSAV: (data) => addDemandeSAVLogic(data, contextState, uuidv4),
    updateDemandeSAV: (id, data) => updateDemandeSAVLogic(id, data, contextState),
    deleteDemandeSAV: (id) => deleteDemandeSAVLogic(id, contextState),

    // Points de contrôle spécifiques au chantier
    addPointControleChantierSpecific: (chantierId, modeleId, domaineId, sousCategorieId, pointData) =>
      addPointControleChantierSpecificLogic(chantierId, modeleId, domaineId, sousCategorieId, pointData, contextState, uuidv4),
    updatePointControleChantierSpecific: (chantierId, modeleId, domaineId, sousCategorieId, pointId, pointData) =>
      updatePointControleChantierSpecificLogic(chantierId, modeleId, domaineId, sousCategorieId, pointId, pointData, contextState),
    deletePointControleChantierSpecific: (chantierId, modeleId, domaineId, sousCategorieId, pointId) =>
      deletePointControleChantierSpecificLogic(chantierId, modeleId, domaineId, sousCategorieId, pointId, contextState),
    // updateNomCategorieChantierSpecific: (chantierId, modeleId, domaineId, sousCategorieId, nouveauNom) =>
    //   updateNomCategorieChantierSpecificLogic(chantierId, modeleId, domaineId, sousCategorieId, nouveauNom, contextState),
  };

  return (
    <ChantierContext.Provider value={value}>
      {children}
    </ChantierContext.Provider>
  );
};
