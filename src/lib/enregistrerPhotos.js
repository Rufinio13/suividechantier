// Enregistrement de photos du chantier sur le PC de l'utilisateur, sans ZIP.
// Téléchargement classique du navigateur, photo par photo : si le navigateur est réglé sur
// « Toujours demander où enregistrer les fichiers », la fenêtre Windows « Enregistrer sous »
// s'ouvre pour chaque photo (fonctionne aussi vers pCloud, un NAS, etc.).
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { getSignedUrl } from '@/lib/storage';

// Nettoie un texte pour en faire un morceau de nom de fichier Windows valide.
const nettoyer = (texte, max = 40) =>
  (texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/[()]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, max)
    .replace(/-+$/, '');

const EXT_PAR_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' };

const extension = (url, blob) => {
  const depuisUrl = (url || '').split('?')[0].split('.').pop()?.toLowerCase();
  if (depuisUrl && /^[a-z0-9]{2,5}$/.test(depuisUrl)) return depuisUrl;
  return EXT_PAR_TYPE[blob?.type] || 'jpg';
};

// Nom lisible : 2026-11-12_Electricite_Dupont-Elec_Pose-tableau
export function nomBasePhoto(photo, nomLot) {
  let date = '';
  try { if (photo.date) date = format(new Date(photo.date), 'yyyy-MM-dd'); } catch { /* date invalide */ }
  return [date, nettoyer(nomLot, 30), nettoyer(photo.entreprise === 'Constructeur' ? photo.auteur : photo.entreprise, 30), nettoyer(photo.detail, 40)]
    .filter(Boolean)
    .join('_') || 'photo';
}

async function telechargerBlob(url) {
  const signee = await getSignedUrl(url);
  if (!signee) throw new Error('URL invalide');
  const res = await fetch(signee);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  return res.blob();
}

/** Télécharge une photo sur le PC. */
export async function enregistrerUnePhoto(photo, nomLot) {
  const blob = await telechargerBlob(photo.url);
  saveAs(blob, `${nomBasePhoto(photo, nomLot)}.${extension(photo.url, blob)}`);
}

/**
 * Télécharge plusieurs photos, l'une après l'autre. Chaque élément : { photo, nomLot }.
 * Retourne { ok, erreurs, derniereErreur }.
 */
export async function enregistrerPhotos(elements, onProgression = () => {}) {
  let ok = 0;
  let erreurs = 0;
  let derniereErreur = null;
  const dejaPris = new Set();
  onProgression(0, elements.length);

  for (let i = 0; i < elements.length; i++) {
    const { photo, nomLot } = elements[i];
    try {
      const blob = await telechargerBlob(photo.url);
      const base = nomBasePhoto(photo, nomLot);
      const ext = extension(photo.url, blob);
      let nom = `${base}.${ext}`;
      for (let n = 2; dejaPris.has(nom); n++) nom = `${base}-${n}.${ext}`;
      dejaPris.add(nom);
      saveAs(blob, nom);
      ok++;
      // petite pause : évite que le navigateur bloque les téléchargements en rafale
      if (i < elements.length - 1) await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error('❌ Erreur téléchargement photo :', photo.url, e);
      derniereErreur = e;
      erreurs++;
    }
    onProgression(i + 1, elements.length);
  }

  return { ok, erreurs, derniereErreur };
}

/** Message d'erreur compréhensible pour l'utilisateur. */
export function messageErreurEnregistrement(e) {
  if (!e) return '';
  if (/Téléchargement impossible|Failed to fetch|URL invalide/i.test(e.message || '')) {
    return "La photo n'a pas pu être récupérée depuis le serveur (connexion ou droits d'accès).";
  }
  return `${e.name || 'Erreur'} : ${e.message || e}`;
}
