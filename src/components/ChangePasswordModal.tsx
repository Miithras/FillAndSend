import React, { useState } from 'react';
import { updatePassword } from '../services/authService';

interface ChangePasswordModalProps {
  email: string;
  isMandatory?: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  onShowToast: (msg: string, isErr?: boolean) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  email,
  isMandatory = false,
  onSuccess,
  onClose,
  onShowToast
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanPass.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (cleanPass === 'Rayca2026*' || cleanPass.toLowerCase() === 'rayca2026*') {
      setErrorMessage('Debes elegir una contraseña distinta a la clave temporal predeterminada.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(email, cleanPass);
      if (result.success) {
        onShowToast('✓ Contraseña actualizada. Notificación enviada a tu correo.');
        onSuccess();
      } else {
        setErrorMessage(result.error || 'No se pudo actualizar la contraseña.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <h3 style={{ margin: 0, fontSize: 19 }}>
            {isMandatory ? 'Cambio Obligatorio de Contraseña' : 'Cambiar Contraseña'}
          </h3>
        </div>

        <p className="sub" style={{ marginTop: 6, lineHeight: 1.45 }}>
          {isMandatory
            ? 'Por seguridad de RAYCA Ingeniería, debes definir una contraseña personal para acceder a la aplicación.'
            : 'Define tu nueva contraseña de acceso.'}
        </p>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
          <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Usuario: </span>
          <span style={{ color: 'var(--navy)', fontFamily: 'monospace', fontWeight: 700 }}>{email}</span>
        </div>

        {errorMessage && (
          <div className="login-error-alert" style={{ marginBottom: 14 }} role="alert">
            <span className="login-error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-pw">Nueva contraseña</label>
            <div className="login-password-wrap">
              <input
                id="new-pw"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="confirm-pw">Confirmar nueva contraseña</label>
            <div className="login-password-wrap">
              <input
                id="confirm-pw"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 14, lineHeight: 1.4 }}>
            ✉️ Al guardar se enviará un correo de confirmación de seguridad a tu bandeja institucional.
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '13px' }}
            disabled={loading}
          >
            {loading ? 'Guardando y notificando...' : 'Guardar y Continuar'}
          </button>

          {!isMandatory && onClose && (
            <button
              type="button"
              className="btn-ghost"
              style={{ width: '100%', textAlign: 'center', marginTop: 8 }}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
