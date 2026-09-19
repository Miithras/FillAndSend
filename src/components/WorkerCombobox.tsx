import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Worker } from '../types';
import { WORKERS_DB } from '../config/workers';

interface WorkerComboboxProps {
  value: string;
  onChangeName: (name: string) => void;
  onSelectWorker: (worker: Worker) => void;
  existingSignerNames?: string[];
  placeholder?: string;
}

export const WorkerCombobox: React.FC<WorkerComboboxProps> = ({
  value,
  onChangeName,
  onSelectWorker,
  existingSignerNames = [],
  placeholder = 'Escribe para buscar o ingresar nuevo...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropup, setIsDropup] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar búsqueda cuando cambia el valor externo (ej: tras agregar integrante)
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

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

  const filteredWorkers = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return WORKERS_DB;
    const cleanQ = q.replace(/[^0-9k]/g, '');

    return WORKERS_DB.filter(w => {
      const matchName = normalize(w.nombre).includes(q);
      const matchCargo = normalize(w.cargo).includes(q);
      const cleanRut = normalize(w.rut).replace(/[^0-9k]/g, '');
      const matchRut = cleanQ ? cleanRut.includes(cleanQ) : false;
      return matchName || matchCargo || matchRut;
    });
  }, [searchQuery]);

  const trimmedQuery = searchQuery.trim();
  const isExactMatch = WORKERS_DB.some(
    w => normalize(w.nombre) === normalize(trimmedQuery)
  );
  const canCreate = trimmedQuery.length > 0 && !isExactMatch;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setSearchQuery(nextVal);
    onChangeName(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (worker: Worker) => {
    setSearchQuery(worker.nombre);
    onSelectWorker(worker);
    setIsOpen(false);
  };

  const handleSelectCreatable = () => {
    if (!trimmedQuery) return;
    setSearchQuery(trimmedQuery);
    onChangeName(trimmedQuery);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onChangeName('');
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
            title={isOpen ? 'Cerrar opciones' : 'Mostrar lista de trabajadores'}
          >
            {isOpen ? '▴' : '▾'}
          </button>
        </div>
      </div>

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
          {/* OPCIÓN CREATABLE: AGREGAR INTEGRANTE NUEVO INLINE */}
          {canCreate && (
            <div
              className="combobox-option creatable"
              onClick={handleSelectCreatable}
              role="option"
              aria-selected={false}
            >
              <div className="combobox-option-avatar" style={{ background: 'var(--cyan)', color: '#fff' }}>
                ➕
              </div>
              <div className="combobox-option-text">
                <div className="combobox-option-name">
                  Agregar nuevo: <strong>"{trimmedQuery}"</strong>
                </div>
                <div className="combobox-option-sub">
                  Ingresar integrante no registrado en el catálogo
                </div>
              </div>
              <span className="combobox-badge-new">+ Crear</span>
            </div>
          )}

          <div className="combobox-header">
            <span>Nómina de Personal ({filteredWorkers.length})</span>
            {canCreate && <span style={{ color: 'var(--cyan)' }}>O elige de la lista</span>}
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="combobox-empty">
              <span>No se encontraron trabajadores en la nómina para "{searchQuery}".</span>
              {canCreate && (
                <div style={{ marginTop: 6, color: 'var(--cyan)', fontWeight: 600 }}>
                  Toca arriba para agregarlo como nuevo integrante.
                </div>
              )}
            </div>
          ) : (
            filteredWorkers.map(w => {
              const isAlreadyAdded = existingSignerNames.some(
                n => normalize(n) === normalize(w.nombre)
              );

              return (
                <div
                  key={w.rut}
                  className={`combobox-option ${isAlreadyAdded ? 'already-added' : ''}`}
                  onClick={() => handleSelect(w)}
                  role="option"
                  aria-selected={normalize(value) === normalize(w.nombre)}
                >
                  <div className="combobox-option-avatar">
                    {w.nombre.charAt(0)}
                  </div>
                  <div className="combobox-option-text">
                    <div className="combobox-option-name">{w.nombre}</div>
                    <div className="combobox-option-sub">
                      <span className="mono">{w.rut}</span> · {w.cargo}
                    </div>
                  </div>
                  {isAlreadyAdded && (
                    <span className="combobox-badge-added">✓ Agregado</span>
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
