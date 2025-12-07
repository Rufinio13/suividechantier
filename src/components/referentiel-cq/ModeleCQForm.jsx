import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function ModeleCQForm({ modele, addModeleCQ, updateModeleCQ, nomsociete, isOpen, onClose }) {
  const [titreModele, setTitreModele] = useState('');
  const [categories, setCategories] = useState([]);

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  useEffect(() => {
    if (modele) {
      setTitreModele(modele.titre || '');

      // ✅ CORRIGÉ : On charge depuis 'categories' maintenant
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
    // Validation basique
    if (!titreModele.trim()) {
      alert('Veuillez saisir un titre pour le modèle');
      return;
    }

    // ✅ CORRIGÉ : On envoie 'categories' maintenant (pas 'domaines')
    const modeleData = {
      titre: titreModele,
      categories: deepClone(categories),
      nomsociete: nomsociete
    };

    try {
      if (modele) {
        // Mode édition : on met à jour
        await updateModeleCQ(modele.id, modeleData);
      } else {
        // Mode création : on ajoute
        await addModeleCQ(modeleData);
      }
      
      // Fermer le modal après succès
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
            {categories.map((categorie) => (
              <Card key={categorie.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
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
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => supprimerCategorie(categorie.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="ml-4 space-y-4">
                  {categorie.sousCategories.map((sc) => (
                    <Card key={sc.id} className="p-4 bg-white border rounded-lg">
                      <div className="flex justify-between mb-2">
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
                        />
                        <Button
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
                        {sc.pointsControle.map((pc) => (
                          <Card key={pc.id} className="p-4">
                            <div className="flex justify-between">
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
                              />

                              <Button
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
                    variant="outline"
                    size="sm"
                    onClick={() => ajouterSousCategorie(categorie.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une sous-catégorie
                  </Button>
                </div>
              </Card>
            ))}

            <Button variant="secondary" onClick={ajouterCategorie}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter un domaine
            </Button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}