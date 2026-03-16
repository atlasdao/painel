'use client';

import { useState } from 'react';
import { Fingerprint, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface BiometricEnrollPromptProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function BiometricEnrollPrompt({ userId, onComplete, onSkip }: BiometricEnrollPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    if (!password || loading) return;
    setError('');
    setLoading(true);

    try {
      const { registerBiometric } = await import('@/app/lib/wallet/webauthn');
      const { walletCache } = await import('@/app/lib/wallet/wallet-cache');

      const credential = await registerBiometric(userId, password);
      walletCache.setBiometricCredential(userId, credential);

      // Update settings
      const settings = walletCache.getSettings(userId);
      walletCache.setSettings(userId, { ...settings, biometricEnabled: true });

      onComplete();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Autenticação biométrica cancelada');
      } else {
        setError(err.message || 'Falha ao ativar biometria');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto text-center space-y-6">
      <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mx-auto">
        <Fingerprint className="w-8 h-8 text-[var(--accent)]" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Usar biometria?</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Desbloqueie sua carteira com impressão digital ou reconhecimento facial
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirme sua senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10 text-center"
            autoFocus
            autoComplete="off"
            onKeyDown={e => e.key === 'Enter' && handleEnable()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <button
          onClick={handleEnable}
          disabled={loading || !password}
          className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4" />
              Ativar biometria
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Pular
        </button>
      </div>
    </div>
  );
}
