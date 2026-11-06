import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSousTraitant } from '@/context/SousTraitantContext.jsx';
import { useLots } from '@/context/LotsContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Edit, Trash2, Briefcase, UserPlus, UserCheck, Eye,
  User, Phone, Mail, MapPin, ShieldCheck, KeyRound, Building2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { CreateArtisanAccountDialog } from '@/components/CreateArtisanAccountDialog.jsx';
import { AttestationsTab } from '@/components/attestations/AttestationsTab.jsx';
import { PastilleConformite } from '@/components/attestations/PastilleConformite.jsx';
import { useAuth } from '@/hooks/useAuth.jsx';
import { isGerant } from '@/lib/postes';
import { normaliserSiret } from '@/lib/attestationsPdf';

const champsInfos = (st) => ({
  nomsocieteST: st?.nomsocieteST || '',
  siret: st?.siret || '',
  PrenomST: st?.PrenomST || '',
  nomST: st?.nomST || '',
  email: st?.email || '',
  telephone: st?.telephone || '',
  adresseST: st?.adresseST || '',
  code_postal: st?.code_postal || '',
  ville: st?.ville || '',
});

// ─── Formulaire de modification (remplace l'affichage, comme pour un chantier) ───
function SousTraitantInfosForm({ sousTraitant, onSave, onCancel }) {
  const [formData, setFormData] = useState(() => champsInfos(sousTraitant));
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Modifier l'artisan</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nomsocieteST">Nom de la société <span className="text-red-500">*</span></Label>
            <Input id="nomsocieteST" name="nomsocieteST" value={formData.nomsocieteST} onChange={handleChange} required />
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" name="siret" value={formData.siret} onChange={handleChange} placeholder="14 chiffres" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="PrenomST">Prénom</Label>
              <Input id="PrenomST" name="PrenomST" value={formData.PrenomST} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomST">Nom</Label>
              <Input id="nomST" name="nomST" value={formData.nomST} onChange={handleChange} />
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code_postal">Code postal</Label>
              <Input id="code_postal" name="code_postal" value={formData.code_postal} onChange={handleChange} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" name="ville" value={formData.ville} onChange={handleChange} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SousTraitantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { sousTraitants = [], loading, updateSousTraitant, deleteSousTraitant, getConformite } = useSousTraitant();
  const { profile } = useAuth();
  const peutSupprimer = isGerant(profile);
  const { lots: globalLots = [] } = useLots();

  const sousTraitant = useMemo(
    () => (sousTraitants ?? []).find(st => st.id === id),
    [sousTraitants, id]
  );

  const sortedLots = useMemo(
    () => [...globalLots].sort((a, b) => (a.lot || '').localeCompare(b.lot || '')),
    [globalLots]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('attestations');
  // Proposé automatiquement juste après la création de l'artisan
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(!!location.state?.proposerCompte);
  const [hasAccount, setHasAccount] = useState(false);
  const [selectedLotNames, setSelectedLotNames] = useState([]);

  const isSavingRef = useRef(false);

  useEffect(() => {
    if (sousTraitant) {
      checkIfHasAccount();
    } else {
      setHasAccount(false);
    }
  }, [sousTraitant?.id, sousTraitant?.user_id, sousTraitant?.email]);

  // ✅ Vérification via la Edge Function (clé service role) : la lecture directe de
  // profiles pour un autre utilisateur est bloquée par les RLS côté client, ce qui
  // faisait échouer silencieusement la détection.
  const checkIfHasAccount = async () => {
    if (!sousTraitant.email) {
      setHasAccount(!!sousTraitant.user_id);
      return;
    }
    try {
      // ✅ La fonction vérifie l'appelant et répare elle-même le lien manquant
      const { data, error } = await supabase.functions.invoke('check-artisan-account', {
        body: { soustraitantId: sousTraitant.id },
      });
      if (error) throw error;

      setHasAccount(!!data?.hasAccount);
    } catch (err) {
      console.error('❌ Erreur vérification compte:', err);
      setHasAccount(!!sousTraitant.user_id);
    }
  };

  useEffect(() => {
    if (sousTraitant) setSelectedLotNames(sousTraitant.assigned_lots ?? []);
  }, [sousTraitant]);

  const lotsModifies = useMemo(() => {
    const initiaux = sousTraitant?.assigned_lots ?? [];
    return initiaux.length !== selectedLotNames.length
      || selectedLotNames.some(name => !initiaux.includes(name));
  }, [sousTraitant, selectedLotNames]);

  const handleLotToggle = (lotName) => {
    setSelectedLotNames(prev =>
      prev.includes(lotName) ? prev.filter(name => name !== lotName) : [...prev, lotName]
    );
  };

  const saveLots = async () => {
    if (!sousTraitant || isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await updateSousTraitant(sousTraitant.id, { assigned_lots: selectedLotNames });
      toast({ title: "Lots enregistrés ✅" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer les lots", variant: "destructive" });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 1000);
    }
  };

  const saveInfos = async (formData) => {
    try {
      await updateSousTraitant(sousTraitant.id, { ...formData, siret: normaliserSiret(formData.siret) || null });
      toast({ title: "Mis à jour ✅" });
      setIsEditing(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
    }
  };

  // Contrôle non requis pour cet artisan (colonne decennale_non_requise / urssaf_non_requise)
  const toggleNonRequis = async (colonne, libelle, checked) => {
    try {
      await updateSousTraitant(sousTraitant.id, { [colonne]: !!checked });
      toast({ title: `${libelle} ${checked ? "non requise" : "requise"} ✅` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!sousTraitant) return;
    if (!window.confirm(`Supprimer ${sousTraitant.nomsocieteST} ?\n\nSes marchés, documents, attestations, notifications et indisponibilités seront définitivement supprimés. Ses tâches et SAV resteront dans le planning, sans artisan assigné.`)) return;
    try {
      await deleteSousTraitant(sousTraitant.id);
      toast({ title: "Supprimé ✅" });
      navigate("/sous-traitants");
    } catch (error) {
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
    }
  };

  const initials = `${sousTraitant?.PrenomST?.[0] ?? ''}${sousTraitant?.nomST?.[0] ?? 'ST'}`.toUpperCase();

  // Rechargement en arrière-plan (retour sur l'onglet…) : garder la page affichée
  // pour ne pas perdre une saisie en cours
  if (loading && !sousTraitant) return <div className="h-64 flex items-center justify-center">Chargement…</div>;
  if (!sousTraitant)
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Artisan non trouvé</h2>
        <p className="text-muted-foreground mb-6">L'artisan que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/sous-traitants"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
        </Button>
      </div>
    );

  const nomContact = `${sousTraitant.PrenomST || ''} ${sousTraitant.nomST || ''}`.trim();
  const villeComplete = `${sousTraitant.code_postal || ''} ${sousTraitant.ville || ''}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-3">
            <Link to="/sous-traitants"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <h1 className="text-3xl font-bold tracking-tight">{sousTraitant.nomsocieteST}</h1>
            <PastilleConformite conformite={getConformite(sousTraitant.id)} className="h-4 w-4" />
          </div>
        </div>

        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.open(`/apercu-artisan/${sousTraitant.id}`, '_blank')}>
              <Eye className="mr-2 h-4 w-4" /> Voir son espace
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </Button>
            {peutSupprimer && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <SousTraitantInfosForm
          sousTraitant={sousTraitant}
          onSave={saveInfos}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          {/* INFO GÉNÉRALES */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-lg">
            <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <User className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Contact :</span>
                  &nbsp;{nomContact || "N/A"}
                </div>
                <div className="flex items-center">
                  <Phone className="mr-3 h-5 w-5 text-green-600" />
                  <span className="font-medium">Téléphone :</span>
                  &nbsp;{sousTraitant.telephone || "N/A"}
                </div>
                <div className="flex items-center min-w-0">
                  <Mail className="mr-3 h-5 w-5 text-red-600 flex-shrink-0" />
                  <span className="font-medium">Email :</span>
                  &nbsp;<span className="truncate">{sousTraitant.email || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <Building2 className="mr-3 h-5 w-5 text-slate-500" />
                  <span className="font-medium">SIRET :</span>
                  &nbsp;{sousTraitant.siret || <span className="text-slate-400">N/A</span>}
                </div>
                <div className="flex items-center md:col-span-2">
                  <MapPin className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Adresse :</span>
                  &nbsp;
                  <span className="text-slate-700">
                    {sousTraitant.adresseST}
                    {sousTraitant.adresseST && villeComplete && ", "}
                    {villeComplete}
                    {!sousTraitant.adresseST && !villeComplete && <span className="text-slate-400">N/A</span>}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 md:col-span-2 lg:col-span-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="decennale_non_requise"
                      checked={!!sousTraitant.decennale_non_requise}
                      onCheckedChange={(checked) => toggleNonRequis("decennale_non_requise", "Décennale", checked)}
                    />
                    <Label htmlFor="decennale_non_requise" className="cursor-pointer">
                      Pas de décennale requise
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="urssaf_non_requise"
                      checked={!!sousTraitant.urssaf_non_requise}
                      onCheckedChange={(checked) => toggleNonRequis("urssaf_non_requise", "URSSAF", checked)}
                    />
                    <Label htmlFor="urssaf_non_requise" className="cursor-pointer">
                      Pas d'URSSAF requise
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-2 justify-start">
              <TabsTrigger value="attestations" className="flex items-center justify-center">
                <ShieldCheck className="mr-2 h-4 w-4" /> Assurances & attestations
                <PastilleConformite conformite={getConformite(sousTraitant.id)} className="ml-2 h-2.5 w-2.5" />
              </TabsTrigger>
              <TabsTrigger value="lots" className="flex items-center justify-center">
                <Briefcase className="mr-2 h-4 w-4" /> Lots
              </TabsTrigger>
              <TabsTrigger value="compte" className="flex items-center justify-center">
                <KeyRound className="mr-2 h-4 w-4" /> Compte artisan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attestations" className="mt-6">
              <AttestationsTab
                soustraitantId={sousTraitant.id}
                siretArtisan={sousTraitant.siret || ''}
                decennaleNonRequise={!!sousTraitant.decennale_non_requise}
                urssafNonRequise={!!sousTraitant.urssaf_non_requise}
              />
            </TabsContent>

            <TabsContent value="lots" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle>Lots</CardTitle>
                  <Button size="sm" onClick={saveLots} disabled={!lotsModifies}>Enregistrer</Button>
                </CardHeader>
                <CardContent>
                  {sortedLots.length === 0 ? (
                    <div className="text-center py-6">
                      <Briefcase className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Aucun lot défini</p>
                    </div>
                  ) : (
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {sortedLots.map(lot => (
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compte" className="mt-6">
              <Card>
                <CardHeader><CardTitle>Compte Artisan</CardTitle></CardHeader>
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
                        <p className="text-sm text-muted-foreground">Cet artisan n'a pas encore de compte.</p>
                      </div>
                      <Button onClick={() => setIsCreateAccountOpen(true)} variant="outline" className="w-full">
                        <UserPlus className="mr-2 h-4 w-4" />Générer un lien d'accès
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <CreateArtisanAccountDialog
        artisan={sousTraitant}
        isOpen={isCreateAccountOpen}
        onClose={() => {
          setIsCreateAccountOpen(false);
          // Ne pas reproposer le compte au rafraîchissement de la page
          if (location.state?.proposerCompte) navigate(location.pathname, { replace: true });
        }}
        onSuccess={(res) => {
          // Compte déjà existant : rattaché immédiatement par la fonction
          if (res?.existing) setHasAccount(true);
        }}
      />
    </motion.div>
  );
}
