import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Pen } from 'lucide-react';

export function SignatureCanvas({ onSignatureCapture, onClear }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Configurer le canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    
    if (e.type === 'mousedown') {
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    } else if (e.type === 'touchstart') {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }
    
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    if (e.type === 'mousemove') {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    } else if (e.type === 'touchmove') {
      e.preventDefault();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
      
      // Capturer la signature
      if (!isEmpty) {
        const imageData = canvas.toDataURL('image/png');
        onSignatureCapture?.(imageData);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
          className="w-full h-40 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
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