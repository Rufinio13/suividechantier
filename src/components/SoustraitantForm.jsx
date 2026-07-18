import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSousTraitant } from "@/context/SousTraitantContext";
import { useLots } from "@/context/LotsContext";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";

export function SousTraitantForm({ initialData = null, onClose, onSuccess, onArtisanCreated }) {
  const { toast } = useToast();
  const { addSousTraitant, updateSousTraitant } = useSousTraitant();
  const { lots: globalLots = [] } = useLots();

  const isSavingRef = useRef(false);

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

  const [hasAuthAccount, setHasAuthAccount] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nomsocieteST: initialData.nomsocieteST || "",
        nomST: initialData.nomST || "",
        PrenomST: initialData.PrenomST || "",
        email: initialData.email || "",
        telephone: initialData.telephone || "",
        adresseST: initialData.adresseST || "",
        assigned_lots: initialData.assigned_lots || [],
      });
      
      // ✅ Vérifier si cet artisan a un compte
      checkIfHasAuthAccount(initialData);
    }
  }, [initialData]);

  // ✅ Vérification via la Edge Function (clé service role) : la lecture directe de
  // profiles pour un autre utilisateur est bloquée par les RLS côté client, ce qui
  // faisait échouer silencieusement la détection.
  const checkIfHasAuthAccount = async (artisan) => {
    if (!artisan.email) {
      setHasAuthAccount(!!artisan.user_id);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('check-artisan-account', {
        body: { email: artisan.email },
      });
      if (error) throw error;

      setHasAuthAccount(!!data?.hasAccount);

      // Auto-réparation du lien manquant
      if (data?.hasAccount && data.userId && data.userId !== artisan.user_id) {
        await supabase.from('soustraitants').update({ user_id: data.userId }).eq('id', artisan.id);
      }
    } catch (err) {
      console.error('❌ Erreur vérification compte:', err);
      setHasAuthAccount(!!artisan.user_id);
    }
  };

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
      let result;

      if (initialData?.id) {
        // MODE ÉDITION
        console.log('📝 Mode édition');
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
        toast({ title: "Sous-traitant mis à jour ✅" });
        
      } else {
        // MODE CRÉATION
        console.log('➕ Mode création');
        result = await addSousTraitant(formData);
        toast({ title: "Sous-traitant créé ✅", description: result.nomsocieteST });
        
        // ✅ Callback pour proposer création de compte
        if (onArtisanCreated && result) {
          onArtisanCreated(result);
        }
      }
      
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
          <DialogTitle>{initialData ? "Modifier Sous-Traitant" : "Nouveau Sous-Traitant"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomsocieteST">Nom de la société <span className="text-red-500">*</span></Label>
            <Input id="nomsocieteST" name="nomsocieteST" value={formData.nomsocieteST} onChange={handleChange} required />
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
            <Textarea id="adresseST" name="adresseST" value={formData.adresseST} onChange={handleChange} rows={2} />
          </div>

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

          {/* ✅ NOUVEAU : Section compte artisan */}
          {initialData && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium mb-2 block">Compte Artisan</Label>
              
              {hasAuthAccount ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Cet artisan possède déjà un compte
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border rounded-md p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Cet artisan n'a pas encore de compte.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onArtisanCreated) {
                        onArtisanCreated(initialData);
                      }
                      onClose();
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un compte
                  </Button>
                </div>
              )}
            </div>
          )}

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