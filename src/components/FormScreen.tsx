import React from 'react';
import { AppState, RiskItem } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { WORKERS_DB } from '../config/workers';
import { getTodayISODate } from '../services/storageService';

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

  return (
    <div className="form-screen">
      <button className="back-link" onClick={onBackToSelect}>
        ‹ Cambiar documento
      </button>

      {/* 1. CAMPOS GENERALES */}
      <div className={`accordion ${state.uiOpen.fields !== false ? 'open' : ''}`}>
        <div className="accordion-head" onClick={() => onToggleAccordion('fields')}>
          <h3>Datos generales</h3>
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
                  {isDateLocked && <span style={{ fontSize: 11, color: 'var(--teal)', marginLeft: 6 }}>🔒 (Fecha de hoy)</span>}
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

                    {/* Si seleccionó Otro o no está en la lista pero escribió algo */}
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

          {/* ALERTA VALIDACIÓN HORA DE TÉRMINO MENOR QUE INICIO */}
          {state.form.horaInicio && state.form.horaTermino && state.form.horaTermino < state.form.horaInicio && (
            <div className="banner" style={{ background: 'rgba(245,196,0,0.15)', borderColor: 'var(--yellow)', color: 'var(--yellow)', fontSize: 12, marginTop: 8 }}>
              🌙 <b>Turno Nocturno detectado:</b> La hora de término (<b>{state.form.horaTermino}</b>) es menor que la de inicio (<b>{state.form.horaInicio}</b>). Se registrará como finalizado en la madrugada del día siguiente.
            </div>
          )}
        </div>
      </div>

      {/* 2. GRUPOS TRI-ESTADO (SI / NO / NA) */}
      {doc.triGroups.map((group, gIdx) => (
        <div key={gIdx} className={`accordion ${state.uiOpen[`tri${gIdx}`] ? 'open' : ''}`}>
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

      {/* 3. GRUPOS SELECCIÓN MÚLTIPLE */}
      {doc.multiGroups.map((group, mIdx) => (
        <div key={mIdx} className={`accordion ${state.uiOpen[`multi${mIdx}`] ? 'open' : ''}`}>
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
          </div>
        </div>
      ))}

      {/* 4. ANÁLISIS DE RIESGOS EN EL TRABAJO */}
      {doc.risks && doc.risks.enabled && (
        <div className={`accordion ${state.uiOpen.risks ? 'open' : ''}`}>
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
                    value={r.etapa}
                    onChange={e => onChangeRisk(i, 'etapa', e.target.value)}
                    placeholder="Ej: Instalación de escalera"
                  />
                </div>
                <div className="field">
                  <label>{doc.risks.qEvento}</label>
                  <input
                    type="text"
                    value={r.evento}
                    onChange={e => onChangeRisk(i, 'evento', e.target.value)}
                    placeholder="Ej: Caída a distinto nivel"
                  />
                </div>
                <div className="field">
                  <label>{doc.risks.qMedida}</label>
                  <input
                    type="text"
                    value={r.medida}
                    onChange={e => onChangeRisk(i, 'medida', e.target.value)}
                    placeholder="Ej: Uso de arnés de 3 puntas"
                  />
                </div>
              </div>
            ))}
            <button className="add-row-btn" onClick={onAddRisk}>+ Agregar etapa de riesgo</button>
          </div>
        </div>
      )}

      {/* 5. INCIDENTES */}
      {doc.incidentes && doc.incidentes.enabled && (
        <div className={`accordion ${state.uiOpen.inc ? 'open' : ''}`}>
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

      {/* 6. NOTAS FINALES */}
      {doc.finalFields && doc.finalFields.length > 0 && (
        <div className={`accordion ${state.uiOpen.finalf ? 'open' : ''}`}>
          <div className="accordion-head" onClick={() => onToggleAccordion('finalf')}>
            <h3>Notas finales</h3>
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

      <footer className="actionbar">
        <button className="btn-primary" onClick={onGoToSigners}>
          Continuar a firmas
        </button>
      </footer>
    </div>
  );
};
