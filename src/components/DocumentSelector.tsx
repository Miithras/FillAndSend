import React from 'react';
import { DocTypeId } from '../types';
import { DOC_TYPES } from '../config/docTypes';

interface DocumentSelectorProps {
  hasDraft: boolean;
  onSelectDoc: (id: DocTypeId) => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  hasDraft,
  onSelectDoc,
  onContinueDraft,
  onDiscardDraft
}) => {
  const docList = Object.values(DOC_TYPES);

  return (
    <div className="doc-selector-screen">
      {hasDraft && (
        <div className="banner warn" style={{ marginBottom: 20 }}>
          <b>Tienes un borrador guardado en este dispositivo.</b>
          <br />
          ¿Deseas continuar donde quedaste o descartarlo para empezar uno nuevo?
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              style={{ flex: 1, background: 'var(--yellow)', color: '#ffffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}
              onClick={onContinueDraft}
            >
              Continuar borrador
            </button>
            <button
              style={{ flex: 1, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '10px', borderRadius: '8px' }}
              onClick={onDiscardDraft}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {docList.map(doc => (
        <div
          key={doc.id}
          className={`doc-card ${!doc.enabled ? 'disabled' : ''}`}
          style={{ '--accent': doc.accent } as React.CSSProperties}
          onClick={() => doc.enabled && onSelectDoc(doc.id)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{doc.icon}</span>
              <h3>{doc.label}</h3>
            </div>
            <p>{doc.desc}</p>
            <span className="tag">{doc.meta.codigo} · v{doc.meta.version} ({doc.meta.fechaVersion})</span>
          </div>
          <div className="arrow">›</div>
        </div>
      ))}
    </div>
  );
};
