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