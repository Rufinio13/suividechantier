// src/pages/ControlQualite.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { useReferentielCQ } from '@/context/ReferentielCQContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { ControleQualiteDomaineItem } from '@/components/controle-qualite/ControleQualiteDomaineItem';
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';

export function ControlQualite({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { chantiers } = useChantier();
  
  // ✅ AJOUT: Récupérer les documents du chantier
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
  const [savingModeles, setSavingModeles] = useState({});

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);

  // =========================================
  // INITIALISATION - Charger les résultats existants
  // =========================================
// =========================================
  // INITIALISATION - Charger les résultats existants
  // =========================================
  useEffect(() => {
    console.log('🔍 DEBUG - Initialisation contrôles');
    console.log('controles disponibles:', controles);
    console.log('chantierId:', chantierId);
    console.log('modelesCQ:', modelesCQ);

    const initialResults = {};
    const initialPointsSpecifiques = {};

    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);
    console.log('controlesChantier filtrés:', controlesChantier);

    modelesCQ.forEach(modele => {
      const controleExistant = controlesChantier.find(c => c.modele_cq_id === modele.id);
      console.log(`Modèle ${modele.titre}:`, controleExistant);

      if (controleExistant) {
        console.log('  - resultats:', controleExistant.resultats);
        console.log('  - points_specifiques:', controleExistant.points_specifiques);
      }

      initialResults[modele.id] = controleExistant?.resultats || {};
      initialPointsSpecifiques[modele.id] = controleExistant?.points_specifiques || {};
    });

    console.log('✅ initialResults:', initialResults);
    console.log('✅ initialPointsSpecifiques:', initialPointsSpecifiques);

    setResultatsTousModeles(initialResults);
    setPointsSpecifiquesChantier(initialPointsSpecifiques);
  }, [controles, chantierId, modelesCQ]);

  // =========================================
  // MISE À JOUR D'UN RÉSULTAT LOCALEMENT
  // =========================================
  const handlePointResultatChange = (modeleId, categorieId, sousCategorieId, pointControleId, resultat, explicationNC, photoNC, planIdNC, annotationsNC, dateReprisePrevisionnelle, repriseValidee) => {
    setResultatsTousModeles(prev => ({
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
              photoNC,
              planIdNC,
              annotationsNC,
              dateReprisePrevisionnelle,
              repriseValidee
            }
          }
        }
      }
    }));
  };

  // =========================================
  // VALIDATION + SAVE
  // =========================================
  const validateAndSaveModele = async (modeleId) => {
    const resultatsPourCeModele = resultatsTousModeles[modeleId] || {};
    const pointsSpecifiquesPourCeModele = pointsSpecifiquesChantier[modeleId] || {};

    const modeleStructure = modelesCQ.find(m => m.id === modeleId);
    if (modeleStructure) {
      // Valider les points du modèle
      for (const cat of modeleStructure.categories || []) {
        for (const sc of cat.sousCategories || []) {
          for (const pc of sc.pointsControle || []) {
            const r = resultatsPourCeModele?.[cat.id]?.[sc.id]?.[pc.id];
            if (r && r.resultat === 'NC' && (!r.explicationNC || r.explicationNC.trim() === '')) {
              return { 
                ok: false, 
                message: `Le point "${pc.libelle}" (${cat.nom} > ${sc.nom}) est marqué NC : une explication est requise.` 
              };
            }
          }
        }
      }

      // Valider les points spécifiques
      for (const catId in pointsSpecifiquesPourCeModele) {
        for (const scId in pointsSpecifiquesPourCeModele[catId]) {
          for (const pcId in pointsSpecifiquesPourCeModele[catId][scId]) {
            const r = resultatsPourCeModele?.[catId]?.[scId]?.[pcId];
            if (r && r.resultat === 'NC' && (!r.explicationNC || r.explicationNC.trim() === '')) {
              const lib = pointsSpecifiquesPourCeModele[catId][scId][pcId]?.libelle || 'point spécifique';
              return { 
                ok: false, 
                message: `Le point spécifique "${lib}" est marqué NC : une explication est requise.` 
              };
            }
          }
        }
      }
    }

    // Sauvegarde via le contexte
    try {
      setSavingModeles(prev => ({ ...prev, [modeleId]: true }));
      await saveControleFromModele(chantierId, modeleId, resultatsPourCeModele, pointsSpecifiquesPourCeModele);
      setSavingModeles(prev => ({ ...prev, [modeleId]: false }));
      return { ok: true, message: `Modèle "${modeleStructure?.titre || modeleId}" sauvegardé.` };
    } catch (err) {
      setSavingModeles(prev => ({ ...prev, [modeleId]: false }));
      console.error("Erreur saveControleFromModele:", err);
      return { ok: false, message: err?.message || "Erreur lors de la sauvegarde." };
    }
  };

  const handleSaveModeleResultats = async (modeleId) => {
    const { ok, message } = await validateAndSaveModele(modeleId);
    if (!ok) {
      toast({ title: "Validation", description: message, variant: "destructive", duration: 7000 });
      return;
    }
    toast({ title: "Sauvegarde", description: message });
  };

  const handleSaveAllModelesResultats = async () => {
    let saved = 0;
    let firstError = null;

    for (const modele of modelesCQ) {
      const res = resultatsTousModeles[modele.id] || {};
      const pts = pointsSpecifiquesChantier[modele.id] || {};
      const hasSomething = Object.keys(res).length > 0 || Object.keys(pts).length > 0;
      if (!hasSomething) continue;

      const { ok, message } = await validateAndSaveModele(modele.id);
      if (!ok) {
        firstError = message;
        break;
      } else {
        saved++;
      }
    }

    if (firstError) {
      toast({ title: "Erreur", description: firstError, variant: "destructive", duration: 7000 });
    } else if (saved > 0) {
      toast({ title: "Sauvegarde", description: `${saved} modèle(s) sauvegardé(s).` });
    } else {
      toast({ title: "Aucune modification", description: "Rien à sauvegarder." });
    }
  };

  // =========================================
  // POINTS SPÉCIFIQUES
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
      toast({ title: "Point ajouté", description: `Point "${newPoint.libelle}" ajouté.` });
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
      toast({ title: "Point mis à jour", description: `Point mis à jour.` });
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
        <p className="text-muted-foreground">{chantier?.nom}</p>
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
              Appliquez les points de contrôle de vos modèles. Vous pouvez ajouter des points spécifiques à ce chantier.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className={`space-y-6 ${isEmbedded ? 'p-0 pt-4 sm:p-0' : ''}`}>
          {modelesCQ.length > 0 ? modelesCQ.map(modele => {
            const categoriesAvecPointsSpecifiques = getCombinedPointsControle(modele);
            const isSaving = !!savingModeles[modele.id];

            return (
              <motion.div
                key={modele.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 border rounded-lg bg-white shadow"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-800">{modele.titre}</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveModeleResultats(modele.id)} 
                      variant="outline" 
                      className="bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-700" 
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" /> 
                      {isSaving ? 'Enregistrement...' : 'Sauvegarder ce modèle'}
                    </Button>
                  </div>
                </div>

                {categoriesAvecPointsSpecifiques.map(cat => (
                  <ControleQualiteDomaineItem
                    key={cat.id}
                    domaine={cat}
                    resultatsDomaine={resultatsTousModeles[modele.id]?.[cat.id] || {}}
                    chantierId={chantierId}
                    modeleId={modele.id}
                    onPointResultatChangeForDomaine={(scId, pcId, resultat, explicationNC, photoNC, planIdNC, annotationsNC, dateReprisePrevisionnelle, repriseValidee) => 
                      handlePointResultatChange(modele.id, cat.id, scId, pcId, resultat, explicationNC, photoNC, planIdNC, annotationsNC, dateReprisePrevisionnelle, repriseValidee)
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
            <div className="p-4 text-sm text-muted-foreground text-center">
              Aucun modèle dans le référentiel. <Link to="/parametres" className="underline text-primary">Ajoutez-en via le Référentiel CQ</Link>
            </div>
          )}

          {modelesCQ.length > 0 && (
            <Button onClick={handleSaveAllModelesResultats} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 mt-4">
              <ShieldCheck className="mr-2 h-4 w-4" /> Sauvegarder Tous les Résultats Modifiés
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}