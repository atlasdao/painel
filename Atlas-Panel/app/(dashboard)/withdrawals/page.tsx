'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowUpRight, DollarSign, Loader2, TrendingUp,
  Clock, X, CheckCircle, XCircle, Info,
  Copy, FileText, ArrowLeft, Timer
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { withdrawalService } from '@/app/lib/services';
import api from '@/app/lib/api';
import { validatePixKey, detectPixKeyType, getPixKeyTypeLabel } from '@/app/lib/validators/pix';
import WithdrawalReceipt from '@/app/components/WithdrawalReceipt';

enum PixKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  RANDOM_KEY = 'RANDOM_KEY',
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  status: string;
  statusReason?: string;
  requestedAt: string;
  scheduledFor: string;
  processedAt?: string;
  pixKey?: string;
  pixKeyType?: string;
  depixReceiveAddress?: string;
  pollingExpiresAt?: string;
}

type ViewState = 'form' | 'awaiting-deposit' | 'list';

const FEE_PERCENTAGE = 0.025;
const SMALL_AMOUNT_FIXED_FEE = 1.0;
const SMALL_AMOUNT_THRESHOLD = 100;
const MIN_AMOUNT = 2;

export default function WithdrawalsPage() {
  const router = useRouter();

  // View states
  const [view, setView] = useState<ViewState>('list');
  const [activeWithdrawal, setActiveWithdrawal] = useState<any>(null);

  // Data
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Loading
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Form
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | null>(null);
  const [userPixKey, setUserPixKey] = useState<string | null>(null);
  const [userPixKeyType, setUserPixKeyType] = useState<PixKeyType | null>(null);
  const [useDefaultPixKey, setUseDefaultPixKey] = useState(true);
  const [savePixKey, setSavePixKey] = useState(false);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptWithdrawal, setReceiptWithdrawal] = useState<any>(null);

  // Deposit waiting
  const [timeRemaining, setTimeRemaining] = useState('');
  const [copied, setCopied] = useState(false);
  const [depositMessage, setDepositMessage] = useState('');

  // Fetch functions
  const fetchWithdrawals = useCallback(async () => {
    try {
      const data = await withdrawalService.getUserWithdrawals();
      setWithdrawals(data);
      return data;
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      return [];
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await withdrawalService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get('/profile');
      if (response.data?.pixKey) {
        setUserPixKey(response.data.pixKey);
        setUserPixKeyType(response.data.pixKeyType);
        setPixKey(response.data.pixKey);
        setPixKeyType(response.data.pixKeyType);
        setUseDefaultPixKey(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsPageLoading(true);
      const [withdrawalsList] = await Promise.all([
        fetchWithdrawals(),
        fetchStats(),
        fetchUserProfile(),
      ]);

      setIsPageLoading(false);
    };
    loadData();
  }, []);

  // Fee calculation
  const calculateFees = useCallback(() => {
    const value = parseFloat(amount) || 0;
    let fee = value * FEE_PERCENTAGE;
    if (value < SMALL_AMOUNT_THRESHOLD) {
      fee += SMALL_AMOUNT_FIXED_FEE;
    }
    const netAmount = value - fee;
    return { fee, netAmount };
  }, [amount]);

  // Submit withdrawal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const value = parseFloat(amount);

    if (!value || value < MIN_AMOUNT) {
      setError(`Valor mínimo para saque é ${formatCurrency(MIN_AMOUNT)}`);
      setLoading(false);
      return;
    }

    if (!pixKey) {
      setError('Chave PIX é obrigatória');
      setLoading(false);
      return;
    }

    const pixValidation = validatePixKey(pixKey);
    if (!pixValidation.isValid) {
      setError(pixValidation.error || 'Chave PIX inválida');
      setLoading(false);
      return;
    }

    const detectedType = detectPixKeyType(pixKey);
    const typeMapping: Record<string, PixKeyType> = {
      'cpf': PixKeyType.CPF,
      'cnpj': PixKeyType.CNPJ,
      'email': PixKeyType.EMAIL,
      'phone': PixKeyType.PHONE,
      'random': PixKeyType.RANDOM_KEY,
    };

    try {
      const result = await withdrawalService.create({
        amount: value,
        pixKey,
        pixKeyType: detectedType ? typeMapping[detectedType] : (pixKeyType || PixKeyType.CPF),
        cpfCnpj: '',
        fullName: '',
        savePixKey: savePixKey && !userPixKey && pixKey ? true : false,
      });

      setActiveWithdrawal(result);
      setView('awaiting-deposit');
      setAmount('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  // Polling for deposit status
  useEffect(() => {
    if (view !== 'awaiting-deposit' || !activeWithdrawal?.id) return;

    const poll = async () => {
      try {
        const status = await withdrawalService.checkDepositStatus(activeWithdrawal.id);
        if (status.status === 'PENDING') {
          setDepositMessage('Depósito recebido! Aguardando aprovação.');
          setTimeout(() => {
            setView('list');
            setActiveWithdrawal(null);
            setDepositMessage('');
            fetchWithdrawals();
            fetchStats();
          }, 3000);
          return;
        }
        if (status.status === 'EXPIRED') {
          setDepositMessage('expired');
          return;
        }
        if (status.receivedAmount && status.expectedAmount && status.receivedAmount < status.expectedAmount) {
          const diff = status.expectedAmount - status.receivedAmount;
          setDepositMessage(`Recebido parcialmente. Faltam ${formatCurrency(diff)}.`);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [view, activeWithdrawal?.id]);

  // Countdown timer
  useEffect(() => {
    const expiresAt = activeWithdrawal?.pollingExpiresAt;
    if (view !== 'awaiting-deposit' || !expiresAt) return;

    const tick = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeRemaining('00:00');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [view, activeWithdrawal?.pollingExpiresAt]);

  // Cancel withdrawal
  const cancelWithdrawal = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este saque?')) return;
    try {
      await withdrawalService.cancelWithdrawal(id);
      setSuccess('Saque cancelado com sucesso');
      if (activeWithdrawal?.id === id) {
        setView('list');
        setActiveWithdrawal(null);
      }
      fetchWithdrawals();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar saque');
    }
  };

  // Receipt
  const viewReceipt = async (withdrawal: WithdrawalRequest) => {
    try {
      const data = await withdrawalService.getReceipt(withdrawal.id);
      setReceiptData(data);
      setReceiptWithdrawal(withdrawal);
      setShowReceipt(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar comprovante');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'text-yellow-700 dark:text-yellow-400';
      case 'PENDING': return 'text-blue-700 dark:text-blue-400';
      case 'APPROVED': return 'text-blue-700 dark:text-blue-400';
      case 'PROCESSING': return 'text-blue-700 dark:text-blue-400 animate-pulse';
      case 'COMPLETED': return 'text-green-700 dark:text-green-400';
      case 'REJECTED': return 'text-red-700 dark:text-red-400';
      case 'FAILED': return 'text-red-700 dark:text-red-400';
      case 'EXPIRED': return 'text-[var(--text-muted)]';
      case 'CANCELLED': return 'text-[var(--text-muted)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'bg-yellow-100 dark:bg-yellow-400/10 border-yellow-300 dark:border-yellow-400/20';
      case 'PENDING': return 'bg-blue-100 dark:bg-blue-400/10 border-blue-300 dark:border-blue-400/20';
      case 'APPROVED': return 'bg-blue-100 dark:bg-blue-400/10 border-blue-300 dark:border-blue-400/20';
      case 'PROCESSING': return 'bg-blue-100 dark:bg-blue-400/10 border-blue-300 dark:border-blue-400/20';
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-400/10 border-green-300 dark:border-green-400/20';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-400/10 border-red-300 dark:border-red-400/20';
      case 'FAILED': return 'bg-red-100 dark:bg-red-400/10 border-red-300 dark:border-red-400/20';
      case 'EXPIRED': return 'bg-zinc-100 dark:bg-zinc-400/10 border-zinc-300 dark:border-zinc-400/20';
      case 'CANCELLED': return 'bg-zinc-100 dark:bg-zinc-400/10 border-zinc-300 dark:border-zinc-400/20';
      default: return 'bg-zinc-100 dark:bg-zinc-400/10 border-zinc-300 dark:border-zinc-400/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'Aguardando Depósito';
      case 'PENDING': return 'Depósito Recebido';
      case 'APPROVED': return 'Aprovado';
      case 'PROCESSING': return 'Processando PIX';
      case 'COMPLETED': return 'Concluído';
      case 'REJECTED': return 'Rejeitado';
      case 'FAILED': return 'Falhou';
      case 'EXPIRED': return 'Expirado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const { fee, netAmount } = calculateFees();

  // Page loading
  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  // ============ AWAITING DEPOSIT VIEW ============
  if (view === 'awaiting-deposit' && activeWithdrawal) {
    const isExpired = depositMessage === 'expired';
    const isReceived = depositMessage.includes('Depósito recebido');

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => { setView('list'); setActiveWithdrawal(null); setDepositMessage(''); fetchWithdrawals(); fetchStats(); }}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            {isReceived ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-400/10 flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Depósito Recebido!</h2>
                <p className="text-[var(--text-muted)]">Aguardando aprovação do administrador.</p>
              </>
            ) : isExpired ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-400/10 flex items-center justify-center">
                  <XCircle size={32} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Saque Expirado</h2>
                <p className="text-[var(--text-muted)]">O tempo para depósito expirou. Tente novamente.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-soft)] flex items-center justify-center animate-pulse">
                  <Timer size={32} className="text-[var(--accent)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Aguardando Depósito</h2>
                <p className="text-[var(--text-muted)]">Envie o valor em DePix para o endereço abaixo</p>
              </>
            )}
          </div>

          {!isExpired && !isReceived && (
            <>
              {/* Amount */}
              <div className="text-center mb-6">
                <p className="text-sm text-[var(--text-muted)] mb-1">Valor a enviar (DePix)</p>
                <p className="text-3xl font-bold text-[var(--accent)]">
                  {formatCurrency(activeWithdrawal.amount)}
                </p>
              </div>

              {/* Address */}
              <div className="mb-6">
                <p className="text-sm text-[var(--text-muted)] mb-2">Endereço Liquid para depósito</p>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-default)]">
                  <code className="flex-1 text-sm text-[var(--text-secondary)] font-mono break-all">
                    {activeWithdrawal.depixReceiveAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(activeWithdrawal.depixReceiveAddress)}
                    className="shrink-0 p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {copied ? (
                      <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy size={18} className="text-[var(--text-secondary)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Timer */}
              <div className="text-center mb-6">
                <p className="text-sm text-[var(--text-muted)] mb-1">Tempo restante</p>
                <p className="text-2xl font-mono font-bold text-[var(--text-secondary)]">{timeRemaining}</p>
                {/* Progress bar */}
                {activeWithdrawal.pollingExpiresAt && (
                  <div className="mt-3 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, Math.min(100,
                          ((new Date(activeWithdrawal.pollingExpiresAt).getTime() - Date.now()) /
                            (30 * 60 * 1000)) * 100
                        ))}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Partial deposit message */}
              {depositMessage && !isReceived && !isExpired && (
                <div className="mb-6 p-3 bg-yellow-100 dark:bg-yellow-400/10 border border-yellow-300 dark:border-yellow-400/20 rounded-lg text-center">
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm">{depositMessage}</p>
                </div>
              )}

              {/* Spinner */}
              <div className="flex items-center justify-center gap-3 mb-6 text-[var(--text-muted)]">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Aguardando depósito...</span>
              </div>

              {/* Cancel */}
              <div className="text-center">
                <button
                  onClick={() => cancelWithdrawal(activeWithdrawal.id)}
                  className="px-6 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg transition-colors text-sm"
                >
                  Cancelar Saque
                </button>
              </div>
            </>
          )}

          {/* Expired actions */}
          {isExpired && (
            <div className="text-center">
              <button
                onClick={() => { setView('form'); setActiveWithdrawal(null); setDepositMessage(''); }}
                className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ FORM VIEW ============
  if (view === 'form') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="mb-6 animate-slide-up">
          <h1 className="text-3xl font-bold text-[var(--accent)]">
            Novo Saque
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Preencha os dados para solicitar um saque via PIX</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30 rounded-lg">
              <span className="text-green-600 dark:text-green-400 text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min={MIN_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-[var(--accent)] transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                required
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Mínimo: {formatCurrency(MIN_AMOUNT)}</p>
            </div>

            {/* PIX key selection */}
            {userPixKey && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Chave PIX para Recebimento</label>
                <div className="space-y-2">
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={useDefaultPixKey}
                        onChange={() => {
                          setUseDefaultPixKey(true);
                          setPixKey(userPixKey);
                          setPixKeyType(userPixKeyType);
                          setSavePixKey(false);
                        }}
                        className="mr-3 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <div className="flex-1">
                        <span className="text-[var(--text-primary)] font-medium text-sm">Usar minha chave PIX salva</span>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {getPixKeyTypeLabel(userPixKeyType || '')}: {userPixKey}
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={!useDefaultPixKey}
                        onChange={() => {
                          setUseDefaultPixKey(false);
                          setPixKey('');
                          setPixKeyType(PixKeyType.CPF);
                        }}
                        className="mr-3 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-[var(--text-primary)] font-medium text-sm">Usar outra chave PIX</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PIX key fields */}
            {(!userPixKey || !useDefaultPixKey) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipo de Chave PIX</label>
                    <select
                      value={pixKeyType || ''}
                      onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                      className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-[var(--accent)] transition-all text-[var(--text-primary)]"
                    >
                      <option value={PixKeyType.CPF}>CPF</option>
                      <option value={PixKeyType.CNPJ}>CNPJ</option>
                      <option value={PixKeyType.EMAIL}>E-mail</option>
                      <option value={PixKeyType.PHONE}>Telefone</option>
                      <option value={PixKeyType.RANDOM_KEY}>Chave Aleatória</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Chave PIX</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => {
                        setPixKey(e.target.value);
                        const detected = detectPixKeyType(e.target.value);
                        if (detected) {
                          const typeMapping: Record<string, PixKeyType> = {
                            'cpf': PixKeyType.CPF, 'cnpj': PixKeyType.CNPJ,
                            'email': PixKeyType.EMAIL, 'phone': PixKeyType.PHONE,
                            'random': PixKeyType.RANDOM_KEY,
                          };
                          setPixKeyType(typeMapping[detected] || PixKeyType.CPF);
                        }
                      }}
                      placeholder="Digite sua chave PIX"
                      className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-[var(--accent)] transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      required
                    />
                  </div>
                </div>

                {/* Save PIX key */}
                {!userPixKey && pixKey && (
                  <label className="flex items-center cursor-pointer p-3 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-lg hover:bg-[var(--accent-soft)] transition-colors">
                    <input
                      type="checkbox"
                      checked={savePixKey}
                      onChange={(e) => setSavePixKey(e.target.checked)}
                      className="mr-3 text-[var(--accent)] focus:ring-[var(--accent)] rounded"
                    />
                    <div className="flex-1">
                      <span className="text-[var(--text-primary)] font-medium text-sm">Salvar esta chave PIX para próximos saques</span>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Você poderá usar esta chave como padrão</p>
                    </div>
                  </label>
                )}
              </>
            )}

            {/* Fee summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] animate-slide-up">
                <div className="flex justify-between mb-2">
                  <span className="text-[var(--text-muted)] text-sm">Valor Solicitado:</span>
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-[var(--text-muted)] text-sm">
                    Taxa ({(FEE_PERCENTAGE * 100).toFixed(1)}%{parseFloat(amount) < SMALL_AMOUNT_THRESHOLD ? ` + ${formatCurrency(SMALL_AMOUNT_FIXED_FEE)}` : ''}):
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                    - {formatCurrency(fee)}
                  </span>
                </div>
                <div className="border-t border-[var(--border-default)] pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] text-sm">Valor Líquido (PIX):</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[var(--text-primary)]"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowUpRight size={20} />
                  Solicitar Saque
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============ LIST VIEW (default) ============
  return (
    <div className="p-6">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-4xl font-bold mb-2 text-[var(--accent)]">
          Saques
        </h1>
        <p className="text-[var(--text-muted)] text-lg">Solicite e acompanhe seus saques via PIX</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 card-lift group animate-bounce-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-muted)] text-sm font-medium">Total de Saques</span>
              <div className="p-2 bg-[var(--accent-soft)] rounded-lg group-hover:bg-[var(--accent-soft)] transition-colors">
                <DollarSign size={20} className="text-[var(--accent)]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.completed || 0}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Saques realizados</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 card-lift group animate-bounce-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-muted)] text-sm font-medium">Pendentes</span>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-400/10 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-400/20 transition-colors">
                <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.pending || 0}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Aguardando processamento</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 card-lift group animate-bounce-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-muted)] text-sm font-medium">Total Sacado</span>
              <div className="p-2 bg-[var(--accent-soft)] rounded-lg group-hover:bg-[var(--accent-soft)] transition-colors">
                <TrendingUp size={20} className="text-[var(--accent)]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(stats.completedNetAmount || 0)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Valor líquido realizado</p>
          </div>
        </div>
      )}

      {/* New Withdrawal Button */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: '350ms' }}>
        <button
          onClick={() => { setError(''); setSuccess(''); setView('form'); }}
          className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg font-medium transition-colors flex items-center gap-2 text-[var(--text-primary)]"
        >
          <ArrowUpRight size={20} />
          Novo Saque
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30 rounded-lg">
          <span className="text-green-600 dark:text-green-400 text-sm">{success}</span>
        </div>
      )}

      {/* History */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="text-[var(--text-muted)]" size={20} />
            Histórico de Saques
          </h2>
        </div>

        {/* Mobile cards + Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table-modern w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Taxa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Líquido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {new Date(w.requestedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {formatCurrency(w.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(w.fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {formatCurrency(w.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBg(w.status)} ${getStatusColor(w.status)}`}>
                      {getStatusText(w.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {w.status === 'AWAITING_DEPOSIT' && (
                        <>
                          <button
                            onClick={() => { setActiveWithdrawal(w); setView('awaiting-deposit'); }}
                            className="text-[var(--accent)] hover:opacity-80 text-xs font-medium"
                          >
                            Depositar
                          </button>
                          <button
                            onClick={() => cancelWithdrawal(w.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-xs"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {w.status === 'PENDING' && (
                        <button
                          onClick={() => cancelWithdrawal(w.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-xs"
                        >
                          Cancelar
                        </button>
                      )}
                      {w.status === 'COMPLETED' && (
                        <button
                          onClick={() => viewReceipt(w)}
                          className="text-[var(--accent)] hover:opacity-80 text-xs font-medium flex items-center gap-1"
                        >
                          <FileText size={12} />
                          Comprovante
                        </button>
                      )}
                      {(w.status === 'REJECTED' || w.status === 'FAILED') && w.statusReason && (
                        <button
                          onClick={() => { setSelectedReason(w.statusReason!); setShowReasonModal(true); }}
                          className="text-[var(--accent)] hover:opacity-80 text-xs flex items-center gap-1"
                        >
                          <Info size={12} />
                          Ver Motivo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    Nenhum saque encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--border-default)]">
          {withdrawals.map((w) => (
            <div key={w.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  {new Date(w.requestedAt).toLocaleDateString('pt-BR')}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBg(w.status)} ${getStatusColor(w.status)}`}>
                  {getStatusText(w.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{formatCurrency(w.amount)}</p>
                  <p className="text-xs text-[var(--text-muted)]">Taxa: {formatCurrency(w.fee)}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(w.netAmount)}</p>
                  <p className="text-xs text-[var(--text-muted)]">Líquido</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {w.status === 'AWAITING_DEPOSIT' && (
                  <>
                    <button
                      onClick={() => { setActiveWithdrawal(w); setView('awaiting-deposit'); }}
                      className="text-[var(--accent)] hover:opacity-80 text-xs font-medium"
                    >
                      Depositar
                    </button>
                    <button
                      onClick={() => cancelWithdrawal(w.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-xs"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {w.status === 'PENDING' && (
                  <button
                    onClick={() => cancelWithdrawal(w.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-xs"
                  >
                    Cancelar
                  </button>
                )}
                {w.status === 'COMPLETED' && (
                  <button
                    onClick={() => viewReceipt(w)}
                    className="text-[var(--accent)] hover:opacity-80 text-xs font-medium flex items-center gap-1"
                  >
                    <FileText size={12} />
                    Comprovante
                  </button>
                )}
                {(w.status === 'REJECTED' || w.status === 'FAILED') && w.statusReason && (
                  <button
                    onClick={() => { setSelectedReason(w.statusReason!); setShowReasonModal(true); }}
                    className="text-[var(--accent)] hover:opacity-80 text-xs flex items-center gap-1"
                  >
                    <Info size={12} />
                    Ver Motivo
                  </button>
                )}
              </div>
            </div>
          ))}
          {withdrawals.length === 0 && (
            <div className="px-6 py-12 text-center text-[var(--text-muted)]">
              Nenhum saque encontrado
            </div>
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                Motivo
              </h3>
              <button
                onClick={() => setShowReasonModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="p-4 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg">
                <p className="text-red-600 dark:text-red-300 leading-relaxed text-sm">{selectedReason}</p>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <WithdrawalReceipt
          isOpen={showReceipt}
          onClose={() => { setShowReceipt(false); setReceiptData(null); setReceiptWithdrawal(null); }}
          receiptData={receiptData}
          withdrawal={receiptWithdrawal}
        />
      )}
    </div>
  );
}