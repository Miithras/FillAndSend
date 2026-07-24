import React, { useState } from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';

interface ClosingFormModalProps {
  state: AppState;
  onNext: (name: string, roleVal: string) => void;
  onClose: () => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const ClosingFormModal: React.FC<ClosingFormModalProps> = ({ state, onNext, onClose, onShowToast }) => {
  const doc = DOC_TYPES[state.docType];
  const [name, setName] = useState(state.closingSig?.nombre || '');
  const [roleVal, setRoleVal] = useState(
    doc.closing.roleField ? state.closingSig?.[doc.closing.roleField.id] || '' : ''
  );

  const handleNext = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onShowToast('Completa el nombre', true);
      return;
    }
    onNext(trimmedName, roleVal.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{doc.closing.title}</h3>
        <p className="sub">Completa los datos antes de firmar.</p>

        <div className="field">
          <label>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre completo"
          />
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

        <button className="btn-primary" onClick={handleNext}>
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
