import React, { useState } from 'react';
import { AppState, Signer, Worker } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { WORKERS_DB, findWorker } from '../config/workers';
import { formatearRut, validarRut, uid } from '../utils/rut';
import { WorkerCombobox } from './WorkerCombobox';

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

  const presenterName = (state.form.instructor || state.form.supervisor || '').trim();
  const workerInfo = findWorker(presenterName);

  const handleOpenClosing = () => {
    if (!presenterName) {
      onShowToast('⚠️ Debes ingresar primero al instructor/supervisor en el Paso 1 (Datos Generales)', true);
      return;
    }
    onOpenClosingModal();
  };

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [rutHint, setRutHint] = useState({ text: 'Formato: 12.345.678-9', isOk: false, isErr: false });
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  const handleSelectWorker = (worker: Worker) => {
    setName(worker.nombre);
    const fRut = formatearRut(worker.rut);
    setRut(fRut);
    setRutHint({ text: 'RUT válido', isOk: true, isErr: false });
    if (doc.signerSchema.extra.some(e => e.id === 'cargo')) {
      setExtraValues(prev => ({ ...prev, cargo: worker.cargo }));
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const worker = findWorker(val);
    if (worker) {
      handleSelectWorker(worker);
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

    // Validar duplicados por RUT o Nombre
    const isDuplicate = state.signers.some(s => {
      if (doc.signerSchema.rutRequired && s.rut && trimmedRut) {
        const clean1 = s.rut.replace(/[^0-9kK]/g, '').toLowerCase();
        const clean2 = trimmedRut.replace(/[^0-9kK]/g, '').toLowerCase();
        if (clean1 === clean2) return true;
      }
      return s.nombre.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      onShowToast(`⚠️ El integrante "${trimmedName}" ya se encuentra agregado en la lista`, true);
      return;
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
                title={signed ? 'Toca para editar firma' : 'Toca para firmar en pantalla'}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenSignModal(i);
                  }
                }}
              >
                <div className="signer-avatar">{signed ? '✓' : '👤'}</div>
                <div className="signer-info">
                  <div className="name">{s.nombre || '(sin nombre)'}</div>
                  {doc.signerSchema.rutRequired && (
                    <div className="rut">{s.rut ? formatearRut(s.rut) : 'RUT pendiente'}</div>
                  )}
                  {roleLine && <div className="role">{roleLine}</div>}
                  <div className={`signer-helper ${signed ? 'signed' : ''}`}>
                    {signed ? (
                      <span>✓ Firma registrada {s.timestamp ? `(${s.timestamp})` : ''} · Toca para modificar</span>
                    ) : (
                      <span>👉 Toca para firmar en pantalla</span>
                    )}
                  </div>
                </div>
                <div className={`status-badge ${signed ? 'badge-done' : 'badge-pending'}`}>
                  {signed ? '✓ Firmado' : '⏳ Pendiente'}
                </div>
                <button
                  className="signer-del"
                  title="Eliminar integrante"
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
        <WorkerCombobox
          value={name}
          onChangeName={handleNameChange}
          onSelectWorker={handleSelectWorker}
          existingSignerNames={state.signers.map(s => s.nombre)}
          placeholder="Escribe para buscar o ingresar nuevo..."
        />
        <div className="hint">
          Selecciona de la nómina (autocompleta RUT y cargo) o escribe para ingresar uno nuevo.
        </div>
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

      {/* FIRMA DE CIERRE DEL SUPERVISOR / INSTRUCTOR */}
      {doc.closing && doc.closing.enabled && (
        <>
          <div
            className="section-title"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              margin: '22px 0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{doc.closing.title}</span>
            <span style={{ fontSize: 11, color: 'var(--slate)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'none', fontWeight: 600 }}>
              🔒 Auto-asignado
            </span>
          </div>
          <div
            className={`signer-card ${state.closingSig && state.closingSig.firma ? 'signed' : ''}`}
            onClick={handleOpenClosing}
            title={presenterName ? 'Toca para firmar' : 'Debes asignar al instructor/supervisor en el Paso 1'}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenClosing();
              }
            }}
          >
            <div className="signer-avatar">{state.closingSig && state.closingSig.firma ? '✓' : '✍️'}</div>
            <div className="signer-info">
              <div className="name">
                {presenterName || <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Sin asignar en Paso 1</span>}
              </div>
              <div className="role" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: '6px' }}>
                  🔒 {state.docType === 'charla_inicial' ? 'Instructor' : 'Supervisor'} (Solo lectura)
                </span>
                {doc.closing.roleField && (state.closingSig?.[doc.closing.roleField.id] || workerInfo?.cargo) && (
                  <span>· {state.closingSig?.[doc.closing.roleField.id] || workerInfo?.cargo}</span>
                )}
              </div>
              <div className={`signer-helper ${state.closingSig && state.closingSig.firma ? 'signed' : ''}`}>
                {state.closingSig && state.closingSig.firma
                  ? `✓ Firma registrada (${state.closingSig.timestamp || 'Guardada'}) · Toca para modificar`
                  : (presenterName ? '👉 Toca para registrar firma en pantalla' : '⚠️ Completa el nombre en Datos Generales')}
              </div>
            </div>
            <div className={`status-badge ${state.closingSig && state.closingSig.firma ? 'badge-done' : 'badge-pending'}`}>
              {state.closingSig && state.closingSig.firma ? '✓ Firmado' : '⏳ Pendiente'}
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
