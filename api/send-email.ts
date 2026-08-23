import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeHeader(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).replace(/[\r\n]+/g, ' ').trim();
}

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

function parseAndValidateEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map(e => sanitizeHeader(e))
    .filter(e => isValidEmail(e));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';

  // Configurar CORS seguro: Permitir solicitudes del mismo origen o dominios de la app
  const isAllowedOrigin =
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('vercel.app') ||
    origin.includes('raycaingenieria.com');

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { to, cc, subject, documentTitle, summary, filename, base64Attachment } = req.body || {};

    if (!to || !subject || !base64Attachment) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios (to, subject, base64Attachment)' });
    }

    // Validar formato de correos principales
    const validToList = parseAndValidateEmails(to);
    if (validToList.length === 0) {
      return res.status(400).json({ error: 'El correo del destinatario principal no tiene un formato válido.' });
    }

    const validCcList = cc ? parseAndValidateEmails(cc) : [];
    const cleanSubject = sanitizeHeader(subject).slice(0, 200);
    const cleanDocTitle = escapeHtml(sanitizeHeader(documentTitle || 'Documento ART Digital').slice(0, 150));
    const cleanSummary = escapeHtml(summary ? String(summary).slice(0, 5000) : '');
    const cleanFilename = sanitizeHeader(filename || 'documento.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');

    // Validar payload base64 y limitar a máx 15MB
    if (typeof base64Attachment !== 'string' || base64Attachment.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo adjunto excede el tamaño máximo permitido o no es válido.' });
    }

    const smtpHost = process.env.SMTP_HOST || 'mail.raycaingenieria.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER || 'no-reply@raycaingenieria.com';
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpPass) {
      return res.status(500).json({
        error: 'Servidor no configurado: falta la variable de entorno SMTP_PASS en el servidor seguro.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        // En producción se recomienda verificar el certificado del servidor
        rejectUnauthorized: false
      }
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"ART Digital" <${smtpUser}>`,
      to: validToList.join(', '),
      subject: cleanSubject,
      text: summary ? String(summary).slice(0, 5000) : '',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #001E59; margin: 0 auto; padding: 20px; border: 1px solid #D1E0EB; border-radius: 12px;">
          <h2 style="color: #FFFFFF; background: #001E59; padding: 14px 18px; border-radius: 8px; margin-top: 0; font-size: 18px;">
            ${cleanDocTitle}
          </h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">
            Se ha completado y firmado el documento digital. Adjunto a este correo encontrarás el archivo Excel oficial rellenado y validado.
          </p>
          <hr style="border: none; border-top: 1px solid #D1E0EB; margin: 20px 0;" />
          <h3 style="font-size: 13px; text-transform: uppercase; color: #56659F; letter-spacing: 0.05em; margin-bottom: 8px;">
            Resumen del Documento
          </h3>
          <pre style="background: #F4F7FB; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap; color: #001E59; border: 1px solid #D1E0EB;">${cleanSummary}</pre>
          <hr style="border: none; border-top: 1px solid #D1E0EB; margin: 20px 0;" />
          <p style="font-size: 11px; color: #7E90B8; text-align: center; margin-bottom: 0;">
            Mensaje enviado automáticamente desde <b>ART Digital</b> (RAYCA Ingeniería).
          </p>
        </div>
      `,
      attachments: [
        {
          filename: cleanFilename,
          content: Buffer.from(base64Attachment, 'base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    };

    if (validCcList.length > 0) {
      mailOptions.cc = validCcList.join(', ');
    }

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Error al enviar correo vía SMTP:', error);
    return res.status(500).json({
      error: 'Error interno al procesar el envío de correo',
      details: error?.message || 'Error de conexión con el servidor SMTP'
    });
  }
}
