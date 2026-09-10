import React, { useState } from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { findWorker } from '../config/workers';

interface ClosingFormModalProps {
  state: AppState;
  onNext: (name: string, roleVal: string) => void;
  onClose: () => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const ClosingFormModal: React.FC<ClosingFormModalProps> = ({ state, onNext, onClose, onShowToast }) => {
  const doc = DOC_TYPES[state.docType];
  const presenterName = (state.form.instructor || state.form.supervisor || '').trim();
  const worker = findWorker(presenterName);
  const defaultRole = state.closingSig?.cargo || (doc.closing.roleField ? state.closingSig?.[doc.closing.roleField.id] : '') || worker?.cargo || 'Supervisor';
  const [roleVal, setRoleVal] = useState(defaultRole);

  const handleNext = () => {
    if (!presenterName) {
      onShowToast('⚠️ Debes ingresar primero al instructor/supervisor en el Paso 1 (Datos Generales)', true);
      return;
    }
    onNext(presenterName, roleVal.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{doc.closing.title}</h3>
        <p className="sub">Confirma los datos del presentador antes de firmar.</p>

        <div className="field">
          <label>Nombre del {state.docType === 'charla_inicial' ? 'Instructor' : 'Supervisor'} (Auto-asignado 🔒)</label>
          <input
            type="text"
            value={presenterName || '(Sin asignar en Paso 1)'}
            readOnly
            style={{
              background: 'var(--bg-2)',
              cursor: 'not-allowed',
              color: presenterName ? 'var(--navy)' : 'var(--danger)',
              fontWeight: 700
            }}
          />
          <div className="hint" style={{ color: 'var(--cyan)' }}>
            🔒 Bloqueado: coincide exactamente con los datos generales del inicio.
          </div>
        </div>

        {doc.closing.roleField && (
          <div className="field">
            <label>{doc.closing.roleField.label}</label>
            <input
              type="text"
              value={roleVal}
              onChange={e => setRoleVal(e.target.value)}
              placeholder={doc.closing.roleField.label}
            />
          </div>
        )}

        <button className="btn-primary" onClick={handleNext} disabled={!presenterName}>
          Continuar a firmar
        </button>
        <button
          className="btn-ghost"
          style={{ width: '100%', textAlign: 'center', marginTop: 8 }}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
