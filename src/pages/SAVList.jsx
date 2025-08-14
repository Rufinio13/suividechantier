import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Wrench, User, CalendarDays, FileText, CheckSquare, Search, Filter, Camera, PenLine as FilePenLine } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function SAVFormModal({ isOpen, onClose, savItem, onSubmit }) {
  const [formData, setFormData] = useState({
    nomClient: '',
    dateOuverture: '',
    description: '',
    responsable: '',
    datePrevisionnelle: '',
    repriseValidee: false,
    notes: '',
    dateValidationReprise: null,
  });

  React.useEffect(() => {
    if (savItem) {
      setFormData({
        nomClient: savItem.nomClient || '',
        dateOuverture: savItem.dateOuverture ? format(parseISO(savItem.dateOuverture), 'yyyy-MM-dd') : '',
        description: savItem.description || '',
        responsable: savItem.responsable || '',
        datePrevisionnelle: savItem.datePrevisionnelle ? format(parseISO(savItem.datePrevisionnelle), 'yyyy-MM-dd') : '',
        repriseValidee: savItem.repriseValidee || false,
        notes: savItem.notes || '',
        dateValidationReprise: savItem.dateValidationReprise || null,
      });
    } else {
      setFormData({
        nomClient: '',
        dateOuverture: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        responsable: '',
        datePrevisionnelle: '',
        repriseValidee: false,
        notes: '',
        dateValidationReprise: null,
      });
    }
  }, [savItem, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRepriseValideeChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      repriseValidee: checked,
      dateValidationReprise: checked ? new Date().toISOString() : null
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{savItem ? 'Modifier la demande SAV' : 'Nouvelle demande SAV'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="nomClient">Nom du Client <span className="text-red-500">*</span></Label>
            <Input id="nomClient" name="nomClient" value={formData.nomClient} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="dateOuverture">Date d'ouverture <span className="text-red-500">*</span></Label>
            <Input id="dateOuverture" name="dateOuverture" type="date" value={formData.dateOuverture} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="description">Description du SAV <span className="text-red-500">*</span></Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} required />
          </div>
          <div>
            <Label htmlFor="responsable">Responsable du SAV</Label>
            <Input id="responsable" name="responsable" value={formData.responsable} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="datePrevisionnelle">Date prévisionnelle d'intervention</Label>
            <Input id="datePrevisionnelle" name="datePrevisionnelle" type="date" value={formData.datePrevisionnelle} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="repriseValidee" name="repriseValidee" checked={formData.repriseValidee} onCheckedChange={handleRepriseValideeChange} />
            <Label htmlFor="repriseValidee">Reprise validée</Label>
          </div>
          {formData.repriseValidee && formData.dateValidationReprise && (
            <p className="text-xs text-muted-foreground">
              Validée le: {format(parseISO(formData.dateValidationReprise), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{savItem ? 'Enregistrer les modifications' : 'Ajouter la demande'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export function SAVList() {
  const { demandesSAV, addDemandeSAV, updateDemandeSAV, deleteDemandeSAV, loading } = useChantier();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSAV, setEditingSAV] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('ouvert'); // 'ouvert', 'valide', 'tous'

  const handleOpenModal = (savItem = null) => {
    setEditingSAV(savItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingSAV(null);
    setIsModalOpen(false);
  };

  const handleSubmitSAV = (data) => {
    if (editingSAV) {
      updateDemandeSAV(editingSAV.id, data);
    } else {
      addDemandeSAV(data);
    }
  };

  const handleDeleteSAV = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette demande SAV ?")) {
      deleteDemandeSAV(id);
    }
  };

  const handleToggleRepriseValidee = (savItem, checked) => {
    updateDemandeSAV(savItem.id, { 
      ...savItem, 
      repriseValidee: checked, 
      dateValidationReprise: checked ? new Date().toISOString() : null 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr }); } 
    catch (error) { return 'Date invalide'; }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: fr }); } 
    catch (error) { return 'Date invalide'; }
  };


  const filteredSAV = useMemo(() => {
    return (demandesSAV || [])
      .filter(sav => {
        const matchesSearch = sav.nomClient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              sav.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (sav.responsable && sav.responsable.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filterStatut === 'tous') return matchesSearch;
        if (filterStatut === 'ouvert') return matchesSearch && !sav.repriseValidee;
        if (filterStatut === 'valide') return matchesSearch && sav.repriseValidee;
        return false;
      })
      .sort((a, b) => new Date(b.dateOuverture) - new Date(a.dateOuverture));
  }, [demandesSAV, searchTerm, filterStatut]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des demandes SAV...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Après-Vente (SAV)</h1>
          <p className="text-muted-foreground">Gérez toutes les demandes de service après-vente.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande SAV
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Demandes SAV</CardTitle>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, description, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
                <Button variant={filterStatut === 'ouvert' ? 'default' : 'outline'} onClick={() => setFilterStatut('ouvert')} size="sm">Ouvertes</Button>
                <Button variant={filterStatut === 'valide' ? 'default' : 'outline'} onClick={() => setFilterStatut('valide')} size="sm">Validées</Button>
                <Button variant={filterStatut === 'tous' ? 'default' : 'outline'} onClick={() => setFilterStatut('tous')} size="sm">Toutes</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSAV.length > 0 ? (
            <div className="space-y-4">
              {filteredSAV.map(sav => (
                <motion.div
                  key={sav.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  layout
                >
                  <Card className={`hover:shadow-md transition-shadow ${sav.repriseValidee ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{sav.nomClient}</CardTitle>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sav)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSAV(sav.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="flex items-center text-xs">
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Ouvert le: {formatDate(sav.dateOuverture)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><span className="font-medium">Description:</span> {sav.description}</p>
                      {sav.responsable && <p><span className="font-medium">Responsable:</span> {sav.responsable}</p>}
                      {sav.datePrevisionnelle && <p><span className="font-medium">Intervention Prévue le:</span> {formatDate(sav.datePrevisionnelle)}</p>}
                      {sav.notes && <p className="italic text-xs text-gray-600 pt-1 border-t mt-1"><span className="font-medium not-italic text-gray-700">Notes:</span> {sav.notes}</p>}
                      <div className="flex items-center pt-2 space-x-2">
                        <Checkbox 
                            id={`reprise-${sav.id}`} 
                            checked={sav.repriseValidee} 
                            onCheckedChange={(checked) => handleToggleRepriseValidee(sav, checked)}
                        />
                        <Label htmlFor={`reprise-${sav.id}`} className={`${sav.repriseValidee ? 'text-green-600' : 'text-orange-600'} font-semibold cursor-pointer`}>
                            {sav.repriseValidee ? 'Reprise Validée' : 'Valider la reprise'}
                        </Label>
                      </div>
                      {sav.repriseValidee && sav.dateValidationReprise && (
                        <p className="text-xs text-muted-foreground">
                          Validée le: {formatDateTime(sav.dateValidationReprise)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterStatut !== 'ouvert' ? 'Aucune demande SAV ne correspond à vos critères.' : 'Aucune demande SAV en cours.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <SAVFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          savItem={editingSAV}
          onSubmit={handleSubmitSAV}
        />
      )}
    </div>
  );
}