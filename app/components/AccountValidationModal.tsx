'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Shield, Loader, CheckCircle, Clock, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { accountValidationService, pixService } from '@/app/lib/services';
import QRCode from 'qrcode';

interface AccountValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWallet?: string | null;
}

export default function AccountValidationModal({
  isOpen,
  onClose,
  onSuccess,
  defaultWallet
}: AccountValidationModalProps) {
  const [loading, setLoading] = useState(false);
  const [validationAmount, setValidationAmount] = useState<number>(2.0);
  const [useCustomWallet, setUseCustomWallet] = useState(false);
  const [customDepixAddress, setCustomDepixAddress] = useState('');
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode: string;
    pixKey: string;
    expiresAt: Date;
    transactionId?: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [copied, setCopied] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch dynamic validation amount on component mount
  useEffect(() => {
    const fetchValidationAmount = async () => {
      try {
        const amount = await accountValidationService.getCurrentValidationAmount();
        setValidationAmount(amount);
      } catch (error) {
        console.warn('Failed to fetch validation amount, using default:', error);
      }
    };

    if (isOpen) {
      fetchValidationAmount();
    }
  }, [isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      // Reset state after modal close animation
      setTimeout(() => {
        setQrCodeData(null);
        setPaymentStatus('idle');
        setCustomDepixAddress('');
        setUseCustomWallet(false);
        setCopied(false);
      }, 300);
    }
  }, [isOpen]);

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const startPollingValidationPaymentStatus = (transactionId: string) => {
    // Clear any existing polling
    stopPolling();

    // Start polling every 5 seconds
    pollingInterval.current = setInterval(async () => {
      await checkValidationPaymentStatus(transactionId);
    }, 5000);

    // Also check immediately
    checkValidationPaymentStatus(transactionId);
  };

  const checkValidationPaymentStatus = async (transactionId: string) => {
    try {
      // Check if account is already validated
      const currentValidationStatus = await accountValidationService.getValidationStatus();
      if (currentValidationStatus.isValidated) {
        setPaymentStatus('completed');
        stopPolling();
        toast.success('Conta validada com sucesso!');

        // Call success callback and reload page
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }

      // Try manual validation check
      try {
        await accountValidationService.manualValidationCheck();
        const updatedValidationStatus = await accountValidationService.getValidationStatus();
        if (updatedValidationStatus.isValidated) {
          setPaymentStatus('completed');
          stopPolling();
          toast.success('Conta validada com sucesso!');
          if (onSuccess) onSuccess();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (error) {
        console.log('Manual validation check failed, trying deposit status check...');
      }

      // Check payment status via Eulen API
      const status = await pixService.checkDepositStatus(transactionId);

      if (status.status === 'COMPLETED') {
        setPaymentStatus('processing');
        toast('Pagamento confirmado! Processando validacao de conta...', {
          icon: '⏳',
        });
      } else if (status.status === 'PROCESSING') {
        if (paymentStatus !== 'processing') {
          setPaymentStatus('processing');
          toast('Pagamento recebido, processando confirmacao...', {
            icon: 'ℹ️',
          });
        }
      } else if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
        setPaymentStatus('failed');
        stopPolling();
        if (status.status === 'EXPIRED') {
          toast.error('QR Code de validacao expirado');
        } else {
          toast.error('Pagamento de validacao falhou ou foi cancelado');
        }
      }
    } catch (error: any) {
      console.error('Error checking validation payment status:', error);

      // Handle errors gracefully - continue polling
      if (error.response?.status === 503 || error.response?.status >= 500) {
        console.log('Payment service temporarily unavailable, will retry...');
        return;
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) {
        console.log('Network error, will retry...');
        return;
      }
    }
  };

  const handleValidationPayment = async () => {
    // Validate that we have a wallet address
    const walletToUse = useCustomWallet ? customDepixAddress : (defaultWallet || customDepixAddress);

    if (!walletToUse || walletToUse.trim() === '') {
      toast.error('Por favor, informe o endereco DePix');
      return;
    }

    setLoading(true);
    try {
      const payment = await accountValidationService.createValidationPayment(walletToUse);

      if (payment.qrCode && typeof payment.qrCode === 'string' && payment.qrCode.length > 0) {
        // Generate QR Code image
        const dataUrl = await QRCode.toDataURL(payment.qrCode, {
          type: 'image/png',
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
          width: 300,
        });

        setQrCodeData({
          qrCode: dataUrl,
          pixKey: payment.qrCode,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          transactionId: payment.transactionId,
        });
        setPaymentStatus('pending');
        toast.success('QR Code de validacao gerado!');

        // Start polling for payment confirmation
        if (payment.transactionId) {
          startPollingValidationPaymentStatus(payment.transactionId);
        }
      } else {
        toast.error('QR Code nao foi gerado corretamente');
      }
    } catch (error: any) {
      console.error('Error creating validation payment:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao criar pagamento de validacao';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!qrCodeData?.pixKey) return;

    try {
      await navigator.clipboard.writeText(qrCodeData.pixKey);
      setCopied(true);
      toast.success('Codigo PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar codigo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-primary)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">Validacao de Conta</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">Desbloqueie recursos avancados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex-shrink-0 ml-2"
            disabled={loading}
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {!qrCodeData ? (
            /* Step 1: Configuration */
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600/30 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-2">
                      <strong>Valor da validacao:</strong> R$ {validationAmount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm">
                      Apos o pagamento, sua conta sera validada automaticamente e voce podera ativar o Modo Comercio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Wallet Toggle - Only show if user has default wallet */}
              {defaultWallet && (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--bg-secondary)] rounded-lg gap-3">
                  <label className="text-sm font-medium text-[var(--text-primary)] flex-1 min-w-0">
                    Usar carteira personalizada
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomWallet(!useCustomWallet)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      useCustomWallet ? 'bg-yellow-600' : 'bg-[var(--bg-elevated)]'
                    }`}
                    disabled={loading}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useCustomWallet ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )}

              {/* Wallet Address Input */}
              {(!defaultWallet || useCustomWallet) && (
                <div className="transition-all duration-300">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Endereco DePix {!defaultWallet ? '(Obrigatorio)' : ''}
                  </label>
                  <input
                    type="text"
                    value={customDepixAddress}
                    onChange={(e) => setCustomDepixAddress(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-secondary)] border border-[var(--border-hover)] text-[var(--text-primary)] text-sm sm:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-[var(--text-muted)]"
                    placeholder={defaultWallet ? "Endereco DePix personalizado" : "Insira o endereco DePix"}
                    disabled={loading}
                  />
                  {!defaultWallet && (
                    <p className="text-xs text-[var(--text-muted)] mt-1.5">
                      Configure uma carteira padrao nas configuracoes para tornar este campo opcional
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm sm:text-base rounded-lg transition-colors font-medium touch-manipulation"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidationPayment}
                  className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 active:from-yellow-800 active:to-orange-800 text-[var(--text-primary)] text-sm sm:text-base rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  disabled={loading || (!defaultWallet && !customDepixAddress) || (useCustomWallet && !customDepixAddress)}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="animate-spin" size={16} />
                      <span>Gerando...</span>
                    </div>
                  ) : (
                    'Gerar QR Code'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: QR Code Display */
            <div className="space-y-4 sm:space-y-6">
              {/* Payment Status Banner */}
              {paymentStatus === 'pending' && (
                <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Aguardando Pagamento</p>
                      <p className="text-blue-600 dark:text-blue-400 text-xs">Escaneie o QR Code ou copie o codigo PIX</p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'processing' && (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Loader className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">Processando Validacao</p>
                      <p className="text-yellow-600 dark:text-yellow-400 text-xs">Pagamento confirmado, validando conta...</p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'completed' && (
                <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-green-700 dark:text-green-300 text-sm font-medium">Conta Validada!</p>
                      <p className="text-green-600 dark:text-green-400 text-xs">Recarregando pagina...</p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium">Pagamento Falhou</p>
                      <p className="text-red-600 dark:text-red-400 text-xs">Tente novamente</p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                <img
                  src={qrCodeData.qrCode}
                  alt="QR Code PIX"
                  className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto"
                />
              </div>

              {/* Payment Details */}
              <div className="bg-[var(--bg-secondary)] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[var(--border-default)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3 text-sm">Detalhes do Pagamento</h4>
                <div className="space-y-2.5 sm:space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">Valor:</span>
                    <span className="text-[var(--text-primary)] font-medium">R$ {validationAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">Tipo:</span>
                    <span className="text-[var(--text-primary)] text-right">Validacao de Conta</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">Expira em:</span>
                    <span className="text-[var(--text-primary)]">30 minutos</span>
                  </div>
                </div>

                {/* Copy PIX Key */}
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--border-default)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[var(--text-muted)] text-xs font-medium">Codigo PIX:</span>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 active:text-blue-400 dark:active:text-blue-200 text-xs transition-colors touch-manipulation p-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[var(--text-primary)] text-xs font-mono break-all bg-[var(--bg-primary)] p-2.5 sm:p-3 rounded border border-[var(--border-default)] max-h-20 overflow-y-auto">
                    {qrCodeData.pixKey}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/20 rounded-lg p-3 sm:p-4">
                <p className="text-blue-700 dark:text-blue-400 text-xs sm:text-sm leading-relaxed">
                  Escaneie o QR Code com seu app bancario ou copie o codigo PIX. O pagamento sera confirmado automaticamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
