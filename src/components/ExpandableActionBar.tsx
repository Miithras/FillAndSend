import React, { useState, useRef } from 'react';

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
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = touchStartY.current - currentY;

    // Deslizar hacia arriba (diffY > 30) => Expandir
    if (diffY > 30 && !isExpanded) {
      setIsExpanded(true);
      touchStartY.current = null;
    }
    // Deslizar hacia abajo (diffY < -30) => Colapsar
    else if (diffY < -30 && isExpanded) {
      setIsExpanded(false);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <footer
      className={`fixed-bottom-sheet ${isExpanded ? 'is-expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* MANIJA EN LA PARTE SUPERIOR DEL FOOTER */}
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

      

      {/* BOTÓN PRINCIPAL SIEMPRE VISIBLE EN EL FOOTER */}
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

      {/* CONTENEDOR DESLIZABLE DE OPCIONES SECUNDARIAS (OCULTO HASTA DESLIZAR) */}
      <div className={`sheet-collapsible-content ${isExpanded ? 'show' : ''}`}>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            onShareExcel();
            setIsExpanded(false);
          }}
          disabled={!ready}
          style={{ marginTop: 0 }}
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
