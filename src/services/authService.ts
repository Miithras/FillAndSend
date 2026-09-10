import seedUsers from '../config/allowedUsers.json';
import { sendPasswordChangeNotification } from './emailService';

export interface AuthUserRecord {
  email: string;
  passwordHash: string;
  tempPasswordHash: string;
  must_change_password: boolean;
  updatedAt?: string;
}

export interface CurrentUserSession {
  email: string;
  must_change_password: boolean;
  loginAt: string;
}

const AUTH_USERS_KEY = 'rayca_allowed_users_v1';
const AUTH_SESSION_KEY = 'rayca_auth_session_v1';

/**
 * Genera hash SHA-256 seguro mediante Web Crypto API nativa
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Inicializa el almacenamiento seguro de usuarios autorizados a partir del seed allowedUsers.json
 */
export async function initAuth(): Promise<void> {
  let storedUsers: Record<string, AuthUserRecord> = {};
  const raw = localStorage.getItem(AUTH_USERS_KEY);

  if (raw) {
    try {
      storedUsers = JSON.parse(raw);
    } catch {
      storedUsers = {};
    }
  }

  let hasChanges = false;

  for (const seed of seedUsers) {
    const emailKey = seed.email.toLowerCase().trim();
    if (!storedUsers[emailKey]) {
      const tempHash = await hashPassword(seed.tempPassword);
      storedUsers[emailKey] = {
        email: emailKey,
        passwordHash: tempHash,
        tempPasswordHash: tempHash,
        must_change_password: seed.must_change_password !== false,
        updatedAt: new Date().toISOString()
      };
      hasChanges = true;
    }
  }

  if (hasChanges || !raw) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(storedUsers));
  }
}

/**
 * Obtiene la lista actual de usuarios autorizados desde el storage local
 */
export function getStoredUsers(): Record<string, AuthUserRecord> {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Valida credenciales contra la lista blanca autorizada
 */
export async function login(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: CurrentUserSession; error?: string }> {
  await initAuth();

  const cleanEmail = (emailInput || '').toLowerCase().trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Ingresa tu correo institucional y contraseña.' };
  }

  if (!cleanEmail.endsWith('@raycaingenieria.com')) {
    return {
      success: false,
      error: 'Acceso restringido: Solo se permiten correos corporativos @raycaingenieria.com.'
    };
  }

  const users = getStoredUsers();
  const userRecord = users[cleanEmail];

  if (!userRecord) {
    return {
      success: false,
      error: 'El correo ingresado no se encuentra autorizado en la nómina de la empresa.'
    };
  }

  const inputHash = await hashPassword(cleanPass);

  const isPasswordValid =
    inputHash === userRecord.passwordHash || inputHash === userRecord.tempPasswordHash;

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Contraseña incorrecta. Verifica e inténtalo nuevamente.'
    };
  }

  const session: CurrentUserSession = {
    email: userRecord.email,
    must_change_password: userRecord.must_change_password,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

  return { success: true, user: session };
}

/**
 * Actualiza la contraseña del usuario, desactiva la bandera must_change_password
 * y dispara la notificación por correo electrónico.
 */
export async function updatePassword(
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPass = (newPassword || '').trim();

  if (cleanPass.length < 6) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  }

  const users = getStoredUsers();
  const userRecord = users[cleanEmail];

  if (!userRecord) {
    return { success: false, error: 'Usuario no encontrado en la base de datos local.' };
  }

  const newHash = await hashPassword(cleanPass);

  userRecord.passwordHash = newHash;
  userRecord.must_change_password = false;
  userRecord.updatedAt = new Date().toISOString();

  users[cleanEmail] = userRecord;
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));

  // Actualizar sesión activa
  const currentSession = getCurrentUser();
  if (currentSession && currentSession.email === cleanEmail) {
    currentSession.must_change_password = false;
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(currentSession));
  }

  // Enviar correo transaccional en segundo plano (asíncrono no bloqueante)
  sendPasswordChangeNotification(cleanEmail).catch(err => {
    console.warn('Error al enviar correo de notificación:', err);
  });

  return { success: true };
}

/**
 * Obtiene la sesión del usuario actualmente autenticado en el dispositivo
 */
export function getCurrentUser(): CurrentUserSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session: CurrentUserSession = JSON.parse(raw);
    if (!session || !session.email) return null;

    // Verificar si en los registros locales cambió el estado de must_change_password
    const users = getStoredUsers();
    const userRecord = users[session.email.toLowerCase()];
    if (userRecord) {
      session.must_change_password = userRecord.must_change_password;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión activa del usuario
 */
export function logout(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
}
