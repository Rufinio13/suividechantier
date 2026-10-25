// src/pages/ActiverCompte.jsx
// Activation d'un compte artisan via le lien copié par le constructeur
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const MIN_PASSWORD_LENGTH = 8;

async function callAcceptInvitation(body) {
  const { data, error } = await supabase.functions.invoke('accept-invitation', { body });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(payload?.error || 'Une erreur est survenue. Réessayez plus tard.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function ActiverCompte() {
  const navigate = useNavigate();

  const [token] = useState(() => new URLSearchParams(window.location.hash.replace('#', '')).get('token'));
  const [invitation, setInvitation] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Retirer le jeton de la barre d'adresse
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setError('Lien invalide. Demandez un nouveau lien à votre conducteur de travaux.');
      setChecking(false);
      return;
    }
    callAcceptInvitation({ token })
      .then(setInvitation)
      .catch((err) => setError(err.message))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const { email } = await callAcceptInvitation({ token, password });

      // Connexion directe avec le compte créé
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        navigate('/login');
        return;
      }
      navigate('/artisan');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef]">
        <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#9FC760' }} />
            <p className="text-sm" style={{ color: '#A3806D' }}>Vérification du lien...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef] px-4">
        <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
          <CardHeader>
            <CardTitle className="text-2xl text-center" style={{ color: '#683B11' }}>Lien invalide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <Button className="w-full text-white border-0" style={{ background: '#9FC760' }}
              onClick={() => navigate('/login')}>
              Aller à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef] px-4">
      <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
        <CardHeader>
          <CardTitle className="text-xl text-center" style={{ color: '#683B11' }}>
            Activer votre compte
          </CardTitle>
          <CardDescription className="text-center">
            {invitation.prenom ? `Bonjour ${invitation.prenom}, ` : ''}
            <strong>{invitation.nomsociete}</strong> vous invite sur EVAbois.
            Choisissez un mot de passe pour accéder à votre espace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Identifiant (email)</Label>
              <Input id="email" value={invitation.email} disabled className="bg-slate-50 text-slate-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                required minLength={MIN_PASSWORD_LENGTH} placeholder={`Minimum ${MIN_PASSWORD_LENGTH} caractères`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required minLength={MIN_PASSWORD_LENGTH} placeholder="Retapez le mot de passe" />
            </div>
            <Button type="submit" className="w-full text-white border-0"
              style={{ background: '#9FC760' }} disabled={loading}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activation...</>
                : 'Activer mon compte'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
