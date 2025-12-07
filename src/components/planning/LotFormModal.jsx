import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

export function LotFormModal({ 
  isOpen, 
  onClose, 
  lot, 
  addLot, 
  updateLot,
  isGlobalContext = false
}) {
  const { profile } = useAuth();
  
  const [formData, setFormData] = useState({
    lot: '', // ✅ CORRIGÉ : "lot" au lieu de "nom" (correspond à ta table)
    description: '',
  });

  useEffect(() => {
    if (lot) {
      setFormData({
        lot: lot.lot || '', // ✅ CORRIGÉ : lot.lot
        description: lot.description || '',
      });
    } else {
      setFormData({
        lot: '',
        description: '',
      });
    }
  }, [lot, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("📦 Création/Modification lot:", formData);
    
    try {
      if (lot) {
        // Modification
        await updateLot(lot.id, formData);
      } else {
        // Création - ajoute nomsociete
        const payload = {
          ...formData,
          nomsociete: profile?.nomsociete
        };
        
        console.log("📦 Payload création lot:", payload);
        await addLot(payload);
      }
      onClose();
    } catch (error) {
      console.error("❌ Erreur lot:", error);
      alert(`Erreur: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lot ? 'Modifier le type de lot' : 'Ajouter un type de lot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lot-name">Nom du type de lot <span className="text-red-500">*</span></Label>
            <Input
              id="lot-name"
              name="lot" // ✅ CORRIGÉ : name="lot"
              value={formData.lot}
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
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{lot ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}