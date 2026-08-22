import React, { useState } from 'react';
import { AppState, RiskItem } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { WORKERS_DB } from '../config/workers';
import { getTodayISODate } from '../services/storageService';
import { RISK_ETAPAS, RISK_EVENTOS, RISK_MEDIDAS } from '../config/riskCatalog';

interface FormScreenProps {
  state: AppState;
  onChangeField: (field: string, val: string) => void;
  onChangeFinalField: (field: string, val: string) => void;
  onToggleTri: (key: string, val: 'SI' | 'NO' | 'NA') => void;
  onToggleMulti: (key: string) => void;
  onAddRisk: () => void;
  onChangeRisk: (index: number, field: keyof RiskItem, val: string) => void;
  onDeleteRisk: (index: number) => void;
  onToggleAccordion: (key: string) => void;
  onBackToSelect: () => void;
  onGoToSigners: () => void;
}

export const FormScreen: React.FC<FormScreenProps> = ({
  state,
  onChangeField,
  onChangeFinalField,
  onToggleTri,
  onToggleMulti,
  onAddRisk,
  onChangeRisk,
  onDeleteRisk,
  onToggleAccordion,
  onBackToSelect,
  onGoToSigners
}) => {
  const doc = DOC_TYPES[state.docType];
  const isArt = state.docType === 'art_normal' || state.docType === 'art_mantencion';

  // Configuración de Pasos (Wizard / Stepper no lineal)
  const STEPS = isArt
    ? [
        { id: 'general', title: 'Datos Generales', icon: '📋' },
        { id: 'tri', title: 'Verificación (I)', icon: '✅' },
        { id: 'equipos', title: 'EPP & Equipos', icon: '🛡️' },
        { id: 'risks', title: 'Análisis Riesgos (VI)', icon: '⚡' },
        { id: 'extra', title: 'Incidentes & Visitas', icon: '📝' }
      ]
    : [
        { id: 'general', title: 'Datos Generales', icon: '📋' },
        { id: 'tema', title: 'Clasificación Tema', icon: '📌' },
        { id: 'notas', title: 'Mutual & Comentarios', icon: '💬' }
      ];

  const [activeStep, setActiveStep] = useState(0);
  const currentStepId = STEPS[activeStep]?.id || 'general';

  return (
    <div className="form-screen">
      <button className="back-link" onClick={onBackToSelect}>
        ‹ Cambiar documento
      </button>

      {/* BARRA DE TABS / MENÚ NO LINEAL (Saltar a cualquier ítem sin bloqueo) */}
      <div className="stepper-bar">
        {STEPS.map((s, idx) => (
          <button
            key={s.id}
            className={`stepper-tab ${activeStep === idx ? 'active' : ''}`}
            onClick={() => setActiveStep(idx)}
            type="button"
          >
            <span className="stepper-num">{idx + 1}</span>
            <span>{s.icon}</span>
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {/* PASO: DATOS GENERALES */}
        {currentStepId === 'general' && (
          <div className={`accordion ${state.uiOpen.fields !== false ? 'open' : ''}`}>
            <div className="accordion-head" onClick={() => onToggleAccordion('fields')}>
              <h3>Datos generales del documento</h3>
              <span className="chev">▾</span>
            </div>
            <div className="accordion-body">
              {doc.fields.map(f => {
                const isNameDropdown = f.id === 'instructor' || f.id === 'supervisor';
                const isDateLocked = f.id === 'fecha';

                return (
                  <div className="field" key={f.id}>
                    <label>
                      {f.label} {f.required ? '*' : ''}
                      {isDateLocked && <span style={{ fontSize: 11, color: 'var(--cyan)', marginLeft: 6 }}>🔒 (Fecha de hoy)</span>}
                    </label>

                    {isNameDropdown ? (
                      <div>
                        <select
                          className="select-worker"
                          value={WORKERS_DB.some(w => w.nombre === state.form[f.id]) ? state.form[f.id] : (state.form[f.id] ? '__OTHER__' : '')}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '__OTHER__') {
                              onChangeField(f.id, '');
                            } else {
                              onChangeField(f.id, val);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-1)',
                            border: '1px solid var(--line)',
                            color: 'var(--text-hi)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            marginBottom: 6
                          }}
                        >
                          <option value="">-- Seleccionar de la lista --</option>
                          {WORKERS_DB.map(w => (
                            <option key={w.rut} value={w.nombre}>
                              {w.nombre} ({w.cargo})
                            </option>
                          ))}
                          <option value="__OTHER__">Otro (Ingresar manualmente)...</option>
                        </select>

                        {(!WORKERS_DB.some(w => w.nombre === state.form[f.id]) || state.form[f.id] === '') && (
                          <input
                            type="text"
                            value={state.form[f.id] || ''}
                            onChange={e => onChangeField(f.id, e.target.value)}
                            placeholder="Escribe el nombre completo..."
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={state.form[f.id] || ''}
                        onChange={e => onChangeField(f.id, e.target.value)}
                        placeholder={f.label}
                      />
                    ) : isDateLocked ? (
                      <input
                        type="date"
                        value={state.form[f.id] || getTodayISODate()}
                        readOnly
                        disabled
                        style={{ opacity: 0.85, cursor: 'not-allowed', background: 'var(--bg-2)' }}
                      />
                    ) : (
                      <input
                        type={f.type}
                        value={state.form[f.id] || ''}
                        onChange={e => onChangeField(f.id, e.target.value)}
                        placeholder={f.label}
                      />
                    )}
                  </div>
                );
              })}

              {state.form.horaInicio && state.form.horaTermino && state.form.horaTermino < state.form.horaInicio && (
                <div className="banner" style={{ background: 'rgba(0, 160, 184, 0.08)', borderColor: 'var(--cyan)', color: 'var(--navy)', fontSize: 12, marginTop: 8 }}>
                  🌙 <b>Turno Nocturno detectado:</b> La hora de término (<b>{state.form.horaTermino}</b>) es menor que la de inicio (<b>{state.form.horaInicio}</b>). Se registrará como finalizado en la madrugada del día siguiente.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO: VERIFICACIÓN PREVIA (TRI-ESTADO SI / NO / NA) */}
        {currentStepId === 'tri' && (
          <div>
            {doc.triGroups.map((group, gIdx) => (
              <div key={gIdx} className={`accordion ${state.uiOpen[`tri${gIdx}`] !== false ? 'open' : ''}`}>
                <div className="accordion-head" onClick={() => onToggleAccordion(`tri${gIdx}`)}>
                  <h3>{group.title}</h3>
                  <span className="chev">▾</span>
                </div>
                <div className="accordion-body">
                  {group.items.map(item => {
                    const key = `${gIdx}:${item}`;
                    const currentVal = state.tri[key];
                    return (
                      <div className="tri-item" key={item}>
                        <span>{item}</span>
                        <div className="tri-btns">
                          <button
                            className={`tri-btn ${currentVal === 'SI' ? 'active-si' : ''}`}
                            onClick={() => onToggleTri(key, 'SI')}
                          >
                            SI
                          </button>
                          <button
                            className={`tri-btn ${currentVal === 'NO' ? 'active-no' : ''}`}
                            onClick={() => onToggleTri(key, 'NO')}
                          >
                            NO
                          </button>
                          <button
                            className={`tri-btn ${currentVal === 'NA' ? 'active-na' : ''}`}
                            onClick={() => onToggleTri(key, 'NA')}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASO: EQUIPOS, EPP & ALTO RIESGO (ART) */}
        {currentStepId === 'equipos' && (
          <div>
            {doc.multiGroups.slice(0, 4).map((group, mIdx) => (
              <div key={mIdx} className={`accordion ${state.uiOpen[`multi${mIdx}`] !== false ? 'open' : ''}`}>
                <div className="accordion-head" onClick={() => onToggleAccordion(`multi${mIdx}`)}>
                  <h3>{group.title}</h3>
                  <span className="chev">▾</span>
                </div>
                <div className="accordion-body">
                  <div className="chk-grid">
                    {group.items.map(item => {
                      const key = `${mIdx}:${item}`;
                      const checked = !!state.multi[key];
                      return (
                        <div
                          key={item}
                          className={`chk ${checked ? 'checked' : ''}`}
                          onClick={() => onToggleMulti(key)}
                        >
                          <input type="checkbox" checked={checked} readOnly />
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>

                  {state.multi[`${mIdx}:Otro`] && (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>Especificar {group.title.split('.')[1] || group.title} (Otro)</label>
                      <input
                        type="text"
                        value={
                          mIdx === 0 ? (state.final.eppOtro || '') :
                          mIdx === 1 ? (state.final.maquinasOtro || '') :
                          mIdx === 2 ? (state.final.aspectosOtro || '') :
                          mIdx === 3 ? (state.final.altoRiesgoOtro || '') :
                          (state.final[`otro_${mIdx}`] || '')
                        }
                        onChange={e => {
                          const fieldKey =
                            mIdx === 0 ? 'eppOtro' :
                            mIdx === 1 ? 'maquinasOtro' :
                            mIdx === 2 ? 'aspectosOtro' :
                            mIdx === 3 ? 'altoRiesgoOtro' :
                            `otro_${mIdx}`;
                          onChangeFinalField(fieldKey, e.target.value);
                        }}
                        placeholder="Escribe la especificación para 'Otro'..."
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASO: CLASIFICACIÓN TEMA (CHARLA) */}
        {currentStepId === 'tema' && (
          <div>
            {doc.multiGroups.slice(0, 1).map((group, mIdx) => (
              <div key={mIdx} className={`accordion ${state.uiOpen[`multi${mIdx}`] !== false ? 'open' : ''}`}>
                <div className="accordion-head" onClick={() => onToggleAccordion(`multi${mIdx}`)}>
                  <h3>{group.title}</h3>
                  <span className="chev">▾</span>
                </div>
                <div className="accordion-body">
                  <div className="chk-grid">
                    {group.items.map(item => {
                      const key = `${mIdx}:${item}`;
                      const checked = !!state.multi[key];
                      return (
                        <div
                          key={item}
                          className={`chk ${checked ? 'checked' : ''}`}
                          onClick={() => onToggleMulti(key)}
                        >
                          <input type="checkbox" checked={checked} readOnly />
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>

                  {state.multi['0:Otro'] && (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>Especificar Tema (Otro)</label>
                      <input
                        type="text"
                        value={state.final.clasificacionOtro || ''}
                        onChange={e => onChangeFinalField('clasificacionOtro', e.target.value)}
                        placeholder="Escribe la especificación del tema..."
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASO: ANÁLISIS DE RIESGOS (ART) */}
        {currentStepId === 'risks' && doc.risks && doc.risks.enabled && (
          <div className={`accordion ${state.uiOpen.risks !== false ? 'open' : ''}`}>
            <div className="accordion-head" onClick={() => onToggleAccordion('risks')}>
              <h3>{doc.risks.title}</h3>
              <span className="chev">▾</span>
            </div>
            <div className="accordion-body">
              {state.risks.map((r, i) => (
                <div className="risk-row" key={i}>
                  <button className="del" onClick={() => onDeleteRisk(i)} title="Eliminar fila">✕</button>

                  <div className="field">
                    <label>{doc.risks.qEtapa}</label>
                    <input
                      type="text"
                      list={`etapa-dl-${i}`}
                      value={r.etapa || ''}
                      onChange={e => onChangeRisk(i, 'etapa', e.target.value)}
                      placeholder="Escribe o selecciona la etapa..."
                    />
                    <datalist id={`etapa-dl-${i}`}>
                      {RISK_ETAPAS.map((opt, idx) => (
                        <option key={idx} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div className="field">
                    <label>{doc.risks.qEvento}</label>
                    <input
                      type="text"
                      list={`evento-dl-${i}`}
                      value={r.evento || ''}
                      onChange={e => onChangeRisk(i, 'evento', e.target.value)}
                      placeholder="Escribe o selecciona el riesgo/evento..."
                    />
                    <datalist id={`evento-dl-${i}`}>
                      {RISK_EVENTOS.map((opt, idx) => (
                        <option key={idx} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div className="field">
                    <label>{doc.risks.qMedida}</label>
                    <input
                      type="text"
                      list={`medida-dl-${i}`}
                      value={r.medida || ''}
                      onChange={e => onChangeRisk(i, 'medida', e.target.value)}
                      placeholder="Escribe o selecciona la medida de control..."
                    />
                    <datalist id={`medida-dl-${i}`}>
                      {RISK_MEDIDAS.map((opt, idx) => (
                        <option key={idx} value={opt} />
                      ))}
                    </datalist>
                  </div>
                </div>
              ))}
              <button className="add-row-btn" onClick={onAddRisk}>+ Agregar etapa de riesgo</button>
            </div>
          </div>
        )}

        {/* PASO: EXTRA (INCIDENTES, VISITAS Y EVENTUALIDADES PARA ART) */}
        {currentStepId === 'extra' && (
          <div>
            {/* IX. VISITAS EN TERRENO */}
            {doc.multiGroups[4] && (
              <div className={`accordion ${state.uiOpen.multi4 !== false ? 'open' : ''}`}>
                <div className="accordion-head" onClick={() => onToggleAccordion('multi4')}>
                  <h3>{doc.multiGroups[4].title}</h3>
                  <span className="chev">▾</span>
                </div>
                <div className="accordion-body">
                  <div className="chk-grid">
                    {doc.multiGroups[4].items.map(item => {
                      const key = `4:${item}`;
                      const checked = !!state.multi[key];
                      return (
                        <div key={item} className={`chk ${checked ? 'checked' : ''}`} onClick={() => onToggleMulti(key)}>
                          <input type="checkbox" checked={checked} readOnly />
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                  {state.multi['4:Otro'] && (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>Especificar Visita en Terreno (Otro)</label>
                      <input
                        type="text"
                        value={state.final.visitaOtro || ''}
                        onChange={e => onChangeFinalField('visitaOtro', e.target.value)}
                        placeholder="Ej: Pedro Morales (Inspector Técnico)"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIII. INCIDENTES */}
            {doc.incidentes && doc.incidentes.enabled && (
              <div className={`accordion ${state.uiOpen.inc !== false ? 'open' : ''}`}>
                <div className="accordion-head" onClick={() => onToggleAccordion('inc')}>
                  <h3>{doc.incidentes.title}</h3>
                  <span className="chev">▾</span>
                </div>
                <div className="accordion-body">
                  <div className="chk-grid">
                    {(doc.incidentes.items || []).map(item => {
                      const key = `inc:${item}`;
                      const checked = !!state.multi[key];
                      return (
                        <div key={item} className={`chk ${checked ? 'checked' : ''}`} onClick={() => onToggleMulti(key)}>
                          <input type="checkbox" checked={checked} readOnly />
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label>Descripción del Incidente / Detalle</label>
                    <textarea
                      value={state.final.incidenteDesc || ''}
                      onChange={e => onChangeFinalField('incidenteDesc', e.target.value)}
                      placeholder="Detalla lo ocurrido si hubo incidente"
                    />
                  </div>
                  <div className="field">
                    <label>Acción Correctiva Aplicada</label>
                    <textarea
                      value={state.final.accionCorrectiva || ''}
                      onChange={e => onChangeFinalField('accionCorrectiva', e.target.value)}
                      placeholder="Detalla las acciones correctivas aplicadas"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* X. EVENTUALIDADES */}
            <div className={`accordion ${state.uiOpen.finalf !== false ? 'open' : ''}`}>
              <div className="accordion-head" onClick={() => onToggleAccordion('finalf')}>
                <h3>X. Eventualidades y Notas</h3>
                <span className="chev">▾</span>
              </div>
              <div className="accordion-body">
                <div className="field">
                  <label>Eventualidades observadas en terreno</label>
                  <textarea
                    value={state.final.eventualidades || ''}
                    onChange={e => onChangeFinalField('eventualidades', e.target.value)}
                    placeholder="Escribe aquí las eventualidades si las hubiere..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO: NOTAS / MUTUAL (CHARLA INICIAL) */}
        {currentStepId === 'notas' && (
          <div className={`accordion ${state.uiOpen.finalf !== false ? 'open' : ''}`}>
            <div className="accordion-head" onClick={() => onToggleAccordion('finalf')}>
              <h3>Mutual y Comentarios finales</h3>
              <span className="chev">▾</span>
            </div>
            <div className="accordion-body">
              {doc.finalFields.map(f => (
                <div className="field" key={f.id}>
                  <label>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={state.final[f.id] || ''}
                      onChange={e => onChangeFinalField(f.id, e.target.value)}
                      placeholder={f.label}
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={state.final[f.id] || ''}
                      onChange={e => onChangeFinalField(f.id, e.target.value)}
                      placeholder={f.label}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NAVEGACIÓN SECUENCIAL DEL STEPPER (Sig / Ant) */}
      <div className="stepper-nav">
        <button
          className="btn-secondary"
          disabled={activeStep === 0}
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          type="button"
        >
          ← Anterior
        </button>

        {activeStep < STEPS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={() => setActiveStep(activeStep + 1)}
            type="button"
          >
            Siguiente paso →
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={onGoToSigners}
            type="button"
          >
            Continuar a firmas →
          </button>
        )}
      </div>
    </div>
  );
};
