import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { parseISO, isValid, format, eachDayOfInterval, startOfDay } from "date-fns";
import { calculateDateFinLogic, calculateDureeOuvree } from "@/context/chantierContextLogics/tacheLogics";
import { useSousTraitant } from "@/context/SousTraitantContext";
import { useFournisseur } from "@/context/FournisseurContext";
import { useChantier } from "@/context/ChantierContext";
import { AlertTriangle } from "lucide-react";

export function TacheFormModal({
  isOpen,
  onClose,
  tache,
  chantierId,
  lots: globalLots,
  addTache,
  updateTache,
  conflictsByChantier = {},
  prefilledDate = null
}) {
  console.log("🎯 TacheFormModal reçoit chantierId:", chantierId);
  
  const { sousTraitants } = useSousTraitant();
  const { fournisseurs } = useFournisseur();
  const { chantiers } = useChantier();

  // ✅ DÉTECTER LE CONFLIT
  const tacheConflictInfo = useMemo(() => {
    if (!tache || !tache.assigneid || tache.assignetype !== 'soustraitant' || !tache.datedebut || !tache.datefin) {
      return null;
    }

    try {
      const start = startOfDay(parseISO(tache.datedebut));
      const end = startOfDay(parseISO(tache.datefin));
      const days = eachDayOfInterval({ start, end });
      
      for (const day of days) {
        const key = `${tache.assigneid}-${format(day, "yyyy-MM-dd")}`;
        const conflict = conflictsByChantier[key];
        
        if (conflict && conflict.chantierids && conflict.chantierids.length > 1) {
          const otherIds = conflict.chantierids.filter(id => id !== tache.chantierid);
          
          if (otherIds.length > 0) {
            const otherNames = otherIds
              .map(id => chantiers.find(c => c.id === id)?.nomchantier)
              .filter(Boolean);
            
            return {
              message: `Artisan en conflit le ${format(day, 'dd/MM/yyyy')} avec: ${otherNames.join(', ')}`,
            };
          }
        }
      }
    } catch (err) {
      console.error("Erreur parsing conflit:", err);
    }
    
    return null;
  }, [tache, conflictsByChantier, chantiers]);

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
  // LOTS TRIÉS PAR ORDRE ALPHABÉTIQUE
  // ---------------------------------------------------------
  const sortedLots = useMemo(() => {
    return [...(globalLots || [])].sort((a, b) => 
      (a.lot || "").localeCompare(b.lot || "")
    );
  }, [globalLots]);

  // ---------------------------------------------------------
  // INITIALISATION + PRÉ-REMPLISSAGE
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (tache) {
      const duree =
        tache.datedebut && tache.datefin
          ? calculateDureeOuvree(tache.datedebut, tache.datefin)
          : "";

      setFormData({
        nom: tache.nom || "",
        description: tache.description || "",
        lotid: tache.lotid || (sortedLots?.[0]?.id || ""),
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
        lotid: sortedLots?.[0]?.id || "",
        datedebut: prefilledDate || "",
        duree: "",
        datefin: "",
        assigneid: "",
        assignetype: "",
        terminee: false,
      });
    }
  }, [isOpen, tache, sortedLots, prefilledDate]);

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
  // ENTITÉS ASSIGNABLES PAR LOT (TRIÉES ALPHABÉTIQUEMENT)
  // ---------------------------------------------------------
  const assignableEntities = useMemo(() => {
    if (!formData.lotid) return [];

    const lotObj = sortedLots.find(l => l.id === formData.lotid);
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

    return [...stOpts, ...fOpts].sort((a, b) => 
      (a.nom || "").localeCompare(b.nom || "")
    );
  }, [formData.lotid, sousTraitants, fournisseurs, sortedLots]);

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

    const payload = {
      nom: formData.nom,
      description: formData.description || null,
      chantierid: chantierId,
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tache ? "Modifier la tâche" : "Ajouter une tâche"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* ✅ AFFICHER LE CONFLIT EN HAUT */}
          {tacheConflictInfo && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 font-medium">
                {tacheConflictInfo.message}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
            <Input id="nom" name="nom" value={formData.nom} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datedebut">Date de début <span className="text-red-500">*</span></Label>
              <Input type="date" id="datedebut" name="datedebut" value={formData.datedebut} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duree">Durée (jours) <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" id="duree" name="duree" value={formData.duree} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lotid">Lot <span className="text-red-500">*</span></Label>
            <select
              id="lotid"
              name="lotid"
              value={formData.lotid}
              onChange={(e) => handleSelectChange("lotid", e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Choisir un lot...</option>
              {sortedLots.map(l => (
                <option key={l.id} value={l.id}>{l.lot}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigneCombined">Assigné à</Label>
            <select
              id="assigneCombined"
              name="assigneCombined"
              value={formData.assignetype && formData.assigneid ? `${formData.assignetype}:${formData.assigneid}` : ""}
              onChange={(e) => handleSelectChange("assigneCombined", e.target.value)}
              disabled={assignableEntities.length === 0}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{assignableEntities.length === 0 ? "Aucun disponible" : "Choisir..."}</option>
              {assignableEntities.map(e => (
                <option key={`${e.assignetype}-${e.id}`} value={`${e.assignetype}:${e.id}`}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ CHECKBOX TERMINÉ */}
          {tache && (
            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded border">
              <input
                type="checkbox"
                id="terminee"
                checked={formData.terminee || false}
                onChange={(e) => setFormData(prev => ({ ...prev, terminee: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              />
              <Label htmlFor="terminee" className="cursor-pointer font-medium">
                Marquer comme terminée
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">{tache ? "Mettre à jour" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}