import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReferentielCommande } from '@/context/ReferentielCommandeContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package } from 'lucide-react';
import { ModeleCommandeForm } from '@/components/referentiel-commande/ModeleCommandeForm.jsx';
import { ModeleCommandeItem } from '@/components/referentiel-commande/ModeleCommandeItem.jsx';

export function ReferentielCommande() {
  const { modelesCommande, addModeleCommande, updateModeleCommande, deleteModeleCommande, loading, nomsociete } = useReferentielCommande();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Recherche et tri
  const filteredModeles = useMemo(() => {
    return (modelesCommande || [])
      .filter(modele => {
        const titreMatch = modele.titre?.toLowerCase().includes(searchTerm.toLowerCase());
        const descMatch = modele.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return titreMatch || descMatch;
      })
      .sort((a, b) => a.titre.localeCompare(b.titre));
  }, [modelesCommande, searchTerm]);

  const handleOpenModal = (modele = null) => {
    setEditingModele(modele);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModele(null);
  };

  const handleDeleteModele = (id) => {
    const modeleToDelete = modelesCommande.find(m => m.id === id);
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer le modèle "${modeleToDelete?.titre}" ?`
      )
    ) {
      deleteModeleCommande(id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Chargement du référentiel...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Référentiel Commandes</h1>
          <p className="text-muted-foreground">
            Gérez vos modèles de commandes réutilisables (Société : {nomsociete})
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Modèle
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un modèle (titre, description...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 max-w-md"
        />
      </div>

      {filteredModeles.length > 0 ? (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredModeles.map(modele => (
            <ModeleCommandeItem
              key={modele.id}
              modele={modele}
              onEdit={() => handleOpenModal(modele)}
              onDelete={() => handleDeleteModele(modele.id)}
            />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun modèle trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm
              ? "Aucun modèle ne correspond à votre recherche."
              : "Commencez par créer des modèles pour standardiser vos commandes."}
          </p>

          {!searchTerm && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un modèle
            </Button>
          )}
        </div>
      )}

      {isModalOpen && (
        <ModeleCommandeForm
          isOpen={isModalOpen}
          onClose={closeModal}
          modele={editingModele}
          addModeleCommande={addModeleCommande}
          updateModeleCommande={updateModeleCommande}
          nomsociete={nomsociete}
        />
      )}
    </div>
  );
}