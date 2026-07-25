import React from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';

interface HeaderProps {
  state: AppState;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({ state, onOpenHistory, historyCount }) => {
  const currentDoc = DOC_TYPES[state.docType];

  let stepNum = 0;
  if (state.screen === 'form') stepNum = 1;
  else if (state.screen === 'signers') stepNum = 2;
  else if (state.screen === 'review') stepNum = 3;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">
          ART <span>Digital</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenHistory}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              color: 'var(--text-hi)',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Ver historial de las últimas 24 horas"
          >
            📜 24h
            {historyCount > 0 && (
              <span
                style={{
                  background: 'var(--yellow)',
                  color: '#12151C',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '1px 5px'
                }}
              >
                {historyCount}
              </span>
            )}
          </button>

          <div className="brand-meta">
            <div>RAYCA INGENIERÍA</div>
            {state.screen !== 'select' && currentDoc && (
              <div style={{ color: currentDoc.accent }}>{currentDoc.meta.codigo} v{currentDoc.meta.version}</div>
            )}
          </div>
        </div>
      </div>

      {state.screen !== 'select' ? (
        <>
          <div className="steps">
            <div className={`step ${stepNum >= 1 ? (stepNum > 1 ? 'done' : 'current') : ''}`} />
            <div className={`step ${stepNum >= 2 ? (stepNum > 2 ? 'done' : 'current') : ''}`} />
            <div className={`step ${stepNum >= 3 ? 'current' : ''}`} />
          </div>
          <div className="brand-sub">
            {stepNum === 1 && 'PASO 1 DE 3 — DATOS GENERALES'}
            {stepNum === 2 && 'PASO 2 DE 3 — FIRMAS DE INTEGRANTES'}
            {stepNum === 3 && 'PASO 3 DE 3 — REVISIÓN Y ENVÍO'}
          </div>
        </>
      ) : (
        <div className="brand-sub">SELECCIONA EL DOCUMENTO A EMITIR</div>
      )}
    </header>
  );
};
