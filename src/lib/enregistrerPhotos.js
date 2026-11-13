// Enregistrement de photos du chantier sur le PC de l'utilisateur, sans ZIP.
// - Chrome / Edge : l'utilisateur choisit le dossier (File System Access API).
// - Autres navigateurs : téléchargement classique, fichier par fichier.
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { getSignedUrl } from '@/lib/storage';

export const choixDossierDisponible = () =>
  typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

const choixFichierDisponible = () =>
  typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

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

async function existe(dossier, nom) {
  try { await dossier.getFileHandle(nom); return true; } catch { return false; }
}

async function nomLibre(dossier, base, ext) {
  let nom = `${base}.${ext}`;
  for (let i = 2; await existe(dossier, nom); i++) nom = `${base}-${i}.${ext}`;
  return nom;
}

const estAnnulation = (e) => e?.name === 'AbortError';

/**
 * Enregistre plusieurs photos. Chaque élément : { photo, nomLot }.
 * Doit être appelé directement depuis un clic (le sélecteur de dossier l'exige).
 * Retourne { ok, erreurs, annule, dossier } ; dossier = false si téléchargement classique.
 */
export async function enregistrerPhotos(elements, onProgression = () => {}) {
  let dossier = null;
  if (choixDossierDisponible()) {
    try {
      dossier = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'pictures' });
    } catch (e) {
      if (estAnnulation(e)) return { ok: 0, erreurs: 0, annule: true, dossier: true };
      throw e;
    }
  }

  let ok = 0;
  let erreurs = 0;
  onProgression(0, elements.length);

  for (let i = 0; i < elements.length; i++) {
    const { photo, nomLot } = elements[i];
    try {
      const blob = await telechargerBlob(photo.url);
      const base = nomBasePhoto(photo, nomLot);
      const ext = extension(photo.url, blob);
      if (dossier) {
        const nom = await nomLibre(dossier, base, ext);
        const fichier = await dossier.getFileHandle(nom, { create: true });
        const flux = await fichier.createWritable();
        await flux.write(blob);
        await flux.close();
      } else {
        saveAs(blob, `${base}.${ext}`);
        await new Promise((r) => setTimeout(r, 300)); // évite que le navigateur bloque les téléchargements en rafale
      }
      ok++;
    } catch (e) {
      console.error('❌ Erreur enregistrement photo :', photo.url, e);
      erreurs++;
    }
    onProgression(i + 1, elements.length);
  }

  return { ok, erreurs, annule: false, dossier: !!dossier };
}

/** Enregistre une seule photo : fenêtre « Enregistrer sous » si disponible. Retourne false si annulé. */
export async function enregistrerUnePhoto(photo, nomLot) {
  const base = nomBasePhoto(photo, nomLot);
  if (choixFichierDisponible()) {
    let fichier;
    try {
      const ext = extension(photo.url);
      fichier = await window.showSaveFilePicker({
        suggestedName: `${base}.${ext}`,
        startIn: 'pictures',
        types: [{ description: 'Image', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'] } }],
      });
    } catch (e) {
      if (estAnnulation(e)) return false;
      throw e;
    }
    const blob = await telechargerBlob(photo.url);
    const flux = await fichier.createWritable();
    await flux.write(blob);
    await flux.close();
    return true;
  }
  const blob = await telechargerBlob(photo.url);
  saveAs(blob, `${base}.${extension(photo.url, blob)}`);
  return true;
}
