import React, { useState, useRef, useEffect, useMemo } from 'react';

interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Escribe o selecciona...',
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar valor si cambia externamente
  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  // Cerrar al hacer clic o tocar fuera del contenedor
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

  const handleSelectOption = (opt: string) => {
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
          onFocus={() => setIsOpen(true)}
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
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }}
            title={isOpen ? 'Cerrar opciones' : 'Mostrar opciones'}
          >
            {isOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="combobox-dropdown" role="listbox">
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
              return (
                <div
                  key={idx}
                  className={`combobox-option ${isSelected ? 'already-added' : ''}`}
                  onClick={() => handleSelectOption(opt)}
                  role="option"
                  aria-selected={isSelected}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    color: isSelected ? 'var(--cyan)' : 'var(--navy)',
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isSelected && <span style={{ fontSize: 11, color: 'var(--cyan)' }}>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
