import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Save, X, FolderPlus } from 'lucide-react';

export function CategorieFormModal({ 
  isOpen, 
  onClose, 
  categorie, // Catégorie existante (pour modification)
  onSave,
  title = "Ajouter une Catégorie"
}) {
  const [nom, setNom] = useState('');

  useEffect(() => {
    if (categorie) {
      setNom(categorie.nom || '');
    } else {
      setNom('');
    }
  }, [categorie, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nom.trim()) {
      alert("Le nom de la catégorie est obligatoire.");
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
            <FolderPlus className="mr-2 h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="cat-nom">Nom de la catégorie <span className="text-red-500">*</span></Label>
            <Input
              id="cat-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Gros Œuvre, Second Œuvre, Finitions..."
              required
              className="mt-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cette catégorie sera spécifique à ce chantier
            </p>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                <X className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </DialogClose>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> {categorie ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}