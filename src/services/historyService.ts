import { AppState, DocTypeId } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { uid } from '../utils/rut';
import { sendDocumentEmail } from './emailService';

export type HistoryStatus = 'sent' | 'pending_send' | 'error';

export interface HistoryRecord {
  id: string;
  docType: DocTypeId;
  title: string;
  code: string;
  site: string;
  fecha: string;
  createdAt: number; // Timestamp Date.now()
  expiresAt: number; // Timestamp Date.now() + 24 * 60 * 60 * 1000
  destinatario: string;
  conCopia: string;
  signersCount: number;
  status: HistoryStatus;
  sendError?: string;
  state: AppState;
}

const DB_NAME = 'ARTDigitalDB';
const DB_VERSION = 2;
const STORE_NAME = 'history_24h';
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 Horas en milisegundos

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains('expiresAt')) {
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
      if (!store.indexNames.contains('status')) {
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

/**
 * Guarda un registro de documento en el historial de 24 horas.
 */
export async function saveToHistory(
  state: AppState,
  status: HistoryStatus = 'pending_send',
  sendError?: string
): Promise<HistoryRecord> {
  const db = await openDB();
  const doc = DOC_TYPES[state.docType];
  const now = Date.now();

  const record: HistoryRecord = {
    id: uid(),
    docType: state.docType,
    title: doc.label,
    code: doc.meta.codigo,
    site: state.form.usuario || state.form.obra || 'Sin especificar',
    fecha: state.form.fecha || new Date().toLocaleDateString('es-CL'),
    createdAt: now,
    expiresAt: now + RETENTION_MS,
    destinatario: state.destinatario,
    conCopia: state.conCopia,
    signersCount: state.signers.length,
    status,
    sendError,
    state: JSON.parse(JSON.stringify(state)) // Copia profunda del estado
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Actualiza el estado de envío de un registro existente.
 */
export async function updateHistoryStatus(
  id: string,
  status: HistoryStatus,
  sendError?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record: HistoryRecord = getReq.result;
      if (record) {
        record.status = status;
        record.sendError = sendError;
        store.put(record);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Obtiene todos los registros guardados en las últimas 24 horas.
 * Purga automáticamente cualquier registro que haya superado las 24 horas.
 */
export async function getHistory(): Promise<HistoryRecord[]> {
  try {
    const db = await openDB();
    const now = Date.now();

    const records: HistoryRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const validRecords: HistoryRecord[] = [];
    const expiredIds: string[] = [];

    records.forEach(r => {
      if (now > r.expiresAt) {
        expiredIds.push(r.id);
      } else {
        validRecords.push(r);
      }
    });

    if (expiredIds.length > 0) {
      deleteRecords(expiredIds).catch(err => console.warn('Error purgando expirados:', err));
    }

    return validRecords.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('Error al obtener historial:', e);
    return [];
  }
}

/**
 * Elimina uno o más registros por su ID.
 */
export async function deleteRecords(ids: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    ids.forEach(id => store.delete(id));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Procesa en segundo plano todos los correos pendientes del historial.
 * Intenta enviar vía SMTP y actualiza el estado a 'sent' o 'error'.
 */
let isProcessingQueue = false;

export async function processPendingEmailsQueue(onStatusChange?: () => void): Promise<{ processed: number; errors: number }> {
  if (isProcessingQueue) return { processed: 0, errors: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, errors: 0 };
  }

  isProcessingQueue = true;
  let processed = 0;
  let errors = 0;

  try {
    const history = await getHistory();
    const pending = history.filter(r => r.status === 'pending_send' || r.status === 'error');

    for (const record of pending) {
      try {
        await sendDocumentEmail(record.state);
        await updateHistoryStatus(record.id, 'sent');
        processed++;
        if (onStatusChange) onStatusChange();
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        await updateHistoryStatus(record.id, 'pending_send', errorMsg);
        errors++;
      }
    }
  } catch (e) {
    console.error('Error en cola de envío:', e);
  } finally {
    isProcessingQueue = false;
  }

  return { processed, errors };
}

/**
 * Configura listeners automáticos para reintentar envíos cuando se recupera la conexión a internet.
 */
export function setupAutoSync(onSyncComplete?: () => void) {
  if (typeof window === 'undefined') return;

  const runSync = () => {
    processPendingEmailsQueue(onSyncComplete).then(res => {
      if (res.processed > 0 && onSyncComplete) {
        onSyncComplete();
      }
    });
  };

  window.addEventListener('online', runSync);

  // Intentar sincronizar cada 30 segundos si hay internet
  setInterval(() => {
    if (navigator.onLine) {
      runSync();
    }
  }, 30000);
}

/**
 * Calcula el tiempo restante antes de que expire un registro (formateado en horas y minutos).
 */
export function getTimeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expirado';

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
