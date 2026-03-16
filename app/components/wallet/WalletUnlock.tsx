'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, Fingerprint } from 'lucide-react';
import PinPad from './PinPad';

interface WalletUnlockProps {
  onUnlock: (password: string) => Promise<void>;
  onUnlockWithPin?: (pin: string) => Promise<string>;
  onUnlockWithMnemonic?: (mnemonic: string) => Promise<boolean>;
  error?: string | null;
  biometricAvailable?: boolean;
  onBiometricUnlock?: () => Promise<void>;
  pinEnabled?: boolean;
  pinLocked?: boolean;
  cooldownSeconds?: number;
  pinError?: string;
}

export default function WalletUnlock({
  onUnlock,
  onUnlockWithPin,
  onUnlockWithMnemonic,
  error: externalError,
  biometricAvailable,
  onBiometricUnlock,
  pinEnabled = false,
  pinLocked = false,
  cooldownSeconds = 0,
  pinError,
}: WalletUnlockProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [pinUnlockError, setPinUnlockError] = useState('');
  const autoTriggered = useRef(false);

  // Auto-trigger biometric on mount if PIN is not enabled
  useEffect(() => {
    if (!pinEnabled && biometricAvailable && onBiometricUnlock && !autoTriggered.current) {
      autoTriggered.current = true;
      handleBiometric();
    }
  }, [biometricAvailable, onBiometricUnlock, pinEnabled]);

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

  const handlePinComplete = async (pin: string) => {
    if (!onUnlockWithPin || !onUnlockWithMnemonic) return;

    setPinUnlockError('');
    try {
      const mnemonic = await onUnlockWithPin(pin);
      const success = await onUnlockWithMnemonic(mnemonic);
      if (!success) {
        setPinUnlockError('Falha ao desbloquear carteira');
      }
    } catch (err: any) {
      setPinUnlockError(err.message || 'PIN incorreto');
    }
  };

  const handleForgotPin = () => {
    setShowPasswordFallback(true);
    setPinUnlockError('');
  };

  const displayError = error || externalError;

  // PIN-first unlock mode
  if (pinEnabled && onUnlockWithPin && onUnlockWithMnemonic && !showPasswordFallback) {
    return (
      <div className="max-w-sm mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-[var(--text-muted)]" />
        </div>

        <PinPad
          title="Carteira Bloqueada"
          subtitle={biometricAvailable ? 'Use PIN ou biometria para desbloquear' : undefined}
          onComplete={handlePinComplete}
          onForgot={handleForgotPin}
          onBiometric={biometricAvailable && onBiometricUnlock ? handleBiometric : undefined}
          showBiometric={!!(biometricAvailable && onBiometricUnlock)}
          error={pinUnlockError || pinError}
          disabled={pinLocked}
          cooldownSeconds={cooldownSeconds}
          loading={loading}
        />
      </div>
    );
  }

  // Password-based unlock (original behavior or fallback)
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

      {/* Back to PIN link if PIN is enabled */}
      {showPasswordFallback && pinEnabled && (
        <button
          onClick={() => setShowPasswordFallback(false)}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Voltar para PIN
        </button>
      )}
    </div>
  );
}
