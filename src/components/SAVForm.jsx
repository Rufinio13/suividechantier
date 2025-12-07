// src/components/SAVForm.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSAV } from "@/context/SAVContext"; // context que l'on créera pour Supabase

export function SAVForm({ initialData = null, onClose, onSuccess }) {
  const { toast } = useToast();
  const { addSAV, updateSAV } = useSAV();

  const [formData, setFormData] = useState({
    nomClient: "",
    description: "",
    responsable: "",
    dateOuverture: new Date().toISOString().split("T")[0],
    datePrevisionnelle: "",
    repriseValidee: false,
    dateValidationReprise: null,
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dateOuverture: initialData.dateOuverture?.split("T")[0] || new Date().toISOString().split("T")[0],
        datePrevisionnelle: initialData.datePrevisionnelle?.split("T")[0] || "",
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (initialData?.id) {
        result = await updateSAV(initialData.id, formData);
        toast({ title: "SAV mis à jour ✅", description: formData.nomClient });
      } else {
        result = await addSAV(formData);
        toast({ title: "SAV créé ✅", description: formData.nomClient });
      }
      onSuccess?.();
      onClose?.();
      setFormData({
        nomClient: "",
        description: "",
        responsable: "",
        dateOuverture: new Date().toISOString().split("T")[0],
        datePrevisionnelle: "",
        repriseValidee: false,
        dateValidationReprise: null,
        notes: "",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur ❌", description: "Impossible de sauvegarder la demande SAV", variant: "destructive" });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Modifier la demande SAV" : "Nouvelle demande SAV"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomClient">Nom du client <span className="text-red-500">*</span></Label>
            <Input id="nomClient" name="nomClient" value={formData.nomClient} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" name="responsable" value={formData.responsable} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOuverture">Date d'ouverture</Label>
              <Input id="dateOuverture" name="dateOuverture" type="date" value={formData.dateOuverture} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="datePrevisionnelle">Date prévisionnelle</Label>
            <Input id="datePrevisionnelle" name="datePrevisionnelle" type="date" value={formData.datePrevisionnelle} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} />
          </div>

          <div className="flex items-center space-x-2">
            <Input id="repriseValidee" name="repriseValidee" type="checkbox" checked={formData.repriseValidee} onChange={handleChange} />
            <Label htmlFor="repriseValidee">Reprise validée</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit"><Plus className="mr-2 h-4 w-4" />{initialData ? "Modifier" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
