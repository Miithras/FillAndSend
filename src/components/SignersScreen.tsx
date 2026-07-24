import React, { useState } from 'react';
import { AppState, Signer } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { WORKERS_DB, findWorker } from '../config/workers';
import { formatearRut, validarRut, uid } from '../utils/rut';

interface SignersScreenProps {
  state: AppState;
  onAddSigner: (signer: Signer) => void;
  onDeleteSigner: (index: number) => void;
  onClearAllSigners: () => void;
  onOpenSignModal: (index: number) => void;
  onOpenClosingModal: () => void;
  onBackToForm: () => void;
  onGoToReview: () => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const SignersScreen: React.FC<SignersScreenProps> = ({
  state,
  onAddSigner,
  onDeleteSigner,
  onClearAllSigners,
  onOpenSignModal,
  onOpenClosingModal,
  onBackToForm,
  onGoToReview,
  onShowToast
}) => {
  const doc = DOC_TYPES[state.docType];
  const total = state.signers.length;
  const done = state.signers.filter(s => s.firma).length;
  const pct = total ? done / total : 0;
  const circumference = 2 * Math.PI * 65;
  const offset = circumference * (1 - pct);

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [rutHint, setRutHint] = useState({ text: 'Formato: 12.345.678-9', isOk: false, isErr: false });
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  const handleNameChange = (val: string) => {
    setName(val);
    const worker = findWorker(val);
    if (worker) {
      const fRut = formatearRut(worker.rut);
      setRut(fRut);
      setRutHint({ text: 'RUT válido', isOk: true, isErr: false });
      if (doc.signerSchema.extra.some(e => e.id === 'cargo')) {
        setExtraValues(prev => ({ ...prev, cargo: worker.cargo }));
      }
    }
  };

  const handleRutChange = (val: string) => {
    setRut(val);
    if (val.length > 3) {
      const ok = validarRut(val);
      setRutHint({
        text: ok ? 'RUT válido' : 'RUT inválido — revisa el dígito verificador',
        isOk: ok,
        isErr: !ok
      });
    } else {
      setRutHint({ text: 'Formato: 12.345.678-9', isOk: false, isErr: false });
    }
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onShowToast('Completa el nombre', true);
      return;
    }

    let trimmedRut = '';
    if (doc.signerSchema.rutRequired) {
      trimmedRut = rut.trim();
      if (!trimmedRut) {
        onShowToast('Completa el RUT', true);
        return;
      }
      if (!validarRut(trimmedRut)) {
        onShowToast('El RUT ingresado no es válido', true);
        return;
      }
    }

    const newSigner: Signer = {
      id: uid(),
      nombre: trimmedName,
      rut: trimmedRut,
      firma: null,
      timestamp: null,
      ...extraValues
    };

    onAddSigner(newSigner);
    setName('');
    setRut('');
    setExtraValues({});
    setRutHint({ text: 'Formato: 12.345.678-9', isOk: false, isErr: false });
  };

  return (
    <div className="signers-screen">
      <button className="back-link" onClick={onBackToForm}>
        ‹ Volver al formulario
      </button>

      {/* MEDIDOR DE AVANCE DE FIRMAS */}
      <div className="gauge-wrap">
        <div className="gauge">
          <svg width="150" height="150" viewBox="0 0 150 150">
            <circle className="gauge-track" cx="75" cy="75" r="65" />
            <circle
              className="gauge-fill"
              cx="75"
              cy="75"
              r="65"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="gauge-center">
            <div className="num">{done}/{total}</div>
            <div className="lbl">Firmados</div>
          </div>
        </div>
      </div>

      <div className="section-title" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', marginBottom: 10 }}>
        Integrantes ({total})
      </div>

      {state.signers.length === 0 ? (
        <div className="banner">Aún no agregas integrantes al documento.</div>
      ) : (
        <>
          {state.signers.map((s, i) => {
            const signed = !!s.firma;
            const roleLine = doc.signerSchema.extra.length
              ? doc.signerSchema.extra.map(ef => s[ef.id]).filter(Boolean).join(' · ')
              : '';

            return (
              <div
                key={s.id || i}
                className={`signer-card ${signed ? 'signed' : ''}`}
                onClick={() => onOpenSignModal(i)}
              >
                <div className="signer-avatar">{signed ? '✓' : '👤'}</div>
                <div className="signer-info">
                  <div className="name">{s.nombre || '(sin nombre)'}</div>
                  {doc.signerSchema.rutRequired && (
                    <div className="rut">{s.rut ? formatearRut(s.rut) : 'RUT pendiente'}</div>
                  )}
                  {roleLine && <div className="role">{roleLine}</div>}
                </div>
                <div className={`signer-status ${signed ? 'done' : 'pending'}`}>
                  {signed ? 'Firmado' : 'Pendiente'}
                </div>
                {signed && (
                  <button
                    className="signer-del"
                    title="Editar firma"
                    style={{ color: 'var(--yellow)' }}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenSignModal(i);
                    }}
                  >
                    ✎
                  </button>
                )}
                <button
                  className="signer-del"
                  title="Eliminar"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteSigner(i);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button
            className="btn-ghost"
            style={{ display: 'block', margin: '0 0 12px auto', color: 'var(--danger)' }}
            onClick={onClearAllSigners}
          >
            Eliminar a todos
          </button>
        </>
      )}

      {/* FORMULARIO AGREGAR INTEGRANTE */}
      <div className="field" style={{ marginTop: 14 }}>
        <label>Agregar integrante — nombre</label>
        <input
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="Escribe o elige de la lista"
          list="workersDatalist"
        />
        <datalist id="workersDatalist">
          {WORKERS_DB.map(w => (
            <option key={w.rut} value={w.nombre} />
          ))}
        </datalist>
        <div className="hint">Si eliges a alguien de la lista, RUT y cargo se autocompletan.</div>
      </div>

      {doc.signerSchema.rutRequired && (
        <div className="field">
          <label>RUT</label>
          <input
            type="text"
            value={rut}
            onChange={e => handleRutChange(e.target.value)}
            placeholder="12.345.678-9"
          />
          <div
            className="hint"
            style={{
              color: rutHint.isOk ? 'var(--teal)' : rutHint.isErr ? 'var(--danger)' : 'var(--text-lo)'
            }}
          >
            {rutHint.text}
          </div>
        </div>
      )}

      {doc.signerSchema.extra.map(ef => (
        <div className="field" key={ef.id}>
          <label>{ef.label}</label>
          <input
            type="text"
            value={extraValues[ef.id] || ''}
            onChange={e => setExtraValues({ ...extraValues, [ef.id]: e.target.value })}
            placeholder={ef.label}
          />
        </div>
      ))}

      <button className="add-row-btn" onClick={handleAdd}>
        + Agregar a la lista
      </button>

      {/* FIRMA DE CIERRE DEL SUPERVISOR */}
      {doc.closing && doc.closing.enabled && (
        <>
          <div
            className="section-title"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', margin: '22px 0 10px' }}
          >
            {doc.closing.title}
          </div>
          <div
            className={`signer-card ${state.closingSig && state.closingSig.firma ? 'signed' : ''}`}
            onClick={onOpenClosingModal}
          >
            <div className="signer-avatar">{state.closingSig && state.closingSig.firma ? '✓' : '✍️'}</div>
            <div className="signer-info">
              <div className="name">
                {state.closingSig ? state.closingSig.nombre : 'Toca para registrar firma de cierre'}
              </div>
              {doc.closing.roleField && state.closingSig && (
                <div className="role">{state.closingSig[doc.closing.roleField.id] || ''}</div>
              )}
            </div>
            <div className={`signer-status ${state.closingSig && state.closingSig.firma ? 'done' : 'pending'}`}>
              {state.closingSig && state.closingSig.firma ? 'Firmado' : 'Pendiente'}
            </div>
          </div>
        </>
      )}

      <footer className="actionbar">
        <button className="btn-primary" onClick={onGoToReview} disabled={total === 0}>
          Revisar y finalizar
        </button>
      </footer>
    </div>
  );
};
