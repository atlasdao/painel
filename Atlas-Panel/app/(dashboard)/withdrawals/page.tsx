'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowUpRight, DollarSign, Loader2, TrendingUp, Clock, Tag, ChevronDown, X, CheckCircle, XCircle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';
import { validatePixKey, detectPixKeyType, getPixKeyTypeLabel } from '@/app/lib/validators/pix';

enum WithdrawalMethod {
  PIX = 'PIX',
}

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
  method: WithdrawalMethod;
  status: string;
  statusReason?: string;
  requestedAt: string;
  scheduledFor: string;
  processedAt?: string;
  pixKey?: string;
  pixKeyType?: string;
  liquidAddress?: string;
}

export default function WithdrawalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [method, setMethod] = useState<WithdrawalMethod>(WithdrawalMethod.PIX);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | null>(null);
  const [pixKeyError, setPixKeyError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponValidating, setCouponValidating] = useState(false);
  const [showCouponField, setShowCouponField] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [userPixKey, setUserPixKey] = useState<string | null>(null);
  const [userPixKeyType, setUserPixKeyType] = useState<PixKeyType | null>(null);
  const [useDefaultPixKey, setUseDefaultPixKey] = useState(true);
  const [savePixKey, setSavePixKey] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');

  const PIX_FEE_PERCENTAGE = 0.015; // 1.5%

  useEffect(() => {
    const loadData = async () => {
      setIsPageLoading(true);
      await Promise.all([fetchWithdrawals(), fetchStats(), fetchUserProfile()]);
      setIsPageLoading(false);
    };
    loadData();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/profile');
      if (response.data?.pixKey) {
        setUserPixKey(response.data.pixKey);
        setUserPixKeyType(response.data.pixKeyType);
        // Set as default if user has a saved PIX key
        setPixKey(response.data.pixKey);
        setPixKeyType(response.data.pixKeyType);
        setUseDefaultPixKey(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/withdrawals');
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/withdrawals/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateFees = () => {
    const value = parseFloat(amount) || 0;
    const fee = value * PIX_FEE_PERCENTAGE;

    // Apply coupon discount to fee
    const discountAmount = fee * (couponDiscount / 100);
    const finalFee = Math.max(0, fee - discountAmount);
    const netAmount = value - finalFee;

    return { fee: finalFee, originalFee: fee, discountAmount, netAmount };
  };

  const validateCoupon = async () => {
    if (!couponCode) {
      setCouponDiscount(0);
      return;
    }

    setCouponValidating(true);
    try {
      const response = await api.post('/withdrawals/validate-coupon', {
        code: couponCode,
        amount: parseFloat(amount) || 0,
        method
      });

      if (response.data.valid) {
        setCouponDiscount(response.data.discountPercentage);
        setSuccess(`Cupom aplicado: ${response.data.discountPercentage}% de desconto na taxa`);
      } else {
        setError(response.data.message || 'Cupom inválido');
        setCouponDiscount(0);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao validar cupom');
      setCouponDiscount(0);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const value = parseFloat(amount);

    // Minimum validation for PIX withdrawal
    const minAmount = 100;
    if (!value || value < minAmount) {
      setError(`Valor mínimo para saque PIX é ${formatCurrency(minAmount)}`);
      setLoading(false);
      return;
    }

    const { netAmount } = calculateFees();
    const minNetAmount = 100;
    if (netAmount < minNetAmount) {
      setError(`Valor líquido após taxa deve ser no mínimo ${formatCurrency(minNetAmount)} para PIX`);
      setLoading(false);
      return;
    }

    const payload: any = {
      amount: value,
      method,
      couponCode: couponCode || undefined,
      savePixKey: savePixKey && !userPixKey && pixKey ? true : false,
    };

    if (!pixKey) {
      setError('Chave PIX é obrigatória');
      setLoading(false);
      return;
    }

    // Validate PIX key
    const pixValidation = validatePixKey(pixKey);
    if (!pixValidation.isValid) {
      setError(pixValidation.error || 'Chave PIX inválida');
      setLoading(false);
      return;
    }

    // Map detected type to PixKeyType enum
    const detectedType = detectPixKeyType(pixKey);
    const typeMapping: Record<string, PixKeyType> = {
      'cpf': PixKeyType.CPF,
      'email': PixKeyType.EMAIL,
      'phone': PixKeyType.PHONE,
      'random': PixKeyType.RANDOM_KEY
    };

    payload.pixKey = pixKey;
    payload.pixKeyType = detectedType ? typeMapping[detectedType] : PixKeyType.CPF;

    try {
      const response = await api.post('/withdrawals', payload);
      setSuccess(response.data.message || 'Solicitação de saque criada com sucesso');
      setAmount('');
      setPixKey('');
      setCouponCode('');
      setCouponDiscount(0);
      fetchWithdrawals();
      fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const cancelWithdrawal = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este saque?')) return;

    try {
      await api.delete(`/withdrawals/${id}`);
      setSuccess('Saque cancelado com sucesso');
      fetchWithdrawals();
      fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao cancelar saque');
    }
  };

  const showReason = (reason: string) => {
    setSelectedReason(reason);
    setShowReasonModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400';
      case 'APPROVED': return 'text-blue-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'COMPLETED': return 'text-green-400';
      case 'REJECTED': return 'text-red-400';
      case 'FAILED': return 'text-red-400';
      case 'CANCELLED': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'PROCESSING': return 'Processando';
      case 'COMPLETED': return 'Concluído';
      case 'REJECTED': return 'Rejeitado';
      case 'FAILED': return 'Falhou';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const { fee, originalFee, discountAmount, netAmount } = calculateFees();

  return (
    <div className="p-6">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Saques</h1>
        <p className="text-gray-400 text-lg">Solicite saques via PIX</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-6 card-lift group animate-bounce-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Total de Saques</span>
              <div className="p-2 bg-green-400/10 rounded-lg group-hover:bg-green-400/20 transition-colors">
                <DollarSign size={20} className="text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.completed || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Saques realizados</p>
          </div>

          <div className="glass-card p-6 card-lift group animate-bounce-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Pendentes</span>
              <div className="p-2 bg-yellow-400/10 rounded-lg group-hover:bg-yellow-400/20 transition-colors">
                <Clock size={20} className="text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando processamento</p>
          </div>

          <div className="glass-card p-6 card-lift group animate-bounce-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">Total Sacado</span>
              <div className="p-2 bg-blue-400/10 rounded-lg group-hover:bg-blue-400/20 transition-colors">
                <TrendingUp size={20} className="text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats.completedNetAmount || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Valor líquido realizado</p>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="glass-card p-6 mb-8 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <ArrowUpRight className="text-purple-400" size={24} />
          <span className="text-white">Nova Solicitação de Saque</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
            <AlertCircle size={20} className="text-red-500 mr-2" />
            <span className="text-red-500">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg">
            <span className="text-green-500">{success}</span>
          </div>
        )}

        {/* Subtle Coupon Toggle */}
        {!showCouponField && couponDiscount === 0 && (
          <button
            type="button"
            onClick={() => setShowCouponField(true)}
            className="mb-4 text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-all hover:gap-3 group"
          >
            <Tag size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="font-medium">Tenho um cupom de desconto</span>
            <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Coupon Field */}
        {(showCouponField || couponDiscount > 0) && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/30 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Cupom de Desconto</span>
              </div>
              {couponDiscount === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponField(false);
                    setCouponCode('');
                    setCouponDiscount(0);
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {couponDiscount > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-green-400">{couponCode}</span>
                  <span className="text-sm text-gray-400 ml-2">
                    {couponDiscount}% de desconto aplicado
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCouponCode('');
                    setCouponDiscount(0);
                    setShowCouponField(false);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código"
                  className="flex-1 px-3 py-2 text-sm bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  disabled={!couponCode || !amount || couponValidating}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed btn-pop text-white"
                >
                  {couponValidating ? 'Validando...' : 'Aplicar'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all hover:bg-gray-700/70 text-white placeholder-gray-400"
                required
              />
            </div>

            {/* Show saved PIX key if available */}
            {userPixKey && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chave PIX para Recebimento</label>
                    <div className="space-y-3">
                      {/* Option to use saved PIX key */}
                      <div className="p-3 bg-gray-700/30 border border-gray-600 rounded-lg">
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
                            className="mr-3 text-purple-500 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <span className="text-white font-medium">Usar minha chave PIX salva</span>
                            <p className="text-sm text-gray-400 mt-1">
                              {getPixKeyTypeLabel(userPixKeyType || '')}: {userPixKey}
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Option to use different PIX key */}
                      <div className="p-3 bg-gray-700/30 border border-gray-600 rounded-lg">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            checked={!useDefaultPixKey}
                            onChange={() => {
                              setUseDefaultPixKey(false);
                              setPixKey('');
                              setPixKeyType(PixKeyType.CPF);
                            }}
                            className="mr-3 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-white font-medium">Usar outra chave PIX</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show PIX key fields if using different key or no saved key */}
                {(!userPixKey || !useDefaultPixKey) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Chave PIX</label>
                      <select
                        value={pixKeyType || ''}
                        onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all hover:bg-gray-700/70 text-white"
                      >
                        <option value={PixKeyType.CPF}>CPF</option>
                        <option value={PixKeyType.CNPJ}>CNPJ</option>
                        <option value={PixKeyType.EMAIL}>E-mail</option>
                        <option value={PixKeyType.PHONE}>Telefone</option>
                        <option value={PixKeyType.RANDOM_KEY}>Chave Aleatória</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Chave PIX</label>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => {
                          setPixKey(e.target.value);
                          // Auto-detect PIX key type
                          const detected = detectPixKeyType(e.target.value);
                          if (detected) {
                            const typeMapping: Record<string, PixKeyType> = {
                              'cpf': PixKeyType.CPF,
                              'cnpj': PixKeyType.CNPJ,
                              'email': PixKeyType.EMAIL,
                              'phone': PixKeyType.PHONE,
                              'random': PixKeyType.RANDOM_KEY
                            };
                            setPixKeyType(typeMapping[detected] || PixKeyType.CPF);
                          }
                        }}
                        placeholder="Digite sua chave PIX"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-all hover:bg-gray-700/70 text-white placeholder-gray-400"
                        required
                      />
                    </div>

                    {/* Save PIX key checkbox - only show if user doesn't have a saved key */}
                    {!userPixKey && pixKey && (
                      <div className="md:col-span-2">
                        <label className="flex items-center cursor-pointer p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={savePixKey}
                            onChange={(e) => setSavePixKey(e.target.checked)}
                            className="mr-3 text-purple-500 focus:ring-purple-500 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-white font-medium">Salvar esta chave PIX para próximos saques</span>
                            <p className="text-sm text-gray-400 mt-1">
                              Você poderá usar esta chave como padrão em futuros saques
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </>
                )}

          </div>

          {/* Fee Calculation */}
          {amount && parseFloat(amount) > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600 animate-slide-up">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Valor Solicitado:</span>
                <span className="font-semibold text-white">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Taxa:</span>
                <span className={couponDiscount > 0 ? "line-through text-gray-500" : "text-yellow-400"}>
                  - {formatCurrency(originalFee)}
                </span>
              </div>
              {couponDiscount > 0 && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Desconto ({couponDiscount}%):</span>
                    <span className="text-green-400">+ {formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Taxa com desconto:</span>
                    <span className="text-yellow-400">- {formatCurrency(fee)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor Líquido:</span>
                  <span className="text-green-400 font-bold">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Saques são processados em D+1 (próximo dia útil)
            </p>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center btn-pop"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowUpRight size={20} className="mr-2" />
                  Solicitar Saque
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Withdrawals History */}
      <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '500ms' }}>
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="text-gray-400" size={20} />
            Histórico de Saques
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Taxa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Líquido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Processamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(withdrawal.requestedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">
                      {withdrawal.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(withdrawal.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                    {formatCurrency(withdrawal.fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                    {formatCurrency(withdrawal.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                      {getStatusText(withdrawal.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(withdrawal.scheduledFor).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      {withdrawal.status === 'PENDING' && (
                        <button
                          onClick={() => cancelWithdrawal(withdrawal.id)}
                          className="text-red-400 hover:text-red-300 text-left"
                        >
                          Cancelar
                        </button>
                      )}
                      {withdrawal.statusReason && (
                        <button
                          onClick={() => showReason(withdrawal.statusReason!)}
                          className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                        >
                          <Info size={12} />
                          Ver motivo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    Nenhum saque encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="text-red-400" size={20} />
                Motivo da Rejeição
              </h3>
              <button
                onClick={() => setShowReasonModal(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-300 leading-relaxed">{selectedReason}</p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}