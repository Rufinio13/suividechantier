import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Truck, ListChecks, Tag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";

export function FournisseursList() {
  const { fournisseurs, addFournisseur, updateFournisseur, deleteFournisseur, lots: globalLots, loading } = useChantier();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nomSociete: '',
    nomContact: '',
    email: '',
    telephone: '',
    adresse: '',
    assignedLots: []
  });

  const filteredFournisseurs = useMemo(() => {
    return fournisseurs.filter(f => {
      const term = searchTerm.toLowerCase();
      return (f.nomSociete?.toLowerCase().includes(term) ||
             f.nomContact?.toLowerCase().includes(term) ||
             f.email?.toLowerCase().includes(term));
    }).sort((a,b) => a.nomSociete.localeCompare(b.nomSociete));
  }, [fournisseurs, searchTerm]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLotCheckboxChange = (lotId) => {
    setFormData(prev => {
      const newAssignedLots = prev.assignedLots.includes(lotId)
        ? prev.assignedLots.filter(id => id !== lotId)
        : [...prev.assignedLots, lotId];
      return { ...prev, assignedLots: newAssignedLots };
    });
  };

  const resetForm = () => {
    setFormData({
      nomSociete: '',
      nomContact: '',
      email: '',
      telephone: '',
      adresse: '',
      assignedLots: []
    });
  };

  const handleOpenForm = (fournisseur = null) => {
    if (fournisseur) {
      setEditingFournisseur(fournisseur);
      setFormData({
        nomSociete: fournisseur.nomSociete || '',
        nomContact: fournisseur.nomContact || '',
        email: fournisseur.email || '',
        telephone: fournisseur.telephone || '',
        adresse: fournisseur.adresse || '',
        assignedLots: fournisseur.assignedLots || []
      });
    } else {
      setEditingFournisseur(null);
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingFournisseur) {
      updateFournisseur(editingFournisseur.id, formData);
    } else {
      addFournisseur(formData);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const handleDelete = (id) => {
    // TODO: Add warning if fournisseur is used in taches
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      deleteFournisseur(id);
    }
  };
  
  const getInitials = (name) => {
    if (!name) return 'F';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
  };

  if (loading && !fournisseurs.length) { // show loader if loading and no data yet
    return <div className="flex justify-center items-center h-64">Chargement des fournisseurs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Annuaire des Fournisseurs</h1>
          <p className="text-muted-foreground">Gérez tous vos contacts fournisseurs et les types de lots qu'ils proposent.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom société, contact, email...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 max-w-md"
        />
      </div>

      {filteredFournisseurs.length > 0 ? (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredFournisseurs.map(f => {
            const lotsFournis = globalLots.filter(lot => f.assignedLots?.includes(lot.id));
            return (
              <Card key={f.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(f.nomSociete || f.nomContact)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{f.nomSociete}</CardTitle>
                        {f.nomContact && <CardDescription>{f.nomContact}</CardDescription>}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 items-end">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenForm(f)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  {f.email && (
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${f.email}`} className="hover:underline truncate">{f.email}</a>
                    </div>
                  )}
                  {f.telephone && (
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${f.telephone}`} className="hover:underline">{f.telephone}</a>
                    </div>
                  )}
                  {f.adresse && (
                    <div className="flex items-start">
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>{f.adresse}</span>
                    </div>
                  )}
                  {lotsFournis.length > 0 && (
                    <div className="pt-2 mt-2 border-t">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center"><ListChecks className="mr-1.5 h-3.5 w-3.5"/> Lots fournis :</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {lotsFournis.map(lot => (
                                <span key={lot.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center">
                                  <Tag className="mr-1 h-3 w-3"/>{lot.nom}
                                </span>
                            ))}
                        </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun fournisseur trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm 
              ? "Aucun fournisseur ne correspond à votre recherche." 
              : "Commencez par ajouter des fournisseurs."}
          </p>
          {!searchTerm && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un fournisseur
            </Button>
          )}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nomSociete">Nom de la société <span className="text-red-500">*</span></Label>
              <Input id="nomSociete" name="nomSociete" value={formData.nomSociete} onChange={handleFormChange} placeholder="Ex: Matériaux Pro" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomContact">Nom du contact</Label>
              <Input id="nomContact" name="nomContact" value={formData.nomContact} onChange={handleFormChange} placeholder="Ex: Sophie Martin" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="Ex: contact@materiauxpro.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleFormChange} placeholder="Ex: 0123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Textarea id="adresse" name="adresse" value={formData.adresse} onChange={handleFormChange} placeholder="Ex: Zone Industrielle, 75000 Paris" rows={2} />
            </div>

            <div className="space-y-2">
                <Label>Lots fournis par ce fournisseur</Label>
                {globalLots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                        {globalLots.map(lot => (
                            <div key={lot.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`lot-${lot.id}-fournisseur`}
                                    checked={formData.assignedLots.includes(lot.id)}
                                    onCheckedChange={() => handleLotCheckboxChange(lot.id)}
                                />
                                <Label htmlFor={`lot-${lot.id}-fournisseur`} className="text-sm font-normal cursor-pointer">{lot.nom}</Label>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">Aucun type de lot n'a été défini dans le catalogue global.</p>
                )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
              <Button type="submit">{editingFournisseur ? 'Enregistrer les modifications' : 'Ajouter le fournisseur'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}