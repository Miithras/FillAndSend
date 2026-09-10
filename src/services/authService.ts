export interface CurrentUserSession {
  email: string;
  must_change_password: boolean;
  loginAt: string;
}

const AUTH_SESSION_KEY = 'rayca_auth_session_v1';

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
 * Inicia sesión comunicándose exclusivamente con el backend (/api/auth)
 * Protegido contra enumeración de usuarios y con cookies HttpOnly/Secure.
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
      const session: CurrentUserSession = {
        email: data.user.email,
        must_change_password: !!data.user.must_change_password,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    // Manejar bloqueo por rate-limiting o credenciales inválidas genéricas
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
    return {
      success: false,
      error: 'Error de conexión con el servidor de autenticación.'
    };
  }
}

/**
 * Verifica el estado de la sesión activa contra la cookie HttpOnly en backend
 */
export async function checkSession(): Promise<CurrentUserSession | null> {
  try {
    const resp = await fetch('/api/auth?action=session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!resp.ok) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    const data = await resp.json().catch(() => ({}));

    if (data.authenticated && data.user) {
      const session: CurrentUserSession = {
        email: data.user.email,
        must_change_password: !!data.user.must_change_password,
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
 * Actualiza la contraseña en el backend seguro y remueve la bandera de cambio obligatorio
 */
export async function updatePassword(
  arg1: string,
  arg2?: string
): Promise<{ success: boolean; error?: string }> {
  // Soporta tanto updatePassword(newPassword) como updatePassword(email, newPassword)
  const cleanPass = (arg2 ? arg2 : arg1 || '').trim();

  if (cleanPass.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const resp = await fetch('/api/auth?action=change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({
        newPassword: cleanPass
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data.success) {
      // Actualizar sesión en caché local
      const current = getCurrentUser();
      if (current) {
        current.must_change_password = false;
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
      }
      return { success: true };
    }

    return {
      success: false,
      error: data.error || 'No se pudo actualizar la contraseña.'
    };
  } catch {
    return {
      success: false,
      error: 'Error de conexión al actualizar la contraseña.'
    };
  }
}

/**
 * Cierra la sesión activa en el backend y limpia el almacenamiento local
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth?action=logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  } catch {}
  localStorage.removeItem(AUTH_SESSION_KEY);
}
