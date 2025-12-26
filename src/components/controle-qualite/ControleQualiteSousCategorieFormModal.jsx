import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Save, X, FolderPlus } from 'lucide-react';

export function ControleQualiteSousCategorieFormModal({ 
  isOpen, 
  onClose, 
  sousCategorie, // Sous-catégorie existante (pour modification)
  categorieNom, // Nom de la catégorie parente (pour affichage)
  onSave,
  title = "Ajouter une Sous-Catégorie"
}) {
  const [nom, setNom] = useState('');

  useEffect(() => {
    if (sousCategorie) {
      setNom(sousCategorie.nom || '');
    } else {
      setNom('');
    }
  }, [sousCategorie, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nom.trim()) {
      alert("Le nom de la sous-catégorie est obligatoire.");
      return;
    }
    onSave({
      nom: nom.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FolderPlus className="mr-2 h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {categorieNom && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Catégorie parente :</span> {categorieNom}
              </p>
            </div>
          )}
          
          <div>
            <Label htmlFor="scat-nom">Nom de la sous-catégorie <span className="text-red-500">*</span></Label>
            <Input
              id="scat-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Fondations, Structure, Cloisons..."
              required
              className="mt-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cette sous-catégorie sera spécifique à ce chantier
            </p>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                <X className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </DialogClose>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> {sousCategorie ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}