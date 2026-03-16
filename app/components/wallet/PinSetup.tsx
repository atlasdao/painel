'use client';

import { useState, useCallback } from 'react';
import PinPad from './PinPad';

interface PinSetupProps {
  onComplete: (pin: string) => void;
  onSkip?: () => void;
}

export default function PinSetup({ onComplete, onSkip }: PinSetupProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirstPin = useCallback(async (pin: string) => {
    setError('');

    // Validate PIN strength
    try {
      const { validatePin } = await import('@/app/lib/wallet/pin-crypto');
      const validation = validatePin(pin);
      if (!validation.valid) {
        setError(validation.reason || 'PIN inválido');
        return;
      }
    } catch {
      // If pin-crypto not yet available, do basic validation
      if (pin.length !== 4) {
        setError('PIN deve ter 4 dígitos');
        return;
      }
    }

    setFirstPin(pin);
    setStep('confirm');
  }, []);

  const handleConfirmPin = useCallback((pin: string) => {
    setError('');

    if (pin !== firstPin) {
      setError('PINs não coincidem');
      setStep('create');
      setFirstPin('');
      return;
    }

    setLoading(true);
    onComplete(pin);
  }, [firstPin, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full transition-colors ${
          step === 'create' ? 'bg-[var(--accent)]' : 'bg-[var(--accent)]'
        }`} />
        <div className={`w-8 h-0.5 transition-colors ${
          step === 'confirm' ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
        }`} />
        <div className={`w-2 h-2 rounded-full transition-colors ${
          step === 'confirm' ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
        }`} />
      </div>

      {step === 'create' ? (
        <PinPad
          title="Crie seu PIN"
          subtitle="Escolha 4 dígitos para acesso rápido"
          onComplete={handleFirstPin}
          error={error}
        />
      ) : (
        <PinPad
          title="Confirme seu PIN"
          subtitle="Digite os mesmos 4 dígitos novamente"
          onComplete={handleConfirmPin}
          error={error}
          loading={loading}
        />
      )}

      {/* Skip option */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-6 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Pular
        </button>
      )}
    </div>
  );
}
