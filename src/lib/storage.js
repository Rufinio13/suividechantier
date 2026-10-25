import { supabase } from '@/lib/supabaseClient';

// Buckets privés : les fichiers ne sont plus accessibles par URL publique,
// on génère des URLs signées à la volée (les policies storage vérifient la société).
const PRIVATE_BUCKETS = ['documents-chantiers', 'controle-qualite-images', 'photos-taches', 'photos-reprises'];
const DEFAULT_EXPIRES_IN = 60 * 60; // 1 h
export const EMAIL_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 jours pour les liens envoyés par email

const cache = new Map(); // "bucket/path" -> { promise, expiresAt }

/**
 * Extrait { bucket, path } d'une URL Supabase Storage (publique ou signée)
 * ou d'un chemin brut si `defaultBucket` est fourni. Retourne null sinon.
 */
export function parseStorageRef(urlOrPath, defaultBucket = null) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const match = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/);
  if (match) {
    const bucket = match[1];
    if (!PRIVATE_BUCKETS.includes(bucket)) return null;
    return { bucket, path: decodeURIComponent(match[2]) };
  }
  if (defaultBucket && !/^[a-z]+:/i.test(urlOrPath)) {
    return { bucket: defaultBucket, path: urlOrPath };
  }
  return null;
}

/**
 * Retourne une URL signée pour un fichier stocké (URL publique historique ou chemin).
 * Les URLs non Supabase (blob:, data:, externes) sont renvoyées telles quelles.
 */
export async function getSignedUrl(urlOrPath, { bucket = null, expiresIn = DEFAULT_EXPIRES_IN } = {}) {
  const ref = parseStorageRef(urlOrPath, bucket);
  if (!ref) return isSafeUrl(urlOrPath) ? urlOrPath : null;

  const key = `${ref.bucket}/${ref.path}`;
  const useCache = expiresIn === DEFAULT_EXPIRES_IN;
  const cached = cache.get(key);
  if (useCache && cached && cached.expiresAt > Date.now() + 60_000) return cached.promise;

  const promise = supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, expiresIn)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.signedUrl;
    });

  if (useCache) {
    cache.set(key, { promise, expiresAt: Date.now() + expiresIn * 1000 });
    promise.catch(() => cache.delete(key));
  }
  return promise;
}

/** Ouvre un fichier stocké dans un nouvel onglet (URL signée). */
export function openStorageFile(urlOrPath, options) {
  // Ouvrir l'onglet tout de suite (sinon bloqué par le navigateur après l'await)
  const win = window.open('', '_blank');
  if (win) win.opener = null;
  getSignedUrl(urlOrPath, options)
    .then((url) => {
      if (!url) throw new Error('URL invalide');
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener');
    })
    .catch((err) => {
      console.error('Erreur ouverture fichier:', err);
      win?.close();
    });
}

/** Signe les URLs d'une liste de photos/plans ({ url, name } ou string) pour un email. */
export async function signFilesForEmail(items = []) {
  return Promise.all(
    (items || []).map(async (item) => {
      const url = typeof item === 'string' ? item : item?.url;
      const signed = await getSignedUrl(url, { expiresIn: EMAIL_EXPIRES_IN }).catch(() => null);
      return typeof item === 'string' ? signed : { ...item, url: signed };
    })
  ).then((list) => list.filter((i) => (typeof i === 'string' ? i : i?.url)));
}

function isSafeUrl(url) {
  return typeof url === 'string' && /^(https?:|blob:|data:image\/)/i.test(url);
}
