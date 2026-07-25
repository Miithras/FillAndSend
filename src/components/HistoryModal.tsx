import React, { useEffect, useState } from 'react';
import { AppState } from '../types';
import { HistoryRecord, getHistory, deleteRecords, getTimeRemaining } from '../services/historyService';
import { downloadOriginalExcel, shareOriginalExcel } from '../services/excelService';
import { sendDocumentEmail } from '../services/emailService';

interface HistoryModalProps {
  onClose: () => void;
  onLoadState: (state: AppState) => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose, onLoadState, onShowToast }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const data = await getHistory();
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteRecords([id]);
    onShowToast('Registro eliminado del historial');
    fetchRecords();
  };

  const handleDownload = async (record: HistoryRecord) => {
    onShowToast('Generando Excel...');
    try {
      await downloadOriginalExcel(record.state);
      onShowToast('Excel descargado ✓');
    } catch (err: any) {
      onShowToast('Error al descargar: ' + (err.message || err), true);
    }
  };

  const handleShare = async (record: HistoryRecord) => {
    onShowToast('Generando Excel...');
    try {
      await shareOriginalExcel(record.state);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      onShowToast('Error al compartir: ' + (err.message || err), true);
    }
  };

  const handleResendEmail = async (record: HistoryRecord) => {
    setSendingId(record.id);
    onShowToast('Enviando correo...');
    try {
      await sendDocumentEmail(record.state);
      onShowToast('Correo enviado con éxito ✓');
      await fetchRecords();
    } catch (err: any) {
      onShowToast('Fallo al enviar correo: ' + (err.message || err), true);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3>📜 Historial (últimas 24h)</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <p className="sub">
          Los documentos generados quedan guardados en este dispositivo durante 24 horas y se borran automáticamente.
        </p>

        {loading ? (
          <div className="banner">Cargando historial...</div>
        ) : records.length === 0 ? (
          <div className="banner" style={{ textAlign: 'center', padding: '24px 12px' }}>
            No hay documentos guardados en las últimas 24 horas.
          </div>
        ) : (
          records.map(r => (
            <div className="review-block" key={r.id} style={{ marginBottom: 14, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0 }}>{r.title} — <span className="mono">{r.code}</span></h4>
                    {r.status === 'sent' && (
                      <span style={{ fontSize: 10, background: 'rgba(47,184,148,0.2)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        🟢 Enviado
                      </span>
                    )}
                    {r.status === 'pending_send' && (
                      <span style={{ fontSize: 10, background: 'rgba(245,196,0,0.2)', color: 'var(--yellow)', border: '1px solid var(--yellow)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        🟡 Pendiente (Sin conexión)
                      </span>
                    )}
                    {r.status === 'error' && (
                      <span style={{ fontSize: 10, background: 'rgba(255,91,91,0.2)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        🔴 Error de envío
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 4 }}>
                    📍 <b>{r.site}</b> · {r.fecha}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-lo)', marginTop: 2 }}>
                    👤 {r.signersCount} firmantes · Destino: {r.destinatario || '—'}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-lo)', fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}
                  title="Eliminar del historial"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--yellow)' }}>
                <span>🕒 Expira en: <b>{getTimeRemaining(r.expiresAt)}</b></span>
                <button
                  className="btn-ghost"
                  style={{ padding: 0, textDecoration: 'underline', color: 'var(--teal)' }}
                  onClick={() => {
                    onLoadState(r.state);
                    onClose();
                  }}
                >
                  Cargar datos en formulario
                </button>
              </div>

              {/* ACCIONES POR DOCUMENTO */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 6px', fontSize: 12, marginTop: 0 }}
                  onClick={() => handleDownload(r)}
                >
                  📥 Descargar
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 6px', fontSize: 12, marginTop: 0 }}
                  onClick={() => handleShare(r)}
                >
                  📤 Compartir
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: '8px 6px', fontSize: 12, textTransform: 'none' }}
                  onClick={() => handleResendEmail(r)}
                  disabled={sendingId === r.id}
                >
                  {sendingId === r.id ? 'Enviando...' : r.status === 'sent' ? '✉️ Reenviar' : '⚡ Enviar ahora'}
                </button>
              </div>
            </div>
          ))
        )}

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: 14 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};
