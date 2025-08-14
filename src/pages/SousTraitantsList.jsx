import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Briefcase, ListChecks } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";

export function SousTraitantsList() {
  const { sousTraitants, lots: globalLots, addSousTraitant, updateSousTraitant, deleteSousTraitant, loading, assignLotsToSousTraitant } = useChantier();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSousTraitant, setEditingSousTraitant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLotIds, setSelectedLotIds] = useState([]);
  
  const [formData, setFormData] = useState({
    nomSociete: '',
    nomDirigeant: '',
    email: '',
    telephone: '',
    adressePostale: '',
    notes: '',
    assignedLots: []
  });

  const filteredSousTraitants = useMemo(() => {
    return sousTraitants.filter(st => {
      const term = searchTerm.toLowerCase();
      const assignedLotNames = (st.assignedLots || [])
        .map(lotId => globalLots.find(l => l.id === lotId)?.nom)
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (st.nomSociete?.toLowerCase().includes(term) ||
             st.nomDirigeant?.toLowerCase().includes(term) ||
             st.email?.toLowerCase().includes(term) ||
             assignedLotNames.includes(term));
    });
  }, [sousTraitants, globalLots, searchTerm]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLotSelectionChange = (lotId) => {
    setSelectedLotIds(prev => 
      prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
    );
  };

  const resetForm = () => {
    setFormData({
      nomSociete: '',
      nomDirigeant: '',
      email: '',
      telephone: '',
      adressePostale: '',
      notes: '',
      assignedLots: []
    });
    setSelectedLotIds([]);
  };

  const handleOpenForm = (sousTraitant = null) => {
    if (sousTraitant) {
      setEditingSousTraitant(sousTraitant);
      setFormData({
        nomSociete: sousTraitant.nomSociete || '',
        nomDirigeant: sousTraitant.nomDirigeant || '',
        email: sousTraitant.email || '',
        telephone: sousTraitant.telephone || '',
        adressePostale: sousTraitant.adressePostale || '',
        notes: sousTraitant.notes || '',
        assignedLots: sousTraitant.assignedLots || []
      });
      setSelectedLotIds(sousTraitant.assignedLots || []);
    } else {
      setEditingSousTraitant(null);
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData, assignedLots: selectedLotIds };
    if (editingSousTraitant) {
      updateSousTraitant(editingSousTraitant.id, dataToSubmit);
    } else {
      addSousTraitant(dataToSubmit);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce sous-traitant ?")) {
      deleteSousTraitant(id);
    }
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Annuaire des Sous-traitants</h1>
          <p className="text-muted-foreground">Gérez tous vos contacts professionnels et leurs compétences.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau sous-traitant
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, email, lot...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 max-w-md"
        />
      </div>

      {filteredSousTraitants.length > 0 ? (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredSousTraitants.map(st => {
            const stAssignedLots = (st.assignedLots || [])
              .map(lotId => globalLots.find(l => l.id === lotId)?.nom)
              .filter(Boolean);
            return (
            <Card key={st.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(st.nomSociete || st.nomDirigeant)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        <Link to={`/sous-traitant-details/${st.id}`} className="hover:underline">
                          {st.nomSociete || st.nomDirigeant}
                        </Link>
                      </CardTitle>
                      {st.nomSociete && st.nomDirigeant && <CardDescription>{st.nomDirigeant}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1 items-end">
                     <Button variant="ghost" size="icon" onClick={() => handleOpenForm(st)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(st.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow">
                {st.email && (
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${st.email}`} className="hover:underline truncate">{st.email}</a>
                  </div>
                )}
                {st.telephone && (
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${st.telephone}`} className="hover:underline">{st.telephone}</a>
                  </div>
                )}
                {st.adressePostale && (
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{st.adressePostale}</span>
                  </div>
                )}
                 {stAssignedLots.length > 0 && (
                  <div className="flex items-start pt-2 mt-2 border-t">
                    <ListChecks className="mr-2 h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Lots principaux :</span>
                      <ul className="list-disc list-inside ml-1 text-xs">
                        {stAssignedLots.slice(0, 2).map(lotName => <li key={lotName}>{lotName}</li>)}
                        {stAssignedLots.length > 2 && <li>et {stAssignedLots.length - 2} autre(s)</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-4 pt-0">
                 <Button asChild variant="outline" className="w-full">
                    <Link to={`/sous-traitant-details/${st.id}`}>Voir les détails</Link>
                  </Button>
              </div>
            </Card>
          )})}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun sous-traitant trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm 
              ? "Aucun sous-traitant ne correspond à votre recherche." 
              : "Commencez par ajouter des sous-traitants."}
          </p>
          {!searchTerm && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un sous-traitant
            </Button>
          )}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingSousTraitant ? 'Modifier le sous-traitant' : 'Ajouter un sous-traitant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomSociete">Nom de la société</Label>
                <Input id="nomSociete" name="nomSociete" value={formData.nomSociete} onChange={handleFormChange} placeholder="Ex: Entreprise BTP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomDirigeant">Nom du dirigeant <span className="text-red-500">*</span></Label>
                <Input id="nomDirigeant" name="nomDirigeant" value={formData.nomDirigeant} onChange={handleFormChange} placeholder="Ex: Jean Dupont" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="Ex: contact@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleFormChange} placeholder="Ex: 0123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adressePostale">Adresse Postale</Label>
              <Textarea id="adressePostale" name="adressePostale" value={formData.adressePostale} onChange={handleFormChange} placeholder="Ex: 123 Rue de Paris, 75001 Paris" rows={2} />
            </div>
            
            <div className="space-y-2">
                <Label>Types de Lots (Compétences)</Label>
                <CardDescription>Sélectionnez les types de travaux que ce sous-traitant peut réaliser.</CardDescription>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border p-3 rounded-md">
                    {globalLots.length > 0 ? globalLots.map(lot => {
                    const isChecked = selectedLotIds.includes(lot.id);
                    return (
                        <div key={lot.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50">
                        <Checkbox
                            id={`form-lot-${lot.id}`}
                            checked={isChecked}
                            onCheckedChange={() => handleLotSelectionChange(lot.id)}
                        />
                        <Label htmlFor={`form-lot-${lot.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                            {lot.nom}
                        </Label>
                        </div>
                    );
                    }) : <p className="text-xs text-muted-foreground text-center py-2">Aucun type de lot n'est défini dans le catalogue. Veuillez en ajouter via la section 'Lots'.</p>}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Informations complémentaires..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
              <Button type="submit">{editingSousTraitant ? 'Enregistrer les modifications' : 'Ajouter le sous-traitant'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}