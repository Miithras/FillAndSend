import React, { useState } from 'react';
import { login, CurrentUserSession } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: CurrentUserSession) => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onShowToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, ingresa tu correo institucional.');
      return;
    }

    // Si el usuario escribió solo su usuario sin dominio, autocompletar @raycaingenieria.com
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@raycaingenieria.com`;
      setEmail(cleanEmail);
    }

    if (!password) {
      setErrorMessage('Por favor, ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(cleanEmail, password);
      if (result.success && result.user) {
        onShowToast(`¡Bienvenido a ART Digital!`);
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al validar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-badge">SEGURIDAD PWA</div>
          <h1 className="login-title">
            ART <span>Digital</span>
          </h1>
          <div className="login-company">RAYCA INGENIERÍA SpA</div>
          <p className="login-desc">
            Acceso restringido exclusivamente a colaboradores autorizados en terreno.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-alert" role="alert">
            <span className="login-error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="login-email">Correo institucional</label>
            <div className="login-input-group">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="usuario@raycaingenieria.com"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
            <div className="hint" style={{ color: 'var(--slate)' }}>
              Solo dominios <b>@raycaingenieria.com</b>
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="hint" style={{ color: 'var(--slate)' }}>
              Si es tu primer ingreso, utiliza la clave temporal asignada.
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Verificando credenciales...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          🔒 Conexión segura y cifrada · Datos protegidos localmente
        </div>
      </div>
    </div>
  );
};
