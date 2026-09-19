import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface FloatingDropdownPortalProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  role?: string;
  style?: React.CSSProperties;
  maxHeight?: number;
}

export const FloatingDropdownPortal: React.FC<FloatingDropdownPortalProps> = ({
  isOpen,
  anchorRef,
  onClose,
  children,
  className = 'combobox-dropdown',
  role = 'listbox',
  style,
  maxHeight = 260
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpwards: boolean;
  } | null>(null);

  const calculatePosition = () => {
    if (!anchorRef.current) return null;
    const rect = anchorRef.current.getBoundingClientRect();

    // Si el elemento ancla se desplazó completamente fuera de la vista, cerrar
    if (rect.bottom < -60 || rect.top > window.innerHeight + 60) {
      return null;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Preferir abrir hacia arriba si el espacio inferior es insuficiente (< 220px)
    // y arriba hay más espacio que abajo
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

    const width = Math.min(rect.width, viewportWidth - 16);
    let left = rect.left;
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }
    if (left < 8) left = 8;

    let calculatedMaxHeight: number;
    if (openUpwards) {
      calculatedMaxHeight = Math.min(maxHeight, spaceAbove - 16);
      return {
        bottom: viewportHeight - (rect.top - 4),
        left,
        width,
        openUpwards: true,
        maxHeight: Math.max(120, calculatedMaxHeight)
      };
    } else {
      calculatedMaxHeight = Math.min(maxHeight, spaceBelow - 16);
      return {
        top: rect.bottom + 4,
        left,
        width,
        openUpwards: false,
        maxHeight: Math.max(120, calculatedMaxHeight)
      };
    }
  };

  const updatePosition = () => {
    const nextCoords = calculatePosition();
    if (!nextCoords) {
      onClose();
    } else {
      setCoords(nextCoords);
    }
  };

  // Calcular posición inmediatamente antes del renderizado
  useLayoutEffect(() => {
    if (isOpen) {
      const initialCoords = calculatePosition();
      if (initialCoords) {
        setCoords(initialCoords);
      }
    } else {
      setCoords(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Escuchar scroll en fase de captura para detectar scroll de cualquier contenedor padre
    const handleScroll = (e: Event) => {
      // Si el evento de scroll ocurrió dentro de la misma lista desplegable, ignorar
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updatePosition);
      window.visualViewport.addEventListener('scroll', updatePosition);
    }

    // Detección de clics afuera considerando tanto el ancla como el portal en document.body
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (anchorRef.current && anchorRef.current.contains(target)) {
        return; // Clic en el input o contenedor de origen
      }
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return; // Clic dentro de la lista de opciones
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updatePosition);
        window.visualViewport.removeEventListener('scroll', updatePosition);
      }
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef, maxHeight]);

  if (!isOpen || !coords) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={className}
      role={role}
      style={{
        position: 'fixed',
        top: coords.openUpwards ? undefined : coords.top,
        bottom: coords.openUpwards ? coords.bottom : undefined,
        left: coords.left,
        width: coords.width,
        maxHeight: coords.maxHeight,
        zIndex: 99999,
        ...style
      }}
    >
      {children}
    </div>,
    document.body
  );
};
