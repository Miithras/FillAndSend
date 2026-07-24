import React from 'react';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Confirmar</h3>
        <p className="sub">{message}</p>
        <div className="sig-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
