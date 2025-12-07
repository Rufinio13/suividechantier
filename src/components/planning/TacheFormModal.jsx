import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { parseISO, isValid } from "date-fns";
import { calculateDateFinLogic, calculateDureeOuvree } from "@/context/chantierContextLogics/tacheLogics";
import { useSousTraitant } from "@/context/SousTraitantContext";
import { useFournisseur } from "@/context/FournisseurContext";

export function TacheFormModal({
  isOpen,
  onClose,
  tache,
  chantierId,  // ✅ CORRIGÉ : majuscule pour matcher Planning.jsx
  lots: globalLots,
  addTache,
  updateTache
}) {
  console.log("🎯 TacheFormModal reçoit chantierId:", chantierId);
  
  const { sousTraitants } = useSousTraitant();
  const { fournisseurs } = useFournisseur();

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    lotid: "",
    datedebut: "",
    duree: "",
    datefin: "",
    assigneid: "",
    assignetype: "",
    terminee: false,
  });

  // ---------------------------------------------------------
  // INITIALISATION + PRÉ-REMPLISSAGE
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (tache) {
      // ✅ CORRIGÉ : Calcule la durée en jours ouvrés uniquement
      const duree =
        tache.datedebut && tache.datefin
          ? calculateDureeOuvree(tache.datedebut, tache.datefin)
          : "";

      setFormData({
        nom: tache.nom || "",
        description: tache.description || "",
        lotid: tache.lotid || (globalLots?.[0]?.id || ""),
        datedebut: tache.datedebut || "",
        duree,
        datefin: tache.datefin || "",
        assigneid: tache.assigneid || "",
        assignetype: tache.assignetype || "",
        terminee: tache.terminee || false,
      });
    } else {
      setFormData({
        nom: "",
        description: "",
        lotid: globalLots?.[0]?.id || "",
        datedebut: "",
        duree: "",
        datefin: "",
        assigneid: "",
        assignetype: "",
        terminee: false,
      });
    }
  }, [isOpen, tache, globalLots]);

  // ---------------------------------------------------------
  // CALCUL AUTO DE LA DATE DE FIN
  // ---------------------------------------------------------
  useEffect(() => {
    if (formData.datedebut && formData.duree) {
      const fin = calculateDateFinLogic(formData.datedebut, parseInt(formData.duree, 10));
      setFormData(prev => ({ ...prev, datefin: fin }));
    } else {
      setFormData(prev => ({ ...prev, datefin: "" }));
    }
  }, [formData.datedebut, formData.duree]);

  // ---------------------------------------------------------
  // ENTITÉS ASSIGNABLES PAR LOT
  // ---------------------------------------------------------
  const assignableEntities = useMemo(() => {
    if (!formData.lotid) return [];

    const lotObj = globalLots.find(l => l.id === formData.lotid);
    if (!lotObj) return [];

    const lotName = lotObj.lot;

    const stOpts =
      sousTraitants
        ?.filter(st => Array.isArray(st.assigned_lots) && st.assigned_lots.includes(lotName))
        .map(st => ({
          id: st.id,
          nom: st.nomsocieteST || `${st.PrenomST || ""} ${st.nomST || ""}`.trim() || "Artisan",
          assignetype: "soustraitant",
        })) || [];

    const fOpts =
      fournisseurs
        ?.filter(f => Array.isArray(f.assignedlots) && f.assignedlots.includes(lotName))
        .map(f => ({
          id: f.id,
          nom: f.nomsocieteF || f.nomcontact || "Fournisseur",
          assignetype: "fournisseur",
        })) || [];

    return [...stOpts, ...fOpts].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [formData.lotid, sousTraitants, fournisseurs, globalLots]);

  // ---------------------------------------------------------
  // RESET ASSIGNE SI NON VALIDE
  // ---------------------------------------------------------
  useEffect(() => {
    if (formData.assigneid) {
      const stillValid = assignableEntities.some(
        e => e.id === formData.assigneid && e.assignetype === formData.assignetype
      );
      if (!stillValid) {
        setFormData(prev => ({ ...prev, assigneid: "", assignetype: "" }));
      }
    }
  }, [assignableEntities]);

  // ---------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------
  const handleSelectChange = (name, value) => {
    if (name === "assigneCombined") {
      if (value) {
        const [assignetype, assigneid] = value.split(":");
        setFormData(prev => ({ ...prev, assignetype, assigneid }));
      } else {
        setFormData(prev => ({ ...prev, assignetype: "", assigneid: "" }));
      }
    }

    if (name === "lotid") {
      setFormData(prev => ({
        ...prev,
        lotid: value,
        assigneid: "",
        assignetype: "",
      }));
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ---------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------
  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.lotid) {
      alert("Veuillez sélectionner un lot.");
      return;
    }
    
    if (!formData.datedebut || !formData.duree) {
      alert("Veuillez renseigner la date de début et la durée.");
      return;
    }

    const deb = parseISO(formData.datedebut);
    if (!isValid(deb)) {
      alert("Date de début invalide");
      return;
    }

    // ✅ CORRIGÉ : utilise chantierid (minuscule) pour matcher la colonne Supabase
    const payload = {
      nom: formData.nom,
      description: formData.description || null,
      chantierid: chantierId,  // ✅ minuscule pour Supabase
      lotid: formData.lotid,
      datedebut: formData.datedebut,
      datefin: calculateDateFinLogic(formData.datedebut, parseInt(formData.duree, 10)),
      assigneid: formData.assigneid || null,
      assignetype: formData.assignetype || null,
      terminee: formData.terminee,
    };

    console.log("🔍 FormData avant payload:", formData);
    console.log("📤 Payload envoyé à Supabase:", payload);
    console.log("🔍 Type de chantierId:", typeof chantierId, "| Valeur:", chantierId);

    try {
      if (tache) {
        await updateTache(tache.id, payload);
      } else {
        await addTache(payload);
      }
      onClose();
    } catch (err) {
      console.error("❌ Erreur save tâche:", err);
      alert(`Erreur lors de l'enregistrement de la tâche: ${err.message}`);
    }
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{tache ? "Modifier la tâche" : "Ajouter une tâche"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Nom <span className="text-red-500">*</span></Label>
            <Input name="nom" value={formData.nom} onChange={handleChange} required />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" value={formData.description} onChange={handleChange} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date de début <span className="text-red-500">*</span></Label>
              <Input type="date" name="datedebut" value={formData.datedebut} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label>Durée (jours) <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" name="duree" value={formData.duree} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Lot <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.lotid} 
              onValueChange={v => handleSelectChange("lotid", v)} 
              required
              key={`lot-${formData.lotid}`}  // ✅ AJOUTÉ : Force le re-render
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir lot..." />
              </SelectTrigger>
              <SelectContent>
                {globalLots.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.lot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Assigné à</Label>
            <Select
              value={formData.assignetype && formData.assigneid ? `${formData.assignetype}:${formData.assigneid}` : ""}
              onValueChange={v => handleSelectChange("assigneCombined", v)}
              disabled={assignableEntities.length === 0}
              key={`assigne-${formData.assignetype}-${formData.assigneid}`}  // ✅ AJOUTÉ : Force le re-render
            >
              <SelectTrigger>
                <SelectValue placeholder={assignableEntities.length === 0 ? "Aucun disponible" : "Choisir..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {assignableEntities.map(e => (
                  <SelectItem key={`${e.assignetype}-${e.id}`} value={`${e.assignetype}:${e.id}`}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{tache ? "Mettre à jour" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}