import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function ModeleCQForm({ modele, addModeleCQ, updateModeleCQ, nomsociete, isOpen, onClose }) {
  const [titreModele, setTitreModele] = useState('');
  const [categories, setCategories] = useState([]);

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
  }, [modele, isOpen]);

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
    setCategories([
      ...categories,
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
  };

  const supprimerCategorie = (categorieId) => {
    setCategories(categories.filter((c) => c.id !== categorieId));
  };

  const ajouterSousCategorie = (categorieId) => {
    setCategories(
      categories.map((categorie) =>
        categorie.id === categorieId
          ? {
              ...categorie,
              sousCategories: [
                ...categorie.sousCategories,
                {
                  id: uuidv4(),
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
  };

  const ajouterPointControle = (categorieId, sousCategorieId) => {
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
                        { id: uuidv4(), libelle: '', description: '' }
                      ]
                    }
                  : sc
              )
            }
          : categorie
      )
    );
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

          <div className="space-y-6">
            {categories.map((categorie, catIndex) => (
              <Card key={categorie.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex gap-2 mb-2">
                  {/* ✅ FLÈCHES CATÉGORIE */}
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveCategorie(catIndex, 'up')}
                      disabled={catIndex === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveCategorie(catIndex, 'down')}
                      disabled={catIndex === categories.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
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
                    className="flex-1"
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

                <div className="ml-4 space-y-4">
                  {categorie.sousCategories.map((sc, scIndex) => (
                    <Card key={sc.id} className="p-4 bg-white border rounded-lg">
                      <div className="flex gap-2 mb-2">
                        {/* ✅ FLÈCHES SOUS-CATÉGORIE */}
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveSousCategorie(categorie.id, scIndex, 'up')}
                            disabled={scIndex === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveSousCategorie(categorie.id, scIndex, 'down')}
                            disabled={scIndex === categorie.sousCategories.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
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
                          onClick={() =>
                            supprimerSousCategorie(categorie.id, sc.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4 ml-4">
                        {sc.pointsControle.map((pc, pcIndex) => (
                          <Card key={pc.id} className="p-4">
                            <div className="flex gap-2 mb-3">
                              {/* ✅ FLÈCHES POINT CONTRÔLE */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => movePointControle(categorie.id, sc.id, pcIndex, 'up')}
                                  disabled={pcIndex === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => movePointControle(categorie.id, sc.id, pcIndex, 'down')}
                                  disabled={pcIndex === sc.pointsControle.length - 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
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
                                className="flex-1"
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

                            <Textarea
                              className="mt-3"
                              placeholder="Description"
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
                            />
                          </Card>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            ajouterPointControle(categorie.id, sc.id)
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" /> Ajouter un point de
                          contrôle
                        </Button>
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => ajouterSousCategorie(categorie.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une sous-catégorie
                  </Button>
                </div>
              </Card>
            ))}

            <Button type="button" variant="secondary" onClick={ajouterCategorie}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter un domaine
            </Button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}