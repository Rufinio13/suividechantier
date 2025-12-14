// src/pages/ControlQualite.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useReferentielCQ } from '@/context/ReferentielCQContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { ControleQualiteDomaineItem } from '@/components/controle-qualite/ControleQualiteDomaineItem.jsx';
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';

export function ControlQualite({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { chantiers } = useChantier();
  const { documents = [] } = useChantier();
  
  const {
    modelesCQ,
    controles,
    saveControleFromModele,
    addPointControleChantierSpecific,
    updatePointControleChantierSpecific,
    deletePointControleChantierSpecific,
    loading
  } = useReferentielCQ();

  const { toast } = useToast();

  const [resultatsTousModeles, setResultatsTousModeles] = useState({});
  const [pointsSpecifiquesChantier, setPointsSpecifiquesChantier] = useState({});
  const [isReferentielModalOpen, setIsReferentielModalOpen] = useState(false);
  const [selectedReferentielId, setSelectedReferentielId] = useState('');

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);

  // Récupérer les modèles appliqués à ce chantier
  const modelesAppliques = useMemo(() => {
    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);
    const modeleIdsAppliques = new Set(controlesChantier.map(c => c.modele_cq_id));
    return modelesCQ.filter(m => modeleIdsAppliques.has(m.id));
  }, [controles, chantierId, modelesCQ]);

  // Récupérer les modèles disponibles (non encore appliqués)
  const modelesDisponibles = useMemo(() => {
    const modeleIdsAppliques = new Set(modelesAppliques.map(m => m.id));
    return modelesCQ.filter(m => !modeleIdsAppliques.has(m.id));
  }, [modelesCQ, modelesAppliques]);

  // =========================================
  // INITIALISATION - Charger les résultats existants (UNE SEULE FOIS)
  // =========================================
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) return; // ✅ Ne charger qu'une seule fois
    
    const initialResults = {};
    const initialPointsSpecifiques = {};

    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);

    modelesAppliques.forEach(modele => {
      const controleExistant = controlesChantier.find(c => c.modele_cq_id === modele.id);
      initialResults[modele.id] = controleExistant?.resultats || {};
      initialPointsSpecifiques[modele.id] = controleExistant?.points_specifiques || {};
    });

    setResultatsTousModeles(initialResults);
    setPointsSpecifiquesChantier(initialPointsSpecifiques);
    setIsInitialized(true);
  }, [controles, chantierId, modelesAppliques, isInitialized]);

  // =========================================
  // SAUVEGARDE AUTOMATIQUE
  // =========================================
  const autoSaveTimeoutRef = React.useRef(null);
  
  const autoSave = useCallback(async (modeleId, newResultats, newPointsSpecifiques) => {
    try {
      console.log('💾 Démarrage sauvegarde auto pour modèle:', modeleId);
      await saveControleFromModele(chantierId, modeleId, newResultats, newPointsSpecifiques);
      console.log('✅ Sauvegarde auto réussie');
    } catch (err) {
      console.error("❌ Erreur sauvegarde auto:", err);
      toast({ 
        title: "Erreur de sauvegarde", 
        description: err?.message || "Impossible de sauvegarder automatiquement.", 
        variant: "destructive" 
      });
    }
  }, [chantierId, saveControleFromModele, toast]);

  // =========================================
  // APPLIQUER UN RÉFÉRENTIEL
  // =========================================
  const handleAppliquerReferentiel = async () => {
    if (!selectedReferentielId) {
      alert('Veuillez sélectionner un référentiel');
      return;
    }

    const referentiel = modelesCQ.find(m => m.id === selectedReferentielId);
    if (!referentiel) {
      alert('Référentiel introuvable');
      return;
    }

    try {
      await saveControleFromModele(chantierId, selectedReferentielId, {}, {});
      
      toast({ 
        title: "Référentiel appliqué", 
        description: `Le référentiel "${referentiel.titre}" a été appliqué au chantier.` 
      });
      
      setIsReferentielModalOpen(false);
      setSelectedReferentielId('');
    } catch (error) {
      console.error('❌ Erreur lors de l\'application du référentiel:', error);
      toast({ 
        title: "Erreur", 
        description: error?.message || "Impossible d'appliquer le référentiel.", 
        variant: "destructive" 
      });
    }
  };

  // =========================================
  // MISE À JOUR D'UN RÉSULTAT + SAUVEGARDE AUTO
  // =========================================
  const handlePointResultatChange = (modeleId, categorieId, sousCategorieId, pointControleId, resultat, explicationNC, photos, plans, annotationsNC, dateReprisePrevisionnelle, repriseValidee) => {
    setResultatsTousModeles(prev => {
      const updated = {
        ...prev,
        [modeleId]: {
          ...(prev[modeleId] || {}),
          [categorieId]: {
            ...(prev[modeleId]?.[categorieId] || {}),
            [sousCategorieId]: {
              ...(prev[modeleId]?.[categorieId]?.[sousCategorieId] || {}),
              [pointControleId]: {
                resultat,
                explicationNC,
                photos, // ✅ CORRIGÉ : photos au lieu de photoNC
                plans, // ✅ CORRIGÉ : plans au lieu de planIdNC
                annotationsNC,
                dateReprisePrevisionnelle,
                repriseValidee
              }
            }
          }
        }
      };
      
      // ✅ Annuler le timeout précédent
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // ✅ Sauvegarder après 1 seconde d'inactivité
      autoSaveTimeoutRef.current = setTimeout(() => {
        const resultatsPourCeModele = updated[modeleId] || {};
        const pointsSpecifiquesPourCeModele = pointsSpecifiquesChantier[modeleId] || {};
        autoSave(modeleId, resultatsPourCeModele, pointsSpecifiquesPourCeModele);
      }, 1000);
      
      return updated;
    });
  };

  // =========================================
  // POINTS SPÉCIFIQUES + SAUVEGARDE AUTO
  // =========================================
  const handleAddPointControle = useCallback(async (modeleId, categorieId, sousCategorieId, pointData) => {
    const newId = uuidv4();
    const newPoint = { id: newId, ...pointData, isChantierSpecific: true };

    setPointsSpecifiquesChantier(prev => {
      const next = { ...(prev[modeleId] || {}) };
      if (!next[categorieId]) next[categorieId] = {};
      const scKey = sousCategorieId || '_global';
      if (!next[categorieId][scKey]) next[categorieId][scKey] = {};
      next[categorieId][scKey][newId] = newPoint;
      return { ...prev, [modeleId]: next };
    });

    try {
      await addPointControleChantierSpecific(chantierId, modeleId, categorieId, sousCategorieId, newPoint);
      toast({ title: "Point ajouté", description: `Point "${newPoint.libelle}" ajouté et sauvegardé.` });
    } catch (err) {
      console.error("Erreur addPointControleChantierSpecific:", err);
      toast({ title: "Erreur", description: "Impossible d'ajouter le point spécifique.", variant: "destructive" });
    }
  }, [chantierId, addPointControleChantierSpecific, toast]);

  const handleUpdatePointControle = useCallback(async (modeleId, categorieId, sousCategorieId, pointId, updates) => {
    setPointsSpecifiquesChantier(prev => {
      const next = { ...(prev[modeleId] || {}) };
      const scKey = sousCategorieId || '_global';
      if (next[categorieId]?.[scKey]?.[pointId]) {
        next[categorieId][scKey][pointId] = { ...next[categorieId][scKey][pointId], ...updates };
      }
      return { ...prev, [modeleId]: next };
    });

    try {
      await updatePointControleChantierSpecific(chantierId, modeleId, categorieId, sousCategorieId, pointId, updates);
      toast({ title: "Point mis à jour", description: `Point mis à jour et sauvegardé.` });
    } catch (err) {
      console.error("Erreur updatePointControleChantierSpecific:", err);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le point.", variant: "destructive" });
    }
  }, [chantierId, updatePointControleChantierSpecific, toast]);

  const handleDeletePointControle = useCallback(async (modeleId, categorieId, sousCategorieId, pointId) => {
    setPointsSpecifiquesChantier(prev => {
      const next = { ...(prev[modeleId] || {}) };
      const scKey = sousCategorieId || '_global';
      if (next[categorieId]?.[scKey]?.[pointId]) {
        delete next[categorieId][scKey][pointId];
      }
      return { ...prev, [modeleId]: next };
    });

    try {
      await deletePointControleChantierSpecific(chantierId, modeleId, categorieId, sousCategorieId, pointId);
      toast({ title: "Point supprimé", description: "Point spécifique supprimé." });
    } catch (err) {
      console.error("Erreur deletePointControleChantierSpecific:", err);
      toast({ title: "Erreur", description: "Impossible de supprimer le point.", variant: "destructive" });
    }
  }, [chantierId, deletePointControleChantierSpecific, toast]);

  // =========================================
  // COMBINER MODÈLE + POINTS SPÉCIFIQUES
  // =========================================
  const getCombinedPointsControle = (modele) => {
    const combinedCategories = JSON.parse(JSON.stringify(modele.categories || []));
    const pointsSpecifiqueModele = pointsSpecifiquesChantier[modele.id] || {};

    combinedCategories.forEach(cat => {
      const categorieGlobalPoints = pointsSpecifiqueModele[cat.id]?.['_global'] || {};
      if (Object.keys(categorieGlobalPoints).length > 0) {
        if (!cat.sousCategories.some(sc => sc.id === '_global_categorie_points')) {
          cat.sousCategories.unshift({
            id: '_global_categorie_points',
            nom: `Points spécifiques (Catégorie: ${cat.nom})`,
            pointsControle: Object.values(categorieGlobalPoints),
            isChantierSpecificContainer: true
          });
        }
      }
      cat.sousCategories.forEach(sc => {
        const spec = pointsSpecifiqueModele[cat.id]?.[sc.id] || {};
        sc.pointsControle = [...(sc.pointsControle || []), ...Object.values(spec)];
      });
    });

    return combinedCategories;
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
        <h1 className="text-3xl font-bold">Contrôle Qualité du Chantier</h1>
        <p className="text-muted-foreground">{chantier?.nomchantier}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      <Card className={`bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 shadow-lg ${isEmbedded ? 'shadow-none border-0' : ''}`}>
        {!isEmbedded && (
          <CardHeader>
            <CardTitle className="text-xl">Référentiel de Contrôle Qualité</CardTitle>
            <CardDescription>
              Les modifications sont sauvegardées automatiquement. Vous pouvez ajouter des points spécifiques à ce chantier.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className={`space-y-6 ${isEmbedded ? 'p-0 pt-4 sm:p-0' : ''}`}>
          
          {/* Bouton Appliquer Référentiel */}
          {modelesDisponibles.length > 0 && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setIsReferentielModalOpen(true)}
                variant="outline"
                className="bg-purple-50 border-purple-300 hover:bg-purple-100"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Appliquer un référentiel
              </Button>
            </div>
          )}

          {/* Liste des modèles appliqués */}
          <AnimatePresence>
            {modelesAppliques.length > 0 ? modelesAppliques.map(modele => {
              const categoriesAvecPointsSpecifiques = getCombinedPointsControle(modele);

              return (
                <motion.div
                  key={modele.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-3 p-4 border rounded-lg bg-white shadow"
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">{modele.titre}</h3>

                  {categoriesAvecPointsSpecifiques.map(cat => (
                    <ControleQualiteDomaineItem
                      key={cat.id}
                      domaine={cat}
                      resultatsDomaine={resultatsTousModeles[modele.id]?.[cat.id] || {}}
                      chantierId={chantierId}
                      modeleId={modele.id}
                      onPointResultatChangeForDomaine={(scId, pcId, resultat, explicationNC, photos, plans, annotationsNC, dateReprisePrevisionnelle, repriseValidee) => 
                        handlePointResultatChange(modele.id, cat.id, scId, pcId, resultat, explicationNC, photos, plans, annotationsNC, dateReprisePrevisionnelle, repriseValidee)
                      }
                      pointsControleStructure={cat.sousCategories.reduce((acc, sc) => {
                        acc[sc.id] = { pointsControle: sc.pointsControle };
                        return acc;
                      }, {})}
                      onAddPointControle={handleAddPointControle}
                      onUpdatePointControle={handleUpdatePointControle}
                      onDeletePointControle={handleDeletePointControle}
                      documents={documents}
                    />
                  ))}

                  {categoriesAvecPointsSpecifiques.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Ce modèle ne contient aucune catégorie.</p>
                  )}
                </motion.div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Aucun référentiel appliqué</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {modelesDisponibles.length > 0 
                    ? "Commencez par appliquer un référentiel de contrôle qualité à ce chantier."
                    : "Aucun référentiel disponible. Créez-en dans le Référentiel CQ."}
                </p>
                {modelesDisponibles.length > 0 && (
                  <Button onClick={() => setIsReferentielModalOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Appliquer un référentiel
                  </Button>
                )}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Modal Appliquer Référentiel */}
      <Dialog open={isReferentielModalOpen} onOpenChange={setIsReferentielModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
              Appliquer un référentiel CQ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Sélectionnez un référentiel de contrôle qualité pour l'appliquer à ce chantier.
              </p>
              
              <Select value={selectedReferentielId} onValueChange={setSelectedReferentielId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un référentiel..." />
                </SelectTrigger>
                <SelectContent>
                  {modelesDisponibles.map(modele => (
                    <SelectItem key={modele.id} value={modele.id}>
                      {modele.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReferentielId && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900">
                    Le référentiel sera appliqué au chantier et vous pourrez commencer à remplir les points de contrôle.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferentielModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAppliquerReferentiel} disabled={!selectedReferentielId}>
              <Sparkles className="mr-2 h-4 w-4" />
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}