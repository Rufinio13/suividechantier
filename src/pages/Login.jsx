// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Mail } from 'lucide-react';

export function Login() {
  const { signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
      // ✅ Messages d'erreur personnalisés
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect. Veuillez réessayer.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Votre email n\'a pas été confirmé. Veuillez vérifier votre boîte mail.');
      } else if (signInError.message.includes('Invalid email')) {
        setError('Format d\'email invalide.');
      } else {
        setError('Erreur de connexion : ' + signInError.message);
      }
      return;
    }

    if (data?.user) {
      toast({ 
        title: 'Connexion réussie ✅', 
        description: 'Bienvenue !',
        duration: 2000
      });
      navigate('/');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {showForgotPassword ? 'Mot de passe oublié' : 'Connexion'}
          </CardTitle>
          {showForgotPassword && (
            <CardDescription className="text-center">
              Entrez votre email pour recevoir un lien de réinitialisation
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <ForgotPasswordForm 
              onBack={() => setShowForgotPassword(false)} 
            />
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* ✅ MESSAGE D'ERREUR (sans composant Alert) */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Mot de passe oublié ?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ COMPOSANT MOT DE PASSE OUBLIÉ
function ForgotPasswordForm({ onBack }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'Email envoyé ✅',
        description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.',
        duration: 5000
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        {/* Message sans composant Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
          <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
            Vérifiez votre boîte mail (et vos spams).
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="votre@email.com"
        />
      </div>

      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1" 
          onClick={onBack}
        >
          Retour
        </Button>
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={loading}
        >
          {loading ? 'Envoi...' : 'Envoyer'}
        </Button>
      </div>
    </form>
  );
}