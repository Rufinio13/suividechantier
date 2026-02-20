import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase, supabaseWithSessionCheck } from "@/lib/supabaseClient";

export function CreateArtisanAccountDialog({ artisan, isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!artisan) return null;

  // ✅ Création compte (AVEC wrapper)
  const handleCreateAccount = async () => {
    // Validations
    if (!artisan.email) {
      toast({ 
        title: "Email manquant", 
        description: "L'artisan doit avoir un email pour créer un compte.",
        variant: "destructive" 
      });
      return;
    }

    if (password.length < 6) {
      toast({ 
        title: "Mot de passe trop court", 
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive" 
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ 
        title: "Mots de passe différents", 
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive" 
      });
      return;
    }

    setIsCreating(true);

    try {
      await supabaseWithSessionCheck(async () => {
        console.log('👤 Création compte pour artisan:', artisan.id);

        // 1️⃣ Créer le compte auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: artisan.email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          }
        });

        if (authError) {
          throw new Error(`Erreur création auth: ${authError.message}`);
        }

        const newUserId = authData.user.id;
        console.log('✅ Compte auth créé avec ID:', newUserId);

        // 2️⃣ Mettre à jour le profil (créé automatiquement par trigger)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nom: artisan.nomST || '',
            prenom: artisan.PrenomST || '',
            mail: artisan.email,
            tel: artisan.telephone || '',
            nomsociete: artisan.nomsociete,
            user_type: 'artisan',
          })
          .eq('id', newUserId);

        if (profileError) {
          throw new Error(`Erreur création profil: ${profileError.message}`);
        }

        console.log('✅ Profil artisan créé');

        // 3️⃣ Mettre à jour le sous-traitant avec le nouveau user_id
        const { error: updateError } = await supabase
          .from('soustraitants')
          .update({ user_id: newUserId })
          .eq('id', artisan.id);

        if (updateError) {
          console.error('⚠️ Erreur mise à jour user_id du sous-traitant:', updateError);
          throw new Error(`Erreur liaison compte: ${updateError.message}`);
        }

        console.log('✅ Sous-traitant mis à jour avec nouveau user_id');

        toast({
          title: "Compte créé ✅",
          description: `Un email de confirmation a été envoyé à ${artisan.email}`,
          duration: 5000
        });

        onSuccess?.();
        onClose();
      });
    } catch (err) {
      console.error('❌ Erreur création compte:', err);
      toast({ 
        title: "Erreur ❌", 
        description: err.message || "Impossible de créer le compte", 
        variant: "destructive" 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    console.log('⏭️ Création de compte ignorée');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Créer un compte pour {artisan.nomsocieteST} ?
          </DialogTitle>
          <DialogDescription>
            Cela permettra à cet artisan de se connecter et voir ses chantiers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 border rounded-md p-3 text-sm">
            <div><strong>Email :</strong> {artisan.email || "❌ Aucun email"}</div>
            <div><strong>Contact :</strong> {artisan.PrenomST} {artisan.nomST}</div>
          </div>

          {!artisan.email && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              ⚠️ Impossible de créer un compte sans email. Modifiez l'artisan pour ajouter un email.
            </div>
          )}

          {artisan.email && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe <span className="text-red-500">*</span></Label>
                <Input 
                  id="confirm-password" 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSkip}
            disabled={isCreating}
          >
            Non, plus tard
          </Button>
          <Button 
            onClick={handleCreateAccount}
            disabled={isCreating || !artisan.email}
          >
            {isCreating ? 'Création...' : 'Oui, créer le compte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}