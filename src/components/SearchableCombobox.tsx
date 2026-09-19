import React, { useState, useRef, useEffect, useMemo } from 'react';

interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  isOptionDisabled?: (opt: string) => boolean;
  disabledHint?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Escribe o selecciona...',
  ariaLabel,
  isOptionDisabled,
  disabledHint
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropup, setIsDropup] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar valor si cambia externamente
  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  // Detectar orientación dropup cuando esté cerca del borde inferior
  const checkDropup = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setIsDropup(spaceBelow < 250 && rect.top > 180);
  };

  useEffect(() => {
    if (!isOpen) return;
    checkDropup();
    const handleScrollResize = () => checkDropup();
    window.addEventListener('scroll', handleScrollResize, true);
    window.addEventListener('resize', handleScrollResize);
    return () => {
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [isOpen]);

  // Cerrar al hacer clic o tocar fuera del contenedor o presionar Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalize = (txt: string) =>
    (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const filteredOptions = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return options;
    return options.filter(opt => normalize(opt).includes(q));
  }, [options, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setSearchQuery(nextVal);
    onChange(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const isCurrentDuplicate = useMemo(() => {
    if (!value || !isOptionDisabled) return false;
    return isOptionDisabled(value);
  }, [value, isOptionDisabled]);

  const handleSelectOption = (opt: string) => {
    if (isOptionDisabled && isOptionDisabled(opt)) return;
    setSearchQuery(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="combobox-container" ref={containerRef}>
      <div className="combobox-input-wrap">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            checkDropup();
            setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <div className="combobox-actions">
          {searchQuery && (
            <button
              type="button"
              className="combobox-btn"
              onClick={handleClear}
              title="Borrar texto"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            className="combobox-btn"
            onClick={() => {
              checkDropup();
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }}
            title={isOpen ? 'Cerrar opciones' : 'Mostrar opciones'}
          >
            {isOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {isCurrentDuplicate && (
        <div className="combobox-duplicate-warning" style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span>⚠️</span>
          <span>{disabledHint || 'Esta etapa ya fue seleccionada en otro paso.'}</span>
        </div>
      )}

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`combobox-dropdown max-h-56 overflow-y-auto z-50 ${
            isDropup ? 'bottom-full mb-1 dropup' : 'top-full mt-1 dropdown'
          }`}
          role="listbox"
          style={{
            position: 'absolute',
            maxHeight: '14rem',
            overflowY: 'auto',
            zIndex: 50,
            ...(isDropup
              ? { bottom: '100%', marginBottom: '0.25rem', top: 'auto', marginTop: 0 }
              : { top: '100%', marginTop: '0.25rem', bottom: 'auto', marginBottom: 0 }),
            left: 0,
            right: 0,
            width: '100%'
          }}
        >
          <div className="combobox-header">
            <span>Opciones sugeridas ({filteredOptions.length})</span>
            {searchQuery && <span style={{ color: 'var(--cyan)' }}>Filtrado</span>}
          </div>

          {filteredOptions.length === 0 ? (
            <div className="combobox-empty" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--slate)' }}>
              <span>No se encontraron opciones predefinidas. Se guardará como texto personalizado.</span>
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = normalize(value) === normalize(opt);
              const isDisabled = isOptionDisabled ? isOptionDisabled(opt) : false;

              return (
                <div
                  key={idx}
                  className={`combobox-option ${isSelected ? 'already-added' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!isDisabled) handleSelectOption(opt);
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    color: isDisabled ? 'var(--slate)' : isSelected ? 'var(--cyan)' : 'var(--navy)',
                    fontWeight: isSelected ? 700 : 500,
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isDisabled ? 'rgba(0, 30, 89, 0.03)' : undefined
                  }}
                  title={isDisabled ? (disabledHint || 'Esta opción ya fue seleccionada en otra etapa') : undefined}
                >
                  <span style={{ flex: 1, textDecoration: isDisabled ? 'line-through' : 'none' }}>{opt}</span>
                  {isSelected && <span style={{ fontSize: 11, color: 'var(--cyan)' }}>✓</span>}
                  {isDisabled && (
                    <span style={{ fontSize: 11, color: '#d97706', fontStyle: 'italic', fontWeight: 600 }}>
                      (En otra etapa)
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
