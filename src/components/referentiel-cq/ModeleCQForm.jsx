import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function ModeleCQForm({ modele, addModeleCQ, updateModeleCQ, nomsociete, isOpen, onClose }) {
  const [titreModele, setTitreModele] = useState('');
  const [categories, setCategories] = useState([]);
  
  // ✅ États pour gérer l'ouverture/fermeture des accordéons
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSousCategories, setExpandedSousCategories] = useState(new Set());
  const [expandedPoints, setExpandedPoints] = useState(new Set());

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  useEffect(() => {
    if (modele) {
      setTitreModele(modele.titre || '');

      if (Array.isArray(modele.categories)) {
        setCategories(deepClone(modele.categories));
      } else {
        setCategories([]);
      }

    } else {
      setTitreModele('');
      setCategories([
        {
          id: uuidv4(),
          nom: '',
          sousCategories: [
            {
              id: uuidv4(),
              nom: '',
              pointsControle: [
                { id: uuidv4(), libelle: '', description: '' }
              ]
            }
          ]
        }
      ]);
    }
    
    // Réinitialiser les états d'expansion
    setExpandedCategories(new Set());
    setExpandedSousCategories(new Set());
    setExpandedPoints(new Set());
  }, [modele, isOpen]);

  // ✅ Fonctions pour gérer l'expansion
  const toggleCategorie = (categorieId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categorieId)) {
        newSet.delete(categorieId);
      } else {
        newSet.add(categorieId);
      }
      return newSet;
    });
  };

  const toggleSousCategorie = (sousCategorieId) => {
    setExpandedSousCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sousCategorieId)) {
        newSet.delete(sousCategorieId);
      } else {
        newSet.add(sousCategorieId);
      }
      return newSet;
    });
  };

  const togglePoint = (pointId) => {
    setExpandedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  };

  // ✅ DÉPLACER UNE CATÉGORIE
  const moveCategorie = (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    setCategories(newCategories);
  };

  // ✅ DÉPLACER UNE SOUS-CATÉGORIE
  const moveSousCategorie = (categorieId, scIndex, direction) => {
    setCategories(
      categories.map((categorie) => {
        if (categorie.id !== categorieId) return categorie;
        
        const newSousCategories = [...categorie.sousCategories];
        const targetIndex = direction === 'up' ? scIndex - 1 : scIndex + 1;
        
        if (targetIndex < 0 || targetIndex >= newSousCategories.length) return categorie;
        
        [newSousCategories[scIndex], newSousCategories[targetIndex]] = 
          [newSousCategories[targetIndex], newSousCategories[scIndex]];
        
        return { ...categorie, sousCategories: newSousCategories };
      })
    );
  };

  // ✅ DÉPLACER UN POINT DE CONTRÔLE
  const movePointControle = (categorieId, sousCategorieId, pcIndex, direction) => {
    setCategories(
      categories.map((categorie) => {
        if (categorie.id !== categorieId) return categorie;
        
        return {
          ...categorie,
          sousCategories: categorie.sousCategories.map((sc) => {
            if (sc.id !== sousCategorieId) return sc;
            
            const newPointsControle = [...sc.pointsControle];
            const targetIndex = direction === 'up' ? pcIndex - 1 : pcIndex + 1;
            
            if (targetIndex < 0 || targetIndex >= newPointsControle.length) return sc;
            
            [newPointsControle[pcIndex], newPointsControle[targetIndex]] = 
              [newPointsControle[targetIndex], newPointsControle[pcIndex]];
            
            return { ...sc, pointsControle: newPointsControle };
          })
        };
      })
    );
  };

  const ajouterCategorie = () => {
    const newId = uuidv4();
    setCategories([
      ...categories,
      {
        id: newId,
        nom: '',
        sousCategories: [
          {
            id: uuidv4(),
            nom: '',
            pointsControle: [
              { id: uuidv4(), libelle: '', description: '' }
            ]
          }
        ]
      }
    ]);
    // Ouvrir automatiquement la nouvelle catégorie
    setExpandedCategories(prev => new Set([...prev, newId]));
  };

  const supprimerCategorie = (categorieId) => {
    setCategories(categories.filter((c) => c.id !== categorieId));
    // Retirer des états d'expansion
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categorieId);
      return newSet;
    });
  };

  const ajouterSousCategorie = (categorieId) => {
    const newScId = uuidv4();
    setCategories(
      categories.map((categorie) =>
        categorie.id === categorieId
          ? {
              ...categorie,
              sousCategories: [
                ...categorie.sousCategories,
                {
                  id: newScId,
                  nom: '',
                  pointsControle: [
                    { id: uuidv4(), libelle: '', description: '' }
                  ]
                }
              ]
            }
          : categorie
      )
    );
    // Ouvrir automatiquement la nouvelle sous-catégorie
    setExpandedSousCategories(prev => new Set([...prev, newScId]));
  };

  const supprimerSousCategorie = (categorieId, sousCategorieId) => {
    setCategories(
      categories.map((categorie) =>
        categorie.id === categorieId
          ? {
              ...categorie,
              sousCategories: categorie.sousCategories.filter(
                (sc) => sc.id !== sousCategorieId
              )
            }
          : categorie
      )
    );
    // Retirer des états d'expansion
    setExpandedSousCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(sousCategorieId);
      return newSet;
    });
  };

  const ajouterPointControle = (categorieId, sousCategorieId) => {
    const newPointId = uuidv4();
    setCategories(
      categories.map((categorie) =>
        categorie.id === categorieId
          ? {
              ...categorie,
              sousCategories: categorie.sousCategories.map((sc) =>
                sc.id === sousCategorieId
                  ? {
                      ...sc,
                      pointsControle: [
                        ...sc.pointsControle,
                        { id: newPointId, libelle: '', description: '' }
                      ]
                    }
                  : sc
              )
            }
          : categorie
      )
    );
    // Ouvrir automatiquement le nouveau point
    setExpandedPoints(prev => new Set([...prev, newPointId]));
  };

  const supprimerPointControle = (categorieId, sousCategorieId, pointId) => {
    setCategories(
      categories.map((categorie) =>
        categorie.id === categorieId
          ? {
              ...categorie,
              sousCategories: categorie.sousCategories.map((sc) =>
                sc.id === sousCategorieId
                  ? {
                      ...sc,
                      pointsControle: sc.pointsControle.filter(
                        (pc) => pc.id !== pointId
                      )
                    }
                  : sc
              )
            }
          : categorie
      )
    );
    // Retirer des états d'expansion
    setExpandedPoints(prev => {
      const newSet = new Set(prev);
      newSet.delete(pointId);
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!titreModele.trim()) {
      alert('Veuillez saisir un titre pour le modèle');
      return;
    }

    const modeleData = {
      titre: titreModele,
      categories: deepClone(categories),
      nomsociete: nomsociete
    };

    try {
      if (modele) {
        await updateModeleCQ(modele.id, modeleData);
      } else {
        await addModeleCQ(modeleData);
      }
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du modèle');
    }
  };

  const animation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div {...animation} transition={{ duration: 0.2 }}>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {modele ? 'Modifier le Modèle CQ' : 'Créer un Nouveau Modèle CQ'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div>
            <label className="block text-sm font-medium mb-2">Titre du modèle</label>
            <Input
              value={titreModele}
              onChange={(e) => setTitreModele(e.target.value)}
              placeholder="Ex. Modèle chantier ossature bois"
            />
          </div>

          <div className="space-y-4">
            {categories.map((categorie, catIndex) => {
              const isExpanded = expandedCategories.has(categorie.id);
              
              return (
                <Card key={categorie.id} className="border rounded-lg bg-gradient-to-r from-blue-50 to-slate-50">
                  {/* ✅ EN-TÊTE DE CATÉGORIE AVEC ACCORDÉON */}
                  <div className="p-3 bg-blue-100/50">
                    <div className="flex gap-2 items-center">
                      {/* Bouton accordéon */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleCategorie(categorie.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </Button>

                      {/* Flèches de déplacement */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveCategorie(catIndex, 'up')}
                          disabled={catIndex === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveCategorie(catIndex, 'down')}
                          disabled={catIndex === categories.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <Input
                        placeholder="Nom du domaine"
                        value={categorie.nom}
                        onChange={(e) =>
                          setCategories(
                            categories.map((c) =>
                              c.id === categorie.id ? { ...c, nom: e.target.value } : c
                            )
                          )
                        }
                        className="flex-1 font-medium"
                      />
                      
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => supprimerCategorie(categorie.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* ✅ CONTENU DÉROULANT DE LA CATÉGORIE */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4"
                      >
                        <div className="space-y-3">
                          {categorie.sousCategories.map((sc, scIndex) => {
                            const isScExpanded = expandedSousCategories.has(sc.id);
                            
                            return (
                              <Card key={sc.id} className="bg-white border-l-4 border-l-blue-400">
                                {/* ✅ EN-TÊTE SOUS-CATÉGORIE */}
                                <div className="p-3 bg-slate-50">
                                  <div className="flex gap-2 items-center">
                                    {/* Bouton accordéon */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => toggleSousCategorie(sc.id)}
                                    >
                                      {isScExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>

                                    {/* Flèches de déplacement */}
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveSousCategorie(categorie.id, scIndex, 'up')}
                                        disabled={scIndex === 0}
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveSousCategorie(categorie.id, scIndex, 'down')}
                                        disabled={scIndex === categorie.sousCategories.length - 1}
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <Input
                                      placeholder="Nom de la sous-catégorie"
                                      value={sc.nom}
                                      onChange={(e) =>
                                        setCategories(
                                          categories.map((c) =>
                                            c.id === categorie.id
                                              ? {
                                                  ...c,
                                                  sousCategories: c.sousCategories.map((s) =>
                                                    s.id === sc.id
                                                      ? { ...s, nom: e.target.value }
                                                      : s
                                                  )
                                                }
                                              : c
                                          )
                                        )
                                      }
                                      className="flex-1"
                                    />
                                    
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => supprimerSousCategorie(categorie.id, sc.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* ✅ CONTENU DÉROULANT SOUS-CATÉGORIE */}
                                <AnimatePresence>
                                  {isScExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="p-3"
                                    >
                                      <div className="space-y-3">
                                        {sc.pointsControle.map((pc, pcIndex) => {
                                          const isPcExpanded = expandedPoints.has(pc.id);
                                          
                                          return (
                                            <Card key={pc.id} className="bg-slate-50 border">
                                              {/* ✅ EN-TÊTE POINT DE CONTRÔLE */}
                                              <div className="p-2">
                                                <div className="flex gap-2 items-center mb-2">
                                                  {/* Bouton accordéon */}
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => togglePoint(pc.id)}
                                                  >
                                                    {isPcExpanded ? (
                                                      <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                      <ChevronRight className="h-4 w-4" />
                                                    )}
                                                  </Button>

                                                  {/* Flèches de déplacement */}
                                                  <div className="flex flex-col gap-1">
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="icon"
                                                      className="h-5 w-5"
                                                      onClick={() => movePointControle(categorie.id, sc.id, pcIndex, 'up')}
                                                      disabled={pcIndex === 0}
                                                    >
                                                      <ChevronUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="icon"
                                                      className="h-5 w-5"
                                                      onClick={() => movePointControle(categorie.id, sc.id, pcIndex, 'down')}
                                                      disabled={pcIndex === sc.pointsControle.length - 1}
                                                    >
                                                      <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                  </div>

                                                  <Input
                                                    placeholder="Libellé du point de contrôle"
                                                    value={pc.libelle}
                                                    onChange={(e) =>
                                                      setCategories(
                                                        categories.map((c) =>
                                                          c.id === categorie.id
                                                            ? {
                                                                ...c,
                                                                sousCategories: c.sousCategories.map(
                                                                  (s) =>
                                                                    s.id === sc.id
                                                                      ? {
                                                                          ...s,
                                                                          pointsControle:
                                                                            s.pointsControle.map((p) =>
                                                                              p.id === pc.id
                                                                                ? {
                                                                                    ...p,
                                                                                    libelle:
                                                                                      e.target.value
                                                                                  }
                                                                                : p
                                                                            )
                                                                        }
                                                                      : s
                                                                )
                                                              }
                                                            : c
                                                        )
                                                      )
                                                    }
                                                    className="flex-1 text-sm"
                                                  />

                                                  <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() =>
                                                      supprimerPointControle(
                                                        categorie.id,
                                                        sc.id,
                                                        pc.id
                                                      )
                                                    }
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>

                                                {/* ✅ DESCRIPTION DÉROULANTE */}
                                                <AnimatePresence>
                                                  {isPcExpanded && (
                                                    <motion.div
                                                      initial={{ opacity: 0, height: 0 }}
                                                      animate={{ opacity: 1, height: 'auto' }}
                                                      exit={{ opacity: 0, height: 0 }}
                                                      transition={{ duration: 0.15 }}
                                                      className="ml-12"
                                                    >
                                                      <Textarea
                                                        placeholder="Description (optionnelle)"
                                                        value={pc.description}
                                                        onChange={(e) =>
                                                          setCategories(
                                                            categories.map((c) =>
                                                              c.id === categorie.id
                                                                ? {
                                                                    ...c,
                                                                    sousCategories: c.sousCategories.map(
                                                                      (s) =>
                                                                        s.id === sc.id
                                                                          ? {
                                                                              ...s,
                                                                              pointsControle:
                                                                                s.pointsControle.map((p) =>
                                                                                  p.id === pc.id
                                                                                    ? {
                                                                                        ...p,
                                                                                        description:
                                                                                          e.target.value
                                                                                      }
                                                                                    : p
                                                                                )
                                                                            }
                                                                          : s
                                                                    )
                                                                  }
                                                                : c
                                                            )
                                                          )
                                                        }
                                                        rows={2}
                                                        className="text-sm"
                                                      />
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            </Card>
                                          );
                                        })}

                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            ajouterPointControle(categorie.id, sc.id)
                                          }
                                          className="w-full"
                                        >
                                          <Plus className="h-4 w-4 mr-2" /> Ajouter un point de contrôle
                                        </Button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </Card>
                            );
                          })}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => ajouterSousCategorie(categorie.id)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Ajouter une sous-catégorie
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}

            <Button type="button" variant="secondary" onClick={ajouterCategorie} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un domaine
            </Button>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}