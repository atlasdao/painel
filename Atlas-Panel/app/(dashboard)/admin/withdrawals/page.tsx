'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, Filter, Eye, Check, X, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';

enum WithdrawalMethod {
  PIX = 'PIX',
  DEPIX = 'DEPIX',
}

enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  statusReason?: string;
  requestedAt: string;
  scheduledFor: string;
  processedAt?: string;
  pixKey?: string;
  pixKeyType?: string;
  liquidAddress?: string;
  cpfCnpj?: string;
  fullName?: string;
  adminNotes?: string;
  coldwalletTxId?: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<WithdrawalMethod | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [coldwalletTxId, setColdwalletTxId] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    fetchWithdrawals();
    fetchPendingWithdrawals();
    fetchStats();
  }, [statusFilter, methodFilter]);

  const fetchWithdrawals = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);

      const response = await api.get(`/withdrawals/admin/all?${params}`);
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchPendingWithdrawals = async () => {
    try {
      const response = await api.get('/withdrawals/admin/pending');
      setPendingWithdrawals(response.data);
    } catch (error) {
      console.error('Error fetching pending withdrawals:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/withdrawals/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprovalClick = (withdrawal: WithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setApprovalAction(action);
    setShowApprovalModal(true);
    setAdminNotes('');
    setRejectionReason('');
    setColdwalletTxId('');
  };

  const handleApprovalSubmit = async () => {
    if (!selectedWithdrawal || !approvalAction) return;

    setLoading(true);

    const payload: any = {
      approve: approvalAction === 'approve',
      adminNotes,
    };

    if (approvalAction === 'reject') {
      payload.statusReason = rejectionReason || 'Rejeitado pelo administrador';
    }

    if (approvalAction === 'approve' && coldwalletTxId) {
      payload.coldwalletTxId = coldwalletTxId;
    }

    try {
      await api.put(`/withdrawals/admin/${selectedWithdrawal.id}/approve`, payload);
      setShowApprovalModal(false);
      fetchWithdrawals();
      fetchPendingWithdrawals();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao processar aprovação');
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawals = async () => {
    if (!confirm('Iniciar processamento de saques aprovados?')) return;

    try {
      await api.post('/withdrawals/admin/process');
      alert('Processamento iniciado');
      fetchWithdrawals();
      fetchStats();
    } catch (error) {
      alert('Erro ao iniciar processamento');
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case WithdrawalStatus.PENDING: return 'text-yellow-400';
      case WithdrawalStatus.APPROVED: return 'text-blue-400';
      case WithdrawalStatus.PROCESSING: return 'text-blue-400';
      case WithdrawalStatus.COMPLETED: return 'text-green-400';
      case WithdrawalStatus.REJECTED: return 'text-red-400';
      case WithdrawalStatus.FAILED: return 'text-red-400';
      case WithdrawalStatus.CANCELLED: return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: WithdrawalStatus) => {
    switch (status) {
      case WithdrawalStatus.PENDING: return 'Pendente';
      case WithdrawalStatus.APPROVED: return 'Aprovado';
      case WithdrawalStatus.PROCESSING: return 'Processando';
      case WithdrawalStatus.COMPLETED: return 'Concluído';
      case WithdrawalStatus.REJECTED: return 'Rejeitado';
      case WithdrawalStatus.FAILED: return 'Falhou';
      case WithdrawalStatus.CANCELLED: return 'Cancelado';
      default: return status;
    }
  };

  const isToday = (date: string) => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Gerenciar Saques</h1>
          <p className="text-gray-400">Aprovar e processar solicitações de saque</p>
        </div>
        <button
          onClick={processWithdrawals}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
        >
          Processar Saques Aprovados
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total</span>
              <DollarSign size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pendentes</span>
              <Clock size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Aprovados</span>
              <CheckCircle size={20} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.approved}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Concluídos</span>
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Volume Total</span>
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>
      )}

      {/* Pending Withdrawals Alert */}
      {pendingWithdrawals.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-yellow-500 mr-2" />
            <span className="text-yellow-500">
              {pendingWithdrawals.length} saque(s) pendente(s) aguardando aprovação para processamento hoje
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WithdrawalStatus | '')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">Todos os Status</option>
          <option value={WithdrawalStatus.PENDING}>Pendente</option>
          <option value={WithdrawalStatus.APPROVED}>Aprovado</option>
          <option value={WithdrawalStatus.REJECTED}>Rejeitado</option>
          <option value={WithdrawalStatus.PROCESSING}>Processando</option>
          <option value={WithdrawalStatus.COMPLETED}>Concluído</option>
          <option value={WithdrawalStatus.FAILED}>Falhou</option>
          <option value={WithdrawalStatus.CANCELLED}>Cancelado</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as WithdrawalMethod | '')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">Todos os Métodos</option>
          <option value={WithdrawalMethod.PIX}>PIX</option>
          <option value={WithdrawalMethod.DEPIX}>DePix</option>
        </select>
      </div>

      {/* Withdrawals Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Destino
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium">{withdrawal.user.username}</p>
                      <p className="text-xs text-gray-400">{withdrawal.user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">
                      {withdrawal.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      {withdrawal.method === WithdrawalMethod.PIX ? (
                        <>
                          <p>{withdrawal.pixKeyType}</p>
                          <p className="text-gray-400 truncate max-w-xs" title={withdrawal.pixKey}>
                            {withdrawal.pixKey}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 truncate max-w-xs" title={withdrawal.liquidAddress}>
                          {withdrawal.liquidAddress}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatCurrency(withdrawal.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                    {formatCurrency(withdrawal.fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">
                    {formatCurrency(withdrawal.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                      {getStatusText(withdrawal.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>
                      <p className={isToday(withdrawal.scheduledFor) ? 'text-yellow-400 font-semibold' : ''}>
                        {new Date(withdrawal.scheduledFor).toLocaleDateString('pt-BR')}
                      </p>
                      {isToday(withdrawal.scheduledFor) && (
                        <p className="text-xs text-yellow-400">Hoje</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      {withdrawal.status === WithdrawalStatus.PENDING && (
                        <>
                          <button
                            onClick={() => handleApprovalClick(withdrawal, 'approve')}
                            className="p-1 hover:bg-green-600/20 rounded text-green-400"
                            title="Aprovar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleApprovalClick(withdrawal, 'reject')}
                            className="p-1 hover:bg-red-600/20 rounded text-red-400"
                            title="Rejeitar"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="p-1 hover:bg-gray-600/20 rounded text-gray-400"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                    Nenhum saque encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedWithdrawal && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'} Saque
            </h3>

            <div className="mb-4 p-3 bg-gray-700 rounded">
              <p className="text-sm text-gray-400">Usuário: {selectedWithdrawal.user.username}</p>
              <p className="text-sm text-gray-400">Valor: {formatCurrency(selectedWithdrawal.amount)}</p>
              <p className="text-sm text-gray-400">Líquido: {formatCurrency(selectedWithdrawal.netAmount)}</p>
              <p className="text-sm text-gray-400">Método: {selectedWithdrawal.method}</p>
            </div>

            {approvalAction === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  ID da Transação Coldwallet (Opcional)
                </label>
                <input
                  type="text"
                  value={coldwalletTxId}
                  onChange={(e) => setColdwalletTxId(e.target.value)}
                  placeholder="TX ID da coldwallet"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {approvalAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Motivo da Rejeição</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motivo da rejeição"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Observações do Admin</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Observações (opcional)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApprovalSubmit}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processando...' : approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedWithdrawal && !showApprovalModal && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Detalhes do Saque</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">ID</p>
                  <p className="font-mono text-xs">{selectedWithdrawal.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className={`font-semibold ${getStatusColor(selectedWithdrawal.status)}`}>
                    {getStatusText(selectedWithdrawal.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Usuário</p>
                  <p>{selectedWithdrawal.user.username}</p>
                  <p className="text-xs text-gray-400">{selectedWithdrawal.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Método</p>
                  <p>{selectedWithdrawal.method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Valor Solicitado</p>
                  <p className="font-semibold">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Taxa</p>
                  <p className="text-yellow-400">{formatCurrency(selectedWithdrawal.fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Valor Líquido</p>
                  <p className="text-green-400 font-semibold">{formatCurrency(selectedWithdrawal.netAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Data da Solicitação</p>
                  <p>{new Date(selectedWithdrawal.requestedAt).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Processamento Agendado</p>
                  <p>{new Date(selectedWithdrawal.scheduledFor).toLocaleString('pt-BR')}</p>
                </div>
                {selectedWithdrawal.processedAt && (
                  <div>
                    <p className="text-sm text-gray-400">Processado em</p>
                    <p>{new Date(selectedWithdrawal.processedAt).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>

              {selectedWithdrawal.method === WithdrawalMethod.PIX && (
                <div className="p-4 bg-gray-700 rounded">
                  <p className="text-sm font-medium mb-2">Dados PIX</p>
                  <p className="text-sm">Tipo: {selectedWithdrawal.pixKeyType}</p>
                  <p className="text-sm">Chave: {selectedWithdrawal.pixKey}</p>
                </div>
              )}

              {selectedWithdrawal.method === WithdrawalMethod.DEPIX && (
                <div className="p-4 bg-gray-700 rounded">
                  <p className="text-sm font-medium mb-2">Endereço Liquid</p>
                  <p className="text-sm font-mono break-all">{selectedWithdrawal.liquidAddress}</p>
                </div>
              )}

              {selectedWithdrawal.cpfCnpj && (
                <div className="p-4 bg-gray-700 rounded">
                  <p className="text-sm font-medium mb-2">Dados de Verificação</p>
                  <p className="text-sm">CPF/CNPJ: {selectedWithdrawal.cpfCnpj}</p>
                  {selectedWithdrawal.fullName && (
                    <p className="text-sm">Nome: {selectedWithdrawal.fullName}</p>
                  )}
                </div>
              )}

              {selectedWithdrawal.adminNotes && (
                <div className="p-4 bg-gray-700 rounded">
                  <p className="text-sm font-medium mb-2">Observações do Admin</p>
                  <p className="text-sm">{selectedWithdrawal.adminNotes}</p>
                </div>
              )}

              {selectedWithdrawal.statusReason && (
                <div className="p-4 bg-red-900/20 border border-red-600 rounded">
                  <p className="text-sm font-medium mb-2 text-red-400">Motivo do Status</p>
                  <p className="text-sm text-red-300">{selectedWithdrawal.statusReason}</p>
                </div>
              )}

              {selectedWithdrawal.coldwalletTxId && (
                <div className="p-4 bg-green-900/20 border border-green-600 rounded">
                  <p className="text-sm font-medium mb-2 text-green-400">Transação Coldwallet</p>
                  <p className="text-sm font-mono text-green-300">{selectedWithdrawal.coldwalletTxId}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}