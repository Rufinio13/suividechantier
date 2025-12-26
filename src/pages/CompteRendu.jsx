import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useCompteRendu } from '@/context/CompteRenduContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadCR } from '@/components/compte-rendu/ImageUploadCR.jsx';
import { ArrowLeft, Plus, Calendar, Edit, Trash2, Search, Camera, FileText, Download, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

export function CompteRendu({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { chantiers } = useChantier();
  const {
    getComptesRendusByChantier,
    addCompteRendu,
    updateCompteRendu,
    deleteCompteRendu,
    loading
  } = useCompteRendu();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCompteRendu, setEditingCompteRendu] = useState(null);
  const [viewingCompteRendu, setViewingCompteRendu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);
  const comptesRendus = useMemo(() => getComptesRendusByChantier(chantierId), [chantierId, getComptesRendusByChantier]);

  const filteredComptesRendus = useMemo(() => {
    return comptesRendus.filter(cr => {
      const search = searchTerm.toLowerCase();
      return (
        cr.titre?.toLowerCase().includes(search) ||
        cr.description?.toLowerCase().includes(search) ||
        cr.participants?.toLowerCase().includes(search)
      );
    });
  }, [comptesRendus, searchTerm]);

  // =========================================
  // GESTION MODALE CRÉATION/ÉDITION
  // =========================================
  const handleOpenModal = (compteRendu = null) => {
    if (compteRendu) {
      setEditingCompteRendu({
        id: compteRendu.id,
        titre: compteRendu.titre,
        description: compteRendu.description || '',
        participants: compteRendu.participants || '',
        observations: compteRendu.observations || '',
        decisions: compteRendu.decisions || '',
        photos: compteRendu.photos || []
      });
    } else {
      setEditingCompteRendu({
        id: null,
        titre: '',
        description: '',
        participants: '',
        observations: '',
        decisions: '',
        photos: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompteRendu(null);
  };

  const handleSaveCompteRendu = async (e) => {
    e.preventDefault();
    if (!editingCompteRendu) return;

    if (!editingCompteRendu.titre.trim()) {
      alert('Le titre est obligatoire');
      return;
    }

    try {
      const dataToSave = {
        titre: editingCompteRendu.titre,
        description: editingCompteRendu.description,
        participants: editingCompteRendu.participants,
        observations: editingCompteRendu.observations,
        decisions: editingCompteRendu.decisions,
        photos: editingCompteRendu.photos
      };

      if (editingCompteRendu.id) {
        await updateCompteRendu(editingCompteRendu.id, dataToSave);
      } else {
        await addCompteRendu(chantierId, dataToSave);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du compte rendu');
    }
  };

  const handleDeleteCompteRendu = async (compteRenduId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce compte rendu ?")) {
      try {
        await deleteCompteRendu(compteRenduId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du compte rendu');
      }
    }
  };

  // =========================================
  // VISUALISATION
  // =========================================
  const handleOpenViewModal = (compteRendu) => {
    setViewingCompteRendu(compteRendu);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingCompteRendu(null);
  };

  // =========================================
  // TÉLÉCHARGEMENT PDF
  // =========================================
  const handleDownloadPDF = (cr) => {
    const chantierName = chantier?.nomchantier || 'Chantier inconnu';
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text('Compte rendu de visite', 20, y);
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
      doc.text('Participants :', 20, y);
      y += 8;
      doc.setFontSize(10);
      const participantsLines = doc.splitTextToSize(cr.participants, 170);
      doc.text(participantsLines, 25, y);
      y += participantsLines.length * 5 + 5;
    }

    if (cr.description) {
      doc.setFontSize(12);
      doc.text('Description :', 20, y);
      y += 8;
      doc.setFontSize(10);
      const descLines = doc.splitTextToSize(cr.description, 170);
      doc.text(descLines, 25, y);
      y += descLines.length * 5 + 5;
    }

    if (cr.observations) {
      doc.setFontSize(12);
      doc.text('Observations :', 20, y);
      y += 8;
      doc.setFontSize(10);
      const obsLines = doc.splitTextToSize(cr.observations, 170);
      doc.text(obsLines, 25, y);
      y += obsLines.length * 5 + 5;
    }

    if (cr.decisions) {
      doc.setFontSize(12);
      doc.text('Décisions / Actions :', 20, y);
      y += 8;
      doc.setFontSize(10);
      const decLines = doc.splitTextToSize(cr.decisions, 170);
      doc.text(decLines, 25, y);
      y += decLines.length * 5 + 5;
    }

    doc.save(`compte-rendu-${cr.titre.replace(/[^a-z0-9]/gi, '-')}.pdf`);
  };

  // =========================================
  // FORMATAGE
  // =========================================
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  if (loading && !isEmbedded) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!chantier && !isEmbedded) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
        <Button asChild className="mt-4">
          <Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
        </Button>
      </div>
    );
  }

  const pageHeader = !isEmbedded ? (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link to={`/chantiers/${chantierId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au chantier
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Comptes rendus de visite</h1>
        <p className="text-muted-foreground">{chantier?.nomchantier}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      <Card className={isEmbedded ? 'shadow-none border-0' : ''}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Comptes Rendus
              </CardTitle>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau compte rendu
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un compte rendu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 max-w-md"
              />
            </div>
          </div>

          {filteredComptesRendus.length > 0 ? (
            <ul className="space-y-3">
              {filteredComptesRendus.map(cr => (
                <li
                  key={cr.id}
                  className="p-4 border rounded-md bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h4 className="font-medium text-sm text-slate-800">{cr.titre}</h4>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Calendar className="mr-1 h-3 w-3" />
                        <span>{formatDate(cr.date)}</span>
                      </div>
                      {cr.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                          {cr.description}
                        </p>
                      )}
                      {cr.photos && cr.photos.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Camera className="h-3 w-3" />
                          <span>{cr.photos.length} photo(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenViewModal(cr)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-700"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(cr)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-700"
                      >
                        <Download size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(cr)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-700"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCompteRendu(cr.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm
                ? "Aucun compte rendu ne correspond à votre recherche."
                : "Aucun compte rendu pour ce chantier pour le moment."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* MODALE CRÉATION/ÉDITION */}
      {isModalOpen && editingCompteRendu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <Card
            className="w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>
                {editingCompteRendu.id ? 'Modifier le compte rendu' : 'Nouveau compte rendu'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompteRendu} className="space-y-4">
                <div>
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={editingCompteRendu.titre}
                    onChange={(e) => setEditingCompteRendu(prev => ({
                      ...prev,
                      titre: e.target.value
                    }))}
                    placeholder="Titre du compte rendu"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingCompteRendu.description}
                    onChange={(e) => setEditingCompteRendu(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Description de la visite"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="participants">Participants</Label>
                  <Textarea
                    id="participants"
                    value={editingCompteRendu.participants}
                    onChange={(e) => setEditingCompteRendu(prev => ({
                      ...prev,
                      participants: e.target.value
                    }))}
                    placeholder="Liste des participants"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="observations">Observations</Label>
                  <Textarea
                    id="observations"
                    value={editingCompteRendu.observations}
                    onChange={(e) => setEditingCompteRendu(prev => ({
                      ...prev,
                      observations: e.target.value
                    }))}
                    placeholder="Observations lors de la visite"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="decisions">Décisions et actions</Label>
                  <Textarea
                    id="decisions"
                    value={editingCompteRendu.decisions}
                    onChange={(e) => setEditingCompteRendu(prev => ({
                      ...prev,
                      decisions: e.target.value
                    }))}
                    placeholder="Décisions prises et actions à mener"
                    rows={3}
                  />
                </div>

                {/* ✅ NOUVEAU : Utilisation de ImageUploadCR */}
                <div>
                  <Label className="mb-2">Photos</Label>
                  <ImageUploadCR
                    chantierId={chantierId}
                    photos={editingCompteRendu.photos || []}
                    onPhotosChange={(newPhotos) => setEditingCompteRendu(prev => ({
                      ...prev,
                      photos: newPhotos
                    }))}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingCompteRendu.id ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* MODALE VISUALISATION */}
      {isViewModalOpen && viewingCompteRendu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={handleCloseViewModal}
        >
          <Card
            className="w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{viewingCompteRendu.titre}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(viewingCompteRendu.date)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewingCompteRendu.description && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {viewingCompteRendu.description}
                  </p>
                </div>
              )}

              {viewingCompteRendu.participants && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Participants</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {viewingCompteRendu.participants}
                  </p>
                </div>
              )}

              {viewingCompteRendu.observations && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Observations</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {viewingCompteRendu.observations}
                  </p>
                </div>
              )}

              {viewingCompteRendu.decisions && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Décisions et actions</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {viewingCompteRendu.decisions}
                  </p>
                </div>
              )}

              {/* ✅ NOUVEAU : Affichage des photos avec images */}
              {viewingCompteRendu.photos && viewingCompteRendu.photos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Photos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingCompteRendu.photos.map((photo, index) => (
                      <div key={index} className="space-y-1">
                        <img 
                          src={photo.url} 
                          alt={photo.description || `Photo ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-md border cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(photo.url, '_blank')}
                        />
                        {photo.description && (
                          <p className="text-xs text-slate-600">{photo.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseViewModal}>
                  Fermer
                </Button>
                <Button onClick={() => handleDownloadPDF(viewingCompteRendu)}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
                <Button onClick={() => {
                  handleCloseViewModal();
                  handleOpenModal(viewingCompteRendu);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}