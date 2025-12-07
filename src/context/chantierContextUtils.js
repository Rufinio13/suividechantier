import { parseISO, addDays, getDay, format } from 'date-fns';

const LOCAL_STORAGE_KEY_PREFIX = 'suiviChantierApp_';

const initialDemoData = (uuidv4) => {
  const demoLotId1 = uuidv4();
  const demoLotId2 = uuidv4();
  const demoLotId3 = uuidv4();

  const demoStId1 = uuidv4();
  const demoStId2 = uuidv4();
  
  const demoFournisseurId1 = uuidv4();
  
  const demoChantierId1 = uuidv4();
  const demoChantierId2 = uuidv4();
  
  const demoModeleCQId1 = uuidv4();
  const demoDomaineId1_1 = uuidv4();
  const demoSousCatId1_1_1 = uuidv4();
  const demoSousCatId1_1_2 = uuidv4();
  const demoPointId1 = uuidv4();
  const demoPointId2 = uuidv4();
  const demoPointId3 = uuidv4();

  return {
    chantiers: [
      { id: demoChantierId1, nom: 'Résidence Les Lilas', client: 'SCI Horizon', adresse: '123 Rue Principale, Lyon', dateDebut: '2024-09-01', dateFin: '2025-03-31', budget: 250000, statut: 'En cours', progression: 30 },
      { id: demoChantierId2, nom: 'Bureau Innovatis', client: 'Tech Solutions SARL', adresse: '45 Avenue des Champs, Paris', dateDebut: '2024-10-15', dateFin: '2025-01-20', budget: 120000, statut: 'Planifié', progression: 0 },
    ],
    sousTraitants: [
      { id: demoStId1, nomsociete: 'Plomberie Express', nomDirigeant: 'Marc Dubois', email: 'marc.dubois@plomberie-express.fr', telephone: '0601020304', adressePostale: '10 Rue de la Pompe, Lyon', assignedLots: [demoLotId2] },
      { id: demoStId2, nomsociete: 'Élec Plus', nomDirigeant: 'Sophie Bernard', email: 'sophie.bernard@elecplus.com', telephone: '0705060708', adressePostale: '25 Boulevard Voltaire, Paris', assignedLots: [demoLotId3] },
    ],
    fournisseurs: [
      { id: demoFournisseurId1, nomsociete: 'Béton Pro', nomContact: 'Luc Durand', email: 'luc.durand@betonpro.com', telephone: '0405060708', adresse: 'ZI du Port, Marseille', assignedLots: [demoLotId1] },
    ],
    lots: [
      { id: demoLotId1, nom: 'Gros Œuvre', description: 'Fondations, maçonnerie, structure.' },
      { id: demoLotId2, nom: 'Plomberie', description: 'Installation sanitaire et chauffage.' },
      { id: demoLotId3, nom: 'Électricité', description: 'Courants forts et faibles.' },
    ],
    taches: [
      { id: uuidv4(), chantierId: demoChantierId1, nom: 'Préparation du terrain', description: 'Nettoyage et piquetage', dateDebut: '2024-09-01', duree: '5', dateFin: calculateDateFinLogic('2024-09-01', 5), lotId: demoLotId1, statut: 'Terminé', assigneId: null, assigneType: null },
      { id: uuidv4(), chantierId: demoChantierId1, nom: 'Coulage fondations', description: 'Coulage du béton pour les fondations', dateDebut: '2024-09-06', duree: '8', dateFin: calculateDateFinLogic('2024-09-06', 8), lotId: demoLotId1, statut: 'En cours', assigneId: demoFournisseurId1, assigneType: 'fournisseur' },
      { id: uuidv4(), chantierId: demoChantierId1, nom: 'Installation réseau EU/EP', description: 'Raccordements et attentes', dateDebut: '2024-09-16', duree: '7', dateFin: calculateDateFinLogic('2024-09-16', 7), lotId: demoLotId2, statut: 'À faire', assigneId: demoStId1, assigneType: 'soustraitant' },
    ],
    controles: [],
    modelesCQ: [
      { 
        id: demoModeleCQId1, 
        titre: 'Réception Gros Œuvre', 
        domaines: [
          { 
            id: demoDomaineId1_1, 
            nom: 'Fondations et Soubassements', 
            sousCategories: [
              { 
                id: demoSousCatId1_1_1, 
                nom: 'Fouilles', 
                pointsControle: [
                  { id: demoPointId1, libelle: 'Profondeur des fouilles conforme aux plans', description: 'Vérifier cotes altimétriques NGF' },
                  { id: uuidv4(), libelle: 'Largeur des fouilles respectée', description: '' },
                ]
              },
              { 
                id: demoSousCatId1_1_2, 
                nom: 'Ferraillage', 
                pointsControle: [
                  { id: demoPointId2, libelle: 'Position et conformité des aciers', description: 'Diamètres, espacements, recouvrements' },
                  { id: uuidv4(), libelle: 'Enrobage minimal respecté', description: '' },
                ]
              }
            ]
          },
          { 
            id: uuidv4(), 
            nom: 'Murs et Poteaux', 
            sousCategories: [
              {
                id: uuidv4(),
                nom: 'Implantation et Verticalité',
                pointsControle: [
                  { id: demoPointId3, libelle: 'Aplomb et alignement des murs', description: '' },
                  { id: uuidv4(), libelle: 'Dimensions des ouvertures conformes', description: 'Tolérances +/- 1cm' },
                ]
              }
            ]
          }
        ]
      }
    ],
    comptesRendus: [
      {id: uuidv4(), chantierId: demoChantierId1, titre: 'CR Semaine 35', contenu: 'Avancement conforme au planning. Problème mineur sur livraison béton résolu.', date: '2024-09-06', photos: ['photo_beton.jpg']},
    ],
    documents: [
      {id: uuidv4(), chantierId: demoChantierId1, nom: 'Plan masse RDC', type: 'Plan', url: 'https://example.com/plan_rdc.pdf', dateAjout: '2024-08-15', description: 'Plan général du rez-de-chaussée', sousTraitantId: null },
      {id: uuidv4(), chantierId: demoChantierId1, nom: 'Fiche technique Pompe à Chaleur', type: 'Fiche Technique', url: 'https://example.com/pac.pdf', dateAjout: '2024-09-01', description: 'PAC modèle XYZ pour lot Plomberie', sousTraitantId: demoStId1 },
    ],
  };
};

export const loadDataFromLocalStorage = (contextState, setLoading, uuidv4) => {
  setLoading(true);
  try {
    const keysToLoad = ['chantiers', 'sousTraitants', 'fournisseurs', 'lots', 'taches', 'controles', 'modelesCQ', 'comptesRendus', 'documents'];
    let allDataLoaded = {};
    let useDemoData = false;

    keysToLoad.forEach(key => {
      const localData = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${key}`);
      if (localData) {
        allDataLoaded[key] = JSON.parse(localData);
      } else {
        useDemoData = true; 
      }
    });
    
    if (useDemoData || !allDataLoaded.modelesCQ || !allDataLoaded.modelesCQ[0]?.domaines) { // Forcer demo si structure CQ a changé
      console.log("Données initiales (démonstration) chargées.");
      const demo = initialDemoData(uuidv4);
      keysToLoad.forEach(key => {
        const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (contextState[setterName]) {
            contextState[setterName](demo[key] || []);
        }
      });
    } else {
      console.log("Données chargées depuis localStorage.");
      keysToLoad.forEach(key => {
        const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (contextState[setterName]) {
            contextState[setterName](allDataLoaded[key] || []);
        }
      });
    }

  } catch (error) {
    console.error("Erreur lors du chargement des données depuis localStorage:", error);
    const demo = initialDemoData(uuidv4);
    Object.keys(demo).forEach(key => {
       const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
       if (contextState[setterName]) {
            contextState[setterName](demo[key]);
       }
    });
  } finally {
    setLoading(false);
  }
};

export const saveDataToLocalStorage = (contextState) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}chantiers`, JSON.stringify(contextState.chantiers));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}sousTraitants`, JSON.stringify(contextState.sousTraitants));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}fournisseurs`, JSON.stringify(contextState.fournisseurs));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}lots`, JSON.stringify(contextState.lots));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}taches`, JSON.stringify(contextState.taches));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}controles`, JSON.stringify(contextState.controles));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}modelesCQ`, JSON.stringify(contextState.modelesCQ));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}comptesRendus`, JSON.stringify(contextState.comptesRendus));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}documents`, JSON.stringify(contextState.documents));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des données dans localStorage:", error);
  }
};


export const calculateDateFinLogic = (dateDebutStr, dureeEnJours) => {
  if (!dateDebutStr || !dureeEnJours || isNaN(parseInt(dureeEnJours, 10)) || parseInt(dureeEnJours, 10) <= 0) {
    return ''; 
  }

  let currentDate = parseISO(dateDebutStr);
  let joursOuvresRestants = parseInt(dureeEnJours, 10);
  
  // Le premier jour compte comme un jour entier travaillé s'il est ouvré
  const dayOfWeekInitial = getDay(currentDate);
  if (dayOfWeekInitial !== 0 && dayOfWeekInitial !== 6) {
      joursOuvresRestants--; 
  }


  while (joursOuvresRestants > 0) {
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = getDay(currentDate); 
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      joursOuvresRestants--;
    }
  }
  return format(currentDate, 'yyyy-MM-dd');
};