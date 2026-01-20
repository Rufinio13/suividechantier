import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, Mail, Lock, Loader2 } from 'lucide-react';

export function CreateArtisanAccountModal({ isOpen, onClose, sousTraitant, onSuccess }) {
  const { toast } = useToast();
  const isSavingRef = useRef(false);
  
  const [formData, setFormData] = useState({
    email: sousTraitant?.email || '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSavingRef.current) return;
    
    // ✅ Validation
    if (!formData.email || !formData.password) {
      toast({ 
        title: "Erreur", 
        description: "Email et mot de passe requis", 
        variant: "destructive" 
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: "Erreur", 
        description: "Les mots de passe ne correspondent pas", 
        variant: "destructive" 
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({ 
        title: "Erreur", 
        description: "Mot de passe minimum 6 caractères", 
        variant: "destructive" 
      });
      return;
    }

    isSavingRef.current = true;

    try {
      console.log('🔐 Création compte artisan pour:', formData.email);

      // ✅ 1️⃣ Créer l'utilisateur dans auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nom: sousTraitant.nomST || '',
            prenom: sousTraitant.PrenomST || '',
            nomsociete: sousTraitant.nomsocieteST,
            role: 'artisan'
          }
        }
      });

      if (authError) {
        console.error('❌ Erreur auth.signUp:', authError);
        
        // Messages d'erreur personnalisés
        if (authError.message.includes('User already registered')) {
          throw new Error('Cet email est déjà utilisé');
        }
        
        throw authError;
      }
      
      const userId = authData.user?.id;
      
      if (!userId) {
        throw new Error('Impossible de récupérer l\'ID utilisateur');
      }

      console.log('✅ Utilisateur créé:', userId);

      // ✅ 2️⃣ Attendre que Supabase crée bien l'entrée dans auth.users
      console.log('⏳ Attente création utilisateur dans auth.users...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ✅ 3️⃣ Créer le profil dans la table profiles
      console.log('📝 Création du profil...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nom: sousTraitant.nomST || '',
          prenom: sousTraitant.PrenomST || '',
          nomsociete: sousTraitant.nomsocieteST,
          email: formData.email,
          role: 'artisan',
          telephone: sousTraitant.telephone || null,
          adresse: sousTraitant.adresseST || null
        });

      if (profileError) {
        console.error('❌ Erreur création profil:', profileError);
        
        // Si le profil existe déjà, on continue quand même
        if (!profileError.message.includes('duplicate key')) {
          console.warn('⚠️ Erreur profil mais on continue');
        }
      } else {
        console.log('✅ Profil créé');
      }

      // ✅ 4️⃣ Lier au sous-traitant avec système de retry
      console.log('🔗 Liaison du compte au sous-traitant...');
      let retries = 3;
      let updateError = null;
      
      while (retries > 0) {
        const { error } = await supabase
          .from('soustraitants')
          .update({ 
            user_id: userId,
            email: formData.email
          })
          .eq('id', sousTraitant.id);

        if (!error) {
          console.log('✅ Sous-traitant lié au compte');
          updateError = null;
          break;
        }

        updateError = error;
        retries--;
        
        if (retries > 0) {
          console.log(`⚠️ Erreur liaison (${error.code}), retry dans 1s... (${retries} restants)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (updateError) {
        console.error('❌ Erreur finale liaison:', updateError);
        
        // Message d'erreur selon le code
        if (updateError.code === '23503') {
          throw new Error('Le compte a été créé mais la liaison au sous-traitant a échoué. Vérifiez vos paramètres Supabase (confirmation email désactivée ?)');
        }
        
        throw new Error(`Impossible de lier le compte: ${updateError.message}`);
      }

      console.log('🎉 Création compte terminée avec succès');

      toast({ 
        title: "Compte créé ✅", 
        description: `Compte artisan créé pour ${formData.email}` 
      });

      onSuccess?.();
      onClose();
      
      // Réinitialiser le formulaire
      setFormData({
        email: '',
        password: '',
        confirmPassword: ''
      });

    } catch (error) {
      console.error('❌ Erreur création compte:', error);
      
      let errorMessage = error.message || "Impossible de créer le compte";
      
      toast({ 
        title: "Erreur ❌", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  if (!sousTraitant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isSavingRef.current) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Créer un compte artisan
          </DialogTitle>
          <DialogDescription>
            Créer un compte pour <span className="font-medium">{sousTraitant.nomsocieteST}</span>
            {(sousTraitant.PrenomST || sousTraitant.nomST) && (
              <span> ({sousTraitant.PrenomST} {sousTraitant.nomST})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="inline h-4 w-4 mr-2" />
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="artisan@example.com"
              disabled={isSavingRef.current}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <Lock className="inline h-4 w-4 mr-2" />
              Mot de passe <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Minimum 6 caractères"
              disabled={isSavingRef.current}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              <Lock className="inline h-4 w-4 mr-2" />
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Confirmer le mot de passe"
              disabled={isSavingRef.current}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              ℹ️ L'artisan pourra se connecter immédiatement avec ces identifiants
            </p>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSavingRef.current}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSavingRef.current}
            >
              {isSavingRef.current ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Créer le compte
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}