'use client';

import { useState, useEffect } from 'react';
import { X, Loader, Wallet, AlertCircle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { collateralService } from '@/app/lib/services';
import { LiquidWalletValidator } from '@/app/lib/validators/wallet';

interface DecreaseCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentCollateral: number;
}

type ModalStep = 'amount_input' | 'wallet_input' | 'confirm' | 'success';

export default function DecreaseCollateralModal({
  isOpen,
  onClose,
  onSuccess,
  currentCollateral,
}: DecreaseCollateralModalProps) {
  const [step, setStep] = useState<ModalStep>('amount_input');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= 1 && parsedAmount <= currentCollateral;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('amount_input');
      setAmount('');
      setWalletAddress('');
      setWalletError(null);
      setRequestId(null);
    }
  }, [isOpen]);

  // Validate wallet address
  const validateWallet = (address: string) => {
    if (!address) {
      setWalletError(null);
      return;
    }

    const result = LiquidWalletValidator.validate(address);

    if (!result.valid) {
      setWalletError(result.error || 'Endereco invalido');
    } else {
      setWalletError(null);
    }
  };

  // Submit withdrawal request
  const submitWithdrawal = async () => {
    setLoading(true);
    try {
      const response = await collateralService.decreaseCollateral(
        parsedAmount,
        walletAddress,
      );
      setRequestId(response.requestId);
      setStep('success');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao solicitar saque');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--bg-primary)] rounded-2xl border border-orange-300 dark:border-orange-500/30 shadow-xl animate-fadeIn overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            {step !== 'amount_input' && step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'wallet_input') {
                    setStep('amount_input');
                  } else if (step === 'confirm') {
                    setStep('wallet_input');
                  }
                }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {step === 'amount_input' && 'Diminuir Colateral'}
              {step === 'wallet_input' && 'Carteira de Destino'}
              {step === 'confirm' && 'Confirmar Saque'}
              {step === 'success' && 'Solicitacao Enviada'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount Input */}
          {step === 'amount_input' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-[var(--text-muted)] text-sm">
                  Colateral disponivel para saque:
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  R$ {currentCollateral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Quanto deseja sacar?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    min="1"
                    max={currentCollateral}
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-lg font-medium focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setAmount(currentCollateral.toString())}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 transition-colors"
                  >
                    Sacar tudo
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">Minimo: R$ 1,00</p>
                </div>
              </div>

              {!isValidAmount && parsedAmount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {parsedAmount < 1
                      ? 'O valor minimo e R$ 1,00'
                      : `O valor maximo e R$ ${currentCollateral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep('wallet_input')}
                disabled={!isValidAmount}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Wallet Input */}
          {step === 'wallet_input' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Carteira Liquid para receber
                </label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => {
                      setWalletAddress(e.target.value);
                      validateWallet(e.target.value);
                    }}
                    placeholder="lq1..."
                    className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-card)] border rounded-lg text-[var(--text-primary)] focus:outline-none transition-colors ${
                      walletError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-[var(--border-default)] focus:border-orange-500'
                    }`}
                  />
                </div>
                {walletError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{walletError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  O saque pode levar ate 48 horas para ser processado.
                </p>
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!walletAddress || !!walletError}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revisar Saque
              </button>
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor do saque</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    R$ {parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Carteira</span>
                  <span className="text-[var(--text-primary)] font-mono text-sm">
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  </span>
                </div>
                <div className="border-t border-[var(--border-default)] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Prazo estimado</span>
                    <span className="text-amber-600 dark:text-amber-400">ate 48 horas</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[var(--bg-secondary)]/30 rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">
                  Apos a solicitacao, seu colateral sera reduzido imediatamente.
                  O valor sera enviado para sua carteira apos aprovacao da equipe.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('wallet_input')}
                  className="flex-1 py-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={submitWithdrawal}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Confirmar Saque'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 dark:bg-green-500/20 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Solicitacao Enviada!</h3>
              <p className="text-[var(--text-muted)]">
                Sua solicitacao de saque foi registrada e sera processada em ate 48 horas.
              </p>
              {requestId && (
                <p className="text-xs text-[var(--text-muted)]">
                  ID: {requestId.slice(0, 8)}...
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
