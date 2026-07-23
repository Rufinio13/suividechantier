import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { useArtisanPreview } from '@/context/ArtisanPreviewContext';

// ✅ Identité "artisan courant" pour toutes les pages du LayoutArtisan :
// - connexion artisan normale → déduite du profil connecté
// - aperçu agence (ArtisanPreviewProvider) → l'artisan choisi dans la card
export function useMonSousTraitantId() {
  const preview = useArtisanPreview();
  const { profile } = useAuth();
  const { sousTraitants } = useSousTraitant();

  return useMemo(() => {
    if (preview?.artisanId) return preview.artisanId;
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [preview, profile, sousTraitants]);
}
