import { useState, useEffect } from 'react';
import { AppState, DocTypeId, RiskItem, Signer } from './types';
import { INITIAL_STATE, saveDraft, loadDraft, clearDraft } from './services/storageService';
import { sendDocumentEmail } from './services/emailService';
import { downloadOriginalExcel, shareOriginalExcel } from './services/excelService';

import { Header } from './components/Header';
import { DocumentSelector } from './components/DocumentSelector';
import { FormScreen } from './components/FormScreen';
import { SignersScreen } from './components/SignersScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { SignatureModal } from './components/SignatureModal';
import { ClosingFormModal } from './components/ClosingFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';

export function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [hasDraft, setHasDraft] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; isErr?: boolean } | null>(null);

  // Modales
  const [activeSignerIndex, setActiveSignerIndex] = useState<number | null>(null);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showClosingCanvasModal, setShowClosingCanvasModal] = useState(false);
  const [closingDraftInfo, setClosingDraftInfo] = useState<{ name: string; roleVal: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ msg: string; onConfirm: () => void } | null>(null);

  // Cargar borrador inicial
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.screen !== 'select') {
      setHasDraft(true);
    }
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

  // Handlers Envío
  const handleSendDocument = async () => {
    setState(prev => ({ ...prev, sendStatus: 'sending', sendError: null }));
    try {
      await sendDocumentEmail(state);
      setState(prev => ({ ...prev, sendStatus: 'sent' }));
      clearDraft();
      showToast('Documento enviado ✓ (con el Excel adjunto)');
    } catch (err: any) {
      console.error('Error al enviar documento:', err);
      const msg = err?.message || String(err);
      setState(prev => ({ ...prev, sendStatus: 'error', sendError: msg }));
      showToast('No se pudo enviar: ' + msg, true);
    }
  };

  const handleShareExcel = async () => {
    showToast('Generando Excel...');
    try {
      await shareOriginalExcel(state);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      showToast('Error al compartir: ' + (err.message || err), true);
    }
  };

  const handleDownloadExcel = async () => {
    showToast('Generando Excel...');
    try {
      await downloadOriginalExcel(state);
      showToast('Excel descargado ✓');
    } catch (err: any) {
      showToast('Error al descargar: ' + (err.message || err), true);
    }
  };

  return (
    <div id="app">
      <Header state={state} />

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
            onBackToSigners={() => setState(prev => ({ ...prev, screen: 'signers' }))}
            onSendDocument={handleSendDocument}
            onShareExcel={handleShareExcel}
            onDownloadExcel={handleDownloadExcel}
          />
        )}
      </main>

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
