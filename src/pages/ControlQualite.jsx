import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Search, ShieldAlert, ShieldCheck, Save } from 'lucide-react';
// import { ControleQualiteFormModal } from '@/components/controle-qualite/ControleQualiteFormModal'; // Retiré
// import { ControleQualiteAdHocItem } from '@/components/controle-qualite/ControleQualiteListItem'; // Retiré
import { ControleQualiteDomaineItem } from '@/components/controle-qualite/ControleQualiteDomaineItem';
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';


export function ControlQualite({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { 
    chantiers, 
    controles: allControles, 
    modelesCQ, 
    saveControleFromModele,
    updatePointControleChantierSpecific, // Nouvelle fonction du contexte
    addPointControleChantierSpecific,    // Nouvelle fonction du contexte
    deletePointControleChantierSpecific, // Nouvelle fonction du contexte
    // updateNomCategorieChantierSpecific, // Nouvelle fonction du contexte
    loading 
  } = useChantier();
  const { toast } = useToast();
  
  const [resultatsTousModeles, setResultatsTousModeles] = useState({});
  // const [searchTerm, setSearchTerm] = useState(''); // Retiré car plus de contrôles ad-hoc listés

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);
  
  // Structure des points de contrôle spécifiques au chantier
  const [pointsSpecifiquesChantier, setPointsSpecifiquesChantier] = useState({});


  useEffect(() => {
    const initialResults = {};
    const initialPointsSpecifiques = {};

    const controlesModelePourCeChantier = allControles.filter(
      c => c.chantierId === chantierId && c.type === 'modele' && c.modeleCQId
    );

    modelesCQ.forEach(modele => {
      const controleExistant = controlesModelePourCeChantier.find(c => c.modeleCQId === modele.id);
      initialResults[modele.id] = controleExistant ? controleExistant.resultats || {} : {};
      initialPointsSpecifiques[modele.id] = controleExistant ? controleExistant.pointsSpecifiques || {} : {};
    });
    setResultatsTousModeles(initialResults);
    setPointsSpecifiquesChantier(initialPointsSpecifiques);
  }, [allControles, chantierId, modelesCQ, loading]);


  const handlePointResultatChange = (modeleId, domaineId, sousCategorieId, pointControleId, resultat, explicationNC = '', photoNC = '', planIdNC = '', annotationsNC = '', dateReprisePrevisionnelle = '', repriseValidee = false) => {
    setResultatsTousModeles(prev => ({
      ...prev,
      [modeleId]: {
        ...(prev[modeleId] || {}),
        [domaineId]: {
          ...(prev[modeleId]?.[domaineId] || {}),
          [sousCategorieId]: {
            ...(prev[modeleId]?.[domaineId]?.[sousCategorieId] || {}),
            [pointControleId]: {
              resultat,
              explicationNC: resultat === 'NC' ? explicationNC : '',
              photoNC: resultat === 'NC' ? photoNC : '',
              planIdNC: resultat === 'NC' ? planIdNC : '',
              annotationsNC: resultat === 'NC' ? annotationsNC : '',
              dateReprisePrevisionnelle: resultat === 'NC' ? dateReprisePrevisionnelle : '',
              repriseValidee: resultat === 'NC' ? repriseValidee : false,
            }
          }
        }
      }
    }));
  };

  const validateAndSaveModele = (modeleId, resultatsPourCeModele, pointsSpecifiquesPourCeModele) => {
    if ((!resultatsPourCeModele || Object.keys(resultatsPourCeModele).length === 0) && 
        (!pointsSpecifiquesPourCeModele || Object.keys(pointsSpecifiquesPourCeModele).length === 0)) {
        return { isValid: true, message: "Aucun résultat ou point spécifique à sauvegarder pour ce modèle." };
    }

    const modeleStructure = modelesCQ.find(m => m.id === modeleId);
    if (modeleStructure) {
        // Validation pour les points du modèle
        for (const dom of modeleStructure.domaines) {
            for (const sc of dom.sousCategories) {
                for (const pc of sc.pointsControle) {
                    const resultatPoint = resultatsPourCeModele?.[dom.id]?.[sc.id]?.[pc.id];
                    if (resultatPoint && resultatPoint.resultat === 'NC' && !resultatPoint.explicationNC) {
                        return { 
                            isValid: false, 
                            message: `Veuillez fournir une explication pour le point "${pc.libelle}" (Modèle: ${modeleStructure.titre} > ${dom.nom} > ${sc.nom}) marqué Non Conforme.` 
                        };
                    }
                }
            }
        }
        // Validation pour les points spécifiques au chantier
        if (pointsSpecifiquesPourCeModele) {
            for (const domId in pointsSpecifiquesPourCeModele) {
                for (const scId in pointsSpecifiquesPourCeModele[domId]) {
                    for (const pcId in pointsSpecifiquesPourCeModele[domId][scId]) {
                        const pointSpecifique = pointsSpecifiquesPourCeModele[domId][scId][pcId];
                        const resultatPoint = resultatsPourCeModele?.[domId]?.[scId]?.[pcId]; // Les résultats des points spécifiques sont aussi dans resultatsPourCeModele
                        if (resultatPoint && resultatPoint.resultat === 'NC' && !resultatPoint.explicationNC) {
                             return { 
                                isValid: false, 
                                message: `Veuillez fournir une explication pour le point spécifique "${pointSpecifique.libelle}" marqué Non Conforme.` 
                            };
                        }
                    }
                }
            }
        }
    }
    saveControleFromModele(chantierId, modeleId, resultatsPourCeModele, pointsSpecifiquesPourCeModele);
    return { isValid: true, message: `Résultats et points spécifiques du modèle "${modeleStructure.titre}" sauvegardés.` };
  };

  const handleSaveModeleResultats = (modeleId) => {
    const resultatsPourCeModele = resultatsTousModeles[modeleId];
    const pointsSpecifiquesPourCeModele = pointsSpecifiquesChantier[modeleId];
    const { isValid, message } = validateAndSaveModele(modeleId, resultatsPourCeModele, pointsSpecifiquesPourCeModele);
    if (!isValid) {
        toast({ title: "Validation échouée", description: message, variant: "destructive", duration: 7000 });
    } else {
        if (message.startsWith("Aucun résultat")) {
            toast({ title: "Information", description: message, variant: "default" });
        }
    }
  };
  
  const handleSaveAllModelesResultats = () => {
    let countSaved = 0;
    let firstErrorMessage = "";

    for (const modele of modelesCQ) {
        const resultatsPourCeModele = resultatsTousModeles[modele.id];
        const pointsSpecifiquesPourCeModele = pointsSpecifiquesChantier[modele.id];
        if ((resultatsPourCeModele && Object.keys(resultatsPourCeModele).length > 0) ||
            (pointsSpecifiquesPourCeModele && Object.keys(pointsSpecifiquesPourCeModele).length > 0)) {
            const { isValid, message } = validateAndSaveModele(modele.id, resultatsPourCeModele, pointsSpecifiquesPourCeModele);
            if (!isValid) {
                if (!firstErrorMessage) firstErrorMessage = message;
            } else if (!message.startsWith("Aucun résultat")){
                countSaved++;
            }
        }
    }

    if (firstErrorMessage) {
        toast({ title: "Validation échouée", description: firstErrorMessage, variant: "destructive", duration: 7000 });
    } else if (countSaved > 0) {
        toast({ title: "Sauvegarde Réussie", description: `${countSaved} modèle(s) de contrôle qualité ont été mis à jour.`});
    } else {
        toast({ title: "Aucune modification", description: "Aucun résultat ou point spécifique à sauvegarder pour les modèles.", variant: "default" });
    }
  };

  const handleAddPointControle = useCallback((modeleId, domaineId, sousCategorieId, pointData) => {
    const newPointId = uuidv4();
    const newPoint = { ...pointData, id: newPointId, isChantierSpecific: true };

    setPointsSpecifiquesChantier(prev => {
        const newPointsModele = { ...(prev[modeleId] || {}) };
        if (!newPointsModele[domaineId]) newPointsModele[domaineId] = {};
        if (!newPointsModele[domaineId][sousCategorieId || '_global']) newPointsModele[domaineId][sousCategorieId || '_global'] = {};
        
        newPointsModele[domaineId][sousCategorieId || '_global'][newPointId] = newPoint;
        return { ...prev, [modeleId]: newPointsModele };
    });
    addPointControleChantierSpecific(chantierId, modeleId, domaineId, sousCategorieId, newPoint);
    toast({ title: "Point de contrôle ajouté", description: `Le point "${newPoint.libelle}" a été ajouté au chantier.` });
  }, [chantierId, addPointControleChantierSpecific, toast]);

  const handleUpdatePointControle = useCallback((modeleId, domaineId, sousCategorieId, pointId, pointData) => {
    setPointsSpecifiquesChantier(prev => {
        const newPointsModele = { ...(prev[modeleId] || {}) };
        if (newPointsModele[domaineId]?.[sousCategorieId || '_global']?.[pointId]) {
            newPointsModele[domaineId][sousCategorieId || '_global'][pointId] = { 
                ...newPointsModele[domaineId][sousCategorieId || '_global'][pointId], 
                ...pointData 
            };
        }
        return { ...prev, [modeleId]: newPointsModele };
    });
    updatePointControleChantierSpecific(chantierId, modeleId, domaineId, sousCategorieId, pointId, pointData);
    toast({ title: "Point de contrôle mis à jour", description: `Le point "${pointData.libelle}" a été mis à jour.` });
  }, [chantierId, updatePointControleChantierSpecific, toast]);

  const handleDeletePointControle = useCallback((modeleId, domaineId, sousCategorieId, pointId) => {
    setPointsSpecifiquesChantier(prev => {
        const newPointsModele = { ...(prev[modeleId] || {}) };
        if (newPointsModele[domaineId]?.[sousCategorieId || '_global']?.[pointId]) {
            delete newPointsModele[domaineId][sousCategorieId || '_global'][pointId];
        }
        return { ...prev, [modeleId]: newPointsModele };
    });
    deletePointControleChantierSpecific(chantierId, modeleId, domaineId, sousCategorieId, pointId);
    toast({ title: "Point de contrôle supprimé", description: "Le point de contrôle spécifique au chantier a été supprimé." });
  }, [chantierId, deletePointControleChantierSpecific, toast]);

//   const handleUpdateNomCategorie = useCallback((modeleId, domaineId, sousCategorieId, nouveauNom) => {
//       // Cette fonction mettrait à jour le nom dans pointsSpecifiquesChantier si nécessaire
//       // et appellerait updateNomCategorieChantierSpecific
//       console.log("Mise à jour nom catégorie/domaine:", modeleId, domaineId, sousCategorieId, nouveauNom);
//       // updateNomCategorieChantierSpecific(chantierId, modeleId, domaineId, sousCategorieId, nouveauNom);
//       toast({ title: "Nom de catégorie mis à jour", description: `Le nom a été changé en "${nouveauNom}".` });
//   }, [chantierId, /*updateNomCategorieChantierSpecific,*/ toast]);


  if (loading && !isEmbedded) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }
  if (!chantier && !isEmbedded) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
        <Button asChild className="mt-4"><Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>
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
      {/* Bouton Contrôle Ad-Hoc retiré */}
    </div>
  ) : null; // Pas de header si embarqué, ou un header minimal si besoin

  const getCombinedPointsControle = (modele) => {
    const combinedDomaines = JSON.parse(JSON.stringify(modele.domaines)); // Deep copy
    const pointsSpecifiquesModele = pointsSpecifiquesChantier[modele.id] || {};

    combinedDomaines.forEach(dom => {
        // Points spécifiques au niveau du domaine (sans sous-catégorie)
        const pointsDomaineGlobal = pointsSpecifiquesModele[dom.id]?.['_global'] || {};
        if (!dom.sousCategories.find(sc => sc.id === '_global_domaine_points')) { // Eviter doublons si on recharge
            if (Object.keys(pointsDomaineGlobal).length > 0) {
                 dom.sousCategories.unshift({ 
                    id: '_global_domaine_points', 
                    nom: `Points spécifiques (Domaine: ${dom.nom})`, 
                    pointsControle: Object.values(pointsDomaineGlobal),
                    isChantierSpecificContainer: true 
                });
            }
        }


        dom.sousCategories.forEach(sc => {
            const pointsSpecifiquesSC = pointsSpecifiquesModele[dom.id]?.[sc.id] || {};
            sc.pointsControle = [...(sc.pointsControle || []), ...Object.values(pointsSpecifiquesSC)];
        });
    });
    return combinedDomaines;
  };


  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      <Card className={`bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 shadow-lg ${isEmbedded ? 'shadow-none border-0' : ''}`}>
        {!isEmbedded && (
          <CardHeader>
            <CardTitle className="text-xl">Référentiel de Contrôle Qualité Global</CardTitle>
            <CardDescription>
              Appliquez les points de contrôle de vos modèles. Vous pouvez ajouter des points spécifiques à ce chantier directement dans les catégories ou sous-catégories.
              Les noms des catégories/domaines des modèles se modifient dans le Référentiel CQ (Paramètres).
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className={`space-y-6 ${isEmbedded ? 'p-0 pt-4 sm:p-0' : ''}`}>
          {modelesCQ.length > 0 ? modelesCQ.map(modele => {
            const domainesAvecPointsSpecifiques = getCombinedPointsControle(modele);
            return (
            <motion.div 
                key={modele.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 border rounded-lg bg-white shadow"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">{modele.titre}</h3>
                <Button size="sm" onClick={() => handleSaveModeleResultats(modele.id)} variant="outline" className="bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-700">
                    <Save className="mr-2 h-4 w-4" /> Sauvegarder ce modèle
                </Button>
              </div>
              {domainesAvecPointsSpecifiques.map(dom => (
                 <ControleQualiteDomaineItem
                    key={dom.id}
                    domaine={dom}
                    resultatsDomaine={resultatsTousModeles[modele.id]?.[dom.id] || {}}
                    chantierId={chantierId}
                    modeleId={modele.id}
                    onPointResultatChangeForDomaine={(scId, pcId, res, expl, photo, planId, annotations, dateRepPrev, repValidee) => handlePointResultatChange(modele.id, dom.id, scId, pcId, res, expl, photo, planId, annotations, dateRepPrev, repValidee)}
                    pointsControleStructure={dom.sousCategories.reduce((acc, sc) => {
                        acc[sc.id] = { pointsControle: sc.pointsControle };
                        return acc;
                    }, {})}
                    onAddPointControle={handleAddPointControle}
                    onUpdatePointControle={handleUpdatePointControle}
                    onDeletePointControle={handleDeletePointControle}
                    // onUpdateNomCategorie={handleUpdateNomCategorie}
                  />
              ))}
              {domainesAvecPointsSpecifiques.length === 0 && (
                  <p className="text-sm text-slate-500 italic">Ce modèle ne contient aucun domaine.</p>
               )}
            </motion.div>
          )}) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Aucun modèle dans le référentiel. <Link to="/parametres" className="underline text-primary">Ajoutez-en via l'onglet Référentiel CQ dans les Paramètres pour commencer.</Link>
            </div>
          )}
          {modelesCQ.length > 0 && (
            <Button onClick={handleSaveAllModelesResultats} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 mt-4">
                <ShieldCheck className="mr-2 h-4 w-4" /> Sauvegarder Tous les Résultats Modifiés
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Section des contrôles Ad-Hoc retirée */}
    </div>
  );
}