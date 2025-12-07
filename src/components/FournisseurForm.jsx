import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useFournisseur } from "@/context/FournisseurContext";
import { useAuth } from "@/hooks/useAuth";
import { useLots } from "@/context/LotsContext";
import { Checkbox } from "@/components/ui/checkbox";

export function FournisseurForm({ initialData = null, onClose, onSuccess }) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { addFournisseur, updateFournisseur, loadSAV } = useFournisseur();
  const { lots: globalLots = [] } = useLots();

  const [formData, setFormData] = useState({
    nomsocieteF: "",
    nomcontact: "",
    email: "",
    telephone: "",
    adresse: "",
    assignedlots: [],
  });

  // Préremplir si édition
  useEffect(() => {
    if (initialData) {
      setFormData({
        nomsocieteF: initialData.nomsocieteF || "",
        nomcontact: initialData.nomcontact || "",
        email: initialData.email || "",
        telephone: initialData.telephone || "",
        adresse: initialData.adresse || "",
        assignedlots: initialData.assignedlots || [],
      });
    } else {
      setFormData({
        nomsocieteF: "",
        nomcontact: "",
        email: "",
        telephone: "",
        adresse: "",
        assignedlots: [],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Sélection / désélection des lots
  const handleLotToggle = (lotName) => {
    setFormData(prev => ({
      ...prev,
      assignedlots: prev.assignedlots.includes(lotName)
        ? prev.assignedlots.filter(name => name !== lotName)
        : [...prev.assignedlots, lotName]
    }));
  };

  // Souhait : supprimer la liaison aux lots existants si on est en édition
  const clearAssignedLots = () => {
    setFormData(prev => ({ ...prev, assignedlots: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!profile?.nomsociete) {
      toast({
        title: "Erreur login ❌",
        description: "Impossible d'identifier la société connectée",
        variant: "destructive"
      });
      return;
    }

    try {
      let result;

      if (initialData?.id) {
        // MODE UPDATE
        result = await updateFournisseur(initialData.id, {
          ...formData,
          nomsociete: profile.nomsociete, // cohérence login Supabase
        });

        toast({
          title: "Fournisseur mis à jour ✅",
          description: result.nomsocieteF
        });

      } else {
        // MODE INSERT
        result = await addFournisseur({
          ...formData,
          nomsociete: profile.nomsociete, // liaison login
        });

        toast({
          title: "Fournisseur créé ✅",
          description: result.nomsocieteF
        });
      }

      // Callback UI
      onSuccess?.();
      onClose?.();

      // Reset form
      setFormData({
        nomsocieteF: "",
        nomcontact: "",
        email: "",
        telephone: "",
        adresse: "",
        assignedlots: [],
      });

    } catch (err) {
      console.error("❌ Erreur FournisseurForm :", err);
      toast({
        title: "Erreur Supabase ❌",
        description: "Impossible de sauvegarder le fournisseur",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      
      <div className="space-y-2">
        <Label>Nom de la société <span className="text-red-500">*</span></Label>
        <Input
          name="nomsocieteF"
          value={formData.nomsocieteF}
          onChange={handleChange}
          required
          placeholder="Ex: ACME Construction"
        />
      </div>

      <div className="space-y-2">
        <Label>Nom du contact</Label>
        <Input
          name="nomcontact"
          value={formData.nomcontact}
          onChange={handleChange}
          placeholder="Ex: Jean Dupont"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="exemple@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            placeholder="06 00 00 00 00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Adresse</Label>
        <Textarea
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          rows={2}
          placeholder="Adresse complète..."
        />
      </div>

      {/* SECTION LOTS */}
      <div className="space-y-2">
        <Label className="flex justify-between items-center">
          Lots assignés
          {initialData?.id && (
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAssignedLots}
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              Supprimer tous les lots
            </Button>
          )}
        </Label>

        <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-1">
          {globalLots.map(lot => (
            <div key={lot.id} className="flex items-center gap-2">
              <Checkbox
                id={`lot-${lot.id}`}
                checked={formData.assignedlots.includes(lot.lot)}
                onCheckedChange={() => handleLotToggle(lot.lot)}
              />
              <Label htmlFor={`lot-${lot.id}`} className="text-sm cursor-pointer">
                {lot.lot}
              </Label>
            </div>
          ))}
        </div>

        {formData.assignedlots.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sélectionnés : {formData.assignedlots.join(", ")}
          </p>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit">
          <Plus className="mr-2 h-4 w-4" />
          {initialData ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
