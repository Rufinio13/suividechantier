import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSousTraitant } from "@/context/SousTraitantContext";
import { useLots } from "@/context/LotsContext";
import { Checkbox } from "@/components/ui/checkbox";

// Création d'un artisan (la modification se fait sur sa page de détail)
export function SousTraitantForm({ onClose, onCreated }) {
  const { toast } = useToast();
  const { addSousTraitant } = useSousTraitant();
  const { lots: globalLots = [] } = useLots();

  const isSavingRef = useRef(false);

  const sortedLots = useMemo(() => {
    return [...globalLots].sort((a, b) =>
      (a.lot || "").localeCompare(b.lot || "")
    );
  }, [globalLots]);

  const [formData, setFormData] = useState({
    nomsocieteST: "",
    siret: "",
    nomST: "",
    PrenomST: "",
    email: "",
    telephone: "",
    adresseST: "",
    code_postal: "",
    ville: "",
    decennale_non_requise: false,
    urssaf_non_requise: false,
    assigned_lots: [],
  });

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
    e.preventDefault();

    if (isSavingRef.current) return;

    isSavingRef.current = true;

    try {
      const result = await addSousTraitant(formData);
      toast({ title: "Artisan créé ✅", description: result.nomsocieteST });
      onClose?.();
      onCreated?.(result);
    } catch (err) {
      console.error('❌ Erreur:', err);
      toast({
        title: "Erreur ❌",
        description: err.message || "Impossible de sauvegarder",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel artisan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomsocieteST">Nom de la société <span className="text-red-500">*</span></Label>
            <Input id="nomsocieteST" name="nomsocieteST" value={formData.nomsocieteST} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" name="siret" value={formData.siret} onChange={handleChange} placeholder="14 chiffres" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="PrenomST">Prénom</Label>
              <Input id="PrenomST" name="PrenomST" value={formData.PrenomST} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomST">Nom</Label>
              <Input id="nomST" name="nomST" value={formData.nomST} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresseST">Adresse</Label>
            <Input id="adresseST" name="adresseST" value={formData.adresseST} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code_postal">Code postal</Label>
              <Input id="code_postal" name="code_postal" value={formData.code_postal} onChange={handleChange} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" name="ville" value={formData.ville} onChange={handleChange} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="decennale_non_requise"
                checked={formData.decennale_non_requise}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, decennale_non_requise: !!checked }))}
              />
              <Label htmlFor="decennale_non_requise" className="cursor-pointer">Pas de décennale requise</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="urssaf_non_requise"
                checked={formData.urssaf_non_requise}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, urssaf_non_requise: !!checked }))}
              />
              <Label htmlFor="urssaf_non_requise" className="cursor-pointer">Pas d'URSSAF requise</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lots</Label>
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
              {isSavingRef.current ? 'Enregistrement...' : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
