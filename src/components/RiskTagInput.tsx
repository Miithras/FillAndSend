import React, { useState, useRef, useEffect, useMemo } from 'react';

interface RiskTagInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  variant?: 'hazard' | 'control';
}

export const RiskTagInput: React.FC<RiskTagInputProps> = ({
  items = [],
  onChange,
  options = [],
  placeholder = 'Escribe o busca para agregar...',
  ariaLabel,
  variant = 'hazard'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar dropdown al hacer clic o tocar fuera del componente
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const normalize = (txt: string) =>
    (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Filtrar opciones según búsqueda
  const filteredOptions = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return options;
    return options.filter(opt => normalize(opt).includes(q));
  }, [options, searchQuery]);

  // Verificar si un ítem ya está agregado
  const isItemAdded = (opt: string) => {
    const normOpt = normalize(opt);
    return items.some(item => normalize(item) === normOpt);
  };

  // Agregar ítem
  const handleAddItem = (itemToAdd: string) => {
    const trimmed = itemToAdd.trim();
    if (!trimmed) return;
    if (isItemAdded(trimmed)) {
      setSearchQuery('');
      setIsOpen(false);
      return;
    }
    onChange([...items, trimmed]);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Eliminar ítem
  const handleRemoveItem = (indexToRemove: number) => {
    const nextItems = items.filter((_, idx) => idx !== indexToRemove);
    onChange(nextItems);
  };

  // Manejar teclado (Enter agrega texto personalizado o el primer match)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      // Si hay una coincidencia exacta en las opciones
      const exactMatch = options.find(opt => normalize(opt) === normalize(trimmed));
      if (exactMatch) {
        handleAddItem(exactMatch);
      } else if (filteredOptions.length === 1) {
        handleAddItem(filteredOptions[0]);
      } else {
        // Agregar como ítem personalizado
        handleAddItem(trimmed);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isHazard = variant === 'hazard';
  const tagIcon = isHazard ? '⚠️' : '🛡️';
  const tagTypeClass = isHazard ? 'tag-hazard' : 'tag-control';

  return (
    <div className={`risk-tag-input-container ${tagTypeClass}`} ref={containerRef}>
      {/* Lista de tags/chips activos */}
      {items.length > 0 && (
        <div className="risk-tags-list">
          {items.map((item, idx) => (
            <div key={idx} className={`risk-tag-chip ${tagTypeClass}`}>
              <span className="risk-tag-icon">{tagIcon}</span>
              <span className="risk-tag-text">{item}</span>
              <button
                type="button"
                className="risk-tag-remove"
                onClick={() => handleRemoveItem(idx)}
                title={`Eliminar "${item}"`}
                aria-label={`Eliminar ${item}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input con combobox para buscar en catálogo o escribir libre */}
      <div className="risk-tag-combobox-wrap">
        <div className="combobox-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={items.length === 0 ? placeholder : 'Agregar otro ítem...'}
            aria-label={ariaLabel}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <div className="combobox-actions">
            {searchQuery.trim() && (
              <button
                type="button"
                className="risk-tag-add-btn"
                onClick={() => handleAddItem(searchQuery)}
                title="Agregar ítem"
              >
                + Agregar
              </button>
            )}
            <button
              type="button"
              className="combobox-btn"
              onClick={() => {
                setIsOpen(prev => !prev);
                inputRef.current?.focus();
              }}
              title={isOpen ? 'Cerrar sugerencias' : 'Ver sugerencias'}
            >
              {isOpen ? '▴' : '▾'}
            </button>
          </div>
        </div>

        {/* Dropdown de opciones del catálogo */}
        {isOpen && (
          <div className="combobox-dropdown" role="listbox">
            <div className="combobox-header">
              <span>Catálogo sugerido ({filteredOptions.length})</span>
              {items.length > 0 && (
                <span className="risk-tag-badge-count">
                  {items.length} {items.length === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
              )}
            </div>

            {/* Opción para agregar texto personalizado si no coincide exactamente */}
            {searchQuery.trim() && !options.some(opt => normalize(opt) === normalize(searchQuery.trim())) && (
              <div
                className="combobox-option creatable"
                onClick={() => handleAddItem(searchQuery)}
                role="option"
                aria-selected="false"
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>
                  + Agregar personalizado: &ldquo;{searchQuery.trim()}&rdquo;
                </span>
              </div>
            )}

            {filteredOptions.length === 0 && !searchQuery.trim() ? (
              <div className="combobox-empty" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--slate)' }}>
                <span>No hay más opciones disponibles.</span>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const added = isItemAdded(opt);
                return (
                  <div
                    key={idx}
                    className={`combobox-option ${added ? 'already-added' : ''}`}
                    onClick={() => {
                      if (added) {
                        // Si ya está, removerlo
                        const indexInItems = items.findIndex(it => normalize(it) === normalize(opt));
                        if (indexInItems !== -1) handleRemoveItem(indexInItems);
                      } else {
                        handleAddItem(opt);
                      }
                    }}
                    role="option"
                    aria-selected={added}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      color: added ? (isHazard ? '#d97706' : '#059669') : 'var(--navy)',
                      fontWeight: added ? 700 : 500,
                      backgroundColor: added ? (isHazard ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)') : undefined
                    }}
                  >
                    <span style={{ flex: 1 }}>{opt}</span>
                    {added ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: isHazard ? '#d97706' : '#059669' }}>
                        ✓ Seleccionado
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--slate)', opacity: 0.6 }}>+</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
