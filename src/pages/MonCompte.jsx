import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Phone, MapPin, Lock, Save, Loader2 } from 'lucide-react';

export function MonCompte() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [userType, setUserType] = useState(null); // ✅ pour savoir si artisan ou constructeur

  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    mail: '',
    tel: '',
    nomsociete: '',
    adresse: '',
    ville: '',
    code_postal: '',
  });

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // ✅ Charger le profil
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('nom, prenom, mail, tel, nomsociete, adresse, ville, code_postal, user_type')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUserType(data.user_type);
          setProfile({
            nom: data.nom || '',
            prenom: data.prenom || '',
            mail: data.mail || '',
            tel: data.tel || '',
            nomsociete: data.nomsociete || '',
            adresse: data.adresse || '',
            ville: data.ville || '',
            code_postal: data.code_postal || '',
          });
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        toast({ title: 'Erreur', description: 'Impossible de charger le profil', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ✅ Sauvegarder le profil
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ✅ Pour un artisan : NE PAS mettre à jour nomsociete
      // nomsociete = société du constructeur qui l'a créé → ne doit jamais être modifié
      const updatePayload = userType === 'artisan'
        ? {
            nom: profile.nom,
            prenom: profile.prenom,
            mail: profile.mail,
            tel: profile.tel,
            adresse: profile.adresse,
            ville: profile.ville,
            code_postal: profile.code_postal,
            // ✅ nomsociete intentionnellement absent
          }
        : {
            nom: profile.nom,
            prenom: profile.prenom,
            mail: profile.mail,
            tel: profile.tel,
            nomsociete: profile.nomsociete, // ✅ constructeur peut modifier sa société
            adresse: profile.adresse,
            ville: profile.ville,
            code_postal: profile.code_postal,
          };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Profil mis à jour ✅', description: 'Vos informations ont été sauvegardées' });
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le profil', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ✅ Changer le mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 6) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères', variant: 'destructive' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;

      toast({ title: 'Mot de passe modifié ✅', description: 'Votre mot de passe a été mis à jour' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      toast({ title: 'Erreur', description: 'Impossible de modifier le mot de passe', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#9FC760] mx-auto mb-3"></div>
          <p style={{ color: '#A3806D' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#683B11' }}>
          Mon compte
        </h1>
        <p className="text-sm mt-1" style={{ color: '#A3806D' }}>
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* ─── INFORMATIONS PERSONNELLES ─────────────────────────────────────── */}
      <Card className="border border-[#e8e2d9] shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2"
            style={{ color: '#683B11' }}>
            <User className="h-4 w-4" style={{ color: '#F8B45B' }} />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={profile.prenom}
                  onChange={(e) => setProfile(p => ({ ...p, prenom: e.target.value }))}
                  placeholder="Votre prénom" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={profile.nom}
                  onChange={(e) => setProfile(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Votre nom" />
              </div>
            </div>

            {/* ✅ Champ société : modifiable pour constructeur, lecture seule pour artisan */}
            <div className="space-y-2">
              <Label htmlFor="nomsociete">Société</Label>
              {userType === 'artisan' ? (
                <Input
                  id="nomsociete"
                  value={profile.nomsociete}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  title="Ce champ est géré par votre constructeur"
                />
              ) : (
                <Input id="nomsociete" value={profile.nomsociete}
                  onChange={(e) => setProfile(p => ({ ...p, nomsociete: e.target.value }))}
                  placeholder="Nom de votre société" />
              )}
              {userType === 'artisan' && (
                <p className="text-xs text-muted-foreground">
                  La société est gérée par votre constructeur.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail" className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input id="mail" type="email" value={profile.mail}
                onChange={(e) => setProfile(p => ({ ...p, mail: e.target.value }))}
                placeholder="votre@email.fr" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tel" className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Téléphone
              </Label>
              <Input id="tel" value={profile.tel}
                onChange={(e) => setProfile(p => ({ ...p, tel: e.target.value }))}
                placeholder="06 XX XX XX XX" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Adresse
              </Label>
              <Input id="adresse" value={profile.adresse}
                onChange={(e) => setProfile(p => ({ ...p, adresse: e.target.value }))}
                placeholder="Rue, numéro..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input id="code_postal" value={profile.code_postal}
                  onChange={(e) => setProfile(p => ({ ...p, code_postal: e.target.value }))}
                  placeholder="13450" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" value={profile.ville}
                  onChange={(e) => setProfile(p => ({ ...p, ville: e.target.value }))}
                  placeholder="Grans" />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving}
                className="text-white border-0" style={{ background: '#9FC760' }}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sauvegarde...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Sauvegarder</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── CHANGER MOT DE PASSE ──────────────────────────────────────────── */}
      <Card className="border border-[#e8e2d9] shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2"
            style={{ color: '#683B11' }}>
            <Lock className="h-4 w-4" style={{ color: '#F8B45B' }} />
            Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input id="newPassword" type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Minimum 6 caractères" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input id="confirmPassword" type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Retapez le nouveau mot de passe" minLength={6} />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={changingPassword || !passwords.newPassword}
                variant="outline"
                className="border-[#e8e2d9] hover:bg-[#f7f4ef]"
                style={{ color: '#683B11' }}>
                {changingPassword ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Modification...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Modifier le mot de passe</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}