import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function ModeleCommandeForm({ modele, addModeleCommande, updateModeleCommande, nomsociete, isOpen, onClose }) {
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    commandes_types: []
  });

  useEffect(() => {
    if (modele) {
      // Ajouter des IDs temporaires si pas présents
      const commandesAvecIds = (modele.commandes_types || []).map(c => ({
        ...c,
        id: c.id || uuidv4()
      }));
      
      setFormData({
        titre: modele.titre || '',
        description: modele.description || '',
        commandes_types: commandesAvecIds
      });
    } else {
      setFormData({
        titre: '',
        description: '',
        commandes_types: [
          { id: uuidv4(), nom: '', delai_semaines: 4 }
        ]
      });
    }
  }, [modele, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Ajouter une commande type
  const ajouterCommandeType = () => {
    setFormData(prev => ({
      ...prev,
      commandes_types: [
        ...prev.commandes_types,
        { id: uuidv4(), nom: '', delai_semaines: 4 }
      ]
    }));
  };

  // Supprimer une commande type
  const supprimerCommandeType = (id) => {
    setFormData(prev => ({
      ...prev,
      commandes_types: prev.commandes_types.filter(c => c.id !== id)
    }));
  };

  // Modifier une commande type
  const modifierCommandeType = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      commandes_types: prev.commandes_types.map(c => 
        c.id === id 
          ? { ...c, [field]: field === 'delai_semaines' ? parseInt(value) || 0 : value }
          : c
      )
    }));
  };

  // ✅ NOUVEAU : Déplacer une commande vers le haut
  const monterCommande = (index) => {
    if (index === 0) return; // Déjà en haut
    
    setFormData(prev => {
      const newCommandes = [...prev.commandes_types];
      [newCommandes[index - 1], newCommandes[index]] = [newCommandes[index], newCommandes[index - 1]];
      return { ...prev, commandes_types: newCommandes };
    });
  };

  // ✅ NOUVEAU : Déplacer une commande vers le bas
  const descendreCommande = (index) => {
    if (index === formData.commandes_types.length - 1) return; // Déjà en bas
    
    setFormData(prev => {
      const newCommandes = [...prev.commandes_types];
      [newCommandes[index], newCommandes[index + 1]] = [newCommandes[index + 1], newCommandes[index]];
      return { ...prev, commandes_types: newCommandes };
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.titre.trim()) {
      alert('Veuillez saisir un titre pour le modèle');
      return;
    }

    if (formData.commandes_types.length === 0) {
      alert('Veuillez ajouter au moins une commande type');
      return;
    }

    const commandesSansNom = formData.commandes_types.filter(c => !c.nom.trim());
    if (commandesSansNom.length > 0) {
      alert('Toutes les commandes doivent avoir un nom');
      return;
    }

    const commandesDelaiInvalide = formData.commandes_types.filter(c => c.delai_semaines < 1);
    if (commandesDelaiInvalide.length > 0) {
      alert('Tous les délais doivent être d\'au moins 1 semaine');
      return;
    }

    // Retirer les IDs temporaires avant sauvegarde
    const commandesClean = formData.commandes_types.map(({ id, ...rest }) => rest);

    const modeleData = {
      titre: formData.titre,
      description: formData.description,
      commandes_types: commandesClean,
      nomsociete: nomsociete
    };

    try {
      if (modele) {
        await updateModeleCommande(modele.id, modeleData);
      } else {
        await addModeleCommande(modeleData);
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du modèle');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            {modele ? 'Modifier le Template de Chantier' : 'Créer un Nouveau Template de Chantier'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Titre du template */}
          <div className="space-y-2">
            <Label htmlFor="titre">
              Nom du template <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titre"
              name="titre"
              value={formData.titre}
              onChange={handleChange}
              placeholder="Ex: Maisons Naturea"
              required
            />
            <p className="text-xs text-muted-foreground">
              Type de chantier (ex: Maisons Naturea, Extension, Rénovation...)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Template pour les chantiers type Maisons Naturea avec toutes les commandes standards"
              rows={2}
            />
          </div>

          {/* Liste des commandes types */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">
                Commandes pré-configurées <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={ajouterCommandeType}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {formData.commandes_types.map((commande, index) => (
                <motion.div
                  key={commande.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  layout
                >
                  <Card className="p-4 bg-slate-50">
                    <div className="flex items-start gap-3">
                      {/* ✅ NOUVEAU : Boutons de réordonnancement */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => monterCommande(index)}
                          disabled={index === 0}
                          className="h-8 w-8"
                          title="Monter"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => descendreCommande(index)}
                          disabled={index === formData.commandes_types.length - 1}
                          className="h-8 w-8"
                          title="Descendre"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs">
                            #{index + 1} - Nom de la commande
                          </Label>
                          <Input
                            value={commande.nom}
                            onChange={(e) => modifierCommandeType(commande.id, 'nom', e.target.value)}
                            placeholder="Ex: Menuiseries intérieures"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Délai (semaines)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={commande.delai_semaines}
                            onChange={(e) => modifierCommandeType(commande.id, 'delai_semaines', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => supprimerCommandeType(commande.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {formData.commandes_types.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Aucune commande ajoutée. Cliquez sur "Ajouter" pour commencer.
              </div>
            )}
          </div>

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Comment ça marche :</strong><br/>
                Créez un template avec toutes vos commandes standards. Quand vous appliquerez ce template à un chantier,
                toutes ces commandes seront automatiquement créées <strong>dans l'ordre défini</strong>. Vous n'aurez plus qu'à choisir le fournisseur et la date de livraison pour chaque commande.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave}>
            {modele ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}