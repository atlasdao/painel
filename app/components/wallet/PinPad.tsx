'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Fingerprint, Delete } from 'lucide-react';

interface PinPadProps {
  title?: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  onForgot?: () => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
  error?: string;
  disabled?: boolean;
  cooldownSeconds?: number;
  loading?: boolean;
}

export default function PinPad({
  title = 'Digite seu PIN',
  subtitle,
  onComplete,
  onForgot,
  onBiometric,
  showBiometric = false,
  error,
  disabled = false,
  cooldownSeconds = 0,
  loading = false,
}: PinPadProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);
  const completedRef = useRef(false);
  const PIN_LENGTH = 4;

  // Shake animation on error
  useEffect(() => {
    if (error) {
      setShaking(true);
      const timer = setTimeout(() => {
        setShaking(false);
        setDigits([]);
        completedRef.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (digits.length === PIN_LENGTH && !completedRef.current && !disabled) {
      completedRef.current = true;
      const pin = digits.join('');
      // Small delay so user sees the last dot fill
      const timer = setTimeout(() => onComplete(pin), 150);
      return () => clearTimeout(timer);
    }
  }, [digits, onComplete, disabled]);

  const handleDigit = useCallback((digit: string) => {
    if (disabled || digits.length >= PIN_LENGTH || completedRef.current) return;
    setDigits(prev => [...prev, digit]);
  }, [disabled, digits.length]);

  const handleBackspace = useCallback(() => {
    if (disabled || completedRef.current) return;
    setDigits(prev => prev.slice(0, -1));
  }, [disabled]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || completedRef.current) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleDigit, handleBackspace]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const numberButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showBiometric ? 'bio' : '', '0', 'del'],
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto select-none">
      {/* Title */}
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h2>
      {subtitle && (
        <p className="text-sm text-[var(--text-secondary)] mb-4 text-center">{subtitle}</p>
      )}

      {/* PIN dots */}
      <div
        className={`flex gap-3 mb-6 mt-2 ${shaking ? 'animate-shake' : ''}`}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const isFilled = i < digits.length;
          const isLoading = loading && i === PIN_LENGTH - 1 && digits.length === PIN_LENGTH;

          return (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                isLoading
                  ? 'bg-[var(--accent)] animate-pulse'
                  : isFilled
                    ? 'bg-[var(--accent)] scale-110'
                    : 'bg-[var(--bg-tertiary)] border-2 border-[var(--border-default)]'
              }`}
            />
          );
        })}
      </div>

      {/* Cooldown message */}
      {cooldownSeconds > 0 && (
        <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Aguarde {formatCooldown(cooldownSeconds)} para tentar novamente
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 mb-3 text-center px-4">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {numberButtons.flat().map((key, index) => {
          if (key === '') {
            return <div key={index} className="h-14" />;
          }

          if (key === 'bio') {
            return (
              <button
                key={index}
                onClick={onBiometric}
                disabled={disabled}
                className="h-14 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30"
                aria-label="Biometria"
              >
                <Fingerprint className="w-6 h-6 text-[var(--accent)]" />
              </button>
            );
          }

          if (key === 'del') {
            return (
              <button
                key={index}
                onClick={handleBackspace}
                disabled={disabled}
                className="h-14 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30"
                aria-label="Apagar"
              >
                <Delete className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleDigit(key)}
              disabled={disabled || cooldownSeconds > 0}
              className="h-14 flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xl font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Forgot PIN link */}
      {onForgot && (
        <button
          onClick={onForgot}
          className="mt-5 text-sm text-[var(--accent)] hover:underline"
        >
          Esqueceu? Usar senha
        </button>
      )}

      {/* Shake animation keyframes */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
