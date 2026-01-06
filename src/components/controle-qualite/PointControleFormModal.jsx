import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Save, X } from 'lucide-react';

export function PointControleFormModal({ 
  isOpen, 
  onClose, 
  point, // Point de contrôle existant (pour modification)
  modeleId, // ID du modèle CQ parent
  domaineId, // ID du domaine parent
  sousCategorieId, // ID de la sous-catégorie parente (peut être null si point direct sous domaine)
  onSave 
}) {
  const [libelle, setLibelle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (point) {
      setLibelle(point.libelle || '');
      setDescription(point.description || '');
    } else {
      setLibelle('');
      setDescription('');
    }
    setIsSubmitting(false);
  }, [point, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('⚠️ Formulaire déjà en cours de soumission, ignoré');
      return;
    }
    
    if (!libelle.trim()) {
      alert("Le libellé est obligatoire.");
      return;
    }
    
    setIsSubmitting(true);
    console.log('📤 Soumission du formulaire point de contrôle:', libelle);
    
    onSave({
      libelle: libelle.trim(),
      description: description.trim(),
    });
    
    // ✅ Le parent fermera le modal après la sauvegarde réussie
    setIsSubmitting(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{point ? 'Modifier le Point de Contrôle' : 'Ajouter un Point de Contrôle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="pc-libelle">Libellé du point de contrôle <span className="text-red-500">*</span></Label>
            <Input
              id="pc-libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex: Conformité des armatures"
              required
              className="mt-1"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="pc-description">Description (optionnel)</Label>
            <Textarea
              id="pc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Critères d'acceptation, normes à respecter..."
              rows={3}
              className="mt-1"
              disabled={isSubmitting}
            />
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" /> 
              {isSubmitting ? 'Sauvegarde...' : (point ? 'Sauvegarder' : 'Ajouter')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}