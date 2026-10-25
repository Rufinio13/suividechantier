import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSAV } from '@/context/SAVContext';
import { useArtisanPreview } from '@/context/ArtisanPreviewContext';
import { useMonSousTraitantId } from '@/hooks/useMonSousTraitantId';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SAVArtisanCard } from '@/components/artisan/SAVArtisanCard.jsx';

export function SAVArtisanDetails() {
  const { id } = useParams();
  const preview = useArtisanPreview();
  const basePath = preview?.basePath || '/artisan';
  const { demandesSAV } = useSAV();

  const monSousTraitantId = useMonSousTraitantId();

  const sav = useMemo(
    () => demandesSAV?.find((s) => s.id === id),
    [demandesSAV, id]
  );

  const hasAccess = useMemo(() => {
    if (!sav || !monSousTraitantId) return false;
    return sav.soustraitant_id === monSousTraitantId && !sav.constructeur_valide;
  }, [sav, monSousTraitantId]);

  if (!sav) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">SAV non trouvé</h2>
        <Button asChild className="mt-4">
          <Link to={`${basePath}/sav`}>
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
          </Link>
        </Button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Accès refusé</h2>
        <p className="text-muted-foreground mt-2">
          Vous n'avez pas accès à ce SAV
        </p>
        <Button asChild className="mt-4">
          <Link to={`${basePath}/sav`}>
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <div>
        <Button variant="outline" size="sm" asChild className="mb-3">
          <Link to={`${basePath}/sav`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Détails SAV</h1>
      </div>

      <SAVArtisanCard sav={sav} />
    </motion.div>
  );
}
