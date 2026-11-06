import { format, subMonths } from 'date-fns';

// Durée de validité d'une attestation URSSAF (attestation de vigilance)
export const URSSAF_VALIDITE_MOIS = 6;

const toIso = (date) => format(date, 'yyyy-MM-dd');

/** Décennale couvrant la date donnée (dates au format 'yyyy-MM-dd'). */
export function isDecennaleValide(attestation, date = new Date()) {
  const jour = toIso(date);
  return !!attestation?.date_debut && !!attestation?.date_fin
    && attestation.date_debut <= jour && jour <= attestation.date_fin;
}

/** Attestation URSSAF de moins de 6 mois à la date donnée. */
export function isUrssafValide(attestation, date = new Date()) {
  return !!attestation?.date_attestation
    && attestation.date_attestation >= toIso(subMonths(date, URSSAF_VALIDITE_MOIS))
    && attestation.date_attestation <= toIso(date);
}

/** Décennale valide à la date donnée (la plus récente si plusieurs), sinon null. */
export function getDecennaleValide(attestations = [], date = new Date()) {
  return attestations
    .filter((a) => a.type === 'decennale' && isDecennaleValide(a, date))
    .sort((a, b) => b.date_debut.localeCompare(a.date_debut))[0] || null;
}

/**
 * État de conformité d'un artisan à partir de ses attestations.
 * decennaleRequise / urssafRequise = false : artisan non soumis à ce contrôle.
 */
export function getConformiteArtisan(
  attestations = [],
  date = new Date(),
  { decennaleRequise = true, urssafRequise = true } = {}
) {
  const decennaleOk = !decennaleRequise || !!getDecennaleValide(attestations, date);
  const urssafOk = !urssafRequise || attestations.some((a) => a.type === 'urssaf' && isUrssafValide(a, date));

  const motifs = [];
  if (!decennaleOk) motifs.push('Décennale absente ou expirée');
  if (!urssafOk) motifs.push(`URSSAF absente ou de plus de ${URSSAF_VALIDITE_MOIS} mois`);

  return { decennaleOk, urssafOk, ok: decennaleOk && urssafOk, motifs };
}
