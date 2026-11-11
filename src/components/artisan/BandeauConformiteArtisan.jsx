import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { URSSAF_VALIDITE_MOIS } from '@/lib/attestations';

const formatFr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Bandeau d'alerte de l'espace artisan : décennale / URSSAF pas à jour chez le constructeur.
// Rien n'est affiché si l'artisan est en règle.
export function BandeauConformiteArtisan({ conformite }) {
  if (!conformite || conformite.ok) return null;

  const lignes = [];
  if (!conformite.decennaleOk) {
    lignes.push(
      conformite.inactif && conformite.dateDernierChantier
        ? `Votre constructeur n'a pas d'attestation décennale couvrant la date de votre dernier chantier (${formatFr(conformite.dateDernierChantier)}).`
        : "Votre constructeur n'a pas votre attestation décennale à jour."
    );
  }
  if (!conformite.urssafOk) {
    lignes.push(
      `Votre constructeur n'a pas d'attestation URSSAF de moins de ${URSSAF_VALIDITE_MOIS} mois ` +
      (conformite.derniereUrssafDate
        ? `(dernière attestation validée : ${formatFr(conformite.derniereUrssafDate)}).`
        : '(aucune attestation URSSAF reçue).')
    );
  }

  return (
    <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-red-900 shadow-sm">
      <p className="flex items-center gap-2 text-base font-bold">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
        Vos documents ne sont pas à jour
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
        {lignes.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="mt-3 text-sm font-semibold">
        Nous vous informons qu'aucun marché de travaux ne vous sera transmis si ces éléments ne sont pas à jour.
      </p>
      <p className="mt-1 text-sm">Envoyez vos attestations par mail à votre constructeur.</p>
    </div>
  );
}
