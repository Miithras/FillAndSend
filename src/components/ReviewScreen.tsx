import React, { useState } from 'react';
import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { formatearRut } from '../utils/rut';
import { ExpandableActionBar } from './ExpandableActionBar';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const doc = DOC_TYPES[state.docType];
  const presenterName = (state.form.instructor || state.form.supervisor || '').trim();
  const allSigned = state.signers.length > 0 && state.signers.every(s => s.firma);
  const closingOk = !doc.closing || !doc.closing.enabled || (Boolean(presenterName) && Boolean(state.closingSig && state.closingSig.firma));
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
          <h4>Análisis de riesgos ({state.risks.length} {state.risks.length === 1 ? 'etapa' : 'etapas'})</h4>
          {state.risks.length === 0 ? (
            <div className="review-row"><span className="k">Riesgos</span><span className="v">Sin registrar</span></div>
          ) : (
            state.risks.map((r, i) => {
              const evs = Array.isArray(r.eventos) && r.eventos.length > 0
                ? r.eventos
                : (r.evento ? [r.evento] : []);
              const meds = Array.isArray(r.medidas) && r.medidas.length > 0
                ? r.medidas
                : (r.medida ? [r.medida] : []);

              return (
                <div className="review-risk-card" key={i}>
                  <div className="review-risk-title">
                    <span>📌</span>
                    <span>{r.etapa || `Etapa ${i + 1}`}</span>
                  </div>

                  <div className="review-risk-section">
                    <div className="review-risk-section-label hazard">
                      ⚠️ Peligros / Eventos ({evs.length})
                    </div>
                    {evs.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic', paddingLeft: 12 }}>Sin peligros especificados</div>
                    ) : (
                      <ul className="review-risk-list">
                        {evs.map((ev, eIdx) => (
                          <li key={eIdx}>{ev}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="review-risk-section" style={{ marginTop: 8 }}>
                    <div className="review-risk-section-label control">
                      🛡️ Medidas de Control ({meds.length})
                    </div>
                    {meds.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic', paddingLeft: 12 }}>Sin medidas especificadas</div>
                    ) : (
                      <ul className="review-risk-list">
                        {meds.map((med, mIdx) => (
                          <li key={mIdx}>{med}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* RESUMEN INCIDENTES (SI HUBO) */}
      {(() => {
        const incItems = (doc.incidentes?.items || []).filter(item => state.multi[`inc:${item}`]);
        const hasIncidentInfo = incItems.length > 0 || !!state.final.incidenteDesc || !!state.final.accionCorrectiva;
        if (!hasIncidentInfo) return null;

        return (
          <div className="review-block" style={{ borderLeft: '4px solid var(--danger)', marginTop: 14 }}>
            <h4 style={{ color: 'var(--danger)' }}>⚠️ VIII. Incidentes durante las actividades</h4>
            {incItems.length > 0 && (
              <div className="review-row">
                <span className="k">Tipo(s)</span>
                <span className="v" style={{ fontWeight: 600 }}>{incItems.join(', ')}</span>
              </div>
            )}
            {state.final.incidenteDesc && (
              <div className="review-row">
                <span className="k">Descripción</span>
                <span className="v">{state.final.incidenteDesc}</span>
              </div>
            )}
            {state.final.accionCorrectiva && (
              <div className="review-row">
                <span className="k">Acción correctiva</span>
                <span className="v">{state.final.accionCorrectiva}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* RESUMEN FIRMAS INTEGRANTES */}
      <div className="section-title" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', marginBottom: 10 }}>
        Firmas ({state.signers.filter(s => s.firma).length}/{state.signers.length})
      </div>

      {state.signers.map(s => (
        <div className="review-block" key={s.id}>
          <h4>
            {s.nombre}
            {s.cargo ? ` — ${s.cargo}` : ''}
          </h4>
          {doc.signerSchema.rutRequired && (
            <div className="review-row">
              <span className="k">RUT</span>
              <span className="v mono">{formatearRut(s.rut)}</span>
            </div>
          )}
          {s.tareas && (
            <div className="review-row">
              <span className="k">Tareas</span>
              <span className="v">{s.tareas}</span>
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
            <span className="v">{presenterName || state.closingSig.nombre} (Auto-asignado 🔒)</span>
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
        <div className="banner" style={{ borderColor: 'var(--danger)', color: '#ffb3b3', marginTop: 12, marginBottom: 16 }}>
          Faltan firmas para poder finalizar y enviar el documento.
        </div>
      )}

      {/* BARRA INFERIOR DESLIZABLE (EXPANDABLE BOTTOM SHEET) */}
      <ExpandableActionBar
        onSendDocument={() => setShowConfirmModal(true)}
        onShareExcel={onShareExcel}
        onDownloadExcel={onDownloadExcel}
        ready={!!ready}
        sending={state.sendStatus === 'sending'}
      />

      {/* MODAL DE CONFIRMACIÓN DE ENVÍO */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge">🚀</div>
              <div>
                <h3 className="modal-title">¿Finalizar y enviar por correo?</h3>
                <p className="modal-subtitle">Verifica los datos del despacho antes de confirmar</p>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-summary-box">
                <div className="modal-summary-row">
                  <span className="modal-summary-label">Documento:</span>
                  <span className="modal-summary-val">{doc.label} ({doc.meta.codigo})</span>
                </div>
                <div className="modal-summary-row">
                  <span className="modal-summary-label">Destinatario:</span>
                  <span className="modal-summary-val">{state.destinatario || '(No especificado)'}</span>
                </div>
                {state.conCopia && (
                  <div className="modal-summary-row">
                    <span className="modal-summary-label">Con copia (CC):</span>
                    <span className="modal-summary-val">{state.conCopia}</span>
                  </div>
                )}
                <div className="modal-summary-row">
                  <span className="modal-summary-label">Firmantes:</span>
                  <span className="modal-summary-val">
                    {state.signers.filter(s => s.firma).length} trabajadores + 1 supervisor
                  </span>
                </div>
              </div>

              <div className="modal-notice">
                <span>⚠️</span>
                <span>Al confirmar, se generará la planilla Excel oficial y se despachará automáticamente por correo a la jefatura.</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Revisar datos
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => {
                  setShowConfirmModal(false);
                  onSendDocument();
                }}
              >
                ✓ Sí, enviar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
