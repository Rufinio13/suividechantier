import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSousTraitant } from "@/context/SousTraitantContext";
import { useLots } from "@/context/LotsContext";
import { Checkbox } from "@/components/ui/checkbox";

export function SousTraitantForm({ initialData = null, onClose, onSuccess }) {
  const { toast } = useToast();
  const { addSousTraitant, updateSousTraitant } = useSousTraitant();
  const { lots: globalLots = [] } = useLots();

  // ✅ Protection anti-double-submit
  const isSavingRef = useRef(false);

  // ✅ Tri alphabétique des lots
  const sortedLots = useMemo(() => {
    return [...globalLots].sort((a, b) => 
      (a.lot || "").localeCompare(b.lot || "")
    );
  }, [globalLots]);

  const [formData, setFormData] = useState({
    nomsocieteST: "",
    nomST: "",
    PrenomST: "",
    email: "",
    telephone: "",
    adresseST: "",
    assigned_lots: [],
  });

  useEffect(() => {
    if (initialData) {
      // ✅ Copier UNIQUEMENT les champs modifiables
      setFormData({
        nomsocieteST: initialData.nomsocieteST || "",
        nomST: initialData.nomST || "",
        PrenomST: initialData.PrenomST || "",
        email: initialData.email || "",
        telephone: initialData.telephone || "",
        adresseST: initialData.adresseST || "",
        assigned_lots: initialData.assigned_lots || [],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLotToggle = (lotName) => {
    setFormData(prev => ({
      ...prev,
      assigned_lots: prev.assigned_lots.includes(lotName)
        ? prev.assigned_lots.filter(name => name !== lotName)
        : [...prev.assigned_lots, lotName]
    }));
  };

  const handleSubmit = async (e) => {
    console.log('🔵 handleSubmit SousTraitant appelé !');
    console.log('📋 FormData:', formData);
    e.preventDefault();
    
    // ✅ Bloquer si déjà en cours
    if (isSavingRef.current) {
      console.log('⚠️ Sauvegarde déjà en cours, ignoré');
      return;
    }

    isSavingRef.current = true;

    try {
      let result;
      if (initialData?.id) {
        // ✅ Envoyer UNIQUEMENT les champs modifiables
        console.log('📝 Mode édition - ID:', initialData.id);
        const updates = {
          nomsocieteST: formData.nomsocieteST,
          nomST: formData.nomST,
          PrenomST: formData.PrenomST,
          email: formData.email,
          telephone: formData.telephone,
          adresseST: formData.adresseST,
          assigned_lots: formData.assigned_lots,
        };
        result = await updateSousTraitant(initialData.id, updates);
        toast({ title: "Sous-traitant mis à jour ✅", description: result.nomsocieteST });
      } else {
        // ✅ Envoyer UNIQUEMENT les champs modifiables
        console.log('➕ Mode création');
        result = await addSousTraitant(formData);
        toast({ title: "Sous-traitant créé ✅", description: result.nomsocieteST });
      }
      
      console.log('✅ Résultat:', result);
      
      onSuccess?.();
      onClose?.();
      setFormData({
        nomsocieteST: "",
        nomST: "",
        PrenomST: "",
        email: "",
        telephone: "",
        adresseST: "",
        assigned_lots: [],
      });
    } catch (err) {
      console.error('❌ Erreur handleSubmit:', err);
      toast({ title: "Erreur ❌", description: "Impossible de sauvegarder le sous-traitant", variant: "destructive" });
    } finally {
      // ✅ Débloquer après 1 seconde
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Modifier Sous-Traitant" : "Nouveau Sous-Traitant"}</DialogTitle>
        </DialogHeader>

        <form id="soustraitant-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomsocieteST">Nom de la société <span className="text-red-500">*</span></Label>
            <Input id="nomsocieteST" name="nomsocieteST" value={formData.nomsocieteST || ""} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="PrenomST">Prénom</Label>
              <Input id="PrenomST" name="PrenomST" value={formData.PrenomST || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomST">Nom</Label>
              <Input id="nomST" name="nomST" value={formData.nomST || ""} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" value={formData.telephone || ""} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresseST">Adresse</Label>
            <Textarea id="adresseST" name="adresseST" value={formData.adresseST || ""} onChange={handleChange} rows={2} />
          </div>

          {/* Sélection des lots via checkbox */}
          <div className="space-y-2">
            <Label>Lots / Compétences</Label>
            <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-1">
              {sortedLots.map(lot => (
                <div key={lot.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.assigned_lots.includes(lot.lot)}
                    onCheckedChange={() => handleLotToggle(lot.lot)}
                    id={`lot-${lot.id}`}
                  />
                  <Label htmlFor={`lot-${lot.id}`} className="text-sm cursor-pointer">{lot.lot}</Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isSavingRef.current}>
              <Plus className="mr-2 h-4 w-4" />
              {isSavingRef.current ? 'Enregistrement...' : (initialData ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}