'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Key,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  X,
  DollarSign,
  User,
  Calendar,
  Globe,
  AlertCircle,
  History,
  Store
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';
import { apiKeyRequestService } from '@/app/lib/services';
import { toast, Toaster } from 'react-hot-toast';

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
  method: string;
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

interface ApiKeyRequest {
  id: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  usageReason: string;
  serviceUrl: string;
  estimatedVolume: string;
  usageType: 'SINGLE_CPF' | 'MULTIPLE_CPF';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  approvalNotes?: string;
  generatedApiKey?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
}

interface CommerceApplication {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  businessName: string;
  businessType: string;
  monthlyVolume: string;
  productDescription: string;
  targetAudience: string;
  hasPhysicalStore: string;
  socialMedia: string;
  businessObjective: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DEPOSIT_PENDING' | 'ACTIVE';
  depositAmount?: number;
  depositPaid: boolean;
  depositPaidAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  transactionCount: number;
  commerceActivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'api' | 'commerce'>('withdrawals');
  const [withdrawalView, setWithdrawalView] = useState<'pending' | 'history'>('pending');
  const [apiView, setApiView] = useState<'pending' | 'history'>('pending');
  const [commerceView, setCommerceView] = useState<'pending' | 'history'>('pending');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiKeyRequest[]>([]);
  const [apiHistory, setApiHistory] = useState<ApiKeyRequest[]>([]);
  const [commerceApplications, setCommerceApplications] = useState<CommerceApplication[]>([]);
  const [commerceHistory, setCommerceHistory] = useState<CommerceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [selectedApiRequest, setSelectedApiRequest] = useState<ApiKeyRequest | null>(null);
  const [selectedCommerceApplication, setSelectedCommerceApplication] = useState<CommerceApplication | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showApiDetailsModal, setShowApiDetailsModal] = useState(false);
  const [showCommerceDetailsModal, setShowCommerceDetailsModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [coldwalletTxId, setColdwalletTxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Filters for history
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'ALL'>('ALL');
  const [apiStatusFilter, setApiStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'>('ALL');
  const [commerceStatusFilter, setCommerceStatusFilter] = useState<'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DEPOSIT_PENDING' | 'ACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [apiCurrentPage, setApiCurrentPage] = useState(1);
  const [commerceCurrentPage, setCommerceCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    // Prevent duplicate fetches
    if (isFetching) return;

    if (activeTab === 'withdrawals') {
      if (withdrawalView === 'pending') {
        fetchWithdrawals();
      } else {
        fetchWithdrawalHistory();
      }
    } else if (activeTab === 'api') {
      if (apiView === 'pending') {
        fetchApiRequests();
      } else {
        fetchApiHistory();
      }
    } else if (activeTab === 'commerce') {
      if (commerceView === 'pending') {
        fetchCommerceApplications();
      } else {
        fetchCommerceHistory();
      }
    }
  }, [activeTab, withdrawalView, apiView, commerceView, statusFilter, apiStatusFilter, commerceStatusFilter, currentPage, apiCurrentPage, commerceCurrentPage]);

  const fetchWithdrawals = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('🔄 Fetching withdrawals from /withdrawals/admin/pending');
      const response = await api.get('/withdrawals/admin/pending');
      console.log('✅ Fetched withdrawals:', response.data);
      setWithdrawals(response.data || []);
    } catch (error: any) {
      console.error('❌ Error fetching withdrawals:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });

      // More specific error messages
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser um administrador.');
      } else if (error.response?.status === 429) {
        toast.error('Muitas requisições. Por favor, aguarde um momento.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar saques');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('🔄 Fetching withdrawal history from /withdrawals/admin/all');

      const params: any = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await api.get('/withdrawals/admin/all', { params });
      console.log('✅ Fetched withdrawal history:', response.data);
      setWithdrawalHistory(response.data || []);
      setTotalItems(response.data?.length || 0);
    } catch (error: any) {
      console.error('❌ Error fetching withdrawal history:', error);

      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar histórico de saques');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchApiRequests = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      const data = await apiKeyRequestService.getPendingRequests();
      // Filter only pending requests (in case backend returns all)
      const pendingOnly = data.filter(request => request.status === 'PENDING');
      console.log('✅ Filtered API requests:', { total: data.length, pending: pendingOnly.length });
      setApiRequests(pendingOnly);
    } catch (error) {
      console.error('Error fetching API requests:', error);
      toast.error('Erro ao carregar solicitações de API');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchApiHistory = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('🔄 Fetching API key history');

      // Fetch all API key requests including approved, rejected, revoked
      const response = await api.get('/api-key-requests', {
        params: apiStatusFilter !== 'ALL' ? { status: apiStatusFilter } : {}
      });

      console.log('✅ Fetched API key history:', response.data);
      setApiHistory(response.data || []);
    } catch (error: any) {
      console.error('❌ Error fetching API key history:', error);

      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar histórico de API Keys');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchCommerceApplications = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('🔄 Fetching commerce applications from /admin/requests');
      const response = await api.get('/admin/requests');
      console.log('✅ Fetched commerce applications:', response.data);

      // Extract applications array from response data
      const applications = response.data.data || response.data || [];

      // Filter only pending requests
      const pendingOnly = applications.filter((app: CommerceApplication) => app.status === 'PENDING');
      setCommerceApplications(pendingOnly);
    } catch (error: any) {
      console.error('❌ Error fetching commerce applications:', error);

      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar aplicações de comércio');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchCommerceHistory = async () => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Already fetching, skipping duplicate request');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('🔄 Fetching commerce application history');

      const response = await api.get('/admin/requests', {
        params: commerceStatusFilter !== 'ALL' ? { status: commerceStatusFilter } : {}
      });

      console.log('✅ Fetched commerce application history:', response.data);

      // Extract applications array from response data
      const applications = response.data.data || response.data || [];
      setCommerceHistory(applications);
    } catch (error: any) {
      console.error('❌ Error fetching commerce application history:', error);

      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar histórico de aplicações de comércio');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleWithdrawalApproval = async () => {
    if (!selectedWithdrawal || !approvalAction) return;

    setIsProcessing(true);
    try {
      if (approvalAction === 'approve') {
        await api.post(`/withdrawals/admin/approve/${selectedWithdrawal.id}`, {
          adminNotes: approvalNotes,
          coldwalletTxId: coldwalletTxId || undefined,
        });
        toast.success('Saque aprovado com sucesso');
      } else {
        await api.post(`/withdrawals/admin/reject/${selectedWithdrawal.id}`, {
          adminNotes: approvalNotes,
          rejectionReason: rejectionReason,
        });
        toast.success('Saque rejeitado');
      }

      setShowApprovalModal(false);
      setSelectedWithdrawal(null);
      setApprovalNotes('');
      setRejectionReason('');
      setColdwalletTxId('');
      fetchWithdrawals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar saque');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiRequestApproval = async () => {
    if (!selectedApiRequest || !approvalAction) return;

    setIsProcessing(true);
    try {
      if (approvalAction === 'approve') {
        await apiKeyRequestService.approveRequest(selectedApiRequest.id, {
          approvalNotes
        });
        toast.success('Solicitação de API aprovada');
      } else {
        await apiKeyRequestService.rejectRequest(selectedApiRequest.id, {
          approvalNotes: rejectionReason
        });
        toast.success('Solicitação de API rejeitada');
      }

      setShowApprovalModal(false);
      setSelectedApiRequest(null);
      setApprovalNotes('');
      setRejectionReason('');
      fetchApiRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar solicitação');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommerceApplicationApproval = async () => {
    if (!selectedCommerceApplication || !approvalAction) return;

    setIsProcessing(true);
    try {
      const endpoint = approvalAction === 'approve'
        ? `/admin/requests/${selectedCommerceApplication.id}/approve`
        : `/admin/requests/${selectedCommerceApplication.id}/reject`;

      const payload = {
        reviewNotes: approvalNotes,
        ...(approvalAction === 'reject' && { rejectionReason })
      };

      await api.post(endpoint, payload);

      if (approvalAction === 'approve') {
        toast.success('Aplicação de comércio aprovada');
      } else {
        toast.success('Aplicação de comércio rejeitada');
      }

      setShowApprovalModal(false);
      setSelectedCommerceApplication(null);
      setApprovalNotes('');
      setRejectionReason('');
      fetchCommerceApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar aplicação');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkDepositPaid = async (applicationId: string, notes?: string) => {
    setIsProcessing(true);
    try {
      await api.post(`/admin/requests/${applicationId}/mark-deposit-paid`, {
        notes: notes || 'Depósito confirmado via admin'
      });

      toast.success('Depósito marcado como pago e Modo Comércio ativado');
      fetchCommerceHistory(); // Refresh the history to show updated status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao marcar depósito como pago');
    } finally {
      setIsProcessing(false);
    }
  };

  const openWithdrawalApproval = (withdrawal: WithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setSelectedApiRequest(null);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const openApiRequestApproval = (request: ApiKeyRequest, action: 'approve' | 'reject') => {
    setSelectedApiRequest(request);
    setSelectedWithdrawal(null);
    setSelectedCommerceApplication(null);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const openCommerceApplicationApproval = (application: CommerceApplication, action: 'approve' | 'reject') => {
    setSelectedCommerceApplication(application);
    setSelectedWithdrawal(null);
    setSelectedApiRequest(null);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400';
      case 'APPROVED': return 'text-green-400';
      case 'REJECTED': return 'text-red-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'COMPLETED': return 'text-green-500';
      case 'FAILED': return 'text-red-500';
      case 'CANCELLED': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/20';
      case 'APPROVED': return 'bg-green-500/20';
      case 'REJECTED': return 'bg-red-500/20';
      case 'PROCESSING': return 'bg-blue-500/20';
      case 'COMPLETED': return 'bg-green-600/20';
      case 'FAILED': return 'bg-red-600/20';
      case 'CANCELLED': return 'bg-gray-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'PROCESSING': return 'Processando';
      case 'COMPLETED': return 'Concluído';
      case 'FAILED': return 'Falhou';
      case 'CANCELLED': return 'Cancelado';
      case 'REVOKED': return 'Revogado';
      default: return status;
    }
  };

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400';
      case 'APPROVED': return 'text-green-400';
      case 'REJECTED': return 'text-red-400';
      case 'REVOKED': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getApiStatusBgColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/20';
      case 'APPROVED': return 'bg-green-500/20';
      case 'REJECTED': return 'bg-red-500/20';
      case 'REVOKED': return 'bg-orange-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  // Pagination helpers
  const paginatedHistory = withdrawalHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(withdrawalHistory.length / itemsPerPage);

  const paginatedApiHistory = apiHistory.slice(
    (apiCurrentPage - 1) * itemsPerPage,
    apiCurrentPage * itemsPerPage
  );
  const totalApiPages = Math.ceil(apiHistory.length / itemsPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold gradient-text mb-8 text-white">Gerenciamento de Solicitações</h1>

      {/* Main Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'withdrawals'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <DollarSign size={20} />
          <div className="text-left">
            <div className="text-sm">Saques</div>
            <div className="text-xs opacity-80">{withdrawals.length} pendentes</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'api'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Key size={20} />
          <div className="text-left">
            <div className="text-sm">Chaves API</div>
            <div className="text-xs opacity-80">{apiRequests.length} pendentes</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('commerce')}
          className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'commerce'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Store size={20} />
          <div className="text-left">
            <div className="text-sm">Comércio</div>
            <div className="text-xs opacity-80">{commerceApplications.length} pendentes</div>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          {/* Secondary Navigation for Withdrawals */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setWithdrawalView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  withdrawalView === 'pending'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({withdrawals.length})
              </button>
              <button
                onClick={() => setWithdrawalView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  withdrawalView === 'history'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <History className="inline mr-2" size={16} />
                Histórico
              </button>
            </div>
            {withdrawalView === 'history' && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as WithdrawalStatus | 'ALL');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="PROCESSING">Processando</option>
                <option value="COMPLETED">Concluído</option>
                <option value="FAILED">Falhou</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            )}
          </div>

          {withdrawalView === 'pending' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Solicitações de Saque Pendentes</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Método
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Destino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Nenhum saque pendente
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{withdrawal.user.username}</p>
                              <p className="text-sm text-gray-400">{withdrawal.user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{formatCurrency(withdrawal.amount)}</p>
                              <p className="text-sm text-gray-400">Taxa: {formatCurrency(withdrawal.fee)}</p>
                              <p className="text-sm text-green-400">Líquido: {formatCurrency(withdrawal.netAmount)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              {withdrawal.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {withdrawal.method === 'PIX' ? (
                              <div>
                                <p className="text-sm text-gray-300">{withdrawal.pixKey}</p>
                                <p className="text-xs text-gray-400">{withdrawal.pixKeyType}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-300">{withdrawal.liquidAddress || '-'}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(withdrawal.requestedAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(withdrawal.requestedAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(withdrawal.status)} ${getStatusBgColor(withdrawal.status)}`}>
                              {getStatusLabel(withdrawal.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openWithdrawalApproval(withdrawal, 'approve')}
                                className="text-green-400 hover:text-green-300"
                                title="Aprovar"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => openWithdrawalApproval(withdrawal, 'reject')}
                                className="text-red-400 hover:text-red-300"
                                title="Rejeitar"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {withdrawalView === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Histórico de Saques</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Método
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Destino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Processado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                          Nenhum saque encontrado
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{withdrawal.user.username}</p>
                              <p className="text-sm text-gray-400">{withdrawal.user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{formatCurrency(withdrawal.amount)}</p>
                              <p className="text-sm text-gray-400">Taxa: {formatCurrency(withdrawal.fee)}</p>
                              <p className="text-sm text-green-400">Líquido: {formatCurrency(withdrawal.netAmount)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              {withdrawal.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {withdrawal.method === 'PIX' ? (
                              <div>
                                <p className="text-sm text-gray-300">{withdrawal.pixKey}</p>
                                <p className="text-xs text-gray-400">{withdrawal.pixKeyType}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-300">{withdrawal.liquidAddress || '-'}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(withdrawal.status)} ${getStatusBgColor(withdrawal.status)}`}>
                              {getStatusLabel(withdrawal.status)}
                            </span>
                            {withdrawal.statusReason && (
                              <p className="text-xs text-gray-400 mt-1" title={withdrawal.statusReason}>
                                {withdrawal.statusReason.substring(0, 30)}...
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(withdrawal.requestedAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(withdrawal.requestedAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {withdrawal.processedAt ? (
                              <div className="text-sm">
                                <p className="text-gray-300">{new Date(withdrawal.processedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-gray-400">{new Date(withdrawal.processedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, withdrawalHistory.length)} de {withdrawalHistory.length} registros
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage - 2 + i;
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg ${
                            pageNum === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }).filter(Boolean)}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Secondary Navigation for API Keys */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setApiView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  apiView === 'pending'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({apiRequests.length})
              </button>
              <button
                onClick={() => setApiView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  apiView === 'history'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <History className="inline mr-2" size={16} />
                Histórico
              </button>
            </div>
            {apiView === 'history' && (
              <select
                value={apiStatusFilter}
                onChange={(e) => {
                  setApiStatusFilter(e.target.value as any);
                  setApiCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="REVOKED">Revogado</option>
              </select>
            )}
          </div>

          {apiView === 'pending' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Solicitações de API Key Pendentes</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Motivo de Uso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        URL do Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Volume Est.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : apiRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Nenhuma solicitação de API pendente
                        </td>
                      </tr>
                    ) : (
                      apiRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{request.user?.username}</p>
                              <p className="text-sm text-gray-400">{request.user?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-300">{request.usageReason}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={request.serviceUrl} target="_blank" rel="noopener noreferrer"
                               className="text-blue-400 hover:underline flex items-center gap-1">
                              <Globe size={14} />
                              {request.serviceUrl}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-300">{request.estimatedVolume}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400">
                              {request.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(request.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(request.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openApiRequestApproval(request, 'approve')}
                                className="text-green-400 hover:text-green-300"
                                title="Aprovar"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => openApiRequestApproval(request, 'reject')}
                                className="text-red-400 hover:text-red-300"
                                title="Rejeitar"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {apiView === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Histórico de API Keys</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Motivo de Uso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        URL do Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Processado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : paginatedApiHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                          Nenhuma solicitação de API encontrada
                        </td>
                      </tr>
                    ) : (
                      paginatedApiHistory.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{request.user?.username}</p>
                              <p className="text-sm text-gray-400">{request.user?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-300" title={request.usageReason}>
                              {request.usageReason.substring(0, 50)}
                              {request.usageReason.length > 50 && '...'}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={request.serviceUrl} target="_blank" rel="noopener noreferrer"
                               className="text-blue-400 hover:underline flex items-center gap-1">
                              <Globe size={14} />
                              {request.serviceUrl.substring(0, 30)}...
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400">
                              {request.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApiStatusColor(request.status)} ${getApiStatusBgColor(request.status)}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(request.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(request.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {request.approvedAt ? (
                              <div className="text-sm">
                                <p className="text-gray-300">{new Date(request.approvedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-gray-400">{new Date(request.approvedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : request.rejectedAt ? (
                              <div className="text-sm">
                                <p className="text-gray-300">{new Date(request.rejectedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-gray-400">{new Date(request.rejectedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedApiRequest(request);
                                setShowApiDetailsModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalApiPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Mostrando {((apiCurrentPage - 1) * itemsPerPage) + 1} a {Math.min(apiCurrentPage * itemsPerPage, apiHistory.length)} de {apiHistory.length} registros
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApiCurrentPage(apiCurrentPage - 1)}
                      disabled={apiCurrentPage === 1}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: Math.min(5, totalApiPages) }, (_, i) => {
                      const pageNum = apiCurrentPage - 2 + i;
                      if (pageNum < 1 || pageNum > totalApiPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setApiCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg ${
                            pageNum === apiCurrentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }).filter(Boolean)}
                    <button
                      onClick={() => setApiCurrentPage(apiCurrentPage + 1)}
                      disabled={apiCurrentPage === totalApiPages}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Details Modal for Withdrawal History */}
      {selectedWithdrawal && !showApprovalModal && withdrawalView === 'history' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-700 z-10">
                <h2 className="text-2xl font-bold text-white">Detalhes do Saque</h2>
              </div>

            <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Informações do Usuário</h3>
                <p className="text-white">Username: {selectedWithdrawal.user.username}</p>
                <p className="text-gray-300">Email: {selectedWithdrawal.user.email}</p>
                <p className="text-gray-300">ID: {selectedWithdrawal.user.id}</p>
              </div>

              {/* Amount Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Valores</h3>
                <p className="text-white">Valor Solicitado: {formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-gray-300">Taxa: {formatCurrency(selectedWithdrawal.fee)}</p>
                <p className="text-green-400">Valor Líquido: {formatCurrency(selectedWithdrawal.netAmount)}</p>
              </div>

              {/* Payment Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Informações de Pagamento</h3>
                <p className="text-white">Método: {selectedWithdrawal.method}</p>
                {selectedWithdrawal.method === 'PIX' ? (
                  <>
                    <p className="text-gray-300">Chave PIX: {selectedWithdrawal.pixKey}</p>
                    <p className="text-gray-300">Tipo de Chave: {selectedWithdrawal.pixKeyType}</p>
                    {selectedWithdrawal.cpfCnpj && <p className="text-gray-300">CPF/CNPJ: {selectedWithdrawal.cpfCnpj}</p>}
                    {selectedWithdrawal.fullName && <p className="text-gray-300">Nome Completo: {selectedWithdrawal.fullName}</p>}
                  </>
                ) : (
                  <p className="text-gray-300">Endereço Liquid: {selectedWithdrawal.liquidAddress}</p>
                )}
              </div>

              {/* Status Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                <p className="mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedWithdrawal.status)} ${getStatusBgColor(selectedWithdrawal.status)}`}>
                    {getStatusLabel(selectedWithdrawal.status)}
                  </span>
                </p>
                {selectedWithdrawal.statusReason && (
                  <p className="text-gray-300">Motivo: {selectedWithdrawal.statusReason}</p>
                )}
                {selectedWithdrawal.adminNotes && (
                  <p className="text-gray-300">Notas Admin: {selectedWithdrawal.adminNotes}</p>
                )}
                {selectedWithdrawal.coldwalletTxId && (
                  <p className="text-gray-300">TX ID: {selectedWithdrawal.coldwalletTxId}</p>
                )}
              </div>

              {/* Dates */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Datas</h3>
                <p className="text-gray-300">Solicitado: {new Date(selectedWithdrawal.requestedAt).toLocaleString('pt-BR')}</p>
                <p className="text-gray-300">Agendado para: {new Date(selectedWithdrawal.scheduledFor).toLocaleString('pt-BR')}</p>
                {selectedWithdrawal.processedAt && (
                  <p className="text-gray-300">Processado: {new Date(selectedWithdrawal.processedAt).toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Fechar
              </button>
            </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal for API History */}
      {showApiDetailsModal && selectedApiRequest && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-700 z-10 rounded-t-xl">
                <h2 className="text-2xl font-bold text-white">Detalhes da Solicitação de API Key</h2>
              </div>

            <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Informações do Usuário</h3>
                <p className="text-white">Username: {selectedApiRequest.user?.username}</p>
                <p className="text-gray-300">Email: {selectedApiRequest.user?.email}</p>
                <p className="text-gray-300">ID: {selectedApiRequest.userId}</p>
              </div>

              {/* Request Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Informações da Solicitação</h3>
                <p className="text-white">Motivo de Uso:</p>
                <p className="text-gray-300 ml-2">{selectedApiRequest.usageReason}</p>
                <p className="text-white mt-2">URL do Serviço:</p>
                <a href={selectedApiRequest.serviceUrl} target="_blank" rel="noopener noreferrer"
                   className="text-blue-400 hover:underline ml-2">
                  {selectedApiRequest.serviceUrl}
                </a>
                <p className="text-white mt-2">Volume Estimado: <span className="text-gray-300">{selectedApiRequest.estimatedVolume}</span></p>
                <p className="text-white mt-2">Tipo de Uso: <span className="text-gray-300">
                  {selectedApiRequest.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                </span></p>
              </div>

              {/* Status Info */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                <p className="mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApiStatusColor(selectedApiRequest.status)} ${getApiStatusBgColor(selectedApiRequest.status)}`}>
                    {getStatusLabel(selectedApiRequest.status)}
                  </span>
                </p>
                {selectedApiRequest.approvalNotes && (
                  <p className="text-gray-300">Notas: {selectedApiRequest.approvalNotes}</p>
                )}
                {selectedApiRequest.approvedBy && (
                  <p className="text-gray-300">Aprovado por: {selectedApiRequest.approvedBy}</p>
                )}
                {selectedApiRequest.generatedApiKey && selectedApiRequest.status === 'APPROVED' && (
                  <div className="mt-2">
                    <p className="text-white">API Key:</p>
                    <code className="text-xs text-green-400 bg-gray-800 p-2 rounded block mt-1 break-all">
                      {selectedApiRequest.generatedApiKey}
                    </code>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Datas</h3>
                <p className="text-gray-300">Solicitado: {new Date(selectedApiRequest.createdAt).toLocaleString('pt-BR')}</p>
                {selectedApiRequest.approvedAt && (
                  <p className="text-gray-300">Aprovado: {new Date(selectedApiRequest.approvedAt).toLocaleString('pt-BR')}</p>
                )}
                {selectedApiRequest.rejectedAt && (
                  <p className="text-gray-300">Rejeitado: {new Date(selectedApiRequest.rejectedAt).toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowApiDetailsModal(false);
                  setSelectedApiRequest(null);
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
              >
                Fechar
              </button>
            </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-700 z-10 rounded-t-xl">
                <h2 className="text-2xl font-bold text-white">
                  {approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'} Solicitação
                </h2>
              </div>

            <div className="p-6 overflow-y-auto">

            {selectedWithdrawal && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">Usuário: {selectedWithdrawal.user.username}</p>
                <p className="text-sm text-gray-400">Valor: {formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-sm text-gray-400">Método: {selectedWithdrawal.method}</p>
              </div>
            )}

            {selectedApiRequest && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">Usuário: {selectedApiRequest.user?.username}</p>
                <p className="text-sm text-gray-400">Uso: {selectedApiRequest.usageReason}</p>
                <p className="text-sm text-gray-400">URL: {selectedApiRequest.serviceUrl}</p>
              </div>
            )}

            {selectedCommerceApplication && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">Usuário: {selectedCommerceApplication.user.username}</p>
                <p className="text-sm text-gray-400">Negócio: {selectedCommerceApplication.businessName}</p>
                <p className="text-sm text-gray-400">Tipo: {selectedCommerceApplication.businessType}</p>
                <p className="text-sm text-gray-400">Volume: {selectedCommerceApplication.monthlyVolume}</p>
              </div>
            )}

            {approvalAction === 'approve' && selectedWithdrawal && selectedWithdrawal.method === 'DEPIX' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Coldwallet Transaction ID
                </label>
                <input
                  type="text"
                  value={coldwalletTxId}
                  onChange={(e) => setColdwalletTxId(e.target.value)}
                  placeholder="ID da transação (opcional)"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
            )}

            {approvalAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 h-24 text-white"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Notas Administrativas
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Notas internas (opcional)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 h-20 text-white"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedWithdrawal(null);
                  setSelectedApiRequest(null);
                  setApprovalNotes('');
                  setRejectionReason('');
                  setColdwalletTxId('');
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedWithdrawal) {
                    handleWithdrawalApproval();
                  } else if (selectedApiRequest) {
                    handleApiRequestApproval();
                  } else if (selectedCommerceApplication) {
                    handleCommerceApplicationApproval();
                  }
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-colors text-white ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={isProcessing || (approvalAction === 'reject' && !rejectionReason)}
              >
                {isProcessing ? 'Processando...' : approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </button>
            </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'commerce' && (
        <div className="space-y-6">
          {/* Secondary Navigation for Commerce */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setCommerceView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  commerceView === 'pending'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({commerceApplications.length})
              </button>
              <button
                onClick={() => setCommerceView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  commerceView === 'history'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <History className="inline mr-2" size={16} />
                Histórico
              </button>
            </div>
            {commerceView === 'history' && (
              <select
                value={commerceStatusFilter}
                onChange={(e) => {
                  setCommerceStatusFilter(e.target.value as any);
                  setCommerceCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Pendente</option>
                <option value="UNDER_REVIEW">Em Análise</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="DEPOSIT_PENDING">Aguardando Depósito</option>
                <option value="ACTIVE">Ativo</option>
              </select>
            )}
          </div>

          {commerceView === 'pending' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Aplicações de Comércio Pendentes</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Nome do Negócio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Tipo de Negócio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Volume Mensal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : commerceApplications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Nenhuma aplicação de comércio pendente
                        </td>
                      </tr>
                    ) : (
                      commerceApplications.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{application.user.username}</p>
                              <p className="text-sm text-gray-400">{application.user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-white">{application.businessName}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-300">{application.businessType}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-300">{application.monthlyVolume}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(application.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(application.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)} ${getStatusBgColor(application.status)}`}>
                              {getStatusLabel(application.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedCommerceApplication(application);
                                  setShowCommerceDetailsModal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300"
                                title="Ver detalhes"
                              >
                                <Eye size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {commerceView === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Histórico de Aplicações de Comércio</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Nome do Negócio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Processado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Depósito
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : commerceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                          Nenhuma aplicação de comércio encontrada
                        </td>
                      </tr>
                    ) : (
                      commerceHistory.map((application) => (
                        <tr key={application.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-white">{application.user.username}</p>
                              <p className="text-sm text-gray-400">{application.user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-white">{application.businessName}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)} ${getStatusBgColor(application.status)}`}>
                              {getStatusLabel(application.status)}
                            </span>
                            {application.reviewNotes && (
                              <p className="text-xs text-gray-400 mt-1" title={application.reviewNotes}>
                                {application.reviewNotes.substring(0, 30)}...
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-gray-300">{new Date(application.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-gray-400">{new Date(application.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {application.reviewedAt ? (
                              <div className="text-sm">
                                <p className="text-gray-300">{new Date(application.reviewedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-gray-400">{new Date(application.reviewedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              {application.depositPaid ? (
                                <span className="text-green-400">✓ Pago</span>
                              ) : application.depositAmount ? (
                                <span className="text-yellow-400">Pendente</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                              {application.depositAmount && (
                                <p className="text-xs text-gray-400">{application.depositAmount} sats</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedCommerceApplication(application);
                                  setShowCommerceDetailsModal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300"
                                title="Ver detalhes"
                              >
                                <Eye size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commerce Application Details Modal */}
      {showCommerceDetailsModal && selectedCommerceApplication && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-50 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-700 z-10 rounded-t-xl">
                <h2 className="text-2xl font-bold text-white">Detalhes da Aplicação de Comércio</h2>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Informações do Usuário</h3>
                    <p className="text-white">Username: {selectedCommerceApplication.user.username}</p>
                    <p className="text-gray-300">Email: {selectedCommerceApplication.user.email}</p>
                    <p className="text-gray-300">ID: {selectedCommerceApplication.userId}</p>
                  </div>

                  {/* Business Info */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Informações do Negócio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-white font-medium">Nome do Negócio:</p>
                        <p className="text-gray-300 break-words">
                          {selectedCommerceApplication.businessName?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                          {selectedCommerceApplication.businessName?.length && selectedCommerceApplication.businessName.length < 10 && (
                            <span className="text-yellow-400 text-xs ml-2">⚠️ Resposta muito curta</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Tipo de Negócio:</p>
                        <p className="text-gray-300 break-words">
                          {selectedCommerceApplication.businessType?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                          {selectedCommerceApplication.businessType?.length && selectedCommerceApplication.businessType.length < 10 && (
                            <span className="text-yellow-400 text-xs ml-2">⚠️ Resposta muito curta</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Volume Mensal:</p>
                        <p className="text-gray-300 break-words">
                          {selectedCommerceApplication.monthlyVolume?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                          {selectedCommerceApplication.monthlyVolume?.length && selectedCommerceApplication.monthlyVolume.length < 10 && (
                            <span className="text-yellow-400 text-xs ml-2">⚠️ Resposta muito curta</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Público-Alvo:</p>
                        <p className="text-gray-300 break-words">
                          {selectedCommerceApplication.targetAudience?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                          {selectedCommerceApplication.targetAudience?.length && selectedCommerceApplication.targetAudience.length < 10 && (
                            <span className="text-yellow-400 text-xs ml-2">⚠️ Resposta muito curta</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-white font-medium">Descrição do Produto/Serviço:</p>
                      <div className="mt-1 p-3 bg-gray-800/50 rounded border-l-4 border-blue-500">
                        <p className="text-gray-300 break-words whitespace-pre-wrap">
                          {selectedCommerceApplication.productDescription?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                        </p>
                        {selectedCommerceApplication.productDescription && (
                          <p className="text-xs text-gray-500 mt-2">
                            {selectedCommerceApplication.productDescription.length} caracteres
                            {selectedCommerceApplication.productDescription.length < 50 && (
                              <span className="text-yellow-400 ml-2">⚠️ Descrição muito curta</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-white font-medium">Possui Loja Física:</p>
                      <p className="text-gray-300 break-words">
                        {selectedCommerceApplication.hasPhysicalStore?.trim() ||
                          <span className="text-red-400 italic">Não informado</span>}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-white font-medium">Redes Sociais:</p>
                      <p className="text-gray-300 break-words">
                        {selectedCommerceApplication.socialMedia?.trim() ||
                          <span className="text-red-400 italic">Não informado</span>}
                        {selectedCommerceApplication.socialMedia?.length && selectedCommerceApplication.socialMedia.length < 10 && (
                          <span className="text-yellow-400 text-xs ml-2">⚠️ Resposta muito curta</span>
                        )}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-white font-medium">Objetivo do Negócio:</p>
                      <div className="mt-1 p-3 bg-gray-800/50 rounded border-l-4 border-green-500">
                        <p className="text-gray-300 break-words whitespace-pre-wrap">
                          {selectedCommerceApplication.businessObjective?.trim() ||
                            <span className="text-red-400 italic">Não informado</span>}
                        </p>
                        {selectedCommerceApplication.businessObjective && (
                          <p className="text-xs text-gray-500 mt-2">
                            {selectedCommerceApplication.businessObjective.length} caracteres
                            {selectedCommerceApplication.businessObjective.length < 50 && (
                              <span className="text-yellow-400 ml-2">⚠️ Descrição muito curta</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Status da Aplicação</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCommerceApplication.status)} ${getStatusBgColor(selectedCommerceApplication.status)}`}>
                        {getStatusLabel(selectedCommerceApplication.status)}
                      </span>
                    </div>
                    {selectedCommerceApplication.reviewNotes && (
                      <div className="mt-2">
                        <p className="text-white font-medium">Notas da Revisão:</p>
                        <p className="text-gray-300">{selectedCommerceApplication.reviewNotes}</p>
                      </div>
                    )}
                    {selectedCommerceApplication.rejectionReason && (
                      <div className="mt-2">
                        <p className="text-white font-medium">Motivo da Rejeição:</p>
                        <p className="text-red-400">{selectedCommerceApplication.rejectionReason}</p>
                      </div>
                    )}
                    {selectedCommerceApplication.reviewedBy && (
                      <div className="mt-2">
                        <p className="text-white font-medium">Revisado por:</p>
                        <p className="text-gray-300">{selectedCommerceApplication.reviewedBy}</p>
                      </div>
                    )}
                  </div>

                  {/* Deposit Info */}
                  {selectedCommerceApplication.depositAmount && (
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Informações do Depósito</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-white font-medium">Valor do Depósito:</p>
                          <p className="text-gray-300">{selectedCommerceApplication.depositAmount} satoshis</p>
                        </div>
                        <div>
                          <p className="text-white font-medium">Status do Depósito:</p>
                          <p className={selectedCommerceApplication.depositPaid ? "text-green-400" : "text-yellow-400"}>
                            {selectedCommerceApplication.depositPaid ? "Pago" : "Pendente"}
                          </p>
                        </div>
                      </div>
                      {selectedCommerceApplication.depositPaidAt && (
                        <div className="mt-2">
                          <p className="text-white font-medium">Data do Pagamento:</p>
                          <p className="text-gray-300">{new Date(selectedCommerceApplication.depositPaidAt).toLocaleString('pt-BR')}</p>
                        </div>
                      )}

                      {/* Mark Deposit Paid Button - Only show if status is DEPOSIT_PENDING and not paid */}
                      {selectedCommerceApplication.status === 'DEPOSIT_PENDING' && !selectedCommerceApplication.depositPaid && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <button
                            onClick={() => handleMarkDepositPaid(selectedCommerceApplication.id)}
                            disabled={isProcessing}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processando...
                              </>
                            ) : (
                              <>
                                <Check size={18} />
                                Marcar Depósito como Pago
                              </>
                            )}
                          </button>
                          <p className="text-xs text-gray-400 mt-2 text-center">
                            Isso ativará automaticamente o modo comércio para o usuário
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Commerce Activity */}
                  {selectedCommerceApplication.status === 'ACTIVE' && (
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Atividade Comercial</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-white font-medium">Transações:</p>
                          <p className="text-gray-300">{selectedCommerceApplication.transactionCount}</p>
                        </div>
                        {selectedCommerceApplication.commerceActivatedAt && (
                          <div>
                            <p className="text-white font-medium">Ativado em:</p>
                            <p className="text-gray-300">{new Date(selectedCommerceApplication.commerceActivatedAt).toLocaleString('pt-BR')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Datas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-white font-medium">Criado:</p>
                        <p className="text-gray-300">{new Date(selectedCommerceApplication.createdAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">Atualizado:</p>
                        <p className="text-gray-300">{new Date(selectedCommerceApplication.updatedAt).toLocaleString('pt-BR')}</p>
                      </div>
                      {selectedCommerceApplication.reviewedAt && (
                        <div>
                          <p className="text-white font-medium">Revisado:</p>
                          <p className="text-gray-300">{new Date(selectedCommerceApplication.reviewedAt).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons for Pending Applications */}
                  {selectedCommerceApplication.status === 'PENDING' && (
                    <div className="flex gap-4 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => {
                          setShowCommerceDetailsModal(false);
                          openCommerceApplicationApproval(selectedCommerceApplication, 'approve');
                        }}
                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Aprovar Aplicação
                      </button>
                      <button
                        onClick={() => {
                          setShowCommerceDetailsModal(false);
                          openCommerceApplicationApproval(selectedCommerceApplication, 'reject');
                        }}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Rejeitar Aplicação
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowCommerceDetailsModal(false);
                      setSelectedCommerceApplication(null);
                    }}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-white"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Saques Pendentes</p>
              <p className="text-2xl font-bold text-white">{withdrawals.length}</p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">API Keys Pendentes</p>
              <p className="text-2xl font-bold text-white">{apiRequests.length}</p>
            </div>
            <Clock className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Comércio Pendente</p>
              <p className="text-2xl font-bold text-white">{commerceApplications.length}</p>
            </div>
            <Store className="text-green-500" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Pendente</p>
              <p className="text-2xl font-bold text-white">{withdrawals.length + apiRequests.length + commerceApplications.length}</p>
            </div>
            <FileText className="text-purple-500" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}