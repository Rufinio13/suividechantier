import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { History } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';

// Rose/fuchsia : volontairement différent du rouge "conflit / indisponible"
export const PASTILLE_MODIF_CLASS = 'bg-fuchsia-500 ring-1 ring-white';

const formatJour = (value) => {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd/MM/yyyy'); } catch { return value; }
};

// À l'ouverture d'une tâche : fige les modifications non consultées (pour les afficher),
// puis marque la tâche comme vue (la pastille disparaît).
// Sans modification non consultée, on garde la dernière modification connue.
export function useModificationsTache(tacheId, actif = true) {
  const { modifsNonVuesParTache, derniereModifParTache, marquerTacheVue } = useChantier();
  const [nonVues, setNonVues] = useState([]);

  useEffect(() => {
    if (!actif || !tacheId) { setNonVues([]); return; }
    const liste = modifsNonVuesParTache?.[tacheId] || [];
    setNonVues(liste);
    if (liste.length) marquerTacheVue(tacheId);
  }, [tacheId, actif]);

  if (!tacheId) return { modifications: [], nonVues: false };
  if (nonVues.length) return { modifications: nonVues, nonVues: true };
  const derniere = derniereModifParTache?.[tacheId];
  return { modifications: derniere ? [derniere] : [], nonVues: false };
}

export function TacheModificationInfo({ modifications = [], nonVues = false }) {
  const { sousTraitants, fournisseurs } = useChantier();

  if (!modifications.length) return null;

  const getAssigneNom = (id, type) => {
    if (!id) return 'Non assigné';
    if (type === 'fournisseur') {
      const f = fournisseurs?.find(x => x.id === id);
      return f ? (f.nomsocieteF || f.nomcontact || 'Fournisseur') : 'Inconnu';
    }
    const st = sousTraitants?.find(x => x.id === id);
    return st ? (st.nomsocieteST || `${st.PrenomST || ''} ${st.nomST || ''}`.trim() || 'Artisan') : 'Inconnu';
  };

  return (
    <div className={`p-3 rounded-md border text-sm space-y-2 ${nonVues ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`flex items-center gap-2 font-medium ${nonVues ? 'text-fuchsia-800' : 'text-slate-700'}`}>
        <History className="h-4 w-4 flex-shrink-0" />
        {nonVues
          ? (modifications.length > 1 ? `${modifications.length} modifications du planning depuis votre dernière consultation` : 'Planning modifié depuis votre dernière consultation')
          : 'Dernière modification du planning'}
      </div>
      {modifications.map(m => {
        const datesChangees = m.ancienne_datedebut !== m.nouvelle_datedebut || m.ancienne_datefin !== m.nouvelle_datefin;
        const assigneChange = m.ancien_assigneid !== m.nouvel_assigneid || m.ancien_assignetype !== m.nouvel_assignetype;
        return (
          <div key={m.id} className="text-xs text-slate-700 space-y-0.5">
            <p className="text-slate-500">
              Par <span className="font-medium text-slate-700">{m.modifie_par_nom || 'Utilisateur'}</span> le {format(new Date(m.created_at), "dd/MM/yyyy 'à' HH:mm")}
            </p>
            {datesChangees && (
              <p>
                Dates : <span className="line-through text-slate-500">du {formatJour(m.ancienne_datedebut)} au {formatJour(m.ancienne_datefin)}</span>
                {' → '}
                <span className="font-medium">du {formatJour(m.nouvelle_datedebut)} au {formatJour(m.nouvelle_datefin)}</span>
              </p>
            )}
            {assigneChange && (
              <p>
                Assigné à : <span className="line-through text-slate-500">{getAssigneNom(m.ancien_assigneid, m.ancien_assignetype)}</span>
                {' → '}
                <span className="font-medium">{getAssigneNom(m.nouvel_assigneid, m.nouvel_assignetype)}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
