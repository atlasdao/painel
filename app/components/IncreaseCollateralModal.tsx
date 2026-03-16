'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader, QrCode, Copy, Check, ArrowLeft, Wallet, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { collateralService } from '@/app/lib/services';

interface IncreaseCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentCollateral: number;
  maxCollateral?: number;
}

type ModalStep = 'method_selection' | 'amount_input' | 'pix_qrcode' | 'depix_address' | 'success' | 'excess_wallet' | 'error';

export default function IncreaseCollateralModal({
  isOpen,
  onClose,
  onSuccess,
  currentCollateral,
  maxCollateral = 6000,
}: IncreaseCollateralModalProps) {
  const [step, setStep] = useState<ModalStep>('method_selection');
  const [method, setMethod] = useState<'pix' | 'depix' | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // PIX data
  const [pixData, setPixData] = useState<{
    transactionId: string;
    qrCode: string;
    qrCodeImage: string;
    total: number;
    fee: number;
    expiresAt: Date;
  } | null>(null);

  // Depix data
  const [depixData, setDepixData] = useState<{
    transactionId: string;
    liquidAddress: string;
    pollingExpiresAt: Date;
  } | null>(null);

  // Timer for expiration
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Excess handling
  const [excessAmount, setExcessAmount] = useState<number | null>(null);
  const [excessWallet, setExcessWallet] = useState('');

  const available = maxCollateral - currentCollateral;
  const parsedAmount = parseFloat(amount) || 0;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('method_selection');
      setMethod(null);
      setAmount('');
      setPixData(null);
      setDepixData(null);
      setExcessAmount(null);
      setExcessWallet('');
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isOpen]);

  // Timer effect
  useEffect(() => {
    if (!pixData?.expiresAt && !depixData?.pollingExpiresAt) return;

    const expiresAt = pixData?.expiresAt || depixData?.pollingExpiresAt;
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        setStep('error');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [pixData?.expiresAt, depixData?.pollingExpiresAt, pollingInterval]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Start PIX flow
  const startPixFlow = async () => {
    setLoading(true);
    try {
      const response = await collateralService.increaseViaPix(parsedAmount);
      setPixData({
        ...response,
        expiresAt: new Date(response.expiresAt),
      });
      setStep('pix_qrcode');
      startPixPolling(response.transactionId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar QR code');
    } finally {
      setLoading(false);
    }
  };

  // Poll PIX status
  const startPixPolling = (transactionId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await collateralService.checkPixStatus(transactionId);
        if (status.status === 'completed') {
          clearInterval(interval);
          setPollingInterval(null);
          setStep('success');
          onSuccess?.();
        } else if (status.status === 'expired' || status.status === 'failed') {
          clearInterval(interval);
          setPollingInterval(null);
          setStep('error');
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);
    setPollingInterval(interval);
  };

  // Start Depix flow
  const startDepixFlow = async () => {
    setLoading(true);
    try {
      const response = await collateralService.increaseViaDepix(parsedAmount);
      setDepixData({
        ...response,
        pollingExpiresAt: new Date(response.pollingExpiresAt),
      });
      setStep('depix_address');
      startDepixPolling(response.transactionId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar endereco');
    } finally {
      setLoading(false);
    }
  };

  // Poll Depix status
  const startDepixPolling = (transactionId: string) => {
    let phase1Count = 0;
    const maxPhase1 = 48; // 4 min / 5s = 48

    const poll = async () => {
      try {
        const status = await collateralService.pollDepixStatus(transactionId);

        if (status.status === 'completed' || status.status === 'different_amount') {
          if (pollingInterval) clearInterval(pollingInterval);
          setPollingInterval(null);

          if (status.requiresExcessWallet && status.excessAmount) {
            setExcessAmount(status.excessAmount);
            setStep('excess_wallet');
          } else {
            setStep('success');
            onSuccess?.();
          }
        } else if (status.status === 'expired') {
          if (pollingInterval) clearInterval(pollingInterval);
          setPollingInterval(null);
          setStep('error');
        }
      } catch {
        // Ignore polling errors
      }
    };

    // Phase 1: every 5 seconds for 4 minutes
    const interval = setInterval(() => {
      poll();
      phase1Count++;

      // After 4 minutes, switch to phase 2 (every 10 seconds)
      if (phase1Count >= maxPhase1) {
        clearInterval(interval);
        const phase2Interval = setInterval(poll, 10000);
        setPollingInterval(phase2Interval);

        // Stop after 6 more minutes (10 min total)
        setTimeout(() => {
          clearInterval(phase2Interval);
          setPollingInterval(null);
        }, 6 * 60 * 1000);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // Submit excess wallet
  const submitExcessWallet = async () => {
    if (!depixData?.transactionId || !excessWallet) return;

    setLoading(true);
    try {
      await collateralService.setExcessWallet(depixData.transactionId, excessWallet);
      toast.success('Carteira registrada! O excesso sera enviado em ate 48h.');
      setStep('success');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar carteira');
    } finally {
      setLoading(false);
    }
  };

  // Validate amount
  const isValidAmount = parsedAmount >= 1 && parsedAmount <= available;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--bg-primary)] rounded-2xl border border-cyan-300 dark:border-cyan-500/30 shadow-xl animate-fadeIn overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            {step !== 'method_selection' && step !== 'success' && step !== 'error' && (
              <button
                onClick={() => {
                  if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                  }
                  if (step === 'amount_input') {
                    setStep('method_selection');
                    setMethod(null);
                  } else {
                    setStep('amount_input');
                    setPixData(null);
                    setDepixData(null);
                  }
                }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {step === 'method_selection' && 'Aumentar Colateral'}
              {step === 'amount_input' && (method === 'pix' ? 'Depositar via PIX' : 'Depositar via Depix')}
              {step === 'pix_qrcode' && 'Pague o QR Code'}
              {step === 'depix_address' && 'Envie Depix'}
              {step === 'success' && 'Sucesso!'}
              {step === 'excess_wallet' && 'Excesso Detectado'}
              {step === 'error' && 'Tempo Esgotado'}
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
          {/* Method Selection */}
          {step === 'method_selection' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-[var(--text-muted)] text-sm">
                  Colateral atual: <span className="text-cyan-600 dark:text-cyan-400 font-semibold">R$ {currentCollateral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Disponivel para deposito: R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <button
                onClick={() => {
                  setMethod('pix');
                  setStep('amount_input');
                }}
                className="w-full p-4 bg-gradient-to-r from-cyan-100 dark:from-cyan-600/20 to-blue-100 dark:to-blue-600/20 border border-cyan-300 dark:border-cyan-500/30 rounded-xl hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-200 dark:bg-cyan-500/20 rounded-lg group-hover:bg-cyan-300 dark:group-hover:bg-cyan-500/30 transition-colors">
                    <QrCode className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[var(--text-primary)] font-medium">PIX</h3>
                    <p className="text-[var(--text-muted)] text-sm">Pague via QR Code PIX (+ R$ 0,99 de taxa)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMethod('depix');
                  setStep('amount_input');
                }}
                className="w-full p-4 bg-gradient-to-r from-purple-100 dark:from-purple-600/20 to-pink-100 dark:to-pink-600/20 border border-purple-300 dark:border-purple-500/30 rounded-xl hover:border-purple-400 dark:hover:border-purple-500/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-200 dark:bg-purple-500/20 rounded-lg group-hover:bg-purple-300 dark:group-hover:bg-purple-500/30 transition-colors">
                    <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[var(--text-primary)] font-medium">Depix</h3>
                    <p className="text-[var(--text-muted)] text-sm">Envie Depix (sem taxa adicional)</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Amount Input */}
          {step === 'amount_input' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Valor do deposito
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    min="1"
                    max={available}
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-lg font-medium focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setAmount(available.toString())}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
                  >
                    Depositar maximo
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">Minimo: R$ 1,00</p>
                </div>
              </div>

              {method === 'pix' && parsedAmount > 0 && (
                <div className="p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Valor</span>
                    <span className="text-[var(--text-primary)]">R$ {parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-[var(--text-muted)]">Taxa</span>
                    <span className="text-[var(--text-primary)]">R$ 0,99</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] my-2" />
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-[var(--text-secondary)]">Total a pagar</span>
                    <span className="text-cyan-600 dark:text-cyan-400">R$ {(parsedAmount + 0.99).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {!isValidAmount && parsedAmount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {parsedAmount < 1
                      ? 'O valor minimo e R$ 1,00'
                      : `O valor maximo e R$ ${available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
              )}

              <button
                onClick={method === 'pix' ? startPixFlow : startDepixFlow}
                disabled={!isValidAmount || loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    {method === 'pix' ? 'Gerar QR Code' : 'Gerar Endereco'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* PIX QR Code */}
          {step === 'pix_qrcode' && pixData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl">
                  <img
                    src={pixData.qrCodeImage}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Expira em {formatTime(timeLeft)}</span>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)] mb-2">Copia e cola:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.qrCode}
                    readOnly
                    className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] text-xs truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(pixData.qrCode)}
                    className="px-3 py-2 bg-cyan-100 dark:bg-cyan-600/20 border border-cyan-300 dark:border-cyan-500/30 rounded-lg text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-600/30 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 rounded-lg">
                <Loader className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
                <p className="text-sm text-cyan-700 dark:text-cyan-300">Aguardando pagamento...</p>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)]">
                Total: R$ {pixData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Depix Address */}
          {step === 'depix_address' && depixData && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-purple-300 dark:border-purple-500/30">
                <p className="text-xs text-[var(--text-muted)] mb-2">Envie exatamente este valor em Depix:</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 text-center">
                  R$ {parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-[var(--bg-card)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)] mb-2">Para o endereco:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={depixData.liquidAddress}
                    readOnly
                    className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] text-xs truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(depixData.liquidAddress)}
                    className="px-3 py-2 bg-purple-100 dark:bg-purple-600/20 border border-purple-300 dark:border-purple-500/30 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-600/30 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Tempo restante: {formatTime(timeLeft)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 rounded-lg">
                <Loader className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                <p className="text-sm text-purple-700 dark:text-purple-300">Monitorando endereco...</p>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)]">
                Se enviar um valor diferente, ele sera adicionado ao seu colateral.
              </p>
            </div>
          )}

          {/* Excess Wallet */}
          {step === 'excess_wallet' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-[var(--text-primary)] font-medium">Excesso de R$ {excessAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-200/80">O limite maximo e R$ 6.000. Informe uma carteira para receber o excesso.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Carteira Liquid</label>
                <input
                  type="text"
                  value={excessWallet}
                  onChange={(e) => setExcessWallet(e.target.value)}
                  placeholder="lq1..."
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={submitExcessWallet}
                disabled={!excessWallet || loading}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Confirmar Carteira'
                )}
              </button>

              <p className="text-center text-xs text-[var(--text-muted)]">
                O saque do excesso sera processado em ate 48h.
              </p>
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
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Deposito Confirmado!</h3>
              <p className="text-[var(--text-muted)]">
                Seu colateral foi atualizado com sucesso.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-[var(--text-primary)] rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Tempo Esgotado</h3>
              <p className="text-[var(--text-muted)]">
                O tempo para pagamento expirou. Tente novamente.
              </p>
              <button
                onClick={() => {
                  setStep('method_selection');
                  setPixData(null);
                  setDepixData(null);
                  setAmount('');
                }}
                className="w-full py-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-secondary)] transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
