import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Pen } from 'lucide-react';

const LINE_WIDTH = 2.5;
const EXPORT_HEIGHT = 200; // hauteur fixe de l'image exportée, quel que soit l'écran

// Image PNG de la signature, recadrée sur le tracé, à une résolution fixe.
// Ne dépend ni de la densité d'écran ni de la taille du téléphone.
function exportStrokes(strokes, w, h) {
  const pts = strokes.flat();
  if (!pts.length || !w || !h) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    const x = p.x * w, y = p.y * h;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = LINE_WIDTH * 2;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  // Évite une image démesurément étroite pour un trait quasi horizontal/vertical
  const bw = Math.max(maxX - minX, 20);
  const bh = Math.max(maxY - minY, 20);

  const scale = Math.min(EXPORT_HEIGHT / bh, 4);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(bw * scale));
  out.height = Math.max(1, Math.round(bh * scale));
  const ctx = out.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, -minX * scale, -minY * scale);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) drawStroke(ctx, stroke, w, h);

  const dataUrl = out.toDataURL('image/png');
  out.width = 0; out.height = 0;
  return { dataUrl, width: bw, height: bh };
}

function drawStroke(ctx, stroke, w, h) {
  if (!stroke.length) return;
  ctx.beginPath();
  ctx.moveTo(stroke[0].x * w, stroke[0].y * h);
  if (stroke.length === 1) {
    // Simple appui : dessiner un point
    ctx.lineTo(stroke[0].x * w + 0.1, stroke[0].y * h);
  }
  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i].x * w, stroke[i].y * h);
  }
  ctx.stroke();
}

// Zone de signature compatible doigt, souris et stylet.
// - Événements "pointer" si disponibles, sinon repli sur touch/mouse (anciens iOS/Android).
// - Les traits sont mémorisés en coordonnées relatives (0 à 1) : si la zone change
//   de taille (rotation, chargement du PDF au-dessus, zoom), la signature est
//   redessinée au bon endroit au lieu d'être décalée ou effacée.
// - onSignatureCapture reçoit { dataUrl, width, height } (PNG recadré + proportions).
export function SignatureCanvas({ onSignatureCapture, onClear }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);       // [[{x, y}, ...], ...]
  const currentStrokeRef = useRef(null);
  const activePointerRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const onCaptureRef = useRef(onSignatureCapture);
  useEffect(() => { onCaptureRef.current = onSignatureCapture; }, [onSignatureCapture]);

  const setupCtx = (ctx) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    setupCtx(ctx);
    for (const stroke of strokesRef.current) drawStroke(ctx, stroke, w, h);
  }, []);

  // Adapter la résolution du canvas à sa taille affichée et à la densité de l'écran
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width === targetW && canvas.height === targetH) return;
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [resize]);

  const toPoint = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  // Dessin incrémental : seulement le nouveau segment (fluide sur les téléphones lents)
  const addPoints = (points) => {
    const stroke = currentStrokeRef.current;
    const canvas = canvasRef.current;
    if (!stroke || !canvas || !points.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    setupCtx(ctx);
    ctx.beginPath();
    const last = stroke[stroke.length - 1];
    ctx.moveTo(last.x * w, last.y * h);
    for (const p of points) {
      stroke.push(p);
      ctx.lineTo(p.x * w, p.y * h);
    }
    ctx.stroke();
  };

  const startStroke = (point) => {
    const stroke = [point];
    currentStrokeRef.current = stroke;
    strokesRef.current.push(stroke);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setupCtx(ctx);
    drawStroke(ctx, stroke, canvas.clientWidth, canvas.clientHeight);
    setIsEmpty(false);
  };

  const endStroke = useCallback(() => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const result = exportStrokes(strokesRef.current, canvas.clientWidth, canvas.clientHeight);
      if (result) onCaptureRef.current?.(result);
    } catch (err) {
      console.error('Erreur export signature:', err);
    }
  }, []);

  // ---- Événements pointer (navigateurs récents) ----
  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Un seul doigt à la fois : un 2e appui (paume, autre doigt) est ignoré
    if (activePointerRef.current !== null) return;
    e.preventDefault();
    activePointerRef.current = e.pointerId;
    try { canvasRef.current.setPointerCapture?.(e.pointerId); } catch { /* ignoré */ }
    startStroke(toPoint(e.clientX, e.clientY));
  };

  const handlePointerMove = (e) => {
    if (!currentStrokeRef.current || e.pointerId !== activePointerRef.current) return;
    e.preventDefault();
    // Points intermédiaires pour un trait fluide. Certains navigateurs Android
    // renvoient une liste vide : on retombe alors sur l'événement lui-même.
    let events = null;
    try { events = e.nativeEvent.getCoalescedEvents?.(); } catch { /* ignoré */ }
    if (!events || !events.length) events = [e];
    addPoints(events.map(ev => toPoint(ev.clientX, ev.clientY)));
  };

  const handlePointerEnd = (e) => {
    if (e.pointerId !== activePointerRef.current) return;
    try { canvasRef.current?.releasePointerCapture?.(e.pointerId); } catch { /* ignoré */ }
    endStroke();
  };

  // ---- Repli touch/mouse (navigateurs sans PointerEvent) ----
  // Écouteurs natifs non "passive" pour pouvoir bloquer le défilement de la page.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.PointerEvent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e) => {
      if (currentStrokeRef.current) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      activePointerRef.current = t.identifier;
      startStroke(toPoint(t.clientX, t.clientY));
    };
    const onTouchMove = (e) => {
      if (!currentStrokeRef.current) return;
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(x => x.identifier === activePointerRef.current);
      if (t) addPoints([toPoint(t.clientX, t.clientY)]);
    };
    const onTouchEnd = (e) => {
      const t = Array.from(e.changedTouches).find(x => x.identifier === activePointerRef.current);
      if (t) endStroke();
    };
    let mouseDown = false;
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      mouseDown = true;
      activePointerRef.current = 'mouse';
      startStroke(toPoint(e.clientX, e.clientY));
    };
    const onMouseMove = (e) => {
      if (mouseDown) addPoints([toPoint(e.clientX, e.clientY)]);
    };
    const onMouseUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      endStroke();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endStroke]);

  const clearSignature = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    redraw();
    setIsEmpty(true);
    onClear?.();
  };

  const hasPointer = typeof window !== 'undefined' && !!window.PointerEvent;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2">
          <Pen className="h-4 w-4" />
          Dessinez votre signature
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={isEmpty}
        >
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      </div>

      <div className="border-2 border-dashed rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          className="block w-full h-40 cursor-crosshair touch-none select-none"
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
          onContextMenu={(e) => e.preventDefault()}
          {...(hasPointer ? {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerEnd,
            onPointerCancel: handlePointerEnd,
            onLostPointerCapture: handlePointerEnd,
          } : {})}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">
              Signez ici avec votre souris ou votre doigt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
