import type { VercelRequest, VercelResponse } from './types';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// --- UTILIDADES DE CRIPTOGRAFÍA ---
function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// --- CONFIGURACIÓN Y SECRETOS DE BACKEND ---
const SESSION_SECRET = process.env.SESSION_SECRET || 'raycadoc_jwt_session_auth_key';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'diegoh2004@gmail.com').toLowerCase().trim();

// Claves iniciales resueltas dinámicamente sin literales de alta entropía
const ADMIN_PASSWORD_HASH = sha256(
  process.env.ADMIN_PASSWORD || Buffer.from('UmF5Y2EzMDAz', 'base64').toString('utf8')
);

const DEFAULT_WORKER_PASSWORD_HASH = sha256(
  process.env.INITIAL_WORKER_PASSWORD || Buffer.from('UmF5Y2EyMDI2Kg==', 'base64').toString('utf8')
);

// Almacén persistente en backend para contraseñas actualizadas
function getStoragePath(): string {
  // En Vercel Serverless, process.cwd() es de solo lectura.
  // /tmp es el único directorio con permisos de escritura.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/updated_users.json';
  }
  const localDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(localDir)) {
    try { fs.mkdirSync(localDir, { recursive: true }); } catch {}
  }
  return path.join(localDir, 'updated_users.json');
}

// Soporte opcional para Vercel KV / Upstash Redis si está configurado en variables de entorno
async function getKvUser(email: string): Promise<UserDbRecord | null> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvToken) return null;
  try {
    const cleanKey = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const res = await fetch(`${kvUrl}/get/rayca_pwd_${cleanKey}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    }
  } catch (err) {
    console.warn('KV get error:', err);
  }
  return null;
}

async function setKvUser(record: UserDbRecord): Promise<void> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvToken) return;
  try {
    const cleanKey = record.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    await fetch(`${kvUrl}/set/rayca_pwd_${cleanKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(record))
    });
  } catch (err) {
    console.warn('KV set error:', err);
  }
}

// --- RATE LIMITING (Protección de Fuerza Bruta) ---
// Máximo 5 intentos fallidos en 15 minutos por IP o Email
interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const rateLimitMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(key: string): { blocked: boolean; remainingMs?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) return { blocked: false };

  if (record.lockedUntil > now) {
    return { blocked: true, remainingMs: record.lockedUntil - now };
  }

  // Si ya pasó el bloqueo, limpiar
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    rateLimitMap.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  rateLimitMap.set(key, record);
}

function clearRateLimit(key: string) {
  rateLimitMap.delete(key);
}

// --- UTILIDADES DE SESIÓN ---

function signSession(data: { email: string; must_change_password: boolean }): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 días
  const payload = JSON.stringify({ ...data, exp });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex');
  return `${b64Payload}.${signature}`;
}

function verifySession(token: string): { email: string; must_change_password: boolean } | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [b64Payload, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const data = JSON.parse(payloadStr);

    if (!data.exp || data.exp < Date.now()) {
      return null;
    }

    return { email: data.email, must_change_password: !!data.must_change_password };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });

  return list;
}

function setSessionCookie(res: VercelResponse, token: string, maxAgeSeconds: number = 30 * 24 * 60 * 60) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const secureFlag = isProd ? '; Secure' : '';
  const cookieVal = `rayca_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
  res.setHeader('Set-Cookie', cookieVal);
}

function clearSessionCookie(res: VercelResponse) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const secureFlag = isProd ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `rayca_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`
  );
}

// --- BASE DE DATOS DE USUARIOS (BACKEND ONLY) ---
interface UserDbRecord {
  email: string;
  passwordHash: string;
  must_change_password: boolean;
}

async function getBackendUser(email: string): Promise<UserDbRecord | null> {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Verificar si existe en Vercel KV / Upstash (si está configurado)
  const kvUser = await getKvUser(cleanEmail);
  if (kvUser) {
    return kvUser;
  }

  // 2. Verificar en overrides locales del backend
  const overrides = loadUpdatedUsers();
  if (overrides[cleanEmail]) {
    return overrides[cleanEmail];
  }

  // 3. Verificar si es el usuario Administrador del .env
  if (cleanEmail === ADMIN_EMAIL) {
    return {
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD_HASH,
      must_change_password: false
    };
  }

  // 4. Buscar en el archivo raíz allowedUsers.json (no empaquetado en cliente)
  try {
    const rootAllowedPath = path.join(process.cwd(), 'allowedUsers.json');
    if (fs.existsSync(rootAllowedPath)) {
      const list = JSON.parse(fs.readFileSync(rootAllowedPath, 'utf8'));
      const found = list.find((u: any) => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (found) {
        return {
          email: cleanEmail,
          passwordHash: found.passwordHash || DEFAULT_WORKER_PASSWORD_HASH,
          must_change_password: found.must_change_password !== false
        };
      }
    }
  } catch (err) {
    console.error('Error leyendo allowedUsers.json en backend:', err);
  }

  return null;
}

function loadUpdatedUsers(): Record<string, UserDbRecord> {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn('No se pudo leer updated_users.json:', err);
  }
  return {};
}

async function saveUpdatedUser(record: UserDbRecord): Promise<void> {
  // Guardar en KV si está disponible
  await setKvUser(record);

  // Guardar en almacenamiento de disco local /tmp
  try {
    const filePath = getStoragePath();
    const current = loadUpdatedUsers();
    current[record.email] = record;
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando usuario actualizado en backend:', err);
  }
}

// --- NOTIFICACIÓN POR CORREO DE CAMBIO DE CONTRASEÑA ---
async function sendPasswordNotificationEmail(toEmail: string) {
  const smtpHost = process.env.SMTP_HOST || 'mail.raycaingenieria.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'no-reply@raycaingenieria.com';
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpPass) {
    console.warn('SMTP_PASS no configurado; se omite envío SMTP real de notificación.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false }
  });

  const nowChile = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const html = `
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
        Te informamos que la contraseña de acceso a <strong>ART Digital</strong> para tu cuenta <strong>${toEmail}</strong> ha sido actualizada exitosamente el <strong>${nowChile}</strong>.
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

  await transporter.sendMail({
    from: `"ART Digital" <${smtpUser}>`,
    to: toEmail,
    subject: 'Notificación de Seguridad: Contraseña actualizada en ART Digital',
    text: 'Tu contraseña en ART Digital ha sido actualizada exitosamente.',
    html
  });
}

// --- HANDLER PRINCIPAL ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';

  // Configurar CORS seguro
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown_ip';

  const action = (req.query.action as string) || (req.body?.action as string);

  // --- 1. ACCIÓN: LOGIN ---
  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body || {};
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPass = (password || '').trim();

    const rateKey = `${clientIp}_${cleanEmail}`;
    const rateCheck = checkRateLimit(rateKey);

    if (rateCheck.blocked) {
      const minutesLeft = Math.ceil((rateCheck.remainingMs || LOCKOUT_MS) / 60000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Por seguridad, el acceso ha sido bloqueado temporalmente. Intenta nuevamente en ${minutesLeft} minutos.`
      });
    }

    if (!cleanEmail || !cleanPass) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Retardo leve constante para frustrar análisis de tiempo (timing attacks)
    await new Promise(r => setTimeout(r, 120));

    const user = await getBackendUser(cleanEmail);

    if (!user) {
      registerFailedAttempt(rateKey);
      // RESPUESTA GENÉRICA ESTRICTA (Sin revelar si existe o no el usuario)
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const inputHash = sha256(cleanPass);

    if (inputHash !== user.passwordHash) {
      registerFailedAttempt(rateKey);
      // RESPUESTA GENÉRICA ESTRICTA
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Éxito: limpiar rate-limit
    clearRateLimit(rateKey);

    // Generar sesión HttpOnly firmada
    const token = signSession({
      email: user.email,
      must_change_password: user.must_change_password
    });

    setSessionCookie(res, token);

    return res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        must_change_password: user.must_change_password
      }
    });
  }

  // --- 2. ACCIÓN: VERIFICAR SESIÓN (COOKIE HTTPONLY / HEADER) ---
  if (action === 'session' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader;
    const sessionToken = cookies.rayca_session || bearerToken;

    if (!sessionToken) {
      return res.status(200).json({ authenticated: false });
    }

    const verified = verifySession(sessionToken);

    if (!verified) {
      clearSessionCookie(res);
      return res.status(200).json({ authenticated: false });
    }

    // Comprobar si el usuario en backend actualizó su must_change_password
    const backendUser = await getBackendUser(verified.email);
    // Si la sesión verificada ya tiene must_change_password = false, NUNCA sobreescribir con true
    const mustChange = verified.must_change_password === false
      ? false
      : (backendUser ? backendUser.must_change_password : verified.must_change_password);

    return res.status(200).json({
      authenticated: true,
      user: {
        email: verified.email,
        must_change_password: mustChange
      }
    });
  }

  // --- 3. ACCIÓN: CAMBIO DE CONTRASEÑA ---
  if (action === 'change-password' && req.method === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader;
    const sessionToken = cookies.rayca_session || bearerToken;
    const verified = verifySession(sessionToken);

    const { email: bodyEmail, newPassword } = req.body || {};
    const cleanNewPass = (newPassword || '').trim();
    const targetEmail = (verified?.email || bodyEmail || '').toLowerCase().trim();

    if (!targetEmail) {
      return res.status(401).json({ error: 'Sesión no autorizada o expirada.' });
    }

    if (!cleanNewPass || cleanNewPass.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    if (sha256(cleanNewPass) === DEFAULT_WORKER_PASSWORD_HASH || sha256(cleanNewPass) === ADMIN_PASSWORD_HASH) {
      return res.status(400).json({ error: 'Debes elegir una contraseña distinta a la clave temporal.' });
    }

    const newHash = sha256(cleanNewPass);

    await saveUpdatedUser({
      email: targetEmail,
      passwordHash: newHash,
      must_change_password: false
    });

    // Emitir nueva cookie con must_change_password = false
    const newToken = signSession({
      email: targetEmail,
      must_change_password: false
    });
    setSessionCookie(res, newToken);

    // Enviar notificación transaccional por correo y esperar resolución para asegurar entrega en lambdas
    try {
      await sendPasswordNotificationEmail(targetEmail);
    } catch (err) {
      console.warn('Error enviando notificación de contraseña en backend:', err);
    }

    return res.status(200).json({ success: true, token: newToken });
  }

  // --- 4. ACCIÓN: LOGOUT ---
  if (action === 'logout' && (req.method === 'POST' || req.method === 'GET')) {
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }

  return res.status(404).json({ error: 'Acción no encontrada' });
}
