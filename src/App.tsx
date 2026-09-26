import { useState, useEffect } from 'react';
import { AppState, DocTypeId, RiskItem, Signer } from './types';
import { INITIAL_STATE, saveDraft, loadDraft, clearDraft } from './services/storageService';
import { sendDocumentEmail } from './services/emailService';
import { downloadOriginalExcel, shareOriginalExcel, ensureTriDefaults } from './services/excelService';
import { saveToHistory, getHistory, setupAutoSync, updateHistoryStatus } from './services/historyService';
import { DOC_TYPES } from './config/docTypes';
import { findWorker } from './config/workers';
import { getCurrentUser, checkSession, logout, CurrentUserSession } from './services/authService';

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
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';

// Sub-rutas asociadas a cada paso del flujo
function getScreenFromHash(hash: string): AppState['screen'] {
  const h = (hash || '').replace(/^#/, '').toLowerCase();
  if (h === 'step-1' || h === 'step1' || h === 'form') return 'form';
  if (h === 'step-2' || h === 'step2' || h === 'signers') return 'signers';
  if (h === 'step-3' || h === 'step3' || h === 'review') return 'review';
  return 'select';
}

function getHashForScreen(screen: AppState['screen']): string {
  switch (screen) {
    case 'form': return '#step-1';
    case 'signers': return '#step-2';
    case 'review': return '#step-3';
    default: return '';
  }
}

function getStepNumber(screen: AppState['screen']): number {
  switch (screen) {
    case 'form': return 1;
    case 'signers': return 2;
    case 'review': return 3;
    default: return 0;
  }
}

export function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(() => getCurrentUser());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

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

  // Integración con History API para soportar botones y gestos nativos de retroceso en móviles
  useEffect(() => {
    // 1. Inicializar el estado de historia si no existe
    const currentHashScreen = getScreenFromHash(window.location.hash);
    const initialScreen = state.screen !== 'select' ? state.screen : currentHashScreen;
    const initialStep = getStepNumber(initialScreen);
    const initialUrl = getHashForScreen(initialScreen) || window.location.pathname;

    if (!window.history.state || window.history.state.screen !== initialScreen) {
      window.history.replaceState({ screen: initialScreen, step: initialStep }, '', initialUrl);
    }

    // 2. Escuchar popstate (botón atrás nativo Android / gestos de retroceso / browser back)
    const handlePopState = (event: PopStateEvent) => {
      const targetScreen: AppState['screen'] =
        event.state?.screen || getScreenFromHash(window.location.hash) || 'select';

      // Cerrar modales activos al retroceder para que no queden superpuestos
      setActiveSignerIndex(null);
      setShowClosingModal(false);
      setShowClosingCanvasModal(false);
      setShowHistoryModal(false);
      setShowChangePasswordModal(false);
      setConfirmConfig(null);

      setState(prev => {
        if (prev.screen !== targetScreen) {
          return { ...prev, screen: targetScreen };
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToScreen = (nextScreen: AppState['screen'], mode: 'push' | 'replace' | 'back' = 'push') => {
    const nextStep = getStepNumber(nextScreen);
    const hash = getHashForScreen(nextScreen);
    const url = hash ? `${window.location.pathname}${hash}` : window.location.pathname;

    if (mode === 'back') {
      // Si el historial del navegador tiene una entrada con paso mayor, usamos window.history.back()
      // lo cual dispara popstate y mantiene el stack sincronizado
      if (window.history.state && typeof window.history.state.step === 'number' && window.history.state.step > nextStep) {
        window.history.back();
        return;
      }
      // Fallback si no hay historial previo registrado (ej. refresco de página)
      window.history.replaceState({ screen: nextScreen, step: nextStep }, '', url);
      setState(prev => ({ ...prev, screen: nextScreen }));
      return;
    }

    if (mode === 'replace') {
      window.history.replaceState({ screen: nextScreen, step: nextStep }, '', url);
      setState(prev => ({ ...prev, screen: nextScreen }));
      return;
    }

    // mode === 'push'
    window.history.pushState({ screen: nextScreen, step: nextStep }, '', url);
    setState(prev => ({ ...prev, screen: nextScreen }));
  };

  // Cargar borrador inicial, contador de historial, verificación de sesión segura y sincronización automática offline
  useEffect(() => {
    checkSession().then(user => {
      if (user) {
        setCurrentUser(user);
      } else if (!user && navigator.onLine) {
        setCurrentUser(null);
      }
    });

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
    window.history.pushState({ screen: 'form', step: 1 }, '', '#step-1');
    setState(prev => ({
      ...prev,
      docType: id,
      screen: 'form',
      form: {},
      tri: {},
      multi: {},
      risks: (id === 'art_normal' || id === 'art_mantencion') ? [{ etapa: '', eventos: [], medidas: [], evento: '', medida: '' }] : [],
      final: {},
      signers: [],
      closingSig: null
    }));
  };

  const handleContinueDraft = () => {
    const draft = loadDraft();
    if (draft) {
      const targetScreen = draft.screen || 'form';
      const step = getStepNumber(targetScreen);
      window.history.pushState({ screen: targetScreen, step }, '', getHashForScreen(targetScreen));
      setState(draft);
      setHasDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setHasDraft(false);
    window.history.replaceState({ screen: 'select', step: 0 }, '', window.location.pathname);
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

  const handleBulkToggleTri = (keys: string[], val: 'SI' | 'NO' | 'NA') => {
    setState(prev => {
      const nextTri = { ...prev.tri };
      const allAlreadyVal = keys.every(k => nextTri[k] === val);
      keys.forEach(k => {
        nextTri[k] = allAlreadyVal ? null : val;
      });
      return { ...prev, tri: nextTri };
    });
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
      risks: [...prev.risks, { etapa: '', eventos: [], medidas: [], evento: '', medida: '' }]
    }));
  };

  const handleChangeRisk = (index: number, field: keyof RiskItem, val: any) => {
    setState(prev => {
      const nextRisks = [...prev.risks];
      const current = { ...nextRisks[index] };
      (current as any)[field] = val;

      if (field === 'eventos' && Array.isArray(val)) {
        current.evento = val.join('\n');
      } else if (field === 'medidas' && Array.isArray(val)) {
        current.medida = val.join('\n');
      } else if (field === 'evento' && typeof val === 'string') {
        current.eventos = val ? [val] : [];
      } else if (field === 'medida' && typeof val === 'string') {
        current.medidas = val ? [val] : [];
      }

      nextRisks[index] = current;
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

  const handleUpdateSigner = (index: number, updatedFields: Partial<Signer>) => {
    setState(prev => {
      const next = [...prev.signers];
      next[index] = { ...next[index], ...updatedFields };
      return { ...prev, signers: next };
    });
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

  const handleOpenClosingModal = () => {
    const doc = DOC_TYPES[state.docType];
    const presenterName = (state.form.instructor || state.form.supervisor || '').trim();
    if (!presenterName) {
      showToast('⚠️ Debes ingresar primero al instructor/supervisor en el Paso 1 (Datos Generales)', true);
      return;
    }

    const worker = findWorker(presenterName);
    const initialRole = state.closingSig?.cargo || (worker?.cargo || (state.docType === 'charla_inicial' ? '' : 'Supervisor'));

    if (!doc.closing.roleField) {
      setClosingDraftInfo({ name: presenterName, roleVal: '' });
      setShowClosingCanvasModal(true);
    } else {
      setClosingDraftInfo({ name: presenterName, roleVal: initialRole });
      setShowClosingModal(true);
    }
  };

  const handleSaveClosingSignature = (dataUrl: string) => {
    const presenterName = (state.form.instructor || state.form.supervisor || '').trim();
    const finalName = presenterName || (closingDraftInfo?.name || 'Supervisor');
    setState(prev => ({
      ...prev,
      closingSig: {
        nombre: finalName,
        cargo: closingDraftInfo?.roleVal || '',
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
    const currentSnapshot = ensureTriDefaults(JSON.parse(JSON.stringify(state)));

    try {
      // 1. Guardar inmediatamente en historial como pendiente
      const record = await saveToHistory(currentSnapshot, 'pending_send');

      // 2. Salir a inicio y borrar borrador sin hacer esperar al usuario
      clearDraft();
      setState(INITIAL_STATE);
      setHasDraft(false);
      window.history.pushState({ screen: 'select', step: 0 }, '', window.location.pathname);
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

  const handleLogout = () => {
    setConfirmConfig({
      msg: '¿Estás seguro de que deseas cerrar sesión en este dispositivo?',
      onConfirm: () => {
        logout();
        setCurrentUser(null);
        setConfirmConfig(null);
        showToast('Sesión cerrada.');
      }
    });
  };

  // Auth Guard: Si no hay usuario autenticado, bloquear acceso público
  if (!currentUser) {
    return (
      <div id="app">
        <LoginScreen
          onLoginSuccess={user => {
            setCurrentUser(user);
          }}
          onShowToast={showToast}
        />
        {toastMsg && <Toast message={toastMsg.msg} isErr={toastMsg.isErr} />}
      </div>
    );
  }

  // Auth Guard: Si la contraseña es temporal (must_change_password = true), forzar actualización
  if (currentUser.must_change_password) {
    return (
      <div id="app">
        <ChangePasswordModal
          email={currentUser.email}
          isMandatory={true}
          onSuccess={() => {
            setCurrentUser(prev => (prev ? { ...prev, must_change_password: false } : null));
          }}
          onShowToast={showToast}
        />
        {toastMsg && <Toast message={toastMsg.msg} isErr={toastMsg.isErr} />}
      </div>
    );
  }

  return (
    <div id="app">
      <Header
        state={state}
        onOpenHistory={() => setShowHistoryModal(true)}
        historyCount={historyCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePasswordModal(true)}
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
            onBulkToggleTri={handleBulkToggleTri}
            onToggleMulti={handleToggleMulti}
            onAddRisk={handleAddRisk}
            onChangeRisk={handleChangeRisk}
            onDeleteRisk={handleDeleteRisk}
            onToggleAccordion={handleToggleAccordion}
            onBackToSelect={() => navigateToScreen('select', 'back')}
            onGoToSigners={() => navigateToScreen('signers', 'push')}
          />
        )}

        {state.screen === 'signers' && (
          <SignersScreen
            state={state}
            onAddSigner={handleAddSigner}
            onUpdateSigner={handleUpdateSigner}
            onDeleteSigner={handleDeleteSigner}
            onClearAllSigners={handleClearAllSigners}
            onOpenSignModal={idx => setActiveSignerIndex(idx)}
            onOpenClosingModal={handleOpenClosingModal}
            onBackToForm={() => navigateToScreen('form', 'back')}
            onGoToReview={() => navigateToScreen('review', 'push')}
            onShowToast={showToast}
          />
        )}

        {state.screen === 'review' && (
          <ReviewScreen
            state={state}
            onChangeDestinatario={email => setState(prev => ({ ...prev, destinatario: email }))}
            onChangeConCopia={email => setState(prev => ({ ...prev, conCopia: email }))}
            onBackToSigners={() => navigateToScreen('signers', 'back')}
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
            const targetScreen = s.screen || 'form';
            const step = getStepNumber(targetScreen);
            window.history.pushState({ screen: targetScreen, step }, '', getHashForScreen(targetScreen));
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

      {/* MODAL CAMBIO DE CONTRASEÑA VOLUNTARIO */}
      {showChangePasswordModal && currentUser && (
        <ChangePasswordModal
          email={currentUser.email}
          isMandatory={false}
          onSuccess={() => setShowChangePasswordModal(false)}
          onClose={() => setShowChangePasswordModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* TOAST */}
      {toastMsg && <Toast message={toastMsg.msg} isErr={toastMsg.isErr} />}
    </div>
  );
}
