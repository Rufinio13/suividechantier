import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Calendar, Edit, Trash2, Search, Camera, X, Image, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

export function CompteRendu() {
  const { id } = useParams();
  const { chantiers, comptesRendus, addCompteRendu, updateCompteRendu, deleteCompteRendu, loading } = useChantier();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCompteRendu, setSelectedCompteRendu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    participants: '',
    observations: '',
    decisions: '',
    photos: []
  });

  const chantier = chantiers.find(c => c.id === id);
  const chantiersCompteRendus = comptesRendus.filter(cr => cr.chantierId === id);

  const filteredCompteRendus = chantiersCompteRendus.filter(cr => {
    return cr.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cr.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!chantier) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Chantier non trouvé</h2>
        <p className="text-muted-foreground mb-6">Le chantier que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/chantiers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste des chantiers
          </Link>
        </Button>
      </div>
    );
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPhoto = () => {
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, { description: '', url: '' }]
    }));
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoChange = (index, field, value) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      newPhotos[index] = { ...newPhotos[index], [field]: value };
      return { ...prev, photos: newPhotos };
    });
  };

  const handleAddCompteRendu = (e) => {
    e.preventDefault();
    addCompteRendu({
      ...formData,
      chantierId: id
    });
    setFormData({
      titre: '',
      description: '',
      participants: '',
      observations: '',
      decisions: '',
      photos: []
    });
    setIsAddDialogOpen(false);
  };

  const handleEditCompteRendu = (e) => {
    e.preventDefault();
    updateCompteRendu(selectedCompteRendu.id, formData);
    setIsEditDialogOpen(false);
  };

  const handleDeleteCompteRendu = (compteRenduId) => {
    deleteCompteRendu(compteRenduId);
  };

  const openEditDialog = (compteRendu) => {
    setSelectedCompteRendu(compteRendu);
    setFormData({
      titre: compteRendu.titre,
      description: compteRendu.description || '',
      participants: compteRendu.participants || '',
      observations: compteRendu.observations || '',
      decisions: compteRendu.decisions || '',
      photos: compteRendu.photos || []
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (compteRendu) => {
    setSelectedCompteRendu(compteRendu);
    setIsViewDialogOpen(true);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

const handleDownloadCompteRendu = (cr) => {
  const chantierName = chantier?.nom || 'Chantier inconnu';
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text(`Compte rendu de visite`, 20, y);
  y += 10;

  doc.setFontSize(12);
  doc.text(`Chantier : ${chantierName}`, 20, y);
  y += 10;

  doc.text(`Titre : ${cr.titre}`, 20, y);
  y += 10;

  if (cr.date) {
    doc.text(`Date : ${formatDate(cr.date)}`, 20, y);
    y += 10;
  }

  if (cr.participants) {
    doc.text(`Participants :`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(cr.participants, 170), 25, y);
    y += doc.splitTextToSize(cr.participants, 170).length * 5 + 5;
  }

  if (cr.description) {
    doc.setFontSize(12);
    doc.text(`Description :`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(cr.description, 170), 25, y);
    y += doc.splitTextToSize(cr.description, 170).length * 5 + 5;
  }

  if (cr.observations) {
    doc.setFontSize(12);
    doc.text(`Observations :`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(cr.observations, 170), 25, y);
    y += doc.splitTextToSize(cr.observations, 170).length * 5 + 5;
  }

  if (cr.decisions) {
    doc.setFontSize(12);
    doc.text(`Décisions / Actions :`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(cr.decisions, 170), 25, y);
    y += doc.splitTextToSize(cr.decisions, 170).length * 5 + 5;
  }

  doc.save(`compte-rendu-${chantierName}.pdf`);
};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link to={`/chantiers/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au chantier
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Comptes rendus de visite</h1>
          <p className="text-muted-foreground">{chantier.nom}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau compte rendu
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un compte rendu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 max-w-md"
        />
      </div>

      {filteredCompteRendus.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompteRendus.map(compteRendu => (
            <motion.div
              key={compteRendu.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-hover"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{compteRendu.titre}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(compteRendu)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCompteRendu(compteRendu.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{formatDate(compteRendu.date)}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-3">
                    {compteRendu.description && (
                      <p className="text-sm line-clamp-2">{compteRendu.description}</p>
                    )}
                    
                    {compteRendu.photos && compteRendu.photos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{compteRendu.photos.length} photo(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 mt-auto flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="w-full" onClick={() => openViewDialog(compteRendu)}>
                    Voir le détail
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => handleDownloadCompteRendu(compteRendu)}>
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun compte rendu trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm 
              ? "Aucun compte rendu ne correspond à votre recherche." 
              : "Commencez par ajouter des comptes rendus de visite pour votre chantier."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau compte rendu
            </Button>
          )}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nouveau compte rendu de visite</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCompteRendu} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
            <div className="space-y-2">
              <Label htmlFor="titre">Titre</Label>
              <Input
                id="titre"
                name="titre"
                value={formData.titre}
                onChange={handleFormChange}
                placeholder="Titre du compte rendu"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Description de la visite"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="participants">Participants</Label>
              <Textarea
                id="participants"
                name="participants"
                value={formData.participants}
                onChange={handleFormChange}
                placeholder="Liste des participants à la visite"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleFormChange}
                placeholder="Observations lors de la visite"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="decisions">Décisions et actions</Label>
              <Textarea
                id="decisions"
                name="decisions"
                value={formData.decisions}
                onChange={handleFormChange}
                placeholder="Décisions prises et actions à mener"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Photos</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPhoto}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une photo
                </Button>
              </div>
              
              {formData.photos.length > 0 ? (
                <div className="space-y-4 mt-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex flex-col space-y-2 p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={`photo-desc-${index}`}>Description de la photo</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        id={`photo-desc-${index}`}
                        value={photo.description}
                        onChange={(e) => handlePhotoChange(index, 'description', e.target.value)}
                        placeholder="Description de la photo"
                      />
                      <div className="mt-2">
                        <img  alt="Photo du chantier" className="w-full h-32 object-cover rounded-md bg-gray-100 flex items-center justify-center" src="https://images.unsplash.com/photo-1674576991623-b3c74a056923" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border rounded-md border-dashed">
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune photo ajoutée</p>
                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={handleAddPhoto}>
                    Ajouter une photo
                  </Button>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button type="submit">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le compte rendu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCompteRendu} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
            <div className="space-y-2">
              <Label htmlFor="edit-titre">Titre</Label>
              <Input
                id="edit-titre"
                name="titre"
                value={formData.titre}
                onChange={handleFormChange}
                placeholder="Titre du compte rendu"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Description de la visite"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-participants">Participants</Label>
              <Textarea
                id="edit-participants"
                name="participants"
                value={formData.participants}
                onChange={handleFormChange}
                placeholder="Liste des participants à la visite"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-observations">Observations</Label>
              <Textarea
                id="edit-observations"
                name="observations"
                value={formData.observations}
                onChange={handleFormChange}
                placeholder="Observations lors de la visite"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-decisions">Décisions et actions</Label>
              <Textarea
                id="edit-decisions"
                name="decisions"
                value={formData.decisions}
                onChange={handleFormChange}
                placeholder="Décisions prises et actions à mener"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Photos</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPhoto}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une photo
                </Button>
              </div>
              
              {formData.photos.length > 0 ? (
                <div className="space-y-4 mt-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex flex-col space-y-2 p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={`edit-photo-desc-${index}`}>Description de la photo</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        id={`edit-photo-desc-${index}`}
                        value={photo.description}
                        onChange={(e) => handlePhotoChange(index, 'description', e.target.value)}
                        placeholder="Description de la photo"
                      />
                      <div className="mt-2">
                        <img  alt={photo.description || `Photo du chantier ${index + 1}`} className="w-full h-32 object-cover rounded-md bg-gray-100 flex items-center justify-center" src="https://images.unsplash.com/photo-1674576991623-b3c74a056923" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border rounded-md border-dashed">
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune photo ajoutée</p>
                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={handleAddPhoto}>
                    Ajouter une photo
                  </Button>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button type="submit">Mettre à jour</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedCompteRendu && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{selectedCompteRendu.titre}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(selectedCompteRendu.date)}
              </p>
            </DialogHeader>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
              {selectedCompteRendu.description && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm">{selectedCompteRendu.description}</p>
                </div>
              )}
              
              {selectedCompteRendu.participants && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Participants</h3>
                  <p className="text-sm">{selectedCompteRendu.participants}</p>
                </div>
              )}
              
              {selectedCompteRendu.observations && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Observations</h3>
                  <p className="text-sm">{selectedCompteRendu.observations}</p>
                </div>
              )}
              
              {selectedCompteRendu.decisions && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Décisions et actions</h3>
                  <p className="text-sm">{selectedCompteRendu.decisions}</p>
                </div>
              )}
              
              {selectedCompteRendu.photos && selectedCompteRendu.photos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Photos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedCompteRendu.photos.map((photo, index) => (
                      <div key={index} className="border rounded-md overflow-hidden">
                        <img  alt={photo.description || `Photo du chantier ${index + 1}`} className="w-full h-48 object-cover" src="https://images.unsplash.com/photo-1680711942353-a322c57a8c58" />
                        {photo.description && (
                          <div className="p-2 text-sm">{photo.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fermer
              </Button>
              <Button onClick={() => handleDownloadCompteRendu(selectedCompteRendu)}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(selectedCompteRendu);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}