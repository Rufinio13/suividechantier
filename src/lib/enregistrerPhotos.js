// Téléchargement d'une photo du chantier sur le PC (téléchargement classique du navigateur).
// Si Chrome est réglé sur « Toujours demander où enregistrer les fichiers », la fenêtre Windows
// « Enregistrer sous » s'ouvre ; sinon la photo va dans le dossier Téléchargements.
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

/** Télécharge une photo sur le PC, avec un nom de fichier lisible. */
export async function telechargerPhoto(photo, nomLot) {
  const signee = await getSignedUrl(photo.url);
  if (!signee) throw new Error('URL invalide');
  const res = await fetch(signee);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const blob = await res.blob();
  saveAs(blob, `${nomBasePhoto(photo, nomLot)}.${extension(photo.url, blob)}`);
}

/** Message d'erreur compréhensible pour l'utilisateur. */
export function messageErreurEnregistrement(e) {
  if (!e) return '';
  if (/Téléchargement impossible|Failed to fetch|URL invalide/i.test(e.message || '')) {
    return "La photo n'a pas pu être récupérée depuis le serveur (connexion ou droits d'accès).";
  }
  return `${e.name || 'Erreur'} : ${e.message || e}`;
}
