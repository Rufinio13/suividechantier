import React, { createContext, useContext } from 'react';

const ArtisanPreviewContext = createContext(null);

// ✅ Permet à l'agence de visualiser/modifier l'espace d'un artisan précis sans
// se connecter avec son compte (pas de partage de session d'authentification).
export function ArtisanPreviewProvider({ artisanId, artisanNom, children }) {
  return (
    <ArtisanPreviewContext.Provider
      value={{
        isPreview: true,
        artisanId,
        artisanNom,
        basePath: `/apercu-artisan/${artisanId}`,
      }}
    >
      {children}
    </ArtisanPreviewContext.Provider>
  );
}

// Retourne null hors mode aperçu (connexion artisan normale)
export function useArtisanPreview() {
  return useContext(ArtisanPreviewContext);
}
