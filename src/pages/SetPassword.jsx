// src/pages/SetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export function SetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      // ✅ Cas 1 : token dans le hash (lien email cliqué directement)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      console.log('🔐 SetPassword init - access_token dans hash:', !!accessToken);

      if (accessToken) {
        // Établir la session avec le token du lien
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken,
        });

        if (sessionError || !data?.session) {
          console.error('❌ setSession échoué:', sessionError?.message);
          setError('Lien invalide ou expiré. Veuillez contacter votre conducteur de travaux.');
        } else {
          console.log('✅ Session établie via hash token pour:', data.session.user?.email);
          setIsReady(true);
          // Nettoyer le hash de l'URL
          window.history.replaceState(null, '', window.location.pathname);
        }
        setChecking(false);
        return;
      }

      // ✅ Cas 2 : pas de token dans le hash → vérifier si session déjà active
      // (AppProvider a peut-être déjà établi la session via onAuthStateChange)
      console.log('🔍 Pas de token dans le hash — vérification session existante...');

      // Attendre un peu que AppProvider traite le token s'il est ailleurs
      await new Promise(resolve => setTimeout(resolve, 800));

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        console.log('✅ Session active trouvée pour:', sessionData.session.user?.email);
        setIsReady(true);
      } else {
        console.warn('❌ Aucune session — lien invalide ou expiré');
        setError('Lien invalide ou expiré. Veuillez contacter votre conducteur de travaux.');
      }
      setChecking(false);
    };

    init();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // ✅ Déconnecter après avoir défini le mot de passe
      // pour que l'artisan se reconnecte proprement
      await supabase.auth.signOut();

      setSuccess(true);
      toast({
        title: 'Compte activé ✅',
        description: 'Votre mot de passe a été créé. Connectez-vous maintenant.',
        duration: 4000
      });

      setTimeout(() => navigate('/login'), 3000);

    } catch (err) {
      console.error('❌ Erreur updateUser:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chargement
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

  // Lien invalide
  if (!isReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef]">
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
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Succès
  if (success) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef]">
        <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <CheckCircle className="h-16 w-16" style={{ color: '#9FC760' }} />
            <p className="text-lg font-semibold text-center" style={{ color: '#683B11' }}>Compte activé !</p>
            <p className="text-sm text-center" style={{ color: '#A3806D' }}>Redirection vers la connexion...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulaire
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef]">
      <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="text-center">
              <div>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#683B11' }}>EVA</span>
                <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '28px', color: '#9FC760' }}>bois</span>
              </div>
              <div style={{ fontSize: '10px', color: '#A3806D', fontStyle: 'italic' }}>pour un avenir durable en toute confiance</div>
            </div>
          </div>
          <CardTitle className="text-xl text-center" style={{ color: '#683B11' }}>
            Créer votre mot de passe
          </CardTitle>
          <CardDescription className="text-center">
            Choisissez un mot de passe pour activer votre accès à l'application EVAbois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Choisissez un mot de passe</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="Minimum 6 caractères" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input id="confirm-password" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required minLength={6} placeholder="Retapez le mot de passe" />
            </div>
            <Button type="submit" className="w-full text-white border-0"
              style={{ background: '#9FC760' }} disabled={loading}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />En cours...</>
                : 'Activer mon compte'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}