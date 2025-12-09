import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSousTraitant } from '@/context/SousTraitantContext.jsx';
import { useLots } from '@/context/LotsContext.jsx';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Briefcase, Plus, ListChecks } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';

export function SousTraitantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { sousTraitants = [], loading, updateSousTraitant, deleteSousTraitant } = useSousTraitant();
  const { lots: globalLots = [] } = useLots();

  // ⚡ Trouver le sous-traitant par ID
  const sousTraitant = useMemo(
    () => (sousTraitants ?? []).find(st => st.id === id),
    [sousTraitants, id]
  );

  // MODALES
  const [isAssignLotsOpen, setIsAssignLotsOpen] = useState(false);
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);

  // FORMULAIRES
  const [formData, setFormData] = useState({
    nomST: '',
    PrenomST: '',
    adresseST: '',
    email: '',
    telephone: '',
  });
  const [selectedLotNames, setSelectedLotNames] = useState([]);

  useEffect(() => {
    if (sousTraitant) {
      setFormData({
        nomST: sousTraitant.nomST || '',
        PrenomST: sousTraitant.PrenomST || '',
        adresseST: sousTraitant.adresseST || '',
        email: sousTraitant.email || '',
        telephone: sousTraitant.telephone || '',
      });
      setSelectedLotNames(sousTraitant.assigned_lots ?? []);
    }
  }, [sousTraitant]);

  // Gérer les changements du formulaire
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle lots assignés
  const handleLotToggle = (lotName) => {
    setSelectedLotNames(prev =>
      prev.includes(lotName) ? prev.filter(name => name !== lotName) : [...prev, lotName]
    );
  };

  // Enregistrer les lots assignés
  const saveAssignLots = async () => {
    if (!sousTraitant) return;

    const { data, error } = await supabase
      .from("soustraitants")
      .update({ assigned_lots: selectedLotNames })
      .eq("id", sousTraitant.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible d’assigner les lots", variant: "destructive" });
      return;
    }

    updateSousTraitant?.(sousTraitant.id, { assigned_lots: selectedLotNames });
    setIsAssignLotsOpen(false);
    toast({ title: "Lots enregistrés ✅" });
  };

  // Enregistrer infos générales
  const saveEditInfo = async (e) => {
    e.preventDefault();
    if (!sousTraitant) return;

    const { data, error } = await supabase
      .from("soustraitants")
      .update(formData)
      .eq("id", sousTraitant.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
      return;
    }

    updateSousTraitant?.(sousTraitant.id, data);
    toast({ title: "Mis à jour ✅" });
    setIsEditInfoOpen(false);
  };

  // Supprimer le sous-traitant
  const handleDelete = async () => {
    if (!sousTraitant) return;
    if (!window.confirm(`Supprimer ${sousTraitant.nomsocieteST}?`)) return;

    const { error } = await supabase
      .from("soustraitants")
      .delete()
      .eq("id", sousTraitant.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
      return;
    }

    deleteSousTraitant?.(sousTraitant.id);
    toast({ title: "Supprimé ✅" });
    navigate("/sous-traitants");
  };

  const initials = `${sousTraitant?.PrenomST?.[0] ?? ''}${sousTraitant?.nomST?.[0] ?? 'ST'}`.toUpperCase();

  if (loading) return <div className="h-64 flex items-center justify-center">Chargement…</div>;
  if (!sousTraitant) return <div className="p-4 text-center">Introuvable</div>;

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link to="/sous-traitants"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <div>
              <h1 className="text-2xl font-bold">{sousTraitant.nomsocieteST}</h1>
              {(sousTraitant.nomST || sousTraitant.PrenomST) && (
                <p className="text-muted-foreground text-sm">{sousTraitant.PrenomST} {sousTraitant.nomST}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsEditInfoOpen(true)} variant="outline"><Edit className="mr-2 h-4 w-4"/>Infos</Button>
          <Button onClick={handleDelete} variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Del</Button>
        </div>
      </div>

      {/* LOTS */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Lots / Compétences</CardTitle>
          <Button size="sm" onClick={() => setIsAssignLotsOpen(true)}><ListChecks className="mr-2 h-4 w-4"/>Gérer</Button>
        </CardHeader>
        <CardContent>
          {selectedLotNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedLotNames.map(name => (
                <span key={name} className="px-3 py-1 border bg-muted/40 rounded-md text-sm">{name}</span>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Briefcase className="mx-auto h-7 w-7 text-muted-foreground mb-2"/>
              <p className="text-muted-foreground">Aucun lot assigné</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL EDIT INFOS */}
      <Dialog open={isEditInfoOpen} onOpenChange={setIsEditInfoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier Infos</DialogTitle></DialogHeader>
          <form onSubmit={saveEditInfo} className="space-y-3 py-3">
            <Label>Nom</Label>
            <Input name="nomST" value={formData.nomST} onChange={handleFormChange} />
            <Label>Prénom</Label>
            <Input name="PrenomST" value={formData.PrenomST} onChange={handleFormChange} />
            <Label>Adresse</Label>
            <Textarea name="adresseST" value={formData.adresseST} onChange={handleFormChange} rows={2} />
            <Label>Email</Label>
            <Input name="email" value={formData.email} onChange={handleFormChange} />
            <Label>Téléphone</Label>
            <Input name="telephone" value={formData.telephone} onChange={handleFormChange} />
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsEditInfoOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ASSIGN LOTS */}
      <Dialog open={isAssignLotsOpen} onOpenChange={setIsAssignLotsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assigner des lots</DialogTitle></DialogHeader>
          <div className="max-h-[55vh] overflow-auto space-y-2 py-3">
            {globalLots.map(lot => (
              <div key={lot.id} className="flex items-center gap-2 hover:bg-muted/40 p-2 rounded-md">
                <Checkbox
                  checked={selectedLotNames.includes(lot.lot)}
                  onCheckedChange={() => handleLotToggle(lot.lot)}
                  id={`lot-${lot.id}`}
                />
                <Label htmlFor={`lot-${lot.id}`} className="text-sm cursor-pointer">{lot.lot}</Label>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-1">
            <Button onClick={() => setIsAssignLotsOpen(false)} variant="outline">Annuler</Button>
            <Button onClick={saveAssignLots}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
