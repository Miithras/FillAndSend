import React from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { formatearRut } from '../utils/rut';

interface ReviewScreenProps {
  state: AppState;
  onChangeDestinatario: (email: string) => void;
  onChangeConCopia: (email: string) => void;
  onBackToSigners: () => void;
  onSendDocument: () => void;
  onShareExcel: () => void;
  onDownloadExcel: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  state,
  onChangeDestinatario,
  onChangeConCopia,
  onBackToSigners,
  onSendDocument,
  onShareExcel,
  onDownloadExcel
}) => {
  const doc = DOC_TYPES[state.docType];
  const allSigned = state.signers.length > 0 && state.signers.every(s => s.firma);
  const closingOk = !doc.closing || !doc.closing.enabled || (state.closingSig && state.closingSig.firma);
  const ready = allSigned && closingOk;

  return (
    <div className="review-screen">
      <button className="back-link" onClick={onBackToSigners}>
        ‹ Volver a firmantes
      </button>

      {/* BANNER ESTADO ENVÍO */}
      {state.sendStatus === 'sent' && (
        <div className="banner ok">
          <b>¡Documento enviado correctamente!</b>
          <br />
          Se ha enviado el correo a <span className="mono">{state.destinatario}</span>
          {state.conCopia ? <span> (con copia a <span className="mono">{state.conCopia}</span>)</span> : ''} con el archivo Excel adjunto.
        </div>
      )}

      {state.sendStatus === 'sending' && (
        <div className="banner">
          Enviando correo vía Bluehost SMTP...
        </div>
      )}

      {state.sendStatus === 'error' && (
        <div className="banner warn">
          <b>No se pudo enviar automáticamente el correo.</b>
          <br />
          <span className="mono" style={{ fontSize: 11 }}>{state.sendError || ''}</span>
          <br />
          Puedes usar "Compartir Excel" o descargarlo para enviarlo manualmente.
        </div>
      )}

      {/* RESUMEN DATOS GENERALES */}
      <div className="review-block">
        <h4>{doc.label} — {doc.meta.codigo}</h4>
        {doc.fields.map(fd => (
          <div className="review-row" key={fd.id}>
            <span className="k">{fd.label}</span>
            <span className="v">{state.form[fd.id] || '—'}</span>
          </div>
        ))}
      </div>

      {/* RESUMEN RIESGOS */}
      {doc.risks && doc.risks.enabled && (
        <div className="review-block">
          <h4>Análisis de riesgos ({state.risks.length} etapas)</h4>
          {state.risks.length === 0 ? (
            <div className="review-row"><span className="k">Riesgos</span><span className="v">Sin registrar</span></div>
          ) : (
            state.risks.map((r, i) => (
              <div className="review-row" key={i}>
                <span className="k">{r.etapa || `Etapa ${i + 1}`}</span>
                <span className="v">{r.evento || '—'} → {r.medida || '—'}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* RESUMEN FIRMAS INTEGRANTES */}
      <div className="section-title" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', marginBottom: 10 }}>
        Firmas ({state.signers.filter(s => s.firma).length}/{state.signers.length})
      </div>

      {state.signers.map(s => (
        <div className="review-block" key={s.id}>
          <h4>
            {s.nombre}
            {doc.signerSchema.extra.map(ef => s[ef.id] ? ` — ${s[ef.id]}` : '').join('')}
          </h4>
          {doc.signerSchema.rutRequired && (
            <div className="review-row">
              <span className="k">RUT</span>
              <span className="v mono">{formatearRut(s.rut)}</span>
            </div>
          )}
          <div className="review-row">
            <span className="k">Firmado</span>
            <span className="v">{s.timestamp || '—'}</span>
          </div>
          {s.firma && <img className="sig-thumb" src={s.firma} alt={`Firma de ${s.nombre}`} />}
        </div>
      ))}

      {/* FIRMA DE CIERRE */}
      {state.closingSig && (
        <div className="review-block">
          <h4>{doc.closing.title}</h4>
          <div className="review-row">
            <span className="k">Nombre</span>
            <span className="v">{state.closingSig.nombre}</span>
          </div>
          {doc.closing.roleField && (
            <div className="review-row">
              <span className="k">{doc.closing.roleField.label}</span>
              <span className="v">{state.closingSig[doc.closing.roleField.id] || '—'}</span>
            </div>
          )}
          {state.closingSig.firma && (
            <img className="sig-thumb" src={state.closingSig.firma} alt="Firma de cierre" />
          )}
        </div>
      )}

      {/* CAMPOS DE CORREO DESTINO Y CON COPIA */}
      <div className="field" style={{ marginTop: 16 }}>
        <label>Correo de jefatura (destinatario principal)</label>
        <input
          type="email"
          value={state.destinatario}
          onChange={e => onChangeDestinatario(e.target.value)}
          placeholder="rgarcia@raycaingenieria.com"
        />
      </div>

      <div className="field">
        <label>Correos en copia (CC — opcional)</label>
        <input
          type="text"
          value={state.conCopia}
          onChange={e => onChangeConCopia(e.target.value)}
          placeholder="ej: prevencion@raycaingenieria.com, jefe@cliente.cl"
        />
        <div className="hint">Puedes agregar varios correos separados por coma.</div>
      </div>

      {!ready && (
        <div className="banner" style={{ borderColor: 'var(--danger)', color: '#ffb3b3' }}>
          Faltan firmas para poder finalizar y enviar el documento.
        </div>
      )}

      <footer className="actionbar">
        <button
          className="btn-primary"
          onClick={onSendDocument}
          disabled={!ready || state.sendStatus === 'sending'}
        >
          {state.sendStatus === 'sending' ? 'Enviando correo...' : 'Finalizar y enviar por Correo'}
        </button>
        <button className="btn-secondary" onClick={onShareExcel} disabled={!ready}>
          Compartir Excel (WhatsApp, Gmail...)
        </button>
        <button className="btn-secondary" onClick={onDownloadExcel} disabled={!ready}>
          Descargar Excel original rellenado
        </button>
      </footer>
    </div>
  );
};
