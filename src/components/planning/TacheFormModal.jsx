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
import { AlertTriangle, CheckCircle } from "lucide-react";

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
    constructeur_valide: false,
  });

  const sortedLots = useMemo(() => {
    return [...(globalLots || [])].sort((a, b) => 
      (a.lot || "").localeCompare(b.lot || "")
    );
  }, [globalLots]);

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
        constructeur_valide: tache.constructeur_valide || false,
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
        constructeur_valide: false,
      });
    }
  }, [isOpen, tache, sortedLots, prefilledDate]);

  useEffect(() => {
    if (formData.datedebut && formData.duree) {
      const fin = calculateDateFinLogic(formData.datedebut, parseInt(formData.duree, 10));
      setFormData(prev => ({ ...prev, datefin: fin }));
    } else {
      setFormData(prev => ({ ...prev, datefin: "" }));
    }
  }, [formData.datedebut, formData.duree]);

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
      constructeur_valide: formData.constructeur_valide,
      constructeur_valide_date: formData.constructeur_valide ? new Date().toISOString() : null,
    };

    console.log("🔍 FormData avant payload:", formData);
    console.log("📤 Payload envoyé à Supabase:", payload);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tache ? "Modifier la tâche" : "Ajouter une tâche"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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

          {/* ✅ VALIDATION CONSTRUCTEUR - ENCADRÉ TOUJOURS VISIBLE */}
          {tache && (
            <div>
              {/* ✅ Afficher si artisan a terminé OU si constructeur a validé (pour garder historique) */}
              {(tache.artisan_termine || tache.constructeur_valide) && (
                <div className="space-y-2 mb-3 p-3 rounded-md border bg-gray-50 border-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-700">
                      L'artisan a marqué cette tâche comme terminée
                    </span>
                  </div>
                  
                  {tache.artisan_termine_date && (
                    <p className="text-xs text-gray-600">
                      Date : {format(new Date(tache.artisan_termine_date), 'dd/MM/yyyy à HH:mm')}
                    </p>
                  )}
                  
                  {/* ✅ PHOTOS CLIQUABLES */}
                  {tache.artisan_photos && tache.artisan_photos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 text-gray-700">
                        📸 {tache.artisan_photos.length} photo(s)
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {tache.artisan_photos.map((photo, idx) => (
                          <img 
                            key={idx}
                            src={photo.url} 
                            alt={photo.name || `Photo ${idx + 1}`}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url, '_blank')}
                            title="Cliquer pour agrandir"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ✅ NOUVEAU : COMMENTAIRE ARTISAN */}
                  {tache.artisan_commentaire && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold text-gray-700 mb-1">💬 Commentaire de l'artisan :</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{tache.artisan_commentaire}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* ✅ CHECKBOX VALIDATION */}
              {(tache.artisan_termine || tache.constructeur_valide) && (
                <div className={`flex items-center space-x-2 p-3 rounded border mb-3 ${
                  formData.constructeur_valide 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <input
                    type="checkbox"
                    id="valider_tache"
                    checked={formData.constructeur_valide || false}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      constructeur_valide: e.target.checked,
                      terminee: e.target.checked 
                    }))}
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                  />
                  <Label htmlFor="valider_tache" className={`cursor-pointer font-medium ${
                    formData.constructeur_valide ? 'text-green-900' : 'text-yellow-800'
                  }`}>
                    {formData.constructeur_valide ? '✅ Tâche validée (décocher pour invalider)' : '⏳ Valider la tâche terminée par l\'artisan'}
                  </Label>
                </div>
              )}

              {/* Checkbox normale (seulement si artisan n'a PAS terminé ET pas validé) */}
              {!tache.artisan_termine && !tache.constructeur_valide && (
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

              {/* Info validation (en dessous de la checkbox) */}
              {formData.constructeur_valide && tache.constructeur_valide_date && (
                <p className="text-xs text-green-700 ml-7 -mt-2 mb-3">
                  Validée le {format(new Date(tache.constructeur_valide_date), 'dd/MM/yyyy à HH:mm')}
                </p>
              )}
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