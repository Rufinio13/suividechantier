import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useChantier } from '@/context/ChantierContext';
import { calculateDateFinLogic } from '@/context/chantierContextLogics/tacheLogics';

export function TacheFormModal({ isOpen, onClose, tache, chantierId, lots: globalLots, addTache, updateTache }) {
  const { sousTraitants, fournisseurs } = useChantier();

  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    dateDebut: '',
    duree: '',
    dateFin: '',
    lotId: '',
    assigneId: '', 
    assigneType: '',
    terminee: false, // Ajouté pour la cohérence, même si géré par TacheItem
  });

  const assignableEntities = useMemo(() => {
    let stOptions = [];
    if (formData.lotId) {
      stOptions = sousTraitants
        .filter(st => st.assignedLots && st.assignedLots.includes(formData.lotId))
        .map(st => ({
          id: st.id,
          nom: `${st.nomSociete || st.nomDirigeant} (Artisan)`,
          type: 'soustraitant'
        }));
    }

    let fournisseurOptions = [];
    if (formData.lotId) {
        fournisseurOptions = fournisseurs
        .filter(f => f.assignedLots && f.assignedLots.includes(formData.lotId))
        .map(f => ({
            id: f.id,
            nom: `${f.nomSociete} (Fournisseur)`,
            type: 'fournisseur'
        }));
    }
    
    return [...stOptions, ...fournisseurOptions].sort((a,b) => a.nom.localeCompare(b.nom));
  }, [formData.lotId, sousTraitants, fournisseurs]);


  useEffect(() => {
    if (tache) {
      setFormData({
        nom: tache.nom || '',
        description: tache.description || '',
        dateDebut: tache.dateDebut || '',
        duree: tache.duree || '',
        dateFin: tache.dateFin || '',
        lotId: tache.lotId || '',
        assigneId: tache.assigneId || '',
        assigneType: tache.assigneType || '',
        terminee: tache.terminee || false,
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        dateDebut: '',
        duree: '',
        dateFin: '',
        lotId: (globalLots && globalLots.length > 0) ? globalLots[0].id : '',
        assigneId: '',
        assigneType: '',
        terminee: false,
      });
    }
  }, [tache, isOpen, globalLots]);

  useEffect(() => {
    if (formData.dateDebut && formData.duree) {
      const calculatedDateFin = calculateDateFinLogic(formData.dateDebut, parseInt(formData.duree, 10));
      setFormData(prev => ({ ...prev, dateFin: calculatedDateFin }));
    } else {
      setFormData(prev => ({ ...prev, dateFin: '' }));
    }
  }, [formData.dateDebut, formData.duree]);

  useEffect(() => {
    if (formData.assigneId && !assignableEntities.some(e => e.id === formData.assigneId && e.type === formData.assigneType)) {
      setFormData(prev => ({ ...prev, assigneId: '', assigneType: '' }));
    }
  }, [formData.lotId, assignableEntities, formData.assigneId, formData.assigneType]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    if (name === 'assigneCombined') {
      if (value) {
        const [type, id] = value.split(':');
        setFormData(prev => ({ ...prev, assigneId: id, assigneType: type }));
      } else {
        setFormData(prev => ({ ...prev, assigneId: '', assigneType: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (name === 'lotId') {
      setFormData(prev => ({ ...prev, assigneId: '', assigneType: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lotId) {
        alert("Veuillez sélectionner un type de lot pour cette tâche.");
        return;
    }
    if (!formData.dateDebut || !formData.duree) {
        alert("Veuillez renseigner la date de début et la durée.");
        return;
    }
    const finalFormData = { ...formData, dateFin: calculateDateFinLogic(formData.dateDebut, parseInt(formData.duree,10)) };
    delete finalFormData.statut; // Supprimer le champ statut

    if (tache) {
      updateTache(tache.id, { ...finalFormData, chantierId });
    } else {
      addTache({ ...finalFormData, chantierId });
    }
    onClose();
  };
  
  const currentAssignedValue = formData.assigneType && formData.assigneId 
    ? `${formData.assigneType}:${formData.assigneId}` 
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tache ? 'Modifier la tâche' : 'Ajouter une tâche'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tache-nom">Nom de la tâche <span className="text-red-500">*</span></Label>
            <Input
              id="tache-nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Nom de la tâche"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tache-description">Description</Label>
            <Textarea
              id="tache-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description de la tâche"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tache-dateDebut">Date de début <span className="text-red-500">*</span></Label>
              <Input
                id="tache-dateDebut"
                name="dateDebut"
                type="date"
                value={formData.dateDebut}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tache-duree">Durée (en jours) <span className="text-red-500">*</span></Label>
              <Input
                id="tache-duree"
                name="duree"
                type="number"
                min="1"
                value={formData.duree}
                onChange={handleChange}
                placeholder="Ex: 5"
                required
              />
            </div>
          </div>
          {formData.dateFin && (
             <div className="space-y-1 text-sm">
                <Label>Date de fin calculée :</Label>
                <p className="text-muted-foreground">{new Date(formData.dateFin).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="tache-lotId">Type de Lot <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.lotId} 
              onValueChange={(value) => handleSelectChange('lotId', value)}
              required
            >
              <SelectTrigger id="tache-lotId">
                <SelectValue placeholder="Sélectionner un type de lot" />
              </SelectTrigger>
              <SelectContent>
                {globalLots.map(lot => (
                  <SelectItem key={lot.id} value={lot.id}>{lot.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tache-assigneCombined">Assigné à (Artisan / Fournisseur)</Label>
            <Select 
              value={currentAssignedValue} 
              onValueChange={(value) => handleSelectChange('assigneCombined', value)}
              disabled={!formData.lotId || assignableEntities.length === 0}
            >
              <SelectTrigger id="tache-assigneCombined">
                <SelectValue placeholder={!formData.lotId ? "Sélectionnez d'abord un lot" : (assignableEntities.length === 0 ? "Aucun disponible pour ce lot" : "Sélectionner...")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {assignableEntities.map(entity => (
                  <SelectItem key={`${entity.type}-${entity.id}`} value={`${entity.type}:${entity.id}`}>{entity.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.lotId && assignableEntities.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun artisan ou fournisseur n'est assigné à ce type de lot.</p>
            )}
             {!formData.lotId && (
                <p className="text-xs text-muted-foreground">Veuillez sélectionner un type de lot pour voir les artisans/fournisseurs disponibles.</p>
            )}
          </div>
          
          {/* Champ Statut supprimé */}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{tache ? 'Mettre à jour' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}