import React, { useEffect, useState } from 'react';
import { getSignedUrl } from '@/lib/storage';

export function useSignedUrl(src) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!src) return undefined;
    getSignedUrl(src)
      .then((signed) => { if (!cancelled) setUrl(signed); })
      .catch((err) => console.error('Erreur URL signée:', err));
    return () => { cancelled = true; };
  }, [src]);

  return url;
}

/** <img> pour un fichier des buckets privés : remplace l'URL publique par une URL signée. */
export function StorageImage({ src, alt = '', ...props }) {
  const url = useSignedUrl(src);
  if (!url) return <div className={`${props.className || ''} bg-slate-100 animate-pulse`} aria-label={alt} />;
  return <img src={url} alt={alt} {...props} />;
}
