// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false); // ✅ true si c'est une nouvelle invitation
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      // ✅ Détecter si c'est une invitation (type=invite dans le hash)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const type = params.get('type');

      if (type === 'invite') setIsInvitation(true);

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setIsValidToken(true);
      } else {
        setError('Lien invalide ou expiré. Veuillez contacter votre conducteur de travaux.');
      }
    };

    checkToken();
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

      setSuccess(true);
      toast({
        title: isInvitation ? 'Compte activé ✅' : 'Mot de passe modifié ✅',
        description: isInvitation
          ? 'Votre compte est prêt. Vous allez être redirigé vers la connexion.'
          : 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
        duration: 4000
      });

      setTimeout(() => navigate('/login'), 3000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lien invalide
  if (!isValidToken && error) {
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
            <Button className="w-full" style={{ background: '#9FC760', color: 'white' }} onClick={() => navigate('/login')}>
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
            <CheckCircle className="h-16 w-16 text-[#9FC760]" />
            <p className="text-lg font-semibold text-center" style={{ color: '#683B11' }}>
              {isInvitation ? 'Compte activé !' : 'Mot de passe modifié !'}
            </p>
            <p className="text-sm text-center" style={{ color: '#A3806D' }}>
              Redirection vers la connexion...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f7f4ef]">
      <Card className="w-full max-w-md shadow-lg border border-[#e8e2d9]">
        <CardHeader>
          {/* Logo EVAbois */}
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
            {isInvitation ? 'Créer votre mot de passe' : 'Nouveau mot de passe'}
          </CardTitle>
          <CardDescription className="text-center">
            {isInvitation
              ? 'Choisissez un mot de passe pour activer votre accès à l\'application EVAbois.'
              : 'Choisissez un nouveau mot de passe pour votre compte.'}
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
              <Label htmlFor="password">
                {isInvitation ? 'Choisissez un mot de passe' : 'Nouveau mot de passe'}
              </Label>
              <Input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="Minimum 6 caractères"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required minLength={6} placeholder="Retapez le mot de passe"
              />
            </div>

            <Button type="submit" className="w-full text-white border-0" style={{ background: '#9FC760' }} disabled={loading}>
              {loading
                ? 'En cours...'
                : isInvitation ? 'Activer mon compte' : 'Modifier le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}