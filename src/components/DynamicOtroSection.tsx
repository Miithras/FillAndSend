import React, { useState, useRef } from 'react';

interface DynamicOtroSectionProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

export const DynamicOtroSection: React.FC<DynamicOtroSectionProps> = ({
  value,
  onChange,
  label = 'Especificar temas adicionales (Otro)',
  placeholder = 'Escribe el tema o elemento...'
}) => {
  // Items confirmed are stored separated by \n
  const confirmedItems = (value || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const [pendingText, setPendingText] = useState('');
  const pendingInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmItem = () => {
    const trimmed = pendingText.trim();
    if (!trimmed) return;

    const nextItems = [...confirmedItems, trimmed];
    onChange(nextItems.join('\n'));
    setPendingText('');

    // Re-focus the input to allow quick successive additions
    setTimeout(() => {
      pendingInputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmItem();
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    const nextItems = confirmedItems.filter((_, idx) => idx !== indexToRemove);
    onChange(nextItems.join('\n'));
  };

  return (
    <div className="dynamic-otro-container">
      {label && (
        <div className="dynamic-otro-label">
          <span>{label}</span>
          <span className="dynamic-otro-count">
            {confirmedItems.length} {confirmedItems.length === 1 ? 'agregado' : 'agregados'}
          </span>
        </div>
      )}

      {/* Lista de ítems confirmados */}
      {confirmedItems.length > 0 && (
        <div className="dynamic-otro-list">
          {confirmedItems.map((item, idx) => (
            <div key={idx} className="dynamic-otro-item">
              <div className="dynamic-otro-item-check" title="Confirmado">
                ✓
              </div>
              <span className="dynamic-otro-item-text">{item}</span>
              <button
                type="button"
                className="dynamic-otro-item-del"
                onClick={() => handleRemoveItem(idx)}
                title="Eliminar este ítem"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fila activa/pendiente para escribir y confirmar con ticket */}
      <div className="dynamic-otro-input-row">
        <input
          ref={pendingInputRef}
          type="text"
          className="dynamic-otro-input"
          value={pendingText}
          onChange={e => setPendingText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
        />
        <button
          type="button"
          className={`dynamic-otro-confirm-btn ${pendingText.trim() ? 'active' : ''}`}
          onClick={handleConfirmItem}
          disabled={!pendingText.trim()}
          title="Confirmar y añadir nueva fila (Enter)"
        >
          <span className="confirm-icon">✓</span>
          <span className="confirm-text">Confirmar</span>
        </button>
      </div>
      <div className="dynamic-otro-hint">
        💡 Escribe y presiona <strong style={{ color: 'var(--cyan)' }}>✓ Confirmar</strong> o <strong>Enter</strong> para guardar y desplegar otra fila automáticamente.
      </div>
    </div>
  );
};
