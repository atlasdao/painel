'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowUpRight, DollarSign, Loader2, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';

enum WithdrawalMethod {
  PIX = 'PIX',
  DEPIX = 'DEPIX',
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
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(PixKeyType.CPF);
  const [liquidAddress, setLiquidAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const PIX_FEE_PERCENTAGE = 0.01; // 1%
  const DEPIX_FEE_FIXED = 3.50; // R$ 3.50

  useEffect(() => {
    fetchWithdrawals();
    fetchStats();
  }, []);

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
    let fee = 0;
    let netAmount = 0;

    if (method === WithdrawalMethod.PIX) {
      fee = value * PIX_FEE_PERCENTAGE;
      netAmount = value - fee;
    } else {
      fee = DEPIX_FEE_FIXED;
      netAmount = value - fee;
    }

    return { fee, netAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const value = parseFloat(amount);
    if (!value || value < 10) {
      setError('Valor mínimo para saque é R$ 10,00');
      setLoading(false);
      return;
    }

    const { netAmount } = calculateFees();
    if (netAmount < 10) {
      setError('Valor líquido após taxa deve ser no mínimo R$ 10,00');
      setLoading(false);
      return;
    }

    const payload: any = {
      amount: value,
      method,
    };

    if (method === WithdrawalMethod.PIX) {
      if (!pixKey || !pixKeyType) {
        setError('Chave PIX é obrigatória');
        setLoading(false);
        return;
      }
      payload.pixKey = pixKey;
      payload.pixKeyType = pixKeyType;
    } else {
      if (!liquidAddress) {
        setError('Endereço Liquid é obrigatório');
        setLoading(false);
        return;
      }
      payload.liquidAddress = liquidAddress;
    }

    try {
      const response = await api.post('/withdrawals', payload);
      setSuccess(response.data.message || 'Solicitação de saque criada com sucesso');
      setAmount('');
      setPixKey('');
      setLiquidAddress('');
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

  const { fee, netAmount } = calculateFees();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saques</h1>
        <p className="text-gray-400">Solicite saques via PIX ou DePix</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total de Saques</span>
              <DollarSign size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pendentes</span>
              <Clock size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Sacado</span>
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalNetAmount)}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total em Taxas</span>
              <ArrowUpRight size={20} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</p>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Nova Solicitação de Saque</h2>

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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Método de Saque</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as WithdrawalMethod)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value={WithdrawalMethod.PIX}>PIX (Taxa: 1%)</option>
                <option value={WithdrawalMethod.DEPIX}>DePix (Taxa: R$ 3,50)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            {method === WithdrawalMethod.PIX && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Chave PIX</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value={PixKeyType.CPF}>CPF</option>
                    <option value={PixKeyType.CNPJ}>CNPJ</option>
                    <option value={PixKeyType.EMAIL}>E-mail</option>
                    <option value={PixKeyType.PHONE}>Telefone</option>
                    <option value={PixKeyType.RANDOM_KEY}>Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Chave PIX</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Digite sua chave PIX"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                    required={method === WithdrawalMethod.PIX}
                  />
                </div>
              </>
            )}

            {method === WithdrawalMethod.DEPIX && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Endereço Liquid</label>
                <input
                  type="text"
                  value={liquidAddress}
                  onChange={(e) => setLiquidAddress(e.target.value)}
                  placeholder="Digite seu endereço Liquid (ex: lq1...)"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  required={method === WithdrawalMethod.DEPIX}
                />
              </div>
            )}
          </div>

          {/* Fee Calculation */}
          {amount && parseFloat(amount) > 0 && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Valor Solicitado:</span>
                <span className="font-semibold">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Taxa:</span>
                <span className="text-yellow-400">- {formatCurrency(fee)}</span>
              </div>
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
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Histórico de Saques</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
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
                <tr key={withdrawal.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(withdrawal.requestedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">
                      {withdrawal.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                    {withdrawal.status === 'PENDING' && (
                      <button
                        onClick={() => cancelWithdrawal(withdrawal.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Cancelar
                      </button>
                    )}
                    {withdrawal.statusReason && (
                      <span className="text-xs text-gray-400" title={withdrawal.statusReason}>
                        (Ver motivo)
                      </span>
                    )}
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
    </div>
  );
}