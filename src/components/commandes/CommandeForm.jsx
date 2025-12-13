import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, addDays, subWeeks, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function CommandeForm({ 
  isOpen, 
  onClose, 
  commande, 
  chantierId, 
  modelesCommande, 
  fournisseurs,
  addCommande, 
  updateCommande 
}) {
  const [formData, setFormData] = useState({
    nom_commande: '',
    fournisseur_id: '',
    date_livraison_souhaitee: '',
    delai_commande_semaines: 4,
    date_commande_reelle: '',
    livraison_realisee: false,
    notes: ''
  });

  // ✅ CORRIGÉ : Utiliser l'ID de la commande comme dépendance au lieu de l'objet entier
  useEffect(() => {
    if (commande) {
      setFormData({
        nom_commande: commande.nom_commande || '',
        fournisseur_id: commande.fournisseur_id || '',
        date_livraison_souhaitee: commande.date_livraison_souhaitee || '',
        delai_commande_semaines: commande.delai_commande_semaines || 4,
        date_commande_reelle: commande.date_commande_reelle || '',
        livraison_realisee: commande.livraison_realisee || false,
        notes: commande.notes || ''
      });
    } else {
      setFormData({
        nom_commande: '',
        fournisseur_id: '',
        date_livraison_souhaitee: '',
        delai_commande_semaines: 4,
        date_commande_reelle: '',
        livraison_realisee: false,
        notes: ''
      });
    }
  }, [commande?.id, isOpen]); // ✅ Dépendre de l'ID seulement, pas de l'objet entier

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (name === 'delai_commande_semaines' ? parseInt(value) || 0 : value)
    }));
  };

  // Calculer la date prévisionnelle
  const calculateDatePrevisionnelle = () => {
    if (!formData.date_livraison_souhaitee || !formData.delai_commande_semaines) {
      return 'Non calculée';
    }
    try {
      const dateLivraison = parseISO(formData.date_livraison_souhaitee);
      const datePrevisionnelle = subWeeks(dateLivraison, formData.delai_commande_semaines);
      return format(datePrevisionnelle, 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.nom_commande.trim()) {
      alert('Veuillez saisir un nom de commande');
      return;
    }

    if (formData.delai_commande_semaines < 1) {
      alert('Le délai doit être d\'au moins 1 semaine');
      return;
    }

    const commandeData = {
      chantier_id: chantierId,
      nom_commande: formData.nom_commande,
      fournisseur_id: formData.fournisseur_id || null,
      date_livraison_souhaitee: formData.date_livraison_souhaitee || null,
      delai_commande_semaines: formData.delai_commande_semaines,
      date_commande_reelle: formData.date_commande_reelle || null,
      livraison_realisee: formData.livraison_realisee,
      notes: formData.notes || null
    };

    try {
      if (commande) {
        await updateCommande(commande.id, commandeData);
      } else {
        await addCommande(commandeData);
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la commande');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {commande ? 'Modifier la commande' : 'Nouvelle commande'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          {/* Nom de la commande */}
          <div className="space-y-2">
            <Label htmlFor="nom_commande">
              Nom de la commande <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom_commande"
              name="nom_commande"
              value={formData.nom_commande}
              onChange={handleChange}
              placeholder="Ex: Bois de charpente"
              required
            />
          </div>

          {/* Fournisseur */}
          <div className="space-y-2">
            <Label htmlFor="fournisseur_id">Fournisseur</Label>
            <Select 
              value={formData.fournisseur_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, fournisseur_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {fournisseurs.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nomsocieteF}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates et délai */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_livraison_souhaitee">Date de livraison souhaitée</Label>
              <Input
                id="date_livraison_souhaitee"
                name="date_livraison_souhaitee"
                type="date"
                value={formData.date_livraison_souhaitee}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delai_commande_semaines">
                Délai de commande (semaines) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="delai_commande_semaines"
                name="delai_commande_semaines"
                type="number"
                min="1"
                value={formData.delai_commande_semaines}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Date prévisionnelle (calculée) */}
          {formData.date_livraison_souhaitee && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-900">
                <strong>📅 Date de commande prévisionnelle :</strong>{' '}
                <span className="font-semibold">{calculateDatePrevisionnelle()}</span>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Cette date est calculée automatiquement en fonction de la date de livraison et du délai.
              </p>
            </div>
          )}

          {/* Date réelle de commande */}
          <div className="space-y-2">
            <Label htmlFor="date_commande_reelle">Date réelle de commande (optionnel)</Label>
            <Input
              id="date_commande_reelle"
              name="date_commande_reelle"
              type="date"
              value={formData.date_commande_reelle}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Quand cette date est renseignée, la commande passe en vert (commandée)
            </p>
          </div>

          {/* Checkbox Livraison réalisée */}
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <Checkbox
              id="livraison_realisee"
              name="livraison_realisee"
              checked={formData.livraison_realisee}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, livraison_realisee: checked }))}
            />
            <Label htmlFor="livraison_realisee" className="cursor-pointer">
              ✅ Livraison réalisée (masque la commande si filtre actif)
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Remarques ou informations complémentaires..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {commande ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}