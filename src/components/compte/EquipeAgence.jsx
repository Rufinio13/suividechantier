import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { supabase } from '@/lib/supabaseClient';
import { POSTES } from '@/lib/postes';
import { Users, UserPlus, Loader2, Copy, Check, CheckCircle, Link2 } from 'lucide-react';

const DUREES = [
  { jours: 1, label: '24 heures' },
  { jours: 3, label: '3 jours' },
  { jours: 7, label: '7 jours' },
];

const SELECT_CLASS = 'h-9 w-full min-w-[170px] rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60';

const labelPoste = (poste) => POSTES.find(p => p.value === poste)?.label || '—';

// Appel de l'Edge Function gerer-equipe avec message d'erreur lisible
async function appelerGererEquipe(body) {
  const { data, error } = await supabase.functions.invoke('gerer-equipe', { body });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(payload?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function StatutBadge({ membre }) {
  if (membre.type === 'invitation') {
    return (
      <span className="inline-flex flex-col">
        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Invitation en attente
        </span>
        <span className="mt-0.5 text-[11px] text-slate-500">
          Lien valable jusqu'au {format(new Date(membre.expires_at), 'dd/MM HH:mm', { locale: fr })}
        </span>
      </span>
    );
  }
  return membre.actif ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Actif</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Désactivé</span>
  );
}

export function EquipeAgence({ currentUserId }) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enCours, setEnCours] = useState(null); // id de la ligne en cours de modification
  const [dialogOpen, setDialogOpen] = useState(false);

  const charger = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('lister_equipe_agence');
      if (error) throw error;
      const tri = (m) => (m.type === 'invitation' ? 2 : m.actif ? 0 : 1);
      setEquipe([...(data || [])].sort((a, b) =>
        tri(a) - tri(b) || `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`)
      ));
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
      toast({ title: 'Erreur', description: err.message || "Impossible de charger l'équipe", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { charger(); }, [charger]);

  const nomComplet = (m) => [m.prenom, m.nom].filter(Boolean).join(' ') || m.mail;

  const changerRole = async (membre, poste) => {
    if (poste === membre.poste) return;
    if (poste === 'gerant' && !(await confirm(
      `${nomComplet(membre)} deviendra gérant : il pourra gérer l'équipe, les rôles et les accès, comme vous.\n\nContinuer ?`,
      'Nommer un gérant'
    ))) return;

    setEnCours(membre.id);
    try {
      const { error } = await supabase.rpc('definir_poste_membre', { p_user_id: membre.id, p_poste: poste });
      if (error) throw error;
      setEquipe(prev => prev.map(m => (m.id === membre.id ? { ...m, poste } : m)));
      toast({ title: 'Rôle mis à jour ✅', description: `${nomComplet(membre)} : ${labelPoste(poste)}` });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de changer le rôle', variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  const basculerStatut = async (membre) => {
    const desactiver = membre.actif;
    if (desactiver && !(await confirm(
      `${nomComplet(membre)} ne pourra plus se connecter à l'application. Ses données (chantiers, comptes rendus…) sont conservées et vous pourrez réactiver le compte à tout moment.\n\nDésactiver ce compte ?`,
      'Désactiver un accès'
    ))) return;

    setEnCours(membre.id);
    try {
      await appelerGererEquipe({ action: desactiver ? 'desactiver' : 'reactiver', userId: membre.id });
      setEquipe(prev => prev.map(m => (m.id === membre.id ? { ...m, actif: !desactiver } : m)));
      toast({ title: desactiver ? 'Compte désactivé' : 'Compte réactivé ✅', description: nomComplet(membre) });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  const annulerInvitation = async (membre) => {
    if (!(await confirm(`Annuler l'invitation de ${nomComplet(membre)} ? Le lien envoyé ne fonctionnera plus.`, "Annuler l'invitation"))) return;
    setEnCours(membre.id);
    try {
      const { error } = await supabase.rpc('annuler_invitation_equipe', { p_id: membre.id });
      if (error) throw error;
      setEquipe(prev => prev.filter(m => m.id !== membre.id));
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <>
      <Card className="border border-[#e8e2d9] shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#683B11' }}>
            <Users className="h-4 w-4" style={{ color: '#F8B45B' }} />
            Équipe de l'agence
          </CardTitle>
          <Button size="sm" className="text-white border-0" style={{ background: '#9FC760' }} onClick={() => setDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Nouvel accès
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#9FC760' }} />
            </div>
          ) : equipe.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun membre pour le moment.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[#e8e2d9] text-left text-xs uppercase tracking-wide" style={{ color: '#A3806D' }}>
                    <th className="py-2 pr-3 font-semibold">Nom</th>
                    <th className="py-2 pr-3 font-semibold">Email</th>
                    <th className="py-2 pr-3 font-semibold">Téléphone</th>
                    <th className="py-2 pr-3 font-semibold">Rôle</th>
                    <th className="py-2 pr-3 font-semibold">Statut</th>
                    <th className="py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {equipe.map((m) => {
                    const estMoi = m.id === currentUserId;
                    const invitation = m.type === 'invitation';
                    const occupe = enCours === m.id;
                    return (
                      <tr key={`${m.type}-${m.id}`} className={`border-b border-[#f0ebe3] last:border-0 ${!invitation && !m.actif ? 'opacity-60' : ''}`}>
                        <td className="py-2.5 pr-3 font-medium text-slate-800">
                          {[m.prenom, m.nom].filter(Boolean).join(' ') || '—'}
                          {estMoi && <span className="ml-1 text-xs font-normal text-slate-500">(vous)</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700 break-all">{m.mail || '—'}</td>
                        <td className="py-2.5 pr-3 text-slate-700 whitespace-nowrap">{m.tel || '—'}</td>
                        <td className="py-2.5 pr-3">
                          {invitation || estMoi ? (
                            <span className="text-slate-700">{labelPoste(m.poste)}</span>
                          ) : (
                            <select className={SELECT_CLASS} value={m.poste || ''} disabled={occupe}
                              onChange={(e) => changerRole(m, e.target.value)}>
                              {!m.poste && <option value="" disabled>Choisir un rôle…</option>}
                              {POSTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 pr-3"><StatutBadge membre={m} /></td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {invitation ? (
                            <Button size="sm" variant="outline" disabled={occupe} onClick={() => annulerInvitation(m)}>
                              Annuler
                            </Button>
                          ) : estMoi ? null : (
                            <Button size="sm" variant="outline" disabled={occupe} onClick={() => basculerStatut(m)}
                              className={m.actif ? 'text-red-700 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'}>
                              {occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : m.actif ? 'Désactiver' : 'Réactiver'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <NouvelAccesDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCree={charger}
      />
      {ConfirmDialog}
    </>
  );
}

// ─── Création d'un nouvel accès : lien d'activation à copier ─────────────────
function NouvelAccesDialog({ isOpen, onClose, onCree }) {
  const { toast } = useToast();
  const vide = { prenom: '', nom: '', email: '', tel: '', poste: 'conducteur_travaux' };
  const [form, setForm] = useState(vide);
  const [duree, setDuree] = useState(7);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null); // { link, expiresAt }
  const [copie, setCopie] = useState(false);

  const fermer = () => {
    setForm(vide); setDuree(7); setResultat(null); setCopie(false);
    onClose();
  };

  const generer = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const data = await appelerGererEquipe({
        action: 'inviter', ...form, dureeJours: duree, siteUrl: window.location.origin,
      });
      setResultat(data);
      onCree?.();
    } catch (err) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de créer l\'accès', variant: 'destructive' });
    } finally {
      setEnCours(false);
    }
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(resultat.link);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le lien', variant: 'destructive' });
    }
  };

  const champ = (name) => ({
    id: `acces-${name}`, value: form[name],
    onChange: (e) => setForm(f => ({ ...f, [name]: e.target.value })),
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) fermer(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" style={{ color: '#9FC760' }} /> Nouvel accès
          </DialogTitle>
          <DialogDescription>
            Un lien d'activation est généré : transmettez-le à la personne (SMS, WhatsApp, email…) pour qu'elle choisisse son mot de passe.
          </DialogDescription>
        </DialogHeader>

        {resultat ? (
          <div className="space-y-3 py-2">
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-semibold">Lien généré pour {form.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={resultat.link} onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 rounded-md border bg-slate-50 px-2 py-1.5 text-xs text-slate-600 truncate" />
              <Button type="button" variant="outline" size="sm" onClick={copier} className="shrink-0">
                {copie ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-amber-700">
              ⚠️ Valable jusqu'au {format(new Date(resultat.expiresAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}, utilisable une seule fois.
            </p>
            <DialogFooter>
              <Button onClick={fermer}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={generer} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acces-prenom">Prénom</Label>
                <Input {...champ('prenom')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acces-nom">Nom</Label>
                <Input {...champ('nom')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acces-email">Email (identifiant de connexion) <span className="text-red-500">*</span></Label>
              <Input type="email" required {...champ('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acces-tel">Téléphone</Label>
              <Input {...champ('tel')} placeholder="06 XX XX XX XX" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acces-poste">Rôle <span className="text-red-500">*</span></Label>
              <select {...champ('poste')} className={SELECT_CLASS.replace('h-9', 'h-10')}>
                {POSTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Validité du lien</p>
              <div className="grid grid-cols-3 gap-2">
                {DUREES.map(d => (
                  <Button key={d.jours} type="button" size="sm" variant={duree === d.jours ? 'default' : 'outline'}
                    onClick={() => setDuree(d.jours)}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={fermer} disabled={enCours}>Annuler</Button>
              <Button type="submit" disabled={enCours} className="text-white border-0" style={{ background: '#9FC760' }}>
                {enCours ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Génération…</> : <><Link2 className="mr-2 h-4 w-4" />Générer le lien</>}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
