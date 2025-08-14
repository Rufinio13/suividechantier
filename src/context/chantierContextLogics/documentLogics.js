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