import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Mail, UserPlus, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

export function CreateArtisanAccountDialog({ artisan, isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  const [wasExisting, setWasExisting] = useState(false);

  if (!artisan) return null;

  const handleSendInvitation = async () => {
    if (!artisan.email) {
      toast({
        title: "Email manquant",
        description: "L'artisan doit avoir un email pour recevoir une invitation.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      console.log('📧 Envoi invitation pour:', artisan.email);

      const { data, error } = await supabase.functions.invoke('invite-artisan', {
        body: {
          email: artisan.email,
          artisanNom: artisan.nomsocieteST || `${artisan.PrenomST || ''} ${artisan.nomST || ''}`.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId = data.userId;
      const existing = data.existing;
      setWasExisting(existing);

      console.log(`✅ Email envoyé (${existing ? 'reset' : 'invitation'}), userId:`, newUserId);

      // ✅ Lier le user_id au sous-traitant
      if (newUserId) {
        await supabase.from('soustraitants').update({ user_id: newUserId }).eq('id', artisan.id);

        // ✅ Mettre à jour le profil
        await supabase.from('profiles').update({
          nom: artisan.nomST || '',
          prenom: artisan.PrenomST || '',
          mail: artisan.email,
          tel: artisan.telephone || '',
          nomsociete: artisan.nomsocieteST,
          user_type: 'artisan',
        }).eq('id', newUserId);
      }

      setInvitationSent(true);
      toast({
        title: existing ? "Email de connexion envoyé ✅" : "Invitation envoyée ✅",
        description: existing
          ? `${artisan.email} recevra un lien pour se connecter.`
          : `${artisan.email} recevra un email pour créer son mot de passe.`,
        duration: 5000
      });

      onSuccess?.();

    } catch (err) {
      console.error('❌ Erreur invitation:', err);
      toast({
        title: "Erreur ❌",
        description: err.message || "Impossible d'envoyer l'invitation",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Créer un accès pour {artisan.nomsocieteST}
          </DialogTitle>
          <DialogDescription>
            Un email sera envoyé à l'artisan pour qu'il accède à l'application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Infos artisan */}
          <div className="bg-slate-50 border rounded-md p-3 text-sm space-y-1">
            <div><strong>Email :</strong> {artisan.email || <span className="text-red-600">❌ Aucun email</span>}</div>
            <div><strong>Contact :</strong> {artisan.PrenomST} {artisan.nomST}</div>
          </div>

          {/* Pas d'email */}
          {!artisan.email && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              ⚠️ Impossible d'envoyer une invitation sans email. Modifiez la fiche de l'artisan.
            </div>
          )}

          {/* Invitation envoyée */}
          {invitationSent && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-semibold">
                  {wasExisting ? 'Email de connexion envoyé !' : 'Invitation envoyée !'}
                </p>
                <p>
                  {wasExisting
                    ? `${artisan.email} recevra un lien pour se connecter directement.`
                    : `${artisan.email} recevra un email pour créer son mot de passe.`}
                </p>
              </div>
            </div>
          )}

          {/* Explication */}
          {!invitationSent && artisan.email && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">📧 Comment ça fonctionne :</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>L'artisan reçoit un email avec un lien</li>
                <li>Il clique sur le lien et choisit son mot de passe</li>
                <li>Il peut se connecter immédiatement</li>
              </ol>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            {invitationSent ? 'Fermer' : 'Non, plus tard'}
          </Button>
          {!invitationSent && (
            <Button onClick={handleSendInvitation} disabled={isSending || !artisan.email}>
              {isSending ? 'Envoi en cours...' : <><Mail className="mr-2 h-4 w-4" />Envoyer l'invitation</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}