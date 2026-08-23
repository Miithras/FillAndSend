import { AppState, DocTypeId } from '../types';
import { sanitizeTextInput, sanitizeHeaderValue } from '../utils/sanitize';

const DRAFT_KEY = 'art_digital_draft_v2';

export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateChilean(isoDateStr?: string): string {
  if (!isoDateStr) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return sanitizeTextInput(isoDateStr, 20);
}

export const INITIAL_STATE: AppState = {
  screen: 'select',
  docType: 'charla_inicial',
  form: { fecha: getTodayISODate() },
  tri: {},
  multi: {},
  risks: [],
  final: {},
  signers: [],
  closingSig: null,
  destinatario: 'rgarcia@raycaingenieria.com',
  conCopia: '',
  uiOpen: { tri0: true, tri1: true, multi0: true, multi1: true, multi2: true, multi3: true, multi4: true, risks: true, inc: true, finalf: true },
  sendStatus: 'idle',
  sendError: null
};

export function saveDraft(state: AppState): void {
  try {
    // Sanitizar objeto antes de persistir
    const safeDraft = {
      docType: state.docType,
      form: state.form || {},
      tri: state.tri || {},
      multi: state.multi || {},
      risks: (state.risks || []).slice(0, 50).map(r => ({
        etapa: sanitizeTextInput(r.etapa, 300),
        evento: sanitizeTextInput(r.evento, 300),
        medida: sanitizeTextInput(r.medida, 500)
      })),
      final: state.final || {},
      signers: (state.signers || []).slice(0, 100).map(s => ({
        id: sanitizeTextInput(s.id, 50),
        nombre: sanitizeTextInput(s.nombre, 150),
        rut: sanitizeHeaderValue(s.rut).slice(0, 20),
        cargo: sanitizeTextInput(s.cargo, 100),
        tareas: sanitizeTextInput(s.tareas, 200),
        firma: s.firma ? String(s.firma) : null,
        timestamp: s.timestamp ? sanitizeTextInput(s.timestamp, 50) : null
      })),
      closingSig: state.closingSig
        ? {
            nombre: sanitizeTextInput(state.closingSig.nombre, 150),
            cargo: sanitizeTextInput(state.closingSig.cargo, 100),
            firma: state.closingSig.firma ? String(state.closingSig.firma) : null,
            timestamp: state.closingSig.timestamp ? sanitizeTextInput(state.closingSig.timestamp, 50) : null
          }
        : null,
      destinatario: sanitizeHeaderValue(state.destinatario || 'rgarcia@raycaingenieria.com').slice(0, 150),
      conCopia: sanitizeHeaderValue(state.conCopia || '').slice(0, 300),
      updatedAt: Date.now()
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
  } catch (e) {
    console.error('Error al guardar borrador seguro en localStorage:', e);
  }
}

export function loadDraft(): AppState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Verificar si el borrador es más antiguo que 24 horas (purga de seguridad)
    if (parsed.updatedAt && typeof parsed.updatedAt === 'number') {
      const isExpired = Date.now() - parsed.updatedAt > 24 * 60 * 60 * 1000;
      if (isExpired) {
        clearDraft();
        return null;
      }
    }

    const state: AppState = {
      ...INITIAL_STATE,
      ...parsed,
      screen: 'select',
      sendStatus: 'idle',
      sendError: null
    };

    state.form = { ...(state.form || {}), fecha: getTodayISODate() }; // Forzar siempre fecha de hoy
    return state;
  } catch (e) {
    console.error('Error al cargar borrador seguro:', e);
    clearDraft();
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error('Error al eliminar borrador:', e);
  }
}
