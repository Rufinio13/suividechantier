// Enregistrement de photos du chantier sur le PC de l'utilisateur, sans ZIP.
// - Plusieurs photos : UNE fenêtre « Sélectionner un dossier » (Chrome / Edge), toutes les photos y sont copiées
//   (comme « Enregistrer toutes les pièces jointes » d'Outlook).
// - Une photo : fenêtre « Enregistrer sous ».
// - Navigateur sans ces fenêtres, ou dossier refusé : téléchargement classique (dossier Téléchargements).
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

const estAnnulation = (e) => e?.name === 'AbortError';
// Fenêtre interdite dans ce contexte (navigateur Brave, page dans un cadre, etc.)
const estRefusNavigateur = (e) => ['SecurityError', 'NotAllowedError', 'TypeError'].includes(e?.name);

/**
 * Enregistre plusieurs photos. Chaque élément : { photo, nomLot }.
 * Doit être appelé directement depuis un clic (la fenêtre de choix du dossier l'exige).
 * options.telechargement = true : téléchargement classique, sans fenêtre de choix du dossier.
 * Retourne { ok, erreurs, annule, dossier, nomDossier, derniereErreur } ; dossier = false si téléchargement classique.
 */
export async function enregistrerPhotos(elements, onProgression = () => {}, { telechargement = false } = {}) {
  let dossier = null;
  if (!telechargement && choixDossierDisponible()) {
    try {
      // id : Chrome/Edge rouvrent la fenêtre dans le dernier dossier choisi
      dossier = await window.showDirectoryPicker({ id: 'photos-chantier', mode: 'readwrite' });
    } catch (e) {
      // Chrome renvoie aussi une « annulation » quand il refuse le dossier (lecteur cloud, réseau…)
      if (estAnnulation(e)) {
        console.warn('Choix du dossier annulé ou refusé par le navigateur :', e);
        return { ok: 0, erreurs: 0, annule: true, dossier: true };
      }
      if (!estRefusNavigateur(e)) throw e;
      console.warn('Choix du dossier impossible, téléchargement classique :', e);
      dossier = null;
    }
  }

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
      for (let n = 2; dejaPris.has(nom) || (dossier && (await existe(dossier, nom))); n++) nom = `${base}-${n}.${ext}`;
      dejaPris.add(nom);
      if (dossier) {
        const fichier = await dossier.getFileHandle(nom, { create: true });
        const flux = await fichier.createWritable();
        await flux.write(blob);
        await flux.close();
      } else {
        saveAs(blob, nom);
        // petite pause : évite que le navigateur bloque les téléchargements en rafale
        if (i < elements.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
      ok++;
    } catch (e) {
      console.error('❌ Erreur enregistrement photo :', photo.url, e);
      derniereErreur = e;
      erreurs++;
    }
    onProgression(i + 1, elements.length);
  }

  return { ok, erreurs, annule: false, dossier: !!dossier, nomDossier: dossier?.name, derniereErreur };
}

/** Enregistre une seule photo : fenêtre « Enregistrer sous » si disponible. Retourne false si annulé. */
export async function enregistrerUnePhoto(photo, nomLot) {
  const base = nomBasePhoto(photo, nomLot);
  if (choixFichierDisponible()) {
    let fichier = null;
    try {
      fichier = await window.showSaveFilePicker({ id: 'photos-chantier', suggestedName: `${base}.${extension(photo.url)}` });
    } catch (e) {
      if (estAnnulation(e)) return false;
      if (!estRefusNavigateur(e)) throw e;
      console.warn('Fenêtre « Enregistrer sous » impossible, téléchargement classique :', e);
    }
    if (fichier) {
      const blob = await telechargerBlob(photo.url);
      const flux = await fichier.createWritable();
      await flux.write(blob);
      await flux.close();
      return true;
    }
  }
  const blob = await telechargerBlob(photo.url);
  saveAs(blob, `${base}.${extension(photo.url, blob)}`);
  return true;
}

/** Message d'erreur compréhensible pour l'utilisateur. */
export function messageErreurEnregistrement(e) {
  if (!e) return '';
  if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
    return "Le navigateur a refusé l'accès à ce dossier. Choisissez un sous-dossier du PC (disque C:).";
  }
  if (e.name === 'NotFoundError') return "Le dossier choisi n'existe plus.";
  if (e.name === 'QuotaExceededError') return 'Espace disque insuffisant.';
  if (/Téléchargement impossible|Failed to fetch|URL invalide/i.test(e.message || '')) {
    return "La photo n'a pas pu être récupérée depuis le serveur (connexion ou droits d'accès).";
  }
  return `${e.name || 'Erreur'} : ${e.message || e}`;
}
