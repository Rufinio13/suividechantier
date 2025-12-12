import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useCommandes } from '@/context/CommandesContext.jsx';
import { useReferentielCommande } from '@/context/ReferentielCommandeContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Eye, EyeOff, Package, Sparkles } from 'lucide-react';
import { CommandeForm } from '@/components/commandes/CommandeForm.jsx';
import { CommandeItem } from '@/components/commandes/CommandeItem.jsx';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Commandes({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { chantiers } = useChantier();
  const { commandes, addCommande, updateCommande, deleteCommande, loading } = useCommandes();
  const { modelesCommande } = useReferentielCommande();
  const { fournisseurs = [] } = useChantier();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingCommande, setEditingCommande] = useState(null);
  const [masquerLivrees, setMasquerLivrees] = useState(true);

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);

  // Filtrer les commandes du chantier
  const commandesChantier = useMemo(() => {
    let filtered = commandes.filter(c => c.chantier_id === chantierId);
    
    // ✅ MODIFIÉ : Filtrer sur livraison_realisee au lieu de date_commande_reelle
    if (masquerLivrees) {
      filtered = filtered.filter(c => !c.livraison_realisee);
    }

    return filtered.sort((a, b) => {
      const dateA = a.date_livraison_souhaitee ? new Date(a.date_livraison_souhaitee) : new Date();
      const dateB = b.date_livraison_souhaitee ? new Date(b.date_livraison_souhaitee) : new Date();
      return dateA - dateB;
    });
  }, [commandes, chantierId, masquerLivrees]);

  const handleOpenModal = (commande = null) => {
    setEditingCommande(commande);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCommande(null);
  };

  const handleDeleteCommande = (id) => {
    const commandeToDelete = commandesChantier.find(c => c.id === id);
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer la commande "${commandeToDelete?.nom_commande}" ?`
      )
    ) {
      deleteCommande(id);
    }
  };

  // ✅ MODIFIÉ : Toggle livraison_realisee au lieu de valider
  const handleToggleLivraison = async (id, isLivree) => {
    try {
      await updateCommande(id, { livraison_realisee: isLivree });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour de la commande');
    }
  };

  // Appliquer un template
  const handleAppliquerTemplate = async () => {
    if (!selectedTemplateId) {
      alert('Veuillez sélectionner un template');
      return;
    }

    const template = modelesCommande.find(m => m.id === selectedTemplateId);
    if (!template || !template.commandes_types || template.commandes_types.length === 0) {
      alert('Ce template ne contient aucune commande');
      return;
    }

    try {
      const commandesACreer = template.commandes_types.map(ct => ({
        chantier_id: chantierId,
        modele_commande_id: template.id,
        nom_commande: ct.nom,
        fournisseur_id: null,
        date_livraison_souhaitee: null,
        delai_commande_semaines: ct.delai_semaines,
        date_commande_reelle: null,
        livraison_realisee: false,
        notes: `Créée depuis le template "${template.titre}"`
      }));

      for (const commande of commandesACreer) {
        await addCommande(commande);
      }

      alert(`${commandesACreer.length} commande(s) créée(s) depuis le template "${template.titre}"`);
      setIsTemplateModalOpen(false);
      setSelectedTemplateId('');
    } catch (error) {
      console.error('Erreur lors de l\'application du template:', error);
      alert('Erreur lors de l\'application du template');
    }
  };

  // ✅ MODIFIÉ : Rouge si date prévisionnelle dépassée ET pas encore commandée
  const isCommandeEnRetard = (commande) => {
    if (commande.date_commande_reelle) return false; // Si commandée, pas en retard
    if (!commande.date_commande_previsionnelle) return false;
    const datePrevisionnelle = parseISO(commande.date_commande_previsionnelle);
    return isBefore(datePrevisionnelle, startOfDay(new Date()));
  };

  if (loading && !isEmbedded) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!chantier && !isEmbedded) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
        <Button asChild className="mt-4">
          <Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
        </Button>
      </div>
    );
  }

  const pageHeader = !isEmbedded ? (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link to={`/chantiers/${chantierId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au chantier
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Commandes du Chantier</h1>
        <p className="text-muted-foreground">{chantier?.nomchantier}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      <Card className={`bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg ${isEmbedded ? 'shadow-none border-0' : ''}`}>
        {!isEmbedded && (
          <CardHeader>
            <CardTitle className="text-xl">Gestion des Commandes</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-4 ${isEmbedded ? 'p-0 pt-4 sm:p-0' : ''}`}>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="masquer-livrees" 
                checked={masquerLivrees}
                onCheckedChange={setMasquerLivrees}
              />
              <label htmlFor="masquer-livrees" className="text-sm font-medium cursor-pointer">
                {masquerLivrees ? <EyeOff className="inline h-4 w-4 mr-1" /> : <Eye className="inline h-4 w-4 mr-1" />}
                Masquer les commandes livrées
              </label>
            </div>
            
            <div className="flex gap-2">
              {modelesCommande.length > 0 && (
                <Button 
                  onClick={() => setIsTemplateModalOpen(true)} 
                  size="sm"
                  variant="outline"
                  className="bg-purple-50 border-purple-300 hover:bg-purple-100"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Appliquer un template
                </Button>
              )}
              
              <Button onClick={() => handleOpenModal()} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Commande
              </Button>
            </div>
          </div>

          {/* Liste des commandes */}
          <AnimatePresence>
            {commandesChantier.length > 0 ? (
              <div className="space-y-3">
                {commandesChantier.map(commande => (
                  <CommandeItem
                    key={commande.id}
                    commande={commande}
                    isEnRetard={isCommandeEnRetard(commande)}
                    onEdit={() => handleOpenModal(commande)}
                    onDelete={() => handleDeleteCommande(commande.id)}
                    onToggleLivraison={handleToggleLivraison}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Aucune commande</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {masquerLivrees 
                    ? "Aucune commande en attente. Les commandes livrées sont masquées."
                    : "Commencez par créer des commandes pour ce chantier."}
                </p>
                
                <div className="flex gap-2">
                  {modelesCommande.length > 0 && (
                    <Button 
                      onClick={() => setIsTemplateModalOpen(true)}
                      variant="outline"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Appliquer un template
                    </Button>
                  )}
                  
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une commande
                  </Button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Modal Formulaire Commande */}
      {isModalOpen && (
        <CommandeForm
          isOpen={isModalOpen}
          onClose={closeModal}
          commande={editingCommande}
          chantierId={chantierId}
          modelesCommande={[]}
          fournisseurs={fournisseurs}
          addCommande={addCommande}
          updateCommande={updateCommande}
        />
      )}

      {/* Modal Appliquer Template */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
              Appliquer un template de commandes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Sélectionnez un template pour créer automatiquement toutes ses commandes sur ce chantier.
              </p>
              
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un template..." />
                </SelectTrigger>
                <SelectContent>
                  {modelesCommande.map(modele => (
                    <SelectItem key={modele.id} value={modele.id}>
                      {modele.titre} ({modele.commandes_types?.length || 0} commandes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900">
                    {modelesCommande.find(m => m.id === selectedTemplateId)?.commandes_types?.length || 0} commande(s) seront créées.
                    Vous devrez ensuite choisir le fournisseur et la date de livraison pour chaque commande.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAppliquerTemplate} disabled={!selectedTemplateId}>
              <Sparkles className="mr-2 h-4 w-4" />
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}