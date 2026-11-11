import { useEffect, useMemo, useState } from 'react';
import { useChantier } from '@/context/ChantierContext';
import { useReferentielCQ } from '@/context/ReferentielCQContext';
import { useSAV } from '@/context/SAVContext';
import { useMonSousTraitantId } from '@/hooks/useMonSousTraitantId';
import { supabase } from '@/lib/supabaseClient';
import { compterNCArtisan } from '@/lib/ncArtisan';

const DOCS_VIDE = { nouveauxCount: 0, marchesASignerCount: 0, autresASignerCount: 0 };

// Date du jour au format AAAA-MM-JJ (heure locale)
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Tâche pas encore terminée par l'artisan ni validée par le constructeur
export const estTacheAFaire = (t) => !t.artisan_termine && !t.constructeur_valide;

// Tâche à faire dont la date de fin est passée (une tâche qui finit aujourd'hui n'est pas en retard)
export const estTacheEnRetard = (t, jour = aujourdhui()) =>
  estTacheAFaire(t) && !!t.datefin && String(t.datefin).slice(0, 10) < jour;

// Compteurs de l'espace artisan (accueil + liste des chantiers), par chantier et au total.
export function useIndicateursArtisan() {
  const { chantiers, taches, loading: chantiersLoading } = useChantier();
  const { modelesCQ, controles } = useReferentielCQ();
  const { demandesSAV } = useSAV();
  const monSousTraitantId = useMonSousTraitantId();
  const [docsParChantier, setDocsParChantier] = useState({});

  const mesTaches = useMemo(() => {
    if (!monSousTraitantId) return [];
    return taches.filter(t => t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId);
  }, [taches, monSousTraitantId]);

  // Chantiers où l'artisan a au moins une tâche
  const mesChantiers = useMemo(() => {
    const ids = new Set(mesTaches.map(t => t.chantierid));
    return chantiers.filter(c => ids.has(c.id));
  }, [mesTaches, chantiers]);

  const chantierIdsKey = mesChantiers.map(c => c.id).join(',');

  // Documents visibles par l'artisan, regroupés par chantier
  useEffect(() => {
    if (!monSousTraitantId || !chantierIdsKey) {
      setDocsParChantier({});
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('documents_chantier')
        .select('chantier_id, type_document, necessite_signature, signature_statut, artisan_assigne_signature, artisans_vus')
        .in('chantier_id', chantierIdsKey.split(','))
        .or(`partage_type.eq.tous,artisan_id.eq.${monSousTraitantId}`);

      if (error) {
        console.error('Erreur chargement indicateurs documents:', error);
        return;
      }
      if (cancelled) return;

      const grouped = {};
      (data || []).forEach(doc => {
        if (!grouped[doc.chantier_id]) grouped[doc.chantier_id] = { ...DOCS_VIDE };
        const g = grouped[doc.chantier_id];
        const aSigner = doc.necessite_signature &&
          doc.artisan_assigne_signature === monSousTraitantId &&
          doc.signature_statut === 'en_attente';

        if (aSigner) {
          if (doc.type_document === 'marche_travaux') g.marchesASignerCount++;
          else g.autresASignerCount++;
        } else if (!doc.necessite_signature && !doc.artisans_vus?.includes(monSousTraitantId)) {
          g.nouveauxCount++;
        }
      });
      setDocsParChantier(grouped);
    };

    load();
    window.addEventListener('notifications-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('notifications-updated', load);
    };
  }, [monSousTraitantId, chantierIdsKey]);

  // Indicateurs par chantier
  const parChantier = useMemo(() => {
    const jour = aujourdhui();
    const map = {};
    mesChantiers.forEach(c => {
      const tachesChantier = mesTaches.filter(t => t.chantierid === c.id);
      map[c.id] = {
        ...(docsParChantier[c.id] || DOCS_VIDE),
        ncCount: compterNCArtisan(controles, modelesCQ, c.id, monSousTraitantId),
        tachesCount: tachesChantier.length,
        tachesAFaireCount: tachesChantier.filter(estTacheAFaire).length,
        tachesEnRetardCount: tachesChantier.filter(t => estTacheEnRetard(t, jour)).length,
      };
    });
    return map;
  }, [mesChantiers, mesTaches, docsParChantier, controles, modelesCQ, monSousTraitantId]);

  const totaux = useMemo(() => {
    const valeurs = Object.values(parChantier);
    const somme = (cle) => valeurs.reduce((acc, v) => acc + v[cle], 0);
    return {
      // "En cours" = tout chantier non réceptionné
      chantiersEnCours: mesChantiers.filter(c => c.statut !== 'Réceptionné').length,
      tachesAFaire: somme('tachesAFaireCount'),
      tachesEnRetard: somme('tachesEnRetardCount'),
      documentsNonVus: somme('nouveauxCount'),
      marchesASigner: somme('marchesASignerCount'),
      nonConformites: somme('ncCount'),
      sav: monSousTraitantId
        ? demandesSAV.filter(s => s.soustraitant_id === monSousTraitantId && !s.constructeur_valide).length
        : 0,
    };
  }, [parChantier, mesChantiers, demandesSAV, monSousTraitantId]);

  return { monSousTraitantId, mesChantiers, parChantier, totaux, loading: chantiersLoading };
}
