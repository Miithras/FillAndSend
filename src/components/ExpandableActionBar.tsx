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

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      e.stopPropagation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
      if (e.cancelable) {
        e.preventDefault(); // Bloquear scroll de la página de fondo obligatoriamente
      }

      if (touchStartY.current === null) return;
      const currentY = e.touches[0].clientY;
      const diffY = touchStartY.current - currentY;

      // Deslizar hacia arriba (> 20px) => Abrir opciones
      if (diffY > 20) {
        setIsExpanded(true);
      }
      // Deslizar hacia abajo (< -20px) => Cerrar opciones
      else if (diffY < -20) {
        setIsExpanded(false);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchStartY.current = null;
      e.stopPropagation();
    };

    // Registrar listeners nativos con passive: false para garantizar cancelabilidad del scroll
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`fixed-bottom-sheet ${isExpanded ? 'is-expanded' : ''}`}
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

      {/* 3. OPCIONES SECUNDARIAS (APARECEN ABAJO DEL BOTÓN PRINCIPAL AL DESLIZAR / TAP) */}
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
