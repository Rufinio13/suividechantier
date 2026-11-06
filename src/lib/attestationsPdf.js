// Lecture des attestations des artisans (PDF texte, pas les scans) :
//  - URSSAF (modèle unique) : date, code de sécurité, SIRET
//  - Décennale (modèle propre à chaque assureur) : assureur, période, n° de police, SIRET
// pdf.js est chargé à la demande pour ne pas alourdir l'application.

const MOIS = {
  janvier: '01', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', aout: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12',
};

// Compagnies d'assurance construction courantes : [nom affiché, motif recherché]
// (le courtier éventuel n'y figure pas : on retient la compagnie la plus citée)
const ASSUREURS = [
  ['AXA', /\bAXA\b/g],
  ['SMA BTP', /\bSMA\s?BTP\b|\bSMABTP\b/g],
  ['MAAF', /\bMAAF\b/g],
  ['MMA', /\bMMA\b/g],
  ['ABEILLE', /\bABEILLE\b/g],
  ['AVIVA', /\bAVIVA\b/g],
  ['ALLIANZ', /\bALLIANZ\b/g],
  ['GENERALI', /\bGENERALI\b/g],
  ['GROUPAMA', /\bGROUPAMA\b/g],
  ['GAN', /\bGAN\b/g],
  ['MIC', /\bMIC\b|MILLENNIUM INSURANCE/g],
  ["L'AUXILIAIRE", /\bAUXILIAIRE\b/g],
  ['VHV', /\bVHV\b/g],
  ['APRIL', /\bAPRIL\b/g],
  ['HISCOX', /\bHISCOX\b/g],
  ['QBE', /\bQBE\b/g],
  ['CAMBTP', /\bCAM\s?BTP\b/g],
  ['MAF', /\bMAF\b|MUTUELLE DES ARCHITECTES/g],
  ['THELEM', /\bTHELEM\b/g],
  ['AREAS', /\bAREAS\b/g],
  ['MATMUT', /\bMATMUT\b/g],
  ['MACIF', /\bMACIF\b/g],
  ['MAIF', /\bMAIF\b/g],
  ['SWISSLIFE', /\bSWISS\s?LIFE\b/g],
  ['ERGO', /\bERGO\b/g],
  ['WAKAM', /\bWAKAM\b/g],
  ['ELITE INSURANCE', /\bELITE INSURANCE\b/g],
  ['ALPHA INSURANCE', /\bALPHA INSURANCE\b/g],
  ['LLOYD\'S', /\bLLOYD'?S\b/g],
  ['CNA', /\bCNA\b/g],
  ['ACM', /\bACM\b/g],
  ['PACIFICA', /\bPACIFICA\b/g],
  ['MUTUELLE DE POITIERS', /MUTUELLE DE POITIERS/g],
];

const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** SIRET sans espaces (14 chiffres attendus). */
export const normaliserSiret = (siret) => (siret || '').replace(/\D/g, '');

/** SIRET (14 chiffres) ou SIREN (9 chiffres) du document cohérent avec le SIRET de l'artisan. */
export const siretCorrespond = (siretDocument, siretArtisan) => {
  const doc = normaliserSiret(siretDocument);
  const artisan = normaliserSiret(siretArtisan);
  if (!doc || !artisan) return true;
  return doc.length === 9 ? artisan.startsWith(doc) : doc === artisan;
};

const versIso = (jjmmaaaa) => {
  const [j, m, a] = jjmmaaaa.split('/');
  return `${a}-${m}-${j}`;
};

async function extraireTexte(file) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const contenu = await page.getTextContent();
    pages.push(contenu.items.map((item) => item.str).join(' '));
  }
  return sansAccents(pages.join('\n').replace(/\s+/g, ' '));
}

/** SIRET (14 chiffres) sinon SIREN (9 chiffres), ou null. */
function extraireSiret(texte) {
  const siret = texte.match(/SIRE[NT](?:\s*\/\s*SIRET)?\s*(?:n°|no)?\s*:?\s*((?:\d\s?){14})/i);
  if (siret) return normaliserSiret(siret[1]);
  const siren = texte.match(/SIREN\s*(?:n°|no)?\s*:?\s*((?:\d\s?){9})(?!\s?\d)/i);
  return siren ? normaliserSiret(siren[1]) : null;
}

/**
 * N° de police : texte qui suit « contrat d'assurance n° », « police n° », « n° de contrat »,
 * « numéro de contrat »… Les morceaux suivants sont ajoutés tant qu'ils ressemblent à un
 * numéro (chiffres, sigle court, séparateur), ex. « 113035523 H - MCE - 001 ».
 */
function extrairePolice(texte) {
  const prefixe = /(?:(?:police|contrat)(?:\s+d['’]assurance)?\s*(?:n[°o]|numero)\.?|(?:n[°o]|numero)\s*(?:de\s+)?(?:police|contrat)(?:\s+d['’]assurance)?)\s*:?\s*/i;
  const debut = texte.match(prefixe);
  if (!debut) return null;

  const morceaux = [];
  for (const morceau of texte.slice(debut.index + debut[0].length).split(' ')) {
    const estNumero = /^[A-Z0-9\/.\-]+$/.test(morceau) && (/\d/.test(morceau) || morceau.length <= 3);
    if (!estNumero || morceaux.join(' ').length > 40) break;
    morceaux.push(morceau);
  }
  const numero = morceaux.join(' ').replace(/[\s.\-\/]+$/, '');
  return /\d/.test(numero) ? numero : null;
}

/**
 * Attestation de vigilance URSSAF.
 * @returns {Promise<{ dateAttestation: string|null, codeSecurite: string|null, siret: string|null }>}
 *          dateAttestation au format 'yyyy-MM-dd'. Champs à null si introuvables (scan, autre modèle…).
 */
export async function lireAttestationUrssaf(file) {
  return analyserUrssaf(await extraireTexte(file));
}

/** Analyse du texte (sans accents) d'une attestation URSSAF. */
export function analyserUrssaf(texte) {
  // « Le : 20/01/2025 » sinon « le 20 Janvier 2025 »
  let dateAttestation = null;
  const numerique = texte.match(/\bLe\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (numerique) {
    dateAttestation = versIso(numerique[1]);
  } else {
    const lettres = texte.match(/\ble\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
    const mois = lettres && MOIS[lettres[2].toLowerCase()];
    if (mois) dateAttestation = `${lettres[3]}-${mois}-${lettres[1].padStart(2, '0')}`;
  }

  const code = texte.match(/CODE DE SECURITE\s*:?\s*([A-Z0-9]{10,20})\b/i);

  return {
    dateAttestation,
    codeSecurite: code ? code[1].toUpperCase() : null,
    siret: extraireSiret(texte),
  };
}

/**
 * Attestation d'assurance décennale (lecture « au mieux » : chaque assureur a son modèle).
 * @returns {Promise<{ assureur: string|null, dateDebut: string|null, dateFin: string|null,
 *                     numeroPolice: string|null, siret: string|null }>}
 */
export async function lireAttestationDecennale(file) {
  return analyserDecennale(await extraireTexte(file));
}

/** Analyse du texte (sans accents) d'une attestation décennale. */
export function analyserDecennale(texte) {  const majuscules = texte.toUpperCase();

  // Assureur : la compagnie connue la plus citée (le courtier n'est pas dans la liste)
  let assureur = null;
  let meilleur = 0;
  for (const [nom, motif] of ASSUREURS) {
    const n = (majuscules.match(motif) || []).length;
    if (n > meilleur) {
      meilleur = n;
      assureur = nom;
    }
  }

  // Période : « du 01/10/2026 au 01/01/2027 », de préférence près de période / validité / valable
  const DATE = '(\\d{2}\\/\\d{2}\\/\\d{4})';
  const periode =
    texte.match(new RegExp(`(?:periode|validite|valable|effet)[^.]{0,60}?du\\s+${DATE}\\s+au\\s+${DATE}`, 'i')) ||
    texte.match(new RegExp(`\\bdu\\s+${DATE}\\s+au\\s+${DATE}`, 'i'));

  // N° de police / contrat : « contrat d'assurance n° X », « police n° X », « n° de contrat : X »…
  const numeroPolice = extrairePolice(texte);

  return {
    assureur,
    dateDebut: periode ? versIso(periode[1]) : null,
    dateFin: periode ? versIso(periode[2]) : null,
    numeroPolice,
    siret: extraireSiret(texte),
  };
}
