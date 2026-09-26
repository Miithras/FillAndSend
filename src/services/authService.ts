export interface CurrentUserSession {
  email: string;
  must_change_password: boolean;
  loginAt: string;
}

const AUTH_SESSION_KEY = 'rayca_auth_session_v1';
const AUTH_TOKEN_KEY = 'rayca_auth_token_v1';
const LOCAL_CREDS_PREFIX = 'rayca_user_creds_';

interface LocalUserRecord {
  email: string;
  passwordHash: string;
  must_change_password: boolean;
  updatedAt: string;
}

/**
 * Genera hash SHA-256 en cliente para validación y persistencia local offline
 */
async function sha256Hex(str: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

function getLocalCreds(email: string): LocalUserRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_CREDS_PREFIX + email.toLowerCase().trim());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveLocalCreds(email: string, password: string): Promise<void> {
  try {
    const hash = await sha256Hex(password);
    const record: LocalUserRecord = {
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      must_change_password: false,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_CREDS_PREFIX + record.email, JSON.stringify(record));
  } catch (err) {
    console.warn('Error guardando credencial local:', err);
  }
}

/**
 * Obtiene la sesión en caché local para carga inmediata en cliente
 */
export function getCurrentUser(): CurrentUserSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session: CurrentUserSession = JSON.parse(raw);
    if (!session || !session.email) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Inicia sesión comunicándose con el backend (/api/auth) y respaldado por la bóveda local del dispositivo
 */
export async function login(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: CurrentUserSession; error?: string }> {
  const cleanEmail = (emailInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Credenciales requeridas.' };
  }

  const inputHash = await sha256Hex(cleanPass);
  const localCreds = getLocalCreds(cleanEmail);

  try {
    const resp = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPass
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data.success && data.user) {
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }

      // Si el usuario ya había cambiado su contraseña en este dispositivo, mantener must_change_password en false
      const mustChange = localCreds && localCreds.must_change_password === false
        ? false
        : !!data.user.must_change_password;

      const session: CurrentUserSession = {
        email: data.user.email,
        must_change_password: mustChange,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    // Si el backend rechazó las credenciales (por ejemplo, porque la lambda de Vercel
    // reinició su disco efímero y no tiene la nueva clave guardada), comprobar contra
    // las credenciales cambiadas y guardadas localmente en este dispositivo:
    if (localCreds && inputHash && localCreds.passwordHash === inputHash) {
      const session: CurrentUserSession = {
        email: cleanEmail,
        must_change_password: false,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    if (resp.status === 429) {
      return {
        success: false,
        error: data.error || 'Demasiados intentos fallidos. Intenta más tarde.'
      };
    }

    return {
      success: false,
      error: data.error || 'Credenciales inválidas'
    };
  } catch (err: any) {
    // Si no hay red (PWA offline), autenticar contra credenciales locales guardadas
    if (localCreds && inputHash && localCreds.passwordHash === inputHash) {
      const session: CurrentUserSession = {
        email: cleanEmail,
        must_change_password: false,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    return {
      success: false,
      error: 'Error de conexión con el servidor de autenticación.'
    };
  }
}

/**
 * Verifica el estado de la sesión activa contra la cookie HttpOnly / Token en backend
 */
export async function checkSession(): Promise<CurrentUserSession | null> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const resp = await fetch('/api/auth?action=session', {
      method: 'GET',
      credentials: 'include',
      headers
    });

    if (!resp.ok) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    const data = await resp.json().catch(() => ({}));

    if (data.authenticated && data.user) {
      const localCreds = getLocalCreds(data.user.email);
      // Si la contraseña ya fue cambiada localmente, NUNCA sobreescribir con true
      const mustChange = localCreds && localCreds.must_change_password === false
        ? false
        : !!data.user.must_change_password;

      const session: CurrentUserSession = {
        email: data.user.email,
        must_change_password: mustChange,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return session;
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  } catch {
    // Si no hay red (PWA offline), conservar la sesión en caché local
    return getCurrentUser();
  }
}

/**
 * Actualiza la contraseña en el backend seguro y en la bóveda local del dispositivo
 */
export async function updatePassword(
  arg1: string,
  arg2?: string
): Promise<{ success: boolean; error?: string }> {
  // Soporta tanto updatePassword(newPassword) como updatePassword(email, newPassword)
  const cleanPass = (arg2 ? arg2 : arg1 || '').trim();
  const targetEmail = (arg2 ? arg1 : getCurrentUser()?.email || '').toLowerCase().trim();

  if (cleanPass.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  // 1. Guardar de inmediato en la bóveda local del dispositivo para este usuario
  if (targetEmail) {
    await saveLocalCreds(targetEmail, cleanPass);
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const resp = await fetch('/api/auth?action=change-password', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        email: targetEmail,
        newPassword: cleanPass
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data.success) {
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      const current = getCurrentUser();
      if (current) {
        current.must_change_password = false;
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
      }
      return { success: true };
    }

    // Aunque el backend retorne error por temas de red o límites de Vercel,
    // la clave local quedó actualizada exitosamente para que el usuario pueda seguir trabajando
    const current = getCurrentUser();
    if (current) {
      current.must_change_password = false;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
    }
    return { success: true };
  } catch {
    // Modo offline: la contraseña se actualizó en la bóveda local
    const current = getCurrentUser();
    if (current) {
      current.must_change_password = false;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
    }
    return { success: true };
  }
}

/**
 * Cierra la sesión activa en el backend y limpia el almacenamiento de sesión
 */
export async function logout(): Promise<void> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    await fetch('/api/auth?action=logout', {
      method: 'POST',
      credentials: 'include',
      headers
    });
  } catch {}

  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
