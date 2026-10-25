import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Link2, UserPlus, CheckCircle, Copy, Check, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DUREES = [
  { jours: 1, label: "24 heures" },
  { jours: 3, label: "3 jours" },
  { jours: 7, label: "7 jours" },
];

// Création d'un compte artisan par lien d'activation à copier (aucun email envoyé)
export function CreateArtisanAccountDialog({ artisan, isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [duree, setDuree] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null); // { existing, link, expiresAt }
  const [linkCopied, setLinkCopied] = useState(false);

  if (!artisan) return null;

  const handleGenerate = async () => {
    if (!artisan.email) {
      toast({ title: "Email manquant", description: "L'email de l'artisan sert d'identifiant de connexion.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-artisan', {
        body: { soustraitantId: artisan.id, siteUrl: window.location.origin, dureeJours: duree },
      });

      if (error) {
        const body = await error.context?.json?.().catch(() => null);
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);

      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      console.error('❌ Erreur génération lien:', err);
      toast({ title: "Erreur ❌", description: err.message || "Impossible de générer le lien", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({ title: "Erreur ❌", description: "Impossible de copier le lien", variant: "destructive" });
    }
  };

  const handleClose = () => {
    setResult(null);
    setLinkCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Créer un accès pour {artisan.nomsocieteST}
          </DialogTitle>
          <DialogDescription>
            Générez un lien à transmettre à l'artisan (SMS, WhatsApp…) pour qu'il choisisse son mot de passe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 border rounded-md p-3 text-sm space-y-1">
            <div><strong>Identifiant :</strong> {artisan.email || <span className="text-red-600">❌ Aucun email</span>}</div>
            <div><strong>Contact :</strong> {artisan.PrenomST} {artisan.nomST}</div>
          </div>

          {!artisan.email && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              ⚠️ Renseignez l'email de l'artisan dans sa fiche : il lui sert d'identifiant de connexion.
            </div>
          )}

          {!result && artisan.email && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Validité du lien</p>
              <div className="grid grid-cols-3 gap-2">
                {DUREES.map(d => (
                  <Button key={d.jours} type="button" size="sm"
                    variant={duree === d.jours ? "default" : "outline"}
                    onClick={() => setDuree(d.jours)}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {result?.existing && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-semibold">Cet artisan a déjà un compte</p>
                <p>Il est maintenant rattaché à votre société : il se connecte avec son email et son mot de passe habituels.</p>
              </div>
            </div>
          )}

          {result?.link && (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 font-semibold">Lien généré — copiez-le et envoyez-le à l'artisan</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.link}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 rounded-md border bg-slate-50 px-2 py-1.5 text-xs text-slate-600 truncate"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
                  {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-amber-700">
                ⚠️ Valable jusqu'au {format(new Date(result.expiresAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}, utilisable une seule fois.
                Générer un nouveau lien invalide le précédent.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isGenerating}>
            {result ? 'Fermer' : 'Non, plus tard'}
          </Button>
          {!result && (
            <Button onClick={handleGenerate} disabled={isGenerating || !artisan.email}>
              {isGenerating ? 'Génération...' : <><Link2 className="mr-2 h-4 w-4" />Générer le lien</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
