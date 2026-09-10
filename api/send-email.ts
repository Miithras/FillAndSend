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
    const {
      to,
      cc,
      subject,
      documentTitle,
      summary,
      filename,
      base64Attachment,
      emailType,
      customHtml
    } = req.body || {};

    if (!to || !subject) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios (to, subject)' });
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

    // Validar payload base64 si viene presente
    if (base64Attachment && (typeof base64Attachment !== 'string' || base64Attachment.length > 20 * 1024 * 1024)) {
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

    let mailHtml = '';
    if (emailType === 'password_change') {
      const nowChile = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
      mailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; color: #001E59; margin: 0 auto; padding: 24px; border: 1px solid #D1E0EB; border-radius: 12px; background: #FFFFFF;">
          <div style="background: #001E59; padding: 18px 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #FFFFFF; margin: 0; font-size: 18px; letter-spacing: 0.02em;">
              RAYCA INGENIERÍA · ART DIGITAL
            </h2>
            <div style="color: #67C2D8; font-size: 12px; margin-top: 4px; font-weight: bold;">
              Notificación de Seguridad de la Cuenta
            </div>
          </div>
          <p style="font-size: 15px; color: #001E59; line-height: 1.5; margin-top: 0;">
            Hola,
          </p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">
            Te informamos que la contraseña de acceso a <strong>ART Digital</strong> para tu cuenta <strong>${escapeHtml(validToList.join(', '))}</strong> ha sido actualizada exitosamente el <strong>${nowChile}</strong>.
          </p>
          <div style="background: #F4F7FB; border-left: 4px solid #00A0B8; padding: 14px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #001E59; line-height: 1.5;">
              🔒 <strong>Tu cuenta está protegida</strong><br />
              Ya puedes iniciar sesión en la aplicación PWA usando tu nueva contraseña personalizada.
            </p>
          </div>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
            ⚠️ Si tú no realizaste este cambio de contraseña, comunícate de inmediato con la jefatura o el área de administración de RAYCA Ingeniería para revocar el acceso.
          </p>
          <hr style="border: none; border-top: 1px solid #D1E0EB; margin: 24px 0 16px 0;" />
          <p style="font-size: 11px; color: #7E90B8; text-align: center; margin-bottom: 0;">
            Este es un correo transaccional generado automáticamente por la plataforma ART Digital de RAYCA Ingeniería SpA.
          </p>
        </div>
      `;
    } else if (customHtml) {
      mailHtml = customHtml;
    } else {
      mailHtml = `
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
      `;
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"ART Digital" <${smtpUser}>`,
      to: validToList.join(', '),
      subject: cleanSubject,
      text: summary ? String(summary).slice(0, 5000) : (emailType === 'password_change' ? 'Tu contraseña en ART Digital ha sido actualizada exitosamente.' : ''),
      html: mailHtml
    };

    if (base64Attachment) {
      mailOptions.attachments = [
        {
          filename: cleanFilename,
          content: Buffer.from(base64Attachment, 'base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ];
    }

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
