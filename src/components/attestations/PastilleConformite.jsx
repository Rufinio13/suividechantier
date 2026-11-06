import React from 'react';
import { cn } from '@/lib/utils';

/** Pastille rouge si l'artisan n'est pas à jour (décennale / URSSAF), rien sinon. */
export function PastilleConformite({ conformite, className }) {
  if (!conformite || conformite.ok) return null;
  const motifs = conformite.motifs.join('\n');
  return (
    <span
      title={motifs}
      aria-label={`Artisan non à jour : ${conformite.motifs.join(', ')}`}
      className={cn('inline-block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white flex-shrink-0', className)}
    />
  );
}
