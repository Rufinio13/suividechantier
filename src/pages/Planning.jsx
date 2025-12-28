import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import { TacheFormModal } from '@/components/planning/TacheFormModal.jsx';
import { TacheItem } from '@/components/planning/TacheItem.jsx';
import { GanttChart } from '@/components/planning/GanttChart.jsx';
import { CalendrierView } from '@/components/planning/CalendrierView.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function Planning({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;
  
  console.log("🏗️ Planning - isEmbedded:", isEmbedded, "| embeddedChantierId:", embeddedChantierId, "| params.id:", params.id, "| chantierId final:", chantierId);

  const { toast } = useToast();
  const { chantiers, lots: globalLots, taches, addTache, updateTache, deleteTache, loading, conflictsByChantier } = useChantier();

  const [isAddTacheDialogOpen, setIsAddTacheDialogOpen] = useState(false);
  const [isEditTacheDialogOpen, setIsEditTacheDialogOpen] = useState(false);
  const [selectedTache, setSelectedTache] = useState(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [prefilledDate, setPrefilledDate] = useState(null); // ✅ NOUVEAU : Date pré-remplie

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);

  const chantiersTaches = useMemo(() => {
    return taches
      .filter(t => t.chantierid === chantierId)
      .sort((a, b) => (a.datedebut && b.datedebut ? new Date(a.datedebut) - new Date(b.datedebut) : 0));
  }, [taches, chantierId]);

  const displayedTaches = useMemo(() => (hideCompleted ? chantiersTaches.filter(t => !t.terminee) : chantiersTaches), [chantiersTaches, hideCompleted]);

  const openAddTacheDialog = (date = null) => { // ✅ Accepter date optionnelle
    if (!globalLots.length) {
      toast({
        title: 'Aucun type de lot disponible',
        description: "Veuillez créer des lots dans Paramètres avant d'ajouter des tâches.",
        variant: 'destructive',
        duration: 7000
      });
      return;
    }
    setSelectedTache(null);
    setPrefilledDate(date); // ✅ Sauvegarder la date
    setIsAddTacheDialogOpen(true);
  };

  // ✅ NOUVEAU : Fonction appelée depuis le calendrier
  const handleAddTacheFromCalendar = (dateStr) => {
    console.log('📅 Création tâche depuis calendrier avec date:', dateStr);
    openAddTacheDialog(dateStr);
  };

  const openEditTacheDialog = tache => {
    setSelectedTache(tache);
    setIsEditTacheDialogOpen(true);
  };

  const handleDeleteTache = async (tacheId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      return;
    }

    try {
      await deleteTache(tacheId);
      toast({
        title: "Tâche supprimée ✅",
        description: "La tâche a été supprimée avec succès.",
      });
    } catch (error) {
      console.error("Erreur suppression tâche:", error);
      toast({
        title: "Erreur ❌",
        description: "Impossible de supprimer la tâche.",
        variant: "destructive",
      });
    }
  };

  if (loading && !isEmbedded) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  if (!chantier && !isEmbedded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Chantier non trouvé</h2>
        <p className="text-muted-foreground mb-6">Le chantier que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/chantiers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste des chantiers
          </Link>
        </Button>
      </div>
    );
  }

  const pageHeader = (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 ${isEmbedded ? 'justify-end mb-4' : ''}`}>
      {!isEmbedded && (
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link to={`/chantiers/${chantierId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour au chantier
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Planning du chantier: {chantier?.nomchantier}</h1>
          <p className="text-muted-foreground">Organisez et suivez l'avancement des tâches.</p>
        </div>
      )}
      <Button onClick={openAddTacheDialog} disabled={!globalLots.length} size={isEmbedded ? 'sm' : undefined}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une tâche
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">
        {chantiersTaches.length > 0 && hideCompleted ? 'Toutes les tâches sont terminées !' : 'Aucune tâche pour ce chantier'}
      </h3>
      <p className="text-muted-foreground mt-1 mb-4">
        {chantiersTaches.length > 0 && hideCompleted
          ? 'Décochez le filtre pour voir les tâches terminées.'
          : !globalLots.length
          ? "Veuillez d'abord ajouter des types de lots via Paramètres."
          : 'Commencez par ajouter des tâches à ce chantier.'}
      </p>
      {globalLots.length > 0 && (
        <Button onClick={openAddTacheDialog}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une tâche
        </Button>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      {!globalLots.length && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md"
        >
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-700" />
            <div className="ml-3 text-sm text-yellow-700">
              Aucun type de lot n'est défini.{' '}
              <Link to="/parametres" className="font-medium underline text-yellow-800 hover:text-yellow-900">
                Ajouter des lots via Paramètres
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="listes" className="w-full">
        <TabsList className={`grid w-full ${isEmbedded ? 'grid-cols-3 md:w-full' : 'grid-cols-3 md:w-[500px]'}`}>
          <TabsTrigger value="listes">Tâches</TabsTrigger>
          <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="listes">
          <Card className="mt-4 shadow-none border-0 sm:border sm:shadow-sm">
            {!isEmbedded && (
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">Liste des Tâches</CardTitle>
              </CardHeader>
            )}
            <CardContent className={isEmbedded ? 'p-0 pt-4 sm:p-6' : ''}>
              {chantiersTaches.length > 0 && (
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox id="hide-completed" checked={hideCompleted} onCheckedChange={setHideCompleted} />
                  <Label htmlFor="hide-completed" className="cursor-pointer">
                    Masquer les tâches terminées
                  </Label>
                </div>
              )}
              {displayedTaches.length > 0 ? (
                <div className="space-y-4">
                  {displayedTaches.map(tache => (
                    <TacheItem
                      key={tache.id}
                      tache={tache}
                      lots={globalLots}
                      onEdit={() => openEditTacheDialog(tache)}
                      onDelete={() => handleDeleteTache(tache.id)}
                      conflicts={conflictsByChantier}
                    />
                  ))}
                </div>
              ) : (
                renderEmptyState()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendrier">
          <Card className="mt-4 shadow-none border-0 sm:border sm:shadow-sm">
            {!isEmbedded && (
              <CardHeader>
                <CardTitle>Vue Calendrier</CardTitle>
              </CardHeader>
            )}
            <CardContent className={isEmbedded ? 'p-0 pt-4 sm:p-6' : ''}>
              {chantiersTaches.length > 0 ? (
                <CalendrierView 
                  taches={chantiersTaches} 
                  lots={globalLots} 
                  conflictsByChantier={conflictsByChantier}
                  onEditTache={openEditTacheDialog}
                  onAddTache={handleAddTacheFromCalendar}
                />
              ) : (
                renderEmptyState()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt">
          <Card className="mt-4 shadow-none border-0 sm:border sm:shadow-sm">
            {!isEmbedded && (
              <CardHeader>
                <CardTitle>Diagramme de Gantt du Chantier</CardTitle>
              </CardHeader>
            )}
            <CardContent className={isEmbedded ? 'p-0 pt-4 sm:p-6' : ''}>
              <GanttChart 
                taches={taches} 
                chantierId={chantierId} 
                onEditTache={openEditTacheDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(isAddTacheDialogOpen || isEditTacheDialogOpen) && globalLots.length > 0 && (
        <TacheFormModal
          isOpen={isAddTacheDialogOpen || isEditTacheDialogOpen}
          onClose={() => {
            setIsAddTacheDialogOpen(false);
            setIsEditTacheDialogOpen(false);
            setPrefilledDate(null); // ✅ Reset date
          }}
          tache={selectedTache}
          chantierId={chantierId}
          lots={globalLots}
          addTache={addTache}
          updateTache={updateTache}
          conflictsByChantier={conflictsByChantier}
          prefilledDate={prefilledDate} // ✅ NOUVEAU
        />
      )}
    </div>
  );
}