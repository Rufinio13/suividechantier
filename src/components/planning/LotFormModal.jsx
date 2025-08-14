import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// Select, chantiers, sousTraitants, initialChantierId ne sont plus nécessaires ici pour les lots GLOBAUX.

export function LotFormModal({ 
  isOpen, 
  onClose, 
  lot, 
  addLot, 
  updateLot,
  isGlobalContext = false // Ce prop reste pour clarifier le contexte, mais les champs liés disparaissent
}) {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    // Les champs chantierId, dateDebut, dateFin, sousTraitantId sont supprimés pour les lots génériques
  });

  useEffect(() => {
    if (lot) {
      setFormData({
        nom: lot.nom || '',
        description: lot.description || '',
      });
    } else {
      setFormData({
        nom: '',
        description: '',
      });
    }
  }, [lot, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pas besoin de vérifier chantierId si c'est global et que le champ n'existe plus
    if (lot) {
      updateLot(lot.id, formData);
    } else {
      addLot(formData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lot ? 'Modifier le type de lot' : 'Ajouter un type de lot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Le select pour le chantier est supprimé car le lot est générique */}
          <div className="space-y-2">
            <Label htmlFor="lot-nom">Nom du type de lot <span className="text-red-500">*</span></Label>
            <Input
              id="lot-nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Ex: Maçonnerie, Plomberie, Électricité"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lot-description">Description</Label>
            <Textarea
              id="lot-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description du type de lot (optionnel)"
              rows={3}
            />
          </div>
          
          {/* Les champs dates et sous-traitant sont supprimés */}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{lot ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}