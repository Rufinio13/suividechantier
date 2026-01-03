// src/pages/SAVList.jsx
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useSAV } from "@/context/SAVContext.jsx";
import { useChantier } from "@/context/ChantierContext.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Wrench, Search, Filter, CheckCircle, Clock, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

function SAVFormModal({ isOpen, onClose, savItem, onSubmit }) {
  const { sousTraitants } = useChantier();
  
  // ✅ Trier les artisans par ordre alphabétique
  const sousTraitantsTriés = useMemo(() => {
    return [...sousTraitants].sort((a, b) => {
      const nomA = a.nomsocieteST || `${a.PrenomST} ${a.nomST}`;
      const nomB = b.nomsocieteST || `${b.PrenomST} ${b.nomST}`;
      return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
    });
  }, [sousTraitants]);
  
  const [formData, setFormData] = useState({
    nomClient: "",
    dateOuverture: "",
    description: "",
    soustraitant_id: "", // ✅ Remplace responsable
    datePrevisionnelle: "",
    constructeur_valide: false,
    notes: "",
    constructeur_valide_date: null,
  });

  useEffect(() => {
    if (savItem) {
      setFormData({
        nomClient: savItem.nomClient || "",
        dateOuverture: savItem.dateOuverture
          ? format(parseISO(savItem.dateOuverture), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        description: savItem.description || "",
        soustraitant_id: savItem.soustraitant_id || "",
        datePrevisionnelle: savItem.datePrevisionnelle
          ? format(parseISO(savItem.datePrevisionnelle), "yyyy-MM-dd")
          : "",
        constructeur_valide: savItem.constructeur_valide || false,
        notes: savItem.notes || "",
        constructeur_valide_date: savItem.constructeur_valide_date || null,
      });
    } else {
      setFormData({
        nomClient: "",
        dateOuverture: format(new Date(), "yyyy-MM-dd"),
        description: "",
        soustraitant_id: "",
        datePrevisionnelle: "",
        constructeur_valide: false,
        notes: "",
        constructeur_valide_date: null,
      });
    }
  }, [savItem, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleConstructeurValideChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      constructeur_valide: checked,
      constructeur_valide_date: checked ? new Date().toISOString() : null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{savItem ? "Modifier la demande SAV" : "Nouvelle demande SAV"}</DialogTitle>
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
          
          {/* ✅ Sélecteur Sous-traitant */}
          <div>
            <Label htmlFor="soustraitant_id">Artisan assigné</Label>
            <Select
              value={formData.soustraitant_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, soustraitant_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un artisan..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="">Aucun</SelectItem>
                {sousTraitantsTriés.map(st => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Checkbox 
              id="constructeur_valide" 
              checked={formData.constructeur_valide} 
              onCheckedChange={handleConstructeurValideChange} 
            />
            <Label htmlFor="constructeur_valide">SAV validé</Label>
          </div>
          {formData.constructeur_valide && formData.constructeur_valide_date && (
            <p className="text-xs text-muted-foreground">
              Validé le: {format(parseISO(formData.constructeur_valide_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{savItem ? "Enregistrer les modifications" : "Ajouter la demande"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SAVList() {
  const { demandesSAV, addSAV, updateSAV, deleteSAV, loading } = useSAV();
  const { sousTraitants } = useChantier();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSAV, setEditingSAV] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("ouvert");

  const handleOpenModal = (savItem = null) => {
    setEditingSAV(savItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingSAV(null);
    setIsModalOpen(false);
  };

  const handleSubmitSAV = async (data) => {
    if (editingSAV?.id) {
      await updateSAV(editingSAV.id, data);
    } else {
      await addSAV(data);
    }
  };

  const handleDeleteSAV = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette demande SAV ?")) {
      await deleteSAV(id);
    }
  };

  const handleToggleConstructeurValide = async (savItem, checked) => {
    await updateSAV(savItem.id, {
      ...savItem,
      constructeur_valide: checked,
      constructeur_valide_date: checked ? new Date().toISOString() : null,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try { return format(parseISO(dateString), "dd MMMM yyyy", { locale: fr }); } 
    catch { return "Date invalide"; }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try { return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: fr }); } 
    catch { return "Date invalide"; }
  };

  const getArtisanNom = (soustraitantId) => {
    if (!soustraitantId) return null;
    const st = sousTraitants.find(s => s.id === soustraitantId);
    return st ? (st.nomsocieteST || `${st.PrenomST} ${st.nomST}`) : 'Inconnu';
  };

  const filteredSAV = useMemo(() => {
    return (demandesSAV || [])
      .filter(sav => {
        const matchesSearch = sav.nomClient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              sav.description.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterStatut === "tous") return matchesSearch;
        if (filterStatut === "ouvert") return matchesSearch && !sav.constructeur_valide;
        if (filterStatut === "valide") return matchesSearch && sav.constructeur_valide;
        return false;
      })
      .sort((a, b) => new Date(b.dateOuverture) - new Date(a.dateOuverture));
  }, [demandesSAV, searchTerm, filterStatut]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des demandes SAV...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Après-Vente (SAV)</h1>
          <p className="text-muted-foreground">Gérez toutes les demandes de service après-vente.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande SAV
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom de client..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger>
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrer par statut" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ouvert">En cours</SelectItem>
              <SelectItem value="valide">Validés</SelectItem>
              <SelectItem value="tous">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des SAV */}
      <div className="space-y-4">
        {filteredSAV.length > 0 ? (
          filteredSAV.map((sav) => (
            <motion.div key={sav.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} layout>
              <Card className={`hover:shadow-md transition-shadow ${
                sav.constructeur_valide 
                  ? 'bg-green-50 border-green-200' 
                  : sav.artisan_termine 
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-orange-50 border-orange-200'
              }`}>
                <CardHeader className="pb-2 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{sav.nomClient}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ouvert le {formatDate(sav.dateOuverture)}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sav)} className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSAV(sav.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Description:</strong> {sav.description || "Aucune description"}</p>
                  
                  {/* ✅ Artisan assigné */}
                  {sav.soustraitant_id && (
                    <p className="text-orange-700 font-medium">
                      👷 <strong>Artisan:</strong> {getArtisanNom(sav.soustraitant_id)}
                    </p>
                  )}

                  {/* Date prévisionnelle constructeur */}
                  {sav.datePrevisionnelle && (
                    <p><strong>Date prévisionnelle:</strong> {formatDate(sav.datePrevisionnelle)}</p>
                  )}

                  {/* ✅ Date intervention artisan (sous la date prévisionnelle) */}
                  {sav.artisan_date_intervention && (
                    <p className="flex items-center gap-2 text-blue-700">
                      <Calendar className="h-4 w-4" />
                      <strong>Intervention prévue (artisan):</strong> {formatDate(sav.artisan_date_intervention)}
                    </p>
                  )}

                  {/* ✅ Statut artisan terminé */}
                  {sav.artisan_termine && (
                    <div className="p-2 bg-yellow-100 border border-yellow-300 rounded-md mt-2">
                      <p className="flex items-center gap-2 text-yellow-800 font-semibold text-xs">
                        <CheckCircle className="h-4 w-4" />
                        Intervention terminée par l'artisan le {formatDateTime(sav.artisan_termine_date)}
                      </p>
                      {sav.artisan_commentaire && (
                        <p className="text-xs text-slate-700 mt-1">
                          <strong>Commentaire:</strong> {sav.artisan_commentaire}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ✅ Photos artisan */}
                  {sav.artisan_photos && sav.artisan_photos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">📸 Photos intervention :</p>
                      <div className="flex gap-2 flex-wrap">
                        {sav.artisan_photos.map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo.url} 
                            alt={`SAV ${i+1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {sav.notes && (
                    <p className="text-xs text-muted-foreground"><strong>Notes:</strong> {sav.notes}</p>
                  )}
                  
                  {/* ✅ Validation constructeur */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox 
                      id={`valide-${sav.id}`} 
                      checked={sav.constructeur_valide} 
                      onCheckedChange={(checked) => handleToggleConstructeurValide(sav, checked)} 
                    />
                    <Label 
                      htmlFor={`valide-${sav.id}`} 
                      className={`${sav.constructeur_valide ? 'text-green-600' : 'text-orange-600'} font-semibold cursor-pointer`}
                    >
                      {sav.constructeur_valide ? '✅ SAV Validé' : '⏳ Valider le SAV'}
                    </Label>
                  </div>
                  
                  {sav.constructeur_valide && sav.constructeur_valide_date && (
                    <p className="text-xs text-green-600">
                      Validé le {formatDateTime(sav.constructeur_valide_date)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-10">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterStatut !== "tous" 
                ? "Aucune demande SAV ne correspond à vos critères de recherche" 
                : "Aucune demande SAV trouvée"}
            </p>
            {(searchTerm || filterStatut !== "ouvert") && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatut("ouvert");
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <SAVFormModal isOpen={isModalOpen} onClose={handleCloseModal} savItem={editingSAV} onSubmit={handleSubmitSAV} />
      )}
    </div>
  );
}