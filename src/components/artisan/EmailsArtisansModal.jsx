import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

// Liste des emails des artisans qui ont un compte, prête à coller dans un mail (destinataires en Cci).
export function EmailsArtisansModal({ open, onClose, sousTraitants }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lignes, setLignes] = useState([]);
  const [copie, setCopie] = useState(false);

  const avecCompte = useMemo(
    () => (sousTraitants || []).filter(st => st.user_id),
    [sousTraitants]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setCopie(false);

      // Email de connexion (profil) en priorité, sinon l'email de la fiche artisan
      let mailsProfils = {};
      const userIds = avecCompte.map(st => st.user_id);
      if (userIds.length) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, mail')
          .in('id', userIds);
        if (error) console.error('Lecture des emails de connexion impossible :', error);
        (data || []).forEach(p => { if (p.mail) mailsProfils[p.id] = p.mail; });
      }

      const resultat = avecCompte
        .map(st => ({
          id: st.id,
          nom: st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan',
          email: (mailsProfils[st.user_id] || st.email || '').trim(),
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom));

      if (!cancelled) {
        setLignes(resultat);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, avecCompte]);

  // Un même email n'apparaît qu'une fois
  const emails = useMemo(() => {
    const vus = new Set();
    return lignes
      .map(l => l.email)
      .filter(e => e && !vus.has(e.toLowerCase()) && vus.add(e.toLowerCase()));
  }, [lignes]);

  const sansEmail = lignes.filter(l => !l.email);
  const texte = emails.join('; ');

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      toast({ title: `${emails.length} email${emails.length > 1 ? 's' : ''} copié${emails.length > 1 ? 's' : ''}` });
    } catch {
      toast({ title: 'Copie impossible', description: 'Sélectionnez le texte et copiez-le à la main.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emails des artisans ayant un compte</DialogTitle>
          <DialogDescription>
            Collez la liste dans le champ <strong>Cci</strong> de votre mail : chaque artisan ne verra pas les adresses des autres.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {emails.length} email{emails.length > 1 ? 's' : ''} sur {lignes.length} artisan{lignes.length > 1 ? 's' : ''} avec un compte
            </p>

            <textarea
              readOnly
              value={texte}
              onFocus={(e) => e.target.select()}
              className="w-full h-32 rounded-md border bg-slate-50 p-3 text-sm font-mono resize-none"
            />

            <Button onClick={copier} disabled={!emails.length} className="w-full">
              {copie ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copie ? 'Copié' : 'Copier la liste'}
            </Button>

            {sansEmail.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Sans email trouvé ({sansEmail.length}) :
                </p>
                <p className="mt-1">{sansEmail.map(l => l.nom).join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
