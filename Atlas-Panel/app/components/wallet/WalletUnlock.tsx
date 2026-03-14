'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, Fingerprint } from 'lucide-react';

interface WalletUnlockProps {
  onUnlock: (password: string) => Promise<void>;
  error?: string | null;
  biometricAvailable?: boolean;
  onBiometricUnlock?: () => Promise<void>;
}

export default function WalletUnlock({ onUnlock, error: externalError, biometricAvailable, onBiometricUnlock }: WalletUnlockProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const autoTriggered = useRef(false);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricAvailable && onBiometricUnlock && !autoTriggered.current) {
      autoTriggered.current = true;
      handleBiometric();
    }
  }, [biometricAvailable, onBiometricUnlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setError('');
    setLoading(true);
    try {
      await onUnlock(password);
    } catch (err: any) {
      setError(err.message || 'Senha incorreta');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!onBiometricUnlock || biometricLoading) return;

    setError('');
    setBiometricLoading(true);
    try {
      await onBiometricUnlock();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Falha na biometria. Use a senha.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const displayError = error || externalError;

  return (
    <div className="max-w-sm mx-auto text-center space-y-6">
      <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7 text-[var(--text-muted)]" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Carteira Bloqueada</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {biometricAvailable ? 'Use biometria ou senha para desbloquear.' : 'Digite sua senha para desbloquear.'}
        </p>
      </div>

      {biometricAvailable && onBiometricUnlock && (
        <>
          <button
            onClick={handleBiometric}
            disabled={biometricLoading}
            className="w-full py-4 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl flex items-center justify-center gap-3 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            {biometricLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Verificando...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-6 h-6 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Toque para desbloquear</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-xs">ou use a senha</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Senha da carteira"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10 text-center"
            autoFocus={!biometricAvailable}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {displayError && (
          <p className="text-sm text-red-500 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {displayError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Desbloqueando...
            </>
          ) : (
            'Desbloquear'
          )}
        </button>
      </form>
    </div>
  );
}
