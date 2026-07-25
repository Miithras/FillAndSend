import { useState, useEffect } from 'react';
import { AppState, DocTypeId, RiskItem, Signer } from './types';
import { INITIAL_STATE, saveDraft, loadDraft, clearDraft } from './services/storageService';
import { sendDocumentEmail } from './services/emailService';
import { downloadOriginalExcel, shareOriginalExcel } from './services/excelService';
import { saveToHistory, getHistory, setupAutoSync, updateHistoryStatus } from './services/historyService';

import { Header } from './components/Header';
import { DocumentSelector } from './components/DocumentSelector';
import { FormScreen } from './components/FormScreen';
import { SignersScreen } from './components/SignersScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { SignatureModal } from './components/SignatureModal';
import { ClosingFormModal } from './components/ClosingFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import { HistoryModal } from './components/HistoryModal';
import { Toast } from './components/Toast';

export function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [hasDraft, setHasDraft] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; isErr?: boolean } | null>(null);

  // Historial 24h
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Modales
  const [activeSignerIndex, setActiveSignerIndex] = useState<number | null>(null);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showClosingCanvasModal, setShowClosingCanvasModal] = useState(false);
  const [closingDraftInfo, setClosingDraftInfo] = useState<{ name: string; roleVal: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ msg: string; onConfirm: () => void } | null>(null);

  const refreshHistoryCount = async () => {
    const records = await getHistory();
    setHistoryCount(records.length);
  };

  // Cargar borrador inicial, contador de historial y sincronización automática offline
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.screen !== 'select') {
      setHasDraft(true);
    }
    refreshHistoryCount();

    setupAutoSync(() => {
      refreshHistoryCount();
    });
  }, []);

  // Auto-guardado
  useEffect(() => {
    if (state.screen !== 'select') {
      saveDraft(state);
    }
  }, [state]);

  const showToast = (msg: string, isErr?: boolean) => {
    setToastMsg({ msg, isErr });
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Handlers Selección
  const handleSelectDoc = (id: DocTypeId) => {
    setState(prev => ({
      ...prev,
      docType: id,
      screen: 'form',
      form: {},
      tri: {},
      multi: {},
      risks: [],
      final: {},
      signers: [],
      closingSig: null
    }));
  };

  const handleContinueDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setState(draft);
      setHasDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setHasDraft(false);
    showToast('Borrador descartado');
  };

  // Handlers Formulario
  const handleChangeField = (field: string, val: string) => {
    setState(prev => ({ ...prev, form: { ...prev.form, [field]: val } }));
  };

  const handleChangeFinalField = (field: string, val: string) => {
    setState(prev => ({ ...prev, final: { ...prev.final, [field]: val } }));
  };

  const handleToggleTri = (key: string, val: 'SI' | 'NO' | 'NA') => {
    setState(prev => ({
      ...prev,
      tri: { ...prev.tri, [key]: prev.tri[key] === val ? null : val }
    }));
  };

  const handleToggleMulti = (key: string) => {
    setState(prev => ({
      ...prev,
      multi: { ...prev.multi, [key]: !prev.multi[key] }
    }));
  };

  const handleAddRisk = () => {
    setState(prev => ({
      ...prev,
      risks: [...prev.risks, { etapa: '', evento: '', medida: '' }]
    }));
  };

  const handleChangeRisk = (index: number, field: keyof RiskItem, val: string) => {
    setState(prev => {
      const nextRisks = [...prev.risks];
      nextRisks[index] = { ...nextRisks[index], [field]: val };
      return { ...prev, risks: nextRisks };
    });
  };

  const handleDeleteRisk = (index: number) => {
    setState(prev => {
      const nextRisks = [...prev.risks];
      nextRisks.splice(index, 1);
      return { ...prev, risks: nextRisks };
    });
  };

  const handleToggleAccordion = (key: string) => {
    setState(prev => ({
      ...prev,
      uiOpen: { ...prev.uiOpen, [key]: !prev.uiOpen[key] }
    }));
  };

  // Handlers Firmantes
  const handleAddSigner = (newSigner: Signer) => {
    setState(prev => ({
      ...prev,
      signers: [...prev.signers, newSigner]
    }));
    showToast('Integrante agregado ✓');
  };

  const handleDeleteSigner = (index: number) => {
    const s = state.signers[index];
    if (s.firma) {
      setConfirmConfig({
        msg: `¿Eliminar a ${s.nombre}? Ya había firmado.`,
        onConfirm: () => {
          setState(prev => {
            const next = [...prev.signers];
            next.splice(index, 1);
            return { ...prev, signers: next };
          });
          setConfirmConfig(null);
        }
      });
    } else {
      setState(prev => {
        const next = [...prev.signers];
        next.splice(index, 1);
        return { ...prev, signers: next };
      });
    }
  };

  const handleClearAllSigners = () => {
    setConfirmConfig({
      msg: `¿Eliminar a los ${state.signers.length} integrantes agregados?`,
      onConfirm: () => {
        setState(prev => ({ ...prev, signers: [] }));
        setConfirmConfig(null);
      }
    });
  };

  const handleSaveSignerSignature = (dataUrl: string) => {
    if (activeSignerIndex === null) return;
    setState(prev => {
      const next = [...prev.signers];
      next[activeSignerIndex] = {
        ...next[activeSignerIndex],
        firma: dataUrl,
        timestamp: new Date().toLocaleString('es-CL')
      };
      return { ...prev, signers: next };
    });
    setActiveSignerIndex(null);
    showToast('Firma guardada ✓');
  };

  const handleSaveClosingSignature = (dataUrl: string) => {
    if (!closingDraftInfo) return;
    setState(prev => ({
      ...prev,
      closingSig: {
        nombre: closingDraftInfo.name,
        cargo: closingDraftInfo.roleVal,
        firma: dataUrl,
        timestamp: new Date().toLocaleString('es-CL')
      }
    }));
    setShowClosingCanvasModal(false);
    setClosingDraftInfo(null);
    showToast('Firma de cierre guardada ✓');
  };

  // Handlers Envío (Optimista no bloqueante + Cola Offline)
  const handleSendDocument = async () => {
    const currentSnapshot = JSON.parse(JSON.stringify(state));

    try {
      // 1. Guardar inmediatamente en historial como pendiente
      const record = await saveToHistory(currentSnapshot, 'pending_send');

      // 2. Salir a inicio y borrar borrador sin hacer esperar al usuario
      clearDraft();
      setState(INITIAL_STATE);
      setHasDraft(false);
      await refreshHistoryCount();
      showToast('Documento finalizado y guardado en historial 📜');

      // 3. Procesar el envío por correo en segundo plano (asíncrono no bloqueante)
      (async () => {
        try {
          await sendDocumentEmail(currentSnapshot);
          await updateHistoryStatus(record.id, 'sent');
          await refreshHistoryCount();
          showToast('Correo enviado con éxito ✉️');
        } catch (err: any) {
          console.warn('Fallo envío inmediato en segundo plano, quedando en cola offline:', err);
          const msg = err?.message || String(err);
          await updateHistoryStatus(record.id, 'pending_send', msg);
          await refreshHistoryCount();
          showToast('Se enviará por correo automáticamente al haber conexión 📡', true);
        }
      })();
    } catch (e) {
      console.error('Error al guardar en historial:', e);
    }
  };

  const handleShareExcel = async () => {
    showToast('Generando Excel...');
    try {
      await shareOriginalExcel(state);
      await saveToHistory(state, 'sent');
      await refreshHistoryCount();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      showToast('Error al compartir: ' + (err.message || err), true);
    }
  };

  const handleDownloadExcel = async () => {
    showToast('Generando Excel...');
    try {
      await downloadOriginalExcel(state);
      await saveToHistory(state, 'sent');
      await refreshHistoryCount();
      showToast('Excel descargado ✓ (Guardado en historial 24h)');
    } catch (err: any) {
      showToast('Error al descargar: ' + (err.message || err), true);
    }
  };

  return (
    <div id="app">
      <Header
        state={state}
        onOpenHistory={() => setShowHistoryModal(true)}
        historyCount={historyCount}
      />

      <main className="app-content">
        {state.screen === 'select' && (
          <DocumentSelector
            hasDraft={hasDraft}
            onSelectDoc={handleSelectDoc}
            onContinueDraft={handleContinueDraft}
            onDiscardDraft={handleDiscardDraft}
          />
        )}

        {state.screen === 'form' && (
          <FormScreen
            state={state}
            onChangeField={handleChangeField}
            onChangeFinalField={handleChangeFinalField}
            onToggleTri={handleToggleTri}
            onToggleMulti={handleToggleMulti}
            onAddRisk={handleAddRisk}
            onChangeRisk={handleChangeRisk}
            onDeleteRisk={handleDeleteRisk}
            onToggleAccordion={handleToggleAccordion}
            onBackToSelect={() => setState(prev => ({ ...prev, screen: 'select' }))}
            onGoToSigners={() => setState(prev => ({ ...prev, screen: 'signers' }))}
          />
        )}

        {state.screen === 'signers' && (
          <SignersScreen
            state={state}
            onAddSigner={handleAddSigner}
            onDeleteSigner={handleDeleteSigner}
            onClearAllSigners={handleClearAllSigners}
            onOpenSignModal={idx => setActiveSignerIndex(idx)}
            onOpenClosingModal={() => setShowClosingModal(true)}
            onBackToForm={() => setState(prev => ({ ...prev, screen: 'form' }))}
            onGoToReview={() => setState(prev => ({ ...prev, screen: 'review' }))}
            onShowToast={showToast}
          />
        )}

        {state.screen === 'review' && (
          <ReviewScreen
            state={state}
            onChangeDestinatario={email => setState(prev => ({ ...prev, destinatario: email }))}
            onChangeConCopia={email => setState(prev => ({ ...prev, conCopia: email }))}
            onBackToSigners={() => setState(prev => ({ ...prev, screen: 'signers' }))}
            onSendDocument={handleSendDocument}
            onShareExcel={handleShareExcel}
            onDownloadExcel={handleDownloadExcel}
          />
        )}
      </main>

      {/* MODAL HISTORIAL 24 HORAS */}
      {showHistoryModal && (
        <HistoryModal
          onClose={() => {
            setShowHistoryModal(false);
            refreshHistoryCount();
          }}
          onLoadState={s => {
            setState(s);
            showToast('Documento cargado en el formulario');
          }}
          onShowToast={showToast}
        />
      )}

      {/* MODAL DE FIRMA DE INTEGRANTE */}
      {activeSignerIndex !== null && (
        <SignatureModal
          title={`Firma de ${state.signers[activeSignerIndex]?.nombre || 'Integrante'}`}
          onSave={handleSaveSignerSignature}
          onClose={() => setActiveSignerIndex(null)}
        />
      )}

      {/* MODAL DATOS DE CIERRE */}
      {showClosingModal && (
        <ClosingFormModal
          state={state}
          onNext={(name, roleVal) => {
            setShowClosingModal(false);
            setClosingDraftInfo({ name, roleVal });
            setShowClosingCanvasModal(true);
          }}
          onClose={() => setShowClosingModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* MODAL CANVAS FIRMA DE CIERRE */}
      {showClosingCanvasModal && (
        <SignatureModal
          title={`Firma de Cierre — ${closingDraftInfo?.name || 'Supervisor'}`}
          onSave={handleSaveClosingSignature}
          onClose={() => setShowClosingCanvasModal(false)}
        />
      )}

      {/* MODAL CONFIRMACIÓN */}
      {confirmConfig && (
        <ConfirmModal
          message={confirmConfig.msg}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}

      {/* TOAST */}
      {toastMsg && <Toast message={toastMsg.msg} isErr={toastMsg.isErr} />}
    </div>
  );
}
