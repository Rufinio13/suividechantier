import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Affichage d'un PDF page par page avec pdf.js.
// Remplace l'<iframe>, que les navigateurs mobiles n'affichent pas
// (Android : cadre vide, iOS : première page seulement).
export function PdfViewer({ blob, url, maxHeight = '70vh' }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);

  // Suivre la largeur disponible (rotation du téléphone, redimensionnement)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!blob || !width) return;
    let cancelled = false;
    let pdf = null;

    (async () => {
      try {
        setStatus('loading');
        const pdfjs = await import('pdfjs-dist');
        const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false }).promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);

        const pagesEl = containerRef.current?.querySelector('[data-pages]');
        if (!pagesEl) return;
        pagesEl.innerHTML = '';

        // Plafonné à 2 pour limiter la mémoire sur les téléphones
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'block bg-white shadow-sm mb-2 last:mb-0';
          pagesEl.appendChild(canvas);

          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (i === 1 && !cancelled) setStatus('ready');
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('Erreur affichage PDF:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      pdf?.destroy();
    };
  }, [blob, width]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="border rounded-lg bg-slate-100 overflow-y-auto overflow-x-hidden"
        style={{ maxHeight }}
      >
        {status === 'loading' && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        )}
        {status === 'error' && (
          <p className="p-4 text-sm text-center text-muted-foreground">
            Impossible d'afficher l'aperçu. Utilisez le bouton ci-dessous pour ouvrir le document.
          </p>
        )}
        <div data-pages />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {numPages > 0 && (
          <span className="text-xs text-muted-foreground">
            {numPages} page{numPages > 1 ? 's' : ''} — faites défiler pour tout lire
          </span>
        )}
        {url && (
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir en plein écran
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
