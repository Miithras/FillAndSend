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

    // Deslizar hacia arriba (diffY > 40) => Expandir
    if (diffY > 40 && !isExpanded) {
      setIsExpanded(true);
      touchStartY.current = null;
    }
    // Deslizar hacia abajo (diffY < -40) => Colapsar
    else if (diffY < -40 && isExpanded) {
      setIsExpanded(false);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div
      className={`expandable-action-sheet ${isExpanded ? 'expanded' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* MANIJA TÁCTIL Y FLECHA PARA DESLIZAR */}
      <div
        className="sheet-handle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Deslizar hacia abajo para ocultar' : 'Deslizar hacia arriba para más opciones'}
      >
        <div className="handle-bar" />
        <div className="handle-text">
          {isExpanded ? '▼ Ocultar opciones de exportación' : '▲ Desliza hacia arriba para más opciones'}
        </div>
      </div>

      {/* CONTENIDO EXPANDIBLE (OPCIONES SECUNDARIAS) */}
      {isExpanded && (
        <div className="sheet-expanded-content">
          <button
            className="btn-secondary"
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
      )}

      {/* BOTÓN PRINCIPAL SIEMPRE VISIBLE */}
      <div className="sheet-primary-wrap">
        <button
          className="btn-primary"
          onClick={onSendDocument}
          disabled={!ready || sending}
        >
          {sending ? 'Enviando correo...' : 'Finalizar y enviar por Correo'}
        </button>
      </div>
    </div>
  );
};
