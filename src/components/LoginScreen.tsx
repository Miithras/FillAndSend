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

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Credenciales inválidas');
      return;
    }

    setLoading(true);

    try {
      const result = await login(cleanEmail, cleanPass);
      if (result.success && result.user) {
        onShowToast('¡Bienvenido a RaycaDoc!');
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas');
      }
    } catch {
      setErrorMessage('Error de conexión con el servicio de autenticación.');
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
            Rayca<span>Doc</span>
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
            <label htmlFor="login-email">Correo electrónico</label>
            <div className="login-input-wrap">
              <input
                id="login-email"
                className="login-input"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="correo@ejemplo.com"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                className="login-input login-input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="hint" style={{ color: 'var(--slate)' }}>
              Ingresa tu contraseña de acceso autorizada.
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
          🔒 Conexión segura y cifrada · Datos protegidos
        </div>
      </div>
    </div>
  );
};
