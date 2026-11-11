import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Pen } from 'lucide-react';

// Zone de signature compatible doigt, souris et stylet (événements "pointer").
// Les traits sont mémorisés en coordonnées relatives (0 à 1) : si la zone change
// de taille (rotation du téléphone, chargement du PDF au-dessus, zoom), la
// signature est redessinée au bon endroit au lieu d'être décalée ou effacée.
export function SignatureCanvas({ onSignatureCapture, onClear }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);       // [[{x, y}, ...], ...]
  const currentStrokeRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      if (!stroke.length) continue;
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
  }, []);

  // Adapter la résolution du canvas à sa taille affichée et à la densité de l'écran
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [resize]);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    // Continuer à recevoir le tracé même si le doigt sort de la zone
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const stroke = [getPoint(e)];
    currentStrokeRef.current = stroke;
    strokesRef.current.push(stroke);
    redraw();
  };

  const handlePointerMove = (e) => {
    if (!currentStrokeRef.current) return;
    e.preventDefault();
    // Points intermédiaires pour un trait fluide sur mobile
    const events = e.nativeEvent.getCoalescedEvents?.() || [e];
    for (const ev of events) currentStrokeRef.current.push(getPoint(ev));
    redraw();
  };

  const handlePointerUp = (e) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current = null;
    canvasRef.current.releasePointerCapture?.(e.pointerId);
    setIsEmpty(false);
    onSignatureCapture?.(canvasRef.current.toDataURL('image/png'));
  };

  const clearSignature = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    redraw();
    setIsEmpty(true);
    onClear?.();
  };

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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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
