import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLots } from "@/context/LotsContext";

export function LotForm({ initialData = null, onClose, onSuccess }) {
  const { toast } = useToast();
  const { addLot, updateLot } = useLots();

  // ✅ Protection anti-double-submit
  const isSavingRef = useRef(false);

  // Formulaire local
  const [formData, setFormData] = useState({
    lot: "",
    description: "",
  });

  // Pré-remplir le formulaire si on édite un lot
  useEffect(() => {
    if (initialData) {
      setFormData({
        lot: initialData.lot || "",
        description: initialData.description || "",
      });
    }
  }, [initialData]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    console.log('🔵 handleSubmit Lot appelé !');
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
        // Édition
        console.log('📝 Mode édition - ID:', initialData.id);
        result = await updateLot(initialData.id, formData);
        toast({ title: "Lot mis à jour ✅", description: result.lot });
      } else {
        // Création
        console.log('➕ Mode création');
        result = await addLot(formData);
        toast({ title: "Lot créé ✅", description: result.lot });
      }

      console.log('✅ Résultat:', result);

      onSuccess?.(); // rafraîchir la liste
      onClose?.();   // fermer le modal

      // Reset
      setFormData({ lot: "", description: "" });
    } catch (err) {
      console.error('❌ Erreur handleSubmit:', err);
      toast({
        title: "Erreur ❌",
        description: "Impossible de sauvegarder le lot",
        variant: "destructive",
      });
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
          <DialogTitle>{initialData ? "Modifier Lot" : "Nouveau Lot"}</DialogTitle>
        </DialogHeader>

        <form id="lot-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Nom du lot */}
          <div className="space-y-2">
            <Label htmlFor="lot">Nom du lot <span className="text-red-500">*</span></Label>
            <Input
              id="lot"
              name="lot"
              value={formData.lot || ""}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Boutons */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
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