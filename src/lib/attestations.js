import { format, parseISO, subMonths } from 'date-fns';

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

/** Date (yyyy-MM-dd) de la plus récente attestation URSSAF enregistrée, sinon null. */
export function getDerniereUrssafDate(attestations = []) {
  return attestations
    .filter((a) => a.type === 'urssaf' && a.date_attestation)
    .map((a) => a.date_attestation)
    .sort()
    .pop() || null;
}

const formatFr = (iso) => (iso ? format(parseISO(iso), 'dd/MM/yyyy') : '');

/**
 * État de conformité d'un artisan à partir de ses attestations.
 * decennaleRequise / urssafRequise = false : artisan non soumis à ce contrôle.
 * dateDernierChantier (yyyy-MM-dd) : artisan qui ne travaille plus avec la société ;
 *   seule compte alors la décennale couvrant cette date (l'URSSAF n'est plus demandée).
 * inactif sans date : la décennale ne peut pas être vérifiée → non conforme.
 */
export function getConformiteArtisan(
  attestations = [],
  date = new Date(),
  { decennaleRequise = true, urssafRequise = true, inactif = false, dateDernierChantier = null } = {}
) {
  const dateDecennale = inactif && dateDernierChantier ? parseISO(dateDernierChantier) : date;
  const decennaleOk = !decennaleRequise ||
    (!(inactif && !dateDernierChantier) && !!getDecennaleValide(attestations, dateDecennale));
  const urssafOk = inactif || !urssafRequise ||
    attestations.some((a) => a.type === 'urssaf' && isUrssafValide(a, date));

  const motifs = [];
  if (!decennaleOk) {
    if (inactif && !dateDernierChantier) motifs.push('Date du dernier chantier à renseigner');
    else if (inactif) motifs.push(`Aucune décennale couvrant le dernier chantier (${formatFr(dateDernierChantier)})`);
    else motifs.push('Décennale absente ou expirée');
  }
  if (!urssafOk) motifs.push(`URSSAF absente ou de plus de ${URSSAF_VALIDITE_MOIS} mois`);

  return {
    decennaleOk,
    urssafOk,
    ok: decennaleOk && urssafOk,
    motifs,
    inactif,
    dateDernierChantier,
    derniereUrssafDate: getDerniereUrssafDate(attestations),
  };
}

/** Options de conformité à partir de la fiche artisan (table soustraitants). */
export function optionsConformite(st) {
  return {
    decennaleRequise: !st?.decennale_non_requise,
    urssafRequise: !st?.urssaf_non_requise,
    inactif: st?.travaille_actuellement === false,
    dateDernierChantier: st?.date_dernier_chantier || null,
  };
}
