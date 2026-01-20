import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSousTraitant } from '@/context/SousTraitantContext.jsx';
import { useLots } from '@/context/LotsContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Briefcase, Plus, ListChecks, UserPlus, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { CreateArtisanAccountModal } from '@/components/artisan/CreateArtisanAccountModal';

export function SousTraitantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { sousTraitants = [], loading, updateSousTraitant, deleteSousTraitant } = useSousTraitant();
  const { lots: globalLots = [] } = useLots();

  const sousTraitant = useMemo(
    () => (sousTraitants ?? []).find(st => st.id === id),
    [sousTraitants, id]
  );

  const [isAssignLotsOpen, setIsAssignLotsOpen] = useState(false);
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  
  // ✅ Protection anti-double-submit
  const isSavingRef = useRef(false);

  const [formData, setFormData] = useState({
    nomST: '',
    PrenomST: '',
    adresseST: '',
    email: '',
    telephone: '',
  });
  const [selectedLotNames, setSelectedLotNames] = useState([]);

  // ✅ Vérifier si le sous-traitant a un compte
  useEffect(() => {
    if (sousTraitant?.user_id) {
      checkIfHasAccount(sousTraitant.user_id);
    } else {
      setHasAccount(false);
    }
  }, [sousTraitant]);

  const checkIfHasAccount = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();
      
      const accountExists = !!data && data.role === 'artisan';
      setHasAccount(accountExists);
      console.log('✅ Compte artisan existant:', accountExists);
    } catch (err) {
      console.error('❌ Erreur vérification compte:', err);
      setHasAccount(false);
    }
  };

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLotToggle = (lotName) => {
    setSelectedLotNames(prev =>
      prev.includes(lotName) ? prev.filter(name => name !== lotName) : [...prev, lotName]
    );
  };

  // ✅ Protection anti-double-submit pour les lots
  const saveAssignLots = async () => {
    if (!sousTraitant) return;
    
    if (isSavingRef.current) {
      console.log('⚠️ Sauvegarde déjà en cours, ignoré');
      return;
    }

    console.log('💾 Sauvegarde lots assignés:', selectedLotNames);
    isSavingRef.current = true;

    try {
      await updateSousTraitant(sousTraitant.id, { 
        assigned_lots: selectedLotNames 
      });
      setIsAssignLotsOpen(false);
      toast({ title: "Lots enregistrés ✅" });
    } catch (error) {
      console.error('❌ Erreur saveAssignLots:', error);
      toast({ title: "Erreur", description: "Impossible d'assigner les lots", variant: "destructive" });
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  // ✅ Protection anti-double-submit pour les infos
  const saveEditInfo = async (e) => {
    e.preventDefault();
    if (!sousTraitant) return;
    
    if (isSavingRef.current) {
      console.log('⚠️ Sauvegarde déjà en cours, ignoré');
      return;
    }

    console.log('💾 Sauvegarde infos générales:', formData);
    isSavingRef.current = true;

    try {
      await updateSousTraitant(sousTraitant.id, {
        nomST: formData.nomST,
        PrenomST: formData.PrenomST,
        adresseST: formData.adresseST,
        email: formData.email,
        telephone: formData.telephone,
      });
      toast({ title: "Mis à jour ✅" });
      setIsEditInfoOpen(false);
    } catch (error) {
      console.error('❌ Erreur saveEditInfo:', error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const handleDelete = async () => {
    if (!sousTraitant) return;
    if (!window.confirm(`Supprimer ${sousTraitant.nomsocieteST}?`)) return;

    console.log('🗑️ Suppression sous-traitant:', sousTraitant.id);

    try {
      await deleteSousTraitant(sousTraitant.id);
      toast({ title: "Supprimé ✅" });
      navigate("/sous-traitants");
    } catch (error) {
      console.error('❌ Erreur handleDelete:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
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

      {/* ✅ NOUVEAU : COMPTE ARTISAN */}
      <Card>
        <CardHeader>
          <CardTitle>Compte Artisan</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAccount ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <UserCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Compte créé ✅</p>
                <p className="text-sm text-green-700">Cet artisan peut se connecter à l'application</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border rounded-md">
                <p className="text-sm text-muted-foreground">
                  Cet artisan n'a pas encore de compte pour accéder à l'application.
                </p>
              </div>
              <Button 
                onClick={() => setIsCreateAccountOpen(true)}
                variant="outline"
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Créer un compte artisan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL EDIT INFOS */}
      <Dialog open={isEditInfoOpen} onOpenChange={setIsEditInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier Infos</DialogTitle>
            <DialogDescription>Modifiez les informations du sous-traitant</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEditInfo} className="space-y-3 py-3">
            <div className="space-y-2">
              <Label htmlFor="nomST">Nom</Label>
              <Input id="nomST" name="nomST" value={formData.nomST} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="PrenomST">Prénom</Label>
              <Input id="PrenomST" name="PrenomST" value={formData.PrenomST} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresseST">Adresse</Label>
              <Textarea id="adresseST" name="adresseST" value={formData.adresseST} onChange={handleFormChange} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleFormChange} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditInfoOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSavingRef.current}>
                {isSavingRef.current ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ASSIGN LOTS */}
      <Dialog open={isAssignLotsOpen} onOpenChange={setIsAssignLotsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner des lots</DialogTitle>
            <DialogDescription>Sélectionnez les lots/compétences du sous-traitant</DialogDescription>
          </DialogHeader>
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
            <Button type="button" onClick={() => setIsAssignLotsOpen(false)} variant="outline">Annuler</Button>
            <Button onClick={saveAssignLots} disabled={isSavingRef.current}>
              {isSavingRef.current ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ MODAL CRÉATION COMPTE */}
      <CreateArtisanAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        sousTraitant={sousTraitant}
        onSuccess={() => {
          // Recharger pour vérifier le nouveau compte
          if (sousTraitant?.user_id) {
            checkIfHasAccount(sousTraitant.user_id);
          }
          toast({ title: "Compte créé ✅", description: "L'artisan peut maintenant se connecter" });
        }}
      />
    </div>
  );
}