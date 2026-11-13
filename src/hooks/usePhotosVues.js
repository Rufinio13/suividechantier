// Dernière visite de l'onglet Photos d'un chantier pour l'utilisateur connecté (table photos_vues).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export function usePhotosVues(chantierId) {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [vuAt, setVuAt] = useState(null);       // null = jamais visité
  const [charge, setCharge] = useState(false);
  const [actif, setActif] = useState(false);    // false si la table n'existe pas encore : pas de notifications

  useEffect(() => {
    let annule = false;
    setCharge(false);
    if (!chantierId || !userId) return undefined;

    supabase
      .from('photos_vues')
      .select('vu_at')
      .eq('chantier_id', chantierId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (annule) return;
        if (error) {
          console.error('❌ Erreur chargement photos_vues :', error);
          setActif(false);
        } else {
          setVuAt(data?.vu_at || null);
          setActif(true);
        }
        setCharge(true);
      });

    return () => { annule = true; };
  }, [chantierId, userId]);

  // Enregistre la visite maintenant et renvoie la date de la visite précédente.
  const marquerVu = useCallback(async () => {
    const precedent = vuAt;
    if (!actif || !chantierId || !userId) return precedent;
    const maintenant = new Date().toISOString();
    setVuAt(maintenant);
    const { error } = await supabase
      .from('photos_vues')
      .upsert({ chantier_id: chantierId, user_id: userId, vu_at: maintenant }, { onConflict: 'chantier_id,user_id' });
    if (error) console.error('❌ Erreur marquage photos vues :', error);
    return precedent;
  }, [actif, chantierId, userId, vuAt]);

  return { vuAt, charge, actif, marquerVu };
}
