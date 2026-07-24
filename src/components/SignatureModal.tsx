import React, { useRef, useEffect, useState } from 'react';

interface SignatureModalProps {
  title: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ title, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.strokeStyle = '#F5C400';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
    }
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleSave = () => {
    if (!hasDrawn) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        <p className="sub">Dibuja la firma con el dedo dentro del recuadro.</p>
        <canvas
          ref={canvasRef}
          id="sigCanvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="sig-actions">
          <button className="btn-secondary" onClick={handleClear}>
            Borrar
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!hasDrawn}>
            Guardar firma
          </button>
        </div>
        <button
          className="btn-ghost"
          style={{ width: '100%', textAlign: 'center', marginTop: 8 }}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
