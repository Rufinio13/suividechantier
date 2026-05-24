// src/pages/SAVList.jsx
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useSAV } from "@/context/SAVContext.jsx";
import { useChantier } from "@/context/ChantierContext.jsx";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { sendNotificationEmail, getArtisanEmailInfo } from "@/lib/sendNotificationEmail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Wrench, Search, Filter, CheckCircle, Calendar, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

function SAVFormModal({ isOpen, onClose, savItem, onSubmit }) {
  const { sousTraitants } = useChantier();
  const sousTraitantsTriés = useMemo(() => [...sousTraitants].sort((a, b) => {
    const nomA = a.nomsocieteST || `${a.PrenomST} ${a.nomST}`;
    const nomB = b.nomsocieteST || `${b.PrenomST} ${b.nomST}`;
    return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
  }), [sousTraitants]);

  const [formData, setFormData] = useState({
    nomClient: "", dateOuverture: "", descriptions: [{ texte: '', checked: false }],
    soustraitant_id: "", datePrevisionnelle: "", constructeur_valide: false, constructeur_valide_date: null,
  });

  useEffect(() => {
    if (savItem) {
      let descriptions = [];
      try { descriptions = typeof savItem.description === 'string' ? JSON.parse(savItem.description) : savItem.description; }
      catch { descriptions = [{ texte: savItem.description || '', checked: false }]; }
      setFormData({
        nomClient: savItem.nomClient || "",
        dateOuverture: savItem.dateOuverture ? format(parseISO(savItem.dateOuverture), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        descriptions,
        soustraitant_id: savItem.soustraitant_id || "",
        datePrevisionnelle: savItem.datePrevisionnelle ? format(parseISO(savItem.datePrevisionnelle), "yyyy-MM-dd") : "",
        constructeur_valide: savItem.constructeur_valide || false,
        constructeur_valide_date: savItem.constructeur_valide_date || null,
      });
    } else {
      setFormData({ nomClient: "", dateOuverture: format(new Date(), "yyyy-MM-dd"), descriptions: [{ texte: '', checked: false }], soustraitant_id: "", datePrevisionnelle: "", constructeur_valide: false, constructeur_valide_date: null });
    }
  }, [savItem, isOpen]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleConstructeurValideChange = (checked) => setFormData(prev => ({ ...prev, constructeur_valide: checked, constructeur_valide_date: checked ? new Date().toISOString() : null }));
  const handleAddLigne = () => setFormData(prev => ({ ...prev, descriptions: [...prev.descriptions, { texte: '', checked: false }] }));
  const handleRemoveLigne = (index) => setFormData(prev => ({ ...prev, descriptions: prev.descriptions.filter((_, i) => i !== index) }));
  const handleChangeLigneTexte = (index, texte) => setFormData(prev => ({ ...prev, descriptions: prev.descriptions.map((ligne, i) => i === index ? { ...ligne, texte } : ligne) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const descriptionsValides = formData.descriptions.filter(d => d.texte.trim());
    if (descriptionsValides.length === 0) { alert('Veuillez ajouter au moins une ligne de description'); return; }
    await onSubmit({ ...formData, descriptions: descriptionsValides });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{savItem ? "Modifier la demande SAV" : "Nouvelle demande SAV"}</DialogTitle>
          <DialogDescription>{savItem ? "Modifiez les informations de la demande SAV" : "Créez une nouvelle demande de service après-vente"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <div><Label htmlFor="nomClient">Nom du Client <span className="text-red-500">*</span></Label><Input id="nomClient" name="nomClient" value={formData.nomClient} onChange={handleChange} required /></div>
          <div><Label htmlFor="dateOuverture">Date d'ouverture <span className="text-red-500">*</span></Label><Input id="dateOuverture" name="dateOuverture" type="date" value={formData.dateOuverture} onChange={handleChange} required /></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Descriptions du SAV <span className="text-red-500">*</span></Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLigne}><Plus className="mr-1 h-4 w-4" /> Ajouter une ligne</Button>
            </div>
            <div className="space-y-2">
              {formData.descriptions.map((ligne, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={ligne.texte} onChange={(e) => handleChangeLigneTexte(index, e.target.value)} placeholder={`Description ${index + 1}...`} className="flex-1" />
                  {formData.descriptions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLigne(index)} className="text-red-600 hover:text-red-700"><X size={18} /></Button>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="soustraitant_id">Artisan assigné</Label>
            <select id="soustraitant_id" name="soustraitant_id" value={formData.soustraitant_id} onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <option value="">Aucun</option>
              {sousTraitantsTriés.map(st => <option key={st.id} value={st.id}>{st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}</option>)}
            </select>
          </div>
          <div><Label htmlFor="datePrevisionnelle">Date prévisionnelle d'intervention</Label><Input id="datePrevisionnelle" name="datePrevisionnelle" type="date" value={formData.datePrevisionnelle} onChange={handleChange} /></div>
          <div className="flex items-center space-x-2">
            <Checkbox id="constructeur_valide" checked={formData.constructeur_valide} onCheckedChange={handleConstructeurValideChange} />
            <Label htmlFor="constructeur_valide">SAV validé</Label>
          </div>
          {formData.constructeur_valide && formData.constructeur_valide_date && (
            <p className="text-xs text-muted-foreground">Validé le: {format(parseISO(formData.constructeur_valide_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
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
  const { demandesSAV, addSAV, updateSAV, deleteSAV, toggleDescriptionLigne, loading } = useSAV();
  const { sousTraitants } = useChantier();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSAV, setEditingSAV] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("ouvert");

  const handleOpenModal = (savItem = null) => { setEditingSAV(savItem); setIsModalOpen(true); };
  const handleCloseModal = () => { setEditingSAV(null); setIsModalOpen(false); };

  const getExpediteurProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('nom, prenom, mail, tel, nomsociete, adresse, ville, code_postal').eq('id', user.id).single();
      return data || null;
    } catch { return null; }
  };

  const handleSubmitSAV = async (data) => {
    const cleanedData = { ...data, soustraitant_id: data.soustraitant_id || null };
    const isNew = !editingSAV?.id;
    const ancienArtisanId = editingSAV?.soustraitant_id || null;
    const nouvelArtisanId = cleanedData.soustraitant_id;

    if (editingSAV?.id) await updateSAV(editingSAV.id, cleanedData);
    else await addSAV(cleanedData);

    // ✅ Email si nouveau SAV avec artisan, ou artisan changé
    const doitEnvoyerEmail = nouvelArtisanId && (isNew || nouvelArtisanId !== ancienArtisanId);
    if (doitEnvoyerEmail) {
      const artisan = sousTraitants.find(st => st.id === nouvelArtisanId);
      const destinataire = await getArtisanEmailInfo(artisan, supabase);
      const expediteur = await getExpediteurProfile();
      const descriptionTexte = data.descriptions.filter(d => d.texte.trim()).map((d, i) => `${i + 1}. ${d.texte}`).join('\n');

      if (destinataire?.email) {
        await sendNotificationEmail('sav', destinataire.email, {
          artisanPrenom: destinataire.prenom, aCompte: destinataire.aCompte,
          titreSAV: data.nomClient, chantierNom: data.nomClient,
          description: descriptionTexte,
          datePrevisionnelle: data.datePrevisionnelle ? format(parseISO(data.datePrevisionnelle), 'dd/MM/yyyy', { locale: fr }) : null,
          expediteur,
        });
        console.log('📧 Email SAV envoyé à:', destinataire.email);
      }
    }
  };

  const handleDeleteSAV = async (id) => { if (window.confirm("Supprimer cette demande SAV ?")) await deleteSAV(id); };
  const handleToggleConstructeurValide = async (savItem, checked) => await updateSAV(savItem.id, { constructeur_valide: checked, constructeur_valide_date: checked ? new Date().toISOString() : null });
  const formatDate = (d) => { try { return format(parseISO(d), "dd MMMM yyyy", { locale: fr }); } catch { return "N/A"; } };
  const formatDateTime = (d) => { try { return format(parseISO(d), "dd/MM/yyyy HH:mm", { locale: fr }); } catch { return "N/A"; } };
  const getArtisanNom = (id) => { if (!id) return null; const st = sousTraitants.find(s => s.id === id); return st ? (st.nomsocieteST || `${st.PrenomST} ${st.nomST}`) : 'Inconnu'; };

  const filteredSAV = useMemo(() => (demandesSAV || [])
    .filter(sav => {
      const m = sav.nomClient.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterStatut === "tous") return m;
      if (filterStatut === "ouvert") return m && !sav.constructeur_valide;
      if (filterStatut === "valide") return m && sav.constructeur_valide;
      return false;
    })
    .sort((a, b) => {
      if (!a.datePrevisionnelle && !b.datePrevisionnelle) return new Date(b.dateOuverture) - new Date(a.dateOuverture);
      if (!a.datePrevisionnelle) return 1; if (!b.datePrevisionnelle) return -1;
      return new Date(a.datePrevisionnelle) - new Date(b.datePrevisionnelle);
    }), [demandesSAV, searchTerm, filterStatut]);

  if (loading) return <div className="flex justify-center items-center h-64">Chargement des demandes SAV...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Après-Vente (SAV)</h1>
          <p className="text-muted-foreground">Gérez toutes les demandes de service après-vente.</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" /> Nouvelle Demande SAV</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom de client..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger><div className="flex items-center"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Filtrer" /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="ouvert">En cours</SelectItem>
              <SelectItem value="valide">Validés</SelectItem>
              <SelectItem value="tous">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-4">
        {filteredSAV.length > 0 ? filteredSAV.map((sav) => {
          let descriptions = [];
          try { descriptions = typeof sav.description === 'string' ? JSON.parse(sav.description) : sav.description; }
          catch { descriptions = [{ texte: sav.description || '', checked: false }]; }
          const nbCoches = descriptions.filter(d => d.checked).length;
          const nbTotal = descriptions.length;
          const toutCoche = nbCoches === nbTotal;
          return (
            <motion.div key={sav.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} layout>
              <Card className={`hover:shadow-md transition-shadow border-2 ${sav.constructeur_valide || toutCoche ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300'}`}>
                <CardHeader className="pb-2 flex flex-row justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{sav.nomClient}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Ouvert le {formatDate(sav.dateOuverture)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 bg-white/50 px-2 py-1 rounded">{nbCoches}/{nbTotal} cochés</span>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sav)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSAV(sav.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div>
                    <p className="font-semibold mb-2">Descriptions:</p>
                    <ul className="space-y-2">
                      {descriptions.map((desc, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Checkbox id={`desc-${sav.id}-${index}`} checked={desc.checked} onCheckedChange={() => toggleDescriptionLigne(sav.id, index)} className="mt-0.5" />
                          <label htmlFor={`desc-${sav.id}-${index}`} className={`flex-1 text-sm cursor-pointer ${toutCoche ? 'text-green-800' : 'text-blue-800'}`}>{desc.texte}</label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {sav.soustraitant_id && <p className="text-orange-700 font-medium">👷 <strong>Artisan:</strong> {getArtisanNom(sav.soustraitant_id)}</p>}
                  {sav.datePrevisionnelle && <p><strong>Date prévisionnelle:</strong> {formatDate(sav.datePrevisionnelle)}</p>}
                  {sav.artisan_date_intervention && <p className="flex items-center gap-2 text-blue-700"><Calendar className="h-4 w-4" /><strong>Intervention prévue (artisan):</strong> {formatDate(sav.artisan_date_intervention)}</p>}
                  {sav.artisan_termine && (
                    <div className="p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                      <p className="flex items-center gap-2 text-yellow-800 font-semibold text-xs"><CheckCircle className="h-4 w-4" />Intervention terminée par l'artisan le {formatDateTime(sav.artisan_termine_date)}</p>
                      {sav.artisan_commentaire && <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap"><strong>Commentaire:</strong> {sav.artisan_commentaire}</p>}
                    </div>
                  )}
                  {sav.artisan_photos?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">📸 Photos intervention :</p>
                      <div className="flex gap-2 flex-wrap">{sav.artisan_photos.map((photo, i) => <img key={i} src={photo.url} alt={`SAV ${i + 1}`} className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => window.open(photo.url, '_blank')} />)}</div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox id={`valide-${sav.id}`} checked={sav.constructeur_valide} onCheckedChange={(checked) => handleToggleConstructeurValide(sav, checked)} />
                    <Label htmlFor={`valide-${sav.id}`} className={`${sav.constructeur_valide ? 'text-green-600' : 'text-orange-600'} font-semibold cursor-pointer`}>
                      {sav.constructeur_valide ? '✅ SAV Validé' : '⏳ Valider le SAV'}
                    </Label>
                  </div>
                  {sav.constructeur_valide && sav.constructeur_valide_date && <p className="text-xs text-green-600">Validé le {formatDateTime(sav.constructeur_valide_date)}</p>}
                </CardContent>
              </Card>
            </motion.div>
          );
        }) : (
          <div className="text-center py-10">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{searchTerm || filterStatut !== "tous" ? "Aucune demande SAV ne correspond à vos critères" : "Aucune demande SAV trouvée"}</p>
            {(searchTerm || filterStatut !== "ouvert") && <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(""); setFilterStatut("ouvert"); }}>Réinitialiser les filtres</Button>}
          </div>
        )}
      </div>
      {isModalOpen && <SAVFormModal isOpen={isModalOpen} onClose={handleCloseModal} savItem={editingSAV} onSubmit={handleSubmitSAV} />}
    </div>
  );
}