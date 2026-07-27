import { AppState, DocTypeId } from '../types';

const DRAFT_KEY = 'art_digital_draft_v2';

export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error al guardar borrador en localStorage:', e);
  }
}

export function loadDraft(): AppState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state: AppState = { ...INITIAL_STATE, ...parsed, sendStatus: 'idle', sendError: null };
    state.form = { ...state.form, fecha: getTodayISODate() }; // Forzar siempre fecha de hoy
    return state;
  } catch (e) {
    console.error('Error al cargar borrador:', e);
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
