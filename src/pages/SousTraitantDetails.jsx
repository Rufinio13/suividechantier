import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Briefcase, User, Plus, ListChecks } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";

export function SousTraitantDetails() {
  const { sousTraitantId } = useParams();
  const navigate = useNavigate();
  const { 
    sousTraitants, 
    lots: globalLots, 
    updateSousTraitant, 
    deleteSousTraitant, 
    assignLotsToSousTraitant,
    loading 
  } = useChantier();
  
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isAssignLotsOpen, setIsAssignLotsOpen] = useState(false);
  
  const sousTraitant = useMemo(() => 
    sousTraitants.find(st => st.id === sousTraitantId), 
  [sousTraitants, sousTraitantId]);

  const [selectedLotIds, setSelectedLotIds] = useState([]); 

  const [formData, setFormData] = useState({
    nomSociete: '',
    nomDirigeant: '',
    email: '',
    telephone: '',
    adressePostale: '',
    notes: '',
    assignedLots: [] // Ce champ sera géré par assignLotsToSousTraitant
  });

  const assignedLotNames = useMemo(() => {
    if (!sousTraitant || !sousTraitant.assignedLots) return [];
    return sousTraitant.assignedLots.map(lotId => {
      const lot = globalLots.find(l => l.id === lotId);
      return lot ? lot.nom : 'Lot inconnu';
    }).sort((a,b) => a.localeCompare(b));
  }, [sousTraitant, globalLots]);

  useEffect(() => {
    if (sousTraitant) {
      setFormData({
        nomSociete: sousTraitant.nomSociete || '',
        nomDirigeant: sousTraitant.nomDirigeant || '',
        email: sousTraitant.email || '',
        telephone: sousTraitant.telephone || '',
        adressePostale: sousTraitant.adressePostale || '',
        notes: sousTraitant.notes || '',
        assignedLots: sousTraitant.assignedLots || [] // Initialiser pour la logique interne, mais pas pour le submit direct
      });
      setSelectedLotIds(sousTraitant.assignedLots || []);
    }
  }, [sousTraitant]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  if (!sousTraitant) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sous-traitant non trouvé</h2>
        <p className="text-muted-foreground mb-6">Le sous-traitant que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/sous-traitants-list">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'annuaire
          </Link>
        </Button>
      </div>
    );
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInfoSubmit = (e) => {
    e.preventDefault();
    // Ne pas inclure assignedLots ici, car il est géré séparément
    const { assignedLots, ...infoData } = formData; 
    updateSousTraitant(sousTraitant.id, infoData);
    setIsEditInfoOpen(false);
  };

  const handleDeleteSousTraitant = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${sousTraitant.nomSociete || sousTraitant.nomDirigeant} ? Cette action est irréversible.`)) {
      deleteSousTraitant(sousTraitant.id);
      navigate('/sous-traitants-list');
    }
  };
  
  const handleLotSelectionChange = (lotId) => {
    setSelectedLotIds(prev => 
      prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
    );
  };

  const handleAssignLotsSubmit = () => {
    assignLotsToSousTraitant(sousTraitant.id, selectedLotIds);
    // Mettre à jour l'état local de formData.assignedLots pour refléter le changement immédiatement dans l'UI si nécessaire
    // setFormData(prev => ({ ...prev, assignedLots: selectedLotIds })); // Déjà fait dans le useEffect
    setIsAssignLotsOpen(false);
  };
  
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0,2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link to="/sous-traitants-list">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'annuaire
            </Link>
          </Button>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{getInitials(sousTraitant.nomSociete || sousTraitant.nomDirigeant)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{sousTraitant.nomSociete || sousTraitant.nomDirigeant}</h1>
              {sousTraitant.nomSociete && sousTraitant.nomDirigeant && <p className="text-muted-foreground">{sousTraitant.nomDirigeant}</p>}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsEditInfoOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Modifier Infos
          </Button>
          <Button variant="destructive" onClick={handleDeleteSousTraitant}>
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </Button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sousTraitant.email && (
              <div className="flex items-center">
                <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                <a href={`mailto:${sousTraitant.email}`} className="hover:underline truncate">{sousTraitant.email}</a>
              </div>
            )}
            {sousTraitant.telephone && (
              <div className="flex items-center">
                <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
                <a href={`tel:${sousTraitant.telephone}`} className="hover:underline">{sousTraitant.telephone}</a>
              </div>
            )}
            {sousTraitant.adressePostale && (
              <div className="flex items-start">
                <MapPin className="mr-3 h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{sousTraitant.adressePostale}</span>
              </div>
            )}
            {sousTraitant.notes && (
              <div className="pt-3 mt-3 border-t">
                <h4 className="font-medium mb-1">Notes :</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{sousTraitant.notes}</p>
              </div>
            )}
             {!sousTraitant.email && !sousTraitant.telephone && !sousTraitant.adressePostale && !sousTraitant.notes && (
                <p className="text-muted-foreground italic">Aucune coordonnée ou note supplémentaire.</p>
             )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Types de Lots / Compétences</CardTitle>
            <Button size="sm" onClick={() => {
                setSelectedLotIds(sousTraitant.assignedLots || []); // S'assurer que les lots actuels sont pré-cochés
                setIsAssignLotsOpen(true);
            }}>
              <ListChecks className="mr-2 h-4 w-4" /> Gérer les lots
            </Button>
          </CardHeader>
          <CardContent>
            {assignedLotNames.length > 0 ? (
              <div className="space-y-2">
                {assignedLotNames.map((lotName, index) => (
                  <div key={index} className="p-3 border rounded-md bg-muted/30">
                    <h4 className="font-medium">{lotName}</h4>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun type de lot n'est actuellement assigné à ce sous-traitant.</p>
                <Button className="mt-4" onClick={() => {
                    setSelectedLotIds(sousTraitant.assignedLots || []);
                    setIsAssignLotsOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Assigner des types de lots
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isEditInfoOpen} onOpenChange={setIsEditInfoOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier les informations du sous-traitant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditInfoSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nomSociete">Nom de la société</Label>
                  <Input id="edit-nomSociete" name="nomSociete" value={formData.nomSociete} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nomDirigeant">Nom du dirigeant <span className="text-red-500">*</span></Label>
                  <Input id="edit-nomDirigeant" name="nomDirigeant" value={formData.nomDirigeant} onChange={handleFormChange} required/>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telephone">Téléphone</Label>
                  <Input id="edit-telephone" name="telephone" value={formData.telephone} onChange={handleFormChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-adressePostale">Adresse Postale</Label>
                <Textarea id="edit-adressePostale" name="adressePostale" value={formData.adressePostale} onChange={handleFormChange} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" name="notes" value={formData.notes} onChange={handleFormChange} rows={3} />
              </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditInfoOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignLotsOpen} onOpenChange={setIsAssignLotsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assigner les types de lots à {sousTraitant.nomSociete || sousTraitant.nomDirigeant}</DialogTitle>
            <CardDescription>Sélectionnez les types de lots que ce sous-traitant peut réaliser.</CardDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-2">
            {globalLots.length > 0 ? globalLots.map(lot => {
              const isChecked = selectedLotIds.includes(lot.id);
              return (
                <div key={lot.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    id={`lot-assign-${lot.id}`}
                    checked={isChecked}
                    onCheckedChange={() => handleLotSelectionChange(lot.id)}
                  />
                  <Label htmlFor={`lot-assign-${lot.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    {lot.nom}
                  </Label>
                </div>
              );
            }) : <p className="text-muted-foreground text-center">Aucun type de lot n'est défini dans le catalogue. <Link to="/lots" className="underline text-primary">Ajoutez-en ici.</Link></p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAssignLotsOpen(false)}>Annuler</Button>
            <Button onClick={handleAssignLotsSubmit}>Enregistrer les assignations</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}