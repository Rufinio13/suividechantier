import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, ChevronDown, ChevronUp, Layers, ListChecks, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Sous-composant pour un Point de Contrôle
function PointControleInput({ point, onChange, onDelete, index, onMove }) {
  return (
    <motion.div 
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="flex items-start space-x-2 p-2 border rounded-md bg-slate-50 relative ml-4"
    >
        <div className="flex flex-col space-y-1 pt-1">
            <button type="button" onClick={() => onMove('up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-50"><ChevronUp size={16} /></button>
            <button type="button" onClick={() => onMove('down')} className="text-gray-400 hover:text-gray-600"><ChevronDown size={16} /></button>
        </div>
        <div className="flex-grow space-y-1">
            <Input
                type="text"
                placeholder="Libellé du point de contrôle"
                value={point.libelle}
                onChange={(e) => onChange('libelle', e.target.value)}
                className="text-sm"
                required
            />
            <Textarea
                placeholder="Description (optionnel)"
                value={point.description || ''}
                onChange={(e) => onChange('description', e.target.value)}
                rows={1}
                className="text-xs"
            />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10 h-8 w-8">
            <Trash2 size={16} />
        </Button>
    </motion.div>
  );
}

// Sous-composant pour une Sous-Catégorie
function SousCategorieInput({ sousCategorie, onChange, onDelete, onAddPointControle, onPointControleChange, onPointControleDelete, onMovePointControle }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <motion.div 
        layout
        className="p-3 border rounded-lg space-y-3 bg-white shadow-sm ml-4"
    >
      <div className="flex items-center justify-between">
        <Input
          type="text"
          placeholder="Nom de la sous-catégorie (ex: Murs Extérieurs)"
          value={sousCategorie.nom}
          onChange={(e) => onChange('nom', e.target.value)}
          className="font-medium text-sm flex-grow mr-2"
          required
        />
        <div className="flex items-center space-x-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-8 w-8">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10 h-8 w-8">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pl-4 border-l-2 border-slate-200"
          >
            {sousCategorie.pointsControle.map((pc, pcIndex) => (
              <PointControleInput
                key={pc.id || pcIndex}
                point={pc}
                index={pcIndex}
                onChange={(field, value) => onPointControleChange(pcIndex, field, value)}
                onDelete={() => onPointControleDelete(pcIndex)}
                onMove={(direction) => onMovePointControle(pcIndex, direction)}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={onAddPointControle} className="w-full">
              <CheckSquare size={14} className="mr-2" /> Ajouter un point de contrôle
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sous-composant pour un Domaine (anciennement Catégorie)
function DomaineInput({ domaine, onChange, onDelete, onAddSousCategorie, onSousCategorieChange, onSousCategorieDelete, onPointControleChange, onPointControleDelete, onAddPointControle, onMovePointControle }) {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <motion.div
            layout
            className="p-4 border-2 border-slate-200 rounded-xl space-y-3 bg-slate-50 shadow-md"
        >
            <div className="flex items-center justify-between">
                <Input
                    type="text"
                    placeholder="Titre du Domaine (ex: Gros Œuvre)"
                    value={domaine.nom}
                    onChange={(e) => onChange('nom', e.target.value)}
                    className="font-semibold text-md flex-grow mr-2"
                    required
                />
                <div className="flex items-center space-x-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-9 w-9">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10 h-9 w-9">
                        <Trash2 size={18} />
                    </Button>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pl-4 border-l-2 border-blue-300"
                    >
                        {domaine.sousCategories.map((sc, scIndex) => (
                             <SousCategorieInput
                                key={sc.id || scIndex}
                                sousCategorie={sc}
                                onChange={(field, value) => onSousCategorieChange(scIndex, field, value)}
                                onDelete={() => onSousCategorieDelete(scIndex)}
                                onAddPointControle={() => onAddPointControle(scIndex)}
                                onPointControleChange={(pcIndex, field, value) => onPointControleChange(scIndex, pcIndex, field, value)}
                                onPointControleDelete={(pcIndex) => onPointControleDelete(scIndex, pcIndex)}
                                onMovePointControle={(pcIndex, direction) => onMovePointControle(scIndex, pcIndex, direction)}
                            />
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={onAddSousCategorie} className="w-full border-blue-400 text-blue-600 hover:bg-blue-50">
                            <ListChecks size={14} className="mr-2" /> Ajouter une sous-catégorie
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


export function ModeleCQForm({ isOpen, onClose, modele, addModeleCQ, updateModeleCQ }) {
  const [titreModele, setTitreModele] = useState('');
  const [domaines, setDomaines] = useState([]); // Renommé de categories à domaines

  useEffect(() => {
    if (modele) {
      setTitreModele(modele.titre || '');
      setDomaines(modele.domaines ? JSON.parse(JSON.stringify(modele.domaines)) : []);
    } else {
      setTitreModele('');
      setDomaines([{ 
        id: uuidv4(), 
        nom: '', 
        sousCategories: [{ 
            id: uuidv4(), 
            nom: '', 
            pointsControle: [{ id: uuidv4(), libelle: '', description: '' }] 
        }] 
      }]);
    }
  }, [modele, isOpen]);

  const handleAddDomaine = () => {
    setDomaines([...domaines, { 
        id: uuidv4(), 
        nom: '', 
        sousCategories: [{ 
            id: uuidv4(), 
            nom: '', 
            pointsControle: [{ id: uuidv4(), libelle: '', description: '' }] 
        }] 
    }]);
  };

  const handleDomaineChange = (domIndex, field, value) => {
    const newDomaines = [...domaines];
    newDomaines[domIndex][field] = value;
    setDomaines(newDomaines);
  };

  const handleDeleteDomaine = (domIndex) => {
    if (domaines.length === 1 && domaines[domIndex].sousCategories.length === 0) return;
    if (domaines.length > 1 || domaines[domIndex].sousCategories.length > 0) {
       if (window.confirm("Supprimer ce domaine et tout son contenu ?")) {
            const newDomaines = domaines.filter((_, i) => i !== domIndex);
            setDomaines(newDomaines);
        }
    }
  };

  const handleAddSousCategorie = (domIndex) => {
    const newDomaines = [...domaines];
    newDomaines[domIndex].sousCategories.push({ 
        id: uuidv4(), 
        nom: '', 
        pointsControle: [{ id: uuidv4(), libelle: '', description: '' }] 
    });
    setDomaines(newDomaines);
  };

  const handleSousCategorieChange = (domIndex, scIndex, field, value) => {
    const newDomaines = [...domaines];
    newDomaines[domIndex].sousCategories[scIndex][field] = value;
    setDomaines(newDomaines);
  };

  const handleDeleteSousCategorie = (domIndex, scIndex) => {
    const newDomaines = [...domaines];
    if (newDomaines[domIndex].sousCategories.length > 1 || newDomaines[domIndex].sousCategories[scIndex].pointsControle.length > 0) {
        if (window.confirm("Supprimer cette sous-catégorie et ses points de contrôle ?")) {
            newDomaines[domIndex].sousCategories = newDomaines[domIndex].sousCategories.filter((_, i) => i !== scIndex);
            setDomaines(newDomaines);
        }
    }
  };

  const handleAddPointControle = (domIndex, scIndex) => {
    const newDomaines = [...domaines];
    newDomaines[domIndex].sousCategories[scIndex].pointsControle.push({ id: uuidv4(), libelle: '', description: '' });
    setDomaines(newDomaines);
  };

  const handlePointControleChange = (domIndex, scIndex, pcIndex, field, value) => {
    const newDomaines = [...domaines];
    newDomaines[domIndex].sousCategories[scIndex].pointsControle[pcIndex][field] = value;
    setDomaines(newDomaines);
  };

  const handleDeletePointControle = (domIndex, scIndex, pcIndex) => {
    const newDomaines = [...domaines];
    if (newDomaines[domIndex].sousCategories[scIndex].pointsControle.length > 1) {
        newDomaines[domIndex].sousCategories[scIndex].pointsControle = newDomaines[domIndex].sousCategories[scIndex].pointsControle.filter((_, i) => i !== pcIndex);
        setDomaines(newDomaines);
    } else {
        alert("Une sous-catégorie doit avoir au moins un point de contrôle.");
    }
  };
  
  const handleMovePointControle = (domIndex, scIndex, pcIndex, direction) => {
    const newDomaines = [...domaines];
    const points = newDomaines[domIndex].sousCategories[scIndex].pointsControle;
    const targetIndex = direction === 'up' ? pcIndex - 1 : pcIndex + 1;

    if (targetIndex >= 0 && targetIndex < points.length) {
        [points[pcIndex], points[targetIndex]] = [points[targetIndex], points[pcIndex]];
        setDomaines(newDomaines);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titreModele.trim()) {
        alert("Le titre du modèle est requis.");
        return;
    }
    if (domaines.length === 0 || domaines.some(dom => 
        !dom.nom.trim() || 
        dom.sousCategories.length === 0 || 
        dom.sousCategories.some(sc => 
            !sc.nom.trim() || 
            sc.pointsControle.length === 0 || 
            sc.pointsControle.some(pc => !pc.libelle.trim())
        )
    )) {
        alert("Chaque domaine doit avoir un nom et au moins une sous-catégorie avec un nom et au moins un point de contrôle avec un libellé.");
        return;
    }

    const modeleData = { 
      titre: titreModele, 
      domaines: domaines.map(dom => ({
        ...dom,
        sousCategories: dom.sousCategories.map(sc => ({
            ...sc,
            pointsControle: sc.pointsControle.map(pc => ({...pc}))
        }))
      }))
    };
    
    if (modele && modele.id) {
      updateModeleCQ(modele.id, modeleData);
    } else {
      addModeleCQ(modeleData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modele ? 'Modifier le Modèle CQ' : 'Créer un Nouveau Modèle CQ'}</DialogTitle>
          <DialogDescription>
            Définissez le titre du modèle, puis les domaines, sous-catégories et points de contrôle.
          </DialogDescription>
        </DialogHeader>
        <form id="form-modele-cq" onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-6 p-1 pr-3">
          <div className="space-y-2 sticky top-0 bg-background py-3 z-10 border-b">
            <Label htmlFor="modele-titre" className="text-lg font-semibold">Titre Global du Modèle <span className="text-red-500">*</span></Label>
            <Input
              id="modele-titre"
              value={titreModele}
              onChange={(e) => setTitreModele(e.target.value)}
              placeholder="Ex: Contrôle Qualité Global Bâtiment"
              className="text-lg"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-md font-semibold">Domaines de Contrôle</Label>
            <div className="space-y-4">
                <AnimatePresence>
                    {domaines.map((dom, domIndex) => (
                        <DomaineInput
                            key={dom.id || domIndex}
                            domaine={dom}
                            onChange={(field, value) => handleDomaineChange(domIndex, field, value)}
                            onDelete={() => handleDeleteDomaine(domIndex)}
                            onAddSousCategorie={() => handleAddSousCategorie(domIndex)}
                            onSousCategorieChange={(scIndex, field, value) => handleSousCategorieChange(domIndex, scIndex, field, value)}
                            onSousCategorieDelete={(scIndex) => handleDeleteSousCategorie(domIndex, scIndex)}
                            onAddPointControle={(scIndex) => handleAddPointControle(domIndex, scIndex)}
                            onPointControleChange={(scIndex, pcIndex, field, value) => handlePointControleChange(domIndex, scIndex, pcIndex, field, value)}
                            onPointControleDelete={(scIndex, pcIndex) => handleDeletePointControle(domIndex, scIndex, pcIndex)}
                            onMovePointControle={(scIndex, pcIndex, direction) => handleMovePointControle(domIndex, scIndex, pcIndex, direction)}
                        />
                    ))}
                </AnimatePresence>
            </div>
            <Button type="button" variant="outline" onClick={handleAddDomaine} className="w-full mt-4 border-green-500 text-green-600 hover:bg-green-50">
              <Layers size={16} className="mr-2" /> Ajouter un domaine (ex: Phase, Lot Technique)
            </Button>
          </div>
        </form>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="form-modele-cq">{modele ? 'Mettre à jour' : 'Créer le Modèle'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}