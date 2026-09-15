import React, { useState } from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { CurrentUserSession } from '../services/authService';

interface HeaderProps {
  state: AppState;
  onOpenHistory: () => void;
  historyCount: number;
  currentUser?: CurrentUserSession | null;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onOpenHistory,
  historyCount,
  currentUser,
  onLogout,
  onChangePassword
}) => {
  const currentDoc = DOC_TYPES[state.docType];
  const [showUserMenu, setShowUserMenu] = useState(false);

  let stepNum = 0;
  if (state.screen === 'form') stepNum = 1;
  else if (state.screen === 'signers') stepNum = 2;
  else if (state.screen === 'review') stepNum = 3;

  const headerTitle = state.screen === 'select'
    ? 'Seleccione el documento a emitir'
    : (currentDoc?.label || 'RaycaDoc');

  const userPrefix = currentUser?.email ? currentUser.email.split('@')[0] : '';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">
          {headerTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, position: 'relative' }}>
          <button
            onClick={onOpenHistory}
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              color: 'var(--text-hi)',
              padding: '5px 8px',
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
            🕗 24h
            {historyCount > 0 && (
              <span
                style={{
                  background: 'var(--cyan)',
                  color: 'var(--white)',
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

          {currentUser && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                style={{
                  background: 'rgba(0, 160, 184, 0.1)',
                  border: '1px solid rgba(0, 160, 184, 0.3)',
                  color: 'var(--navy)',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`Sesión activa: ${currentUser.email}`}
              >
                <span>👤</span>
                <span className="hide-mobile" style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userPrefix}
                </span>
                <span style={{ fontSize: 9 }}>▾</span>
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0, 30, 89, 0.15)',
                    zIndex: 100,
                    minWidth: 200,
                    padding: '8px 0'
                  }}
                >
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--slate)' }}>
                    <div>Conectado como:</div>
                    <div style={{ color: 'var(--navy)', fontWeight: 700, wordBreak: 'break-all' }}>{currentUser.email}</div>
                  </div>

                  {onChangePassword && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onChangePassword();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--navy)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      🔑 Cambiar contraseña
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderTop: '1px solid var(--line)'
                      }}
                    >
                      🚪 Cerrar sesión
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="brand-meta hide-mobile">
            <div>RAYCA INGENIERÍA</div>
            {state.screen !== 'select' && currentDoc && (
              <div style={{ color: currentDoc.accent }}>{currentDoc.meta.codigo} v{currentDoc.meta.version}</div>
            )}
          </div>
        </div>
      </div>

      {state.screen !== 'select' && (
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
      )}
    </header>
  );
};
