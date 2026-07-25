import React, { useState, useRef, useEffect } from 'react';

interface ExpandableActionBarProps {
  onSendDocument: () => void;
  onShareExcel: () => void;
  onDownloadExcel: () => void;
  ready: boolean;
  sending: boolean;
}

export const ExpandableActionBar: React.FC<ExpandableActionBarProps> = ({
  onSendDocument,
  onShareExcel,
  onDownloadExcel,
  ready,
  sending
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Evitar que la página de fondo haga scroll al deslizar sobre el footer
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    const onNativeTouchMove = (e: TouchEvent) => {
      if (touchStartY.current !== null && e.cancelable) {
        e.preventDefault(); // Detener scroll de la pantalla principal
      }
    };

    el.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = touchStartY.current - currentY;

    // Deslizar hacia arriba (diffY > 25) => Expandir
    if (diffY > 25 && !isExpanded) {
      setIsExpanded(true);
      touchStartY.current = null;
    }
    // Deslizar hacia abajo (diffY < -25) => Colapsar
    else if (diffY < -25 && isExpanded) {
      setIsExpanded(false);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <footer
      ref={footerRef}
      className={`fixed-bottom-sheet ${isExpanded ? 'is-expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. MANIJA SUPERIOR DEL FOOTER */}
      <div
        className="sheet-drag-handle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Toca o desliza para ocultar' : 'Toca o desliza hacia arriba para más opciones'}
      >
        <div className="drag-pill" />
        <div className="drag-text">
          {isExpanded ? '▼ OCULTAR OPCIONES' : '▲ DESLIZA HACIA ARRIBA PARA MÁS OPCIONES'}
        </div>
      </div>

      {/* 2. BOTÓN PRINCIPAL (SIEMPRE ARRIBA) */}
      <div className="sheet-main-action">
        <button
          className="btn-primary"
          type="button"
          onClick={onSendDocument}
          disabled={!ready || sending}
        >
          {sending ? 'Enviando correo...' : 'Finalizar y enviar por Correo'}
        </button>
      </div>

      {/* 3. OPCIONES SECUNDARIAS (APARECEN ABAJO DEL BOTÓN PRINCIPAL) */}
      <div className={`sheet-collapsible-content ${isExpanded ? 'show' : ''}`}>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            onShareExcel();
            setIsExpanded(false);
          }}
          disabled={!ready}
          style={{ marginTop: 10 }}
        >
          📤 Compartir Excel (WhatsApp, Gmail...)
        </button>

        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            onDownloadExcel();
            setIsExpanded(false);
          }}
          disabled={!ready}
          style={{ marginTop: 8 }}
        >
          📥 Descargar Excel original rellenado
        </button>
      </div>
    </footer>
  );
};
