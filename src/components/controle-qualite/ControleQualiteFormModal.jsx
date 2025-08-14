import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function ControleQualiteFormModal({ 
  isOpen, 
  onClose, 
  controle, 
  chantierId, 
  lotsChantier, 
  tachesChantier, 
  addControleAdHoc, 
  updateControleAdHoc 
}) {
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    lotId: '',
    tacheId: '',
    resultat: 'Conforme',
    observations: '',
    actions: ''
  });

  useEffect(() => {
    if (controle) {
      setFormData({
        titre: controle.titre || '',
        description: controle.description || '',
        lotId: controle.lotId || '',
        tacheId: controle.tacheId || '',
        resultat: controle.resultat || 'Conforme',
        observations: controle.observations || '',
        actions: controle.actions || ''
      });
    } else {
      // Reset pour un nouveau contrôle ad-hoc
      setFormData({
        titre: '',
        description: '',
        lotId: '',
        tacheId: '',
        resultat: 'Conforme',
        observations: '',
        actions: ''
      });
    }
  }, [controle, isOpen]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData, chantierId };
    if (controle && controle.id) {
      updateControleAdHoc(controle.id, dataToSubmit);
    } else {
      addControleAdHoc(dataToSubmit);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{controle ? 'Modifier le Contrôle Qualité Ad-Hoc' : 'Nouveau Contrôle Qualité Ad-Hoc'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="cq-titre">Titre du contrôle <span className="text-red-500">*</span></Label>
            <Input
              id="cq-titre"
              name="titre"
              value={formData.titre}
              onChange={handleFormChange}
              placeholder="Ex: Vérification Ferraillage Poutre X"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cq-description">Description (optionnel)</Label>
            <Textarea
              id="cq-description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Détails sur ce qui est contrôlé"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cq-lotId">Lot concerné (optionnel)</Label>
              <Select 
                value={formData.lotId} 
                onValueChange={(value) => handleSelectChange('lotId', value)}
              >
                <SelectTrigger id="cq-lotId">
                  <SelectValue placeholder="Sélectionner un lot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {lotsChantier.map(lot => (
                    <SelectItem key={lot.id} value={lot.id}>{lot.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cq-tacheId">Tâche concernée (optionnel)</Label>
              <Select 
                value={formData.tacheId} 
                onValueChange={(value) => handleSelectChange('tacheId', value)}
                disabled={!formData.lotId && tachesChantier.length > 0} // Peut être activé si on veut lier une tâche sans lot
              >
                <SelectTrigger id="cq-tacheId">
                  <SelectValue placeholder="Sélectionner une tâche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune</SelectItem>
                  {tachesChantier
                    .filter(tache => !formData.lotId || tache.lotId === formData.lotId) // Filtre tâches par lot si un lot est sélectionné
                    .map(tache => (
                      <SelectItem key={tache.id} value={tache.id}>{tache.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.lotId && lotsChantier.length > 0 && tachesChantier.length > 0 &&
                 <p className="text-xs text-muted-foreground">Sélectionnez un lot pour filtrer les tâches.</p>
              }
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cq-resultat">Résultat <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.resultat} 
              onValueChange={(value) => handleSelectChange('resultat', value)}
              required
            >
              <SelectTrigger id="cq-resultat">
                <SelectValue placeholder="Sélectionner un résultat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Conforme">Conforme</SelectItem>
                <SelectItem value="Non conforme">Non conforme</SelectItem>
                <SelectItem value="À surveiller">À surveiller</SelectItem>
                <SelectItem value="Sans Objet">Sans Objet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cq-observations">Observations</Label>
            <Textarea
              id="cq-observations"
              name="observations"
              value={formData.observations}
              onChange={handleFormChange}
              placeholder="Constatations, mesures, photos de référence..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cq-actions">Actions Correctives / Préventives</Label>
            <Textarea
              id="cq-actions"
              name="actions"
              value={formData.actions}
              onChange={handleFormChange}
              placeholder="Mesures à prendre si non-conforme ou pour amélioration"
              rows={3}
            />
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{controle ? 'Mettre à jour' : 'Ajouter le Contrôle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}