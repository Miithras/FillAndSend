import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { to, cc, subject, documentTitle, summary, filename, base64Attachment } = req.body;

    if (!to || !subject || !base64Attachment) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (to, subject, base64Attachment)' });
    }

    const host = process.env.SMTP_HOST || 'mail.raycaingenieria.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || 'no-reply@raycaingenieria.com';
    const pass = process.env.SMTP_PASS || '@Rayca3003'; 

    if (!pass) {
      return res.status(500).json({
        error: 'Servidor no configurado: falta la variable de entorno SMTP_PASS en Vercel.'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465, false para otros puertos
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"ART Digital" <${user}>`,
      to,
      subject,
      text: summary,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #222;">
          <h2 style="color: #F5C400; background: #12151C; padding: 12px 16px; border-radius: 8px; margin-top: 0;">
            ${documentTitle || 'Documento ART Digital'}
          </h2>
          <p>Se ha completado y firmado el documento digital. Adjunto a este correo encontrarás el archivo Excel oficial rellenado.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <h3 style="font-size: 14px; text-transform: uppercase; color: #555;">Resumen del Documento</h3>
          <pre style="background: #f4f5f7; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${summary}</pre>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Mensaje enviado automáticamente desde <b>ART Digital</b> (RAYCA Ingeniería) mediante Bluehost SMTP.</p>
        </div>
      `,
      attachments: [
        {
          filename: filename || 'documento.xlsx',
          content: Buffer.from(base64Attachment, 'base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    };

    if (cc) {
      mailOptions.cc = cc;
    }

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Error al enviar correo vía Bluehost SMTP:', error);
    return res.status(500).json({
      error: 'Error al enviar el correo vía Bluehost SMTP',
      details: error?.message || String(error)
    });
  }
}
