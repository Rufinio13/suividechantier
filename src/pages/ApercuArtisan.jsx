import React from 'react';
import { Navigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { ArtisanPreviewProvider } from '@/context/ArtisanPreviewContext';
import { LayoutArtisan } from '@/components/LayoutArtisan';

// ✅ Permet à un constructeur de voir/modifier l'espace d'un artisan précis
// sans se connecter avec son compte (mêmes pages que le vrai espace artisan,
// mais sous la session de l'agence).
export function ApercuArtisan() {
  const { artisanId } = useParams();
  const { profile } = useAuth();
  const { sousTraitants, loading } = useSousTraitant();

  if (profile?.user_type !== 'constructeur') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const artisan = sousTraitants?.find(st => st.id === artisanId);

  if (!artisan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h2 className="text-2xl font-bold mb-2">Artisan introuvable</h2>
        <p className="text-muted-foreground">
          Cet artisan n'existe pas ou n'appartient pas à votre société.
        </p>
      </div>
    );
  }

  const artisanNom = artisan.nomsocieteST || `${artisan.PrenomST || ''} ${artisan.nomST || ''}`.trim() || 'Artisan';

  return (
    <ArtisanPreviewProvider artisanId={artisanId} artisanNom={artisanNom}>
      <LayoutArtisan />
    </ArtisanPreviewProvider>
  );
}
