import { AppState } from '../types';
import { DOC_TYPES } from '../config/docTypes';
import { buildExcelBlob, generateExcelFileName } from './excelService';
import { formatearRut } from '../utils/rut';
import { getTodayISODate } from './storageService';

export function buildSummaryText(state: AppState): string {
  const doc = DOC_TYPES[state.docType];
  const f = state.form;
  let body = `${doc.label} — ${doc.meta.codigo}\n\n`;

  doc.fields.forEach(fd => {
    body += `${fd.label}: ${f[fd.id] || '—'}\n`;
  });

  body += `\nFirmantes:\n`;
  state.signers.forEach(s => {
    body += `- ${s.nombre}${doc.signerSchema.rutRequired ? ` (${formatearRut(s.rut)})` : ''} — firmado ${s.timestamp || ''}\n`;
  });

  if (state.closingSig) {
    body += `\n${doc.closing.title}: ${state.closingSig.nombre} — firmado ${state.closingSig.timestamp || ''}\n`;
  }

  return body;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function sendDocumentEmail(state: AppState): Promise<void> {
  if (!state.destinatario) {
    throw new Error('Ingresa el correo de destino');
  }

  const doc = DOC_TYPES[state.docType];
  const blob = await buildExcelBlob(state);
  const base64Attachment = await blobToBase64(blob);
  const filename = generateExcelFileName(state);
  const dateStr = state.form.fecha || getTodayISODate();
  const subject = `${doc.label} — ${state.form.obra || state.form.usuario || ''} — ${dateStr}`;
  const summary = buildSummaryText(state);

  // Intentar primero a través de nuestra API Serverless con Bluehost SMTP
  try {
    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: state.destinatario,
        cc: state.conCopia,
        subject,
        documentTitle: doc.label,
        summary,
        filename,
        base64Attachment
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data.success) {
      return;
    }

    if (data?.error && data.error.includes('SMTP_PASS')) {
      // Si la variable no está configurada aún en desarrollo, arrojar mensaje descriptivo
      throw new Error(data.error);
    }
  } catch (err: any) {
    // Si la API no está desplegada aún (ej. dev local puro) o falla la red, intentar fallback con FormSubmit
    console.warn('Fallo API Bluehost SMTP, intentando envío alternativo FormSubmit:', err);

    const fd = new FormData();
    fd.append('_subject', subject);
    fd.append('_template', 'box');
    fd.append('_captcha', 'false');
    fd.append('documento', doc.label);
    fd.append('empresa', state.form.empresa || state.form.cliente || '');
    fd.append('obra', state.form.obra || state.form.usuario || '');
    fd.append('fecha', state.form.fecha || '');
    fd.append('supervisor', state.form.supervisor || state.form.instructor || '');
    fd.append('resumen', summary);
    fd.append('attachment', blob, filename);

    const endpoint = `https://formsubmit.co/ajax/${state.destinatario}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.success === 'false' || data.success === false) {
      throw new Error(data.message || err.message || `Error de envío HTTP ${resp.status}`);
    }
  }
}

export async function sendPasswordChangeNotification(email: string): Promise<boolean> {
  const subject = 'Notificación de Seguridad: Contraseña actualizada en RaycaDoc';

  try {
    const resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        emailType: 'password_change'
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success) {
      return true;
    }
  } catch (err) {
    console.warn('No se pudo enviar notificación de cambio de contraseña por API (modo offline o sin red):', err);
  }

  // Fallback alternativo vía FormSubmit si la API no está accesible (ej. dev local)
  try {
    const fd = new FormData();
    fd.append('_subject', subject);
    fd.append('_template', 'box');
    fd.append('_captcha', 'false');
    fd.append('notificacion', 'Tu contraseña de acceso a RaycaDoc ha sido actualizada exitosamente.');
    fd.append('usuario', email);
    fd.append('fecha', new Date().toLocaleString('es-CL'));

    const endpoint = `https://formsubmit.co/ajax/${email}`;
    await fetch(endpoint, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });
    return true;
  } catch {
    return false;
  }
}

