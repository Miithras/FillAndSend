import { AppState, DocTypeId } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { uid } from '../utils/rut';

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
  state: AppState;
}

const DB_NAME = 'ARTDigitalDB';
const DB_VERSION = 1;
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Guarda un registro de documento completado/enviado en el historial de 24 horas.
 */
export async function saveToHistory(state: AppState): Promise<HistoryRecord> {
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

    // Separar válidos de expirados (> 24h)
    const validRecords: HistoryRecord[] = [];
    const expiredIds: string[] = [];

    records.forEach(r => {
      if (now > r.expiresAt) {
        expiredIds.push(r.id);
      } else {
        validRecords.push(r);
      }
    });

    // Eliminar expirados de fondo
    if (expiredIds.length > 0) {
      deleteRecords(expiredIds).catch(err => console.warn('Error purgando expirados:', err));
    }

    // Ordenar del más reciente al más antiguo
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
