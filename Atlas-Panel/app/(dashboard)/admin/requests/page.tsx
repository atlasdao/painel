'use client';

import { useState, useEffect, useRef } from 'react';
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
  Copy,
  Gift,
  Wallet,
  Gem
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';
import { apiKeyRequestService, referralService, collateralService, withdrawalService } from '@/app/lib/services';
import { toast, Toaster } from 'react-hot-toast';
import WithdrawalReceipt from '@/app/components/WithdrawalReceipt';

enum WithdrawalStatus {
  AWAITING_DEPOSIT = 'AWAITING_DEPOSIT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
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
  receivedAmount?: number;
  excessAmount?: number;
  eulenWithdrawalId?: string;
  eulenDepositAddress?: string;
  eulenDepositAmountCents?: number;
  eulenPayoutAmountCents?: number;
  eulenStatus?: string;
  receiptData?: any;
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

interface CommissionPayout {
  id: string;
  referredUserId: string;
  userId: string;
  amount: number;
  liquidAddress?: string;
  status: 'AVAILABLE' | 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  statusReason?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  adminNotes?: string;
  coldwalletTxId?: string;
  createdAt: string;
  updatedAt: string;
  referredUserEmail?: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

interface CollateralWithdrawal {
  id: string;
  userId: string;
  type: 'WITHDRAWAL';
  status: 'AWAITING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  amount: number;
  liquidAddress?: string;
  previousBalance: number;
  newBalance: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  adminNotes?: string;
  coldwalletTxId?: string;
  createdAt: string;
  processedAt?: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'api' | 'commissions' | 'collateral'>('withdrawals');
  const [withdrawalView, setWithdrawalView] = useState<'pending' | 'processing' | 'history'>('pending');
  const [apiView, setApiView] = useState<'pending' | 'history'>('pending');
  const [commissionView, setCommissionView] = useState<'pending' | 'history'>('pending');
  const [collateralView, setCollateralView] = useState<'pending' | 'history'>('pending');

  // Tab scroll indicators
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiKeyRequest[]>([]);
  const [apiHistory, setApiHistory] = useState<ApiKeyRequest[]>([]);
  const [commissions, setCommissions] = useState<CommissionPayout[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<CommissionPayout[]>([]);
  const [collateralWithdrawals, setCollateralWithdrawals] = useState<CollateralWithdrawal[]>([]);
  const [collateralHistory, setCollateralHistory] = useState<CollateralWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [selectedApiRequest, setSelectedApiRequest] = useState<ApiKeyRequest | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<CommissionPayout | null>(null);
  const [selectedCollateralWithdrawal, setSelectedCollateralWithdrawal] = useState<CollateralWithdrawal | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showApiDetailsModal, setShowApiDetailsModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showCommissionRejectModal, setShowCommissionRejectModal] = useState(false);
  const [showCommissionCompleteModal, setShowCommissionCompleteModal] = useState(false);
  const [showCollateralApproveModal, setShowCollateralApproveModal] = useState(false);
  const [showCollateralRejectModal, setShowCollateralRejectModal] = useState(false);
  const [showEulenModal, setShowEulenModal] = useState(false);
  const [showWithdrawalRejectModal, setShowWithdrawalRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [eulenData, setEulenData] = useState<{ address: string; amountBRL: number; amountCents: number } | null>(null);
  const [processingWithdrawals, setProcessingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState('');
  const [commissionRejectReason, setCommissionRejectReason] = useState('');
  const [collateralRejectReason, setCollateralRejectReason] = useState('');
  const [collateralTxId, setCollateralTxId] = useState('');
  const [collateralAdminNotes, setCollateralAdminNotes] = useState('');
  const [commissionTxId, setCommissionTxId] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [coldwalletTxId, setColdwalletTxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Copy to clipboard function
  const handleCopy = async (text: string | undefined) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado!', { duration: 1500 });
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Filters for history
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'ALL'>('ALL');
  const [apiStatusFilter, setApiStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'>('ALL');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [collateralStatusFilter, setCollateralStatusFilter] = useState<'ALL' | 'AWAITING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [apiCurrentPage, setApiCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    // Prevent duplicate fetches
    if (isFetching) return;

    if (activeTab === 'withdrawals') {
      if (withdrawalView === 'pending') {
        fetchWithdrawals();
      } else if (withdrawalView === 'processing') {
        fetchProcessingWithdrawals();
      } else {
        fetchWithdrawalHistory();
      }
    } else if (activeTab === 'api') {
      if (apiView === 'pending') {
        fetchApiRequests();
      } else {
        fetchApiHistory();
      }
    } else if (activeTab === 'commissions') {
      if (commissionView === 'pending') {
        fetchCommissions();
      } else {
        fetchCommissionHistory();
      }
    } else if (activeTab === 'collateral') {
      if (collateralView === 'pending') {
        fetchCollateralWithdrawals();
      } else {
        fetchCollateralHistory();
      }
    }
  }, [activeTab, withdrawalView, apiView, commissionView, collateralView, statusFilter, apiStatusFilter, collateralStatusFilter, currentPage, apiCurrentPage]);

  // Scroll detection for tab navigation gradients
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      // Show left gradient if scrolled right
      setShowLeftGradient(scrollLeft > 10);
      // Show right gradient if there's more content to the right
      setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
    };

    // Initial check
    checkScroll();

    // Add scroll listener
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // Optional: Initial hint animation - scroll a bit to show it's scrollable
    const hintTimeout = setTimeout(() => {
      if (container.scrollWidth > container.clientWidth) {
        container.scrollTo({ left: 30, behavior: 'smooth' });
        setTimeout(() => {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        }, 600);
      }
    }, 300);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(hintTimeout);
    };
  }, [loading]); // Re-run when loading completes

  const fetchWithdrawals = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const data = await withdrawalService.adminGetPending();
      setWithdrawals(data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Sessao expirada. Por favor, faca login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Voce precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar saques');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchProcessingWithdrawals = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const data = await withdrawalService.adminGetProcessing();
      setProcessingWithdrawals(data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar saques em processamento');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const params = statusFilter !== 'ALL' ? statusFilter : undefined;
      const data = await withdrawalService.adminGetAll(params);
      setWithdrawalHistory(data || []);
      setTotalItems(data?.length || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar historico de saques');
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

  const fetchCommissions = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const response = await referralService.getPendingPayouts();
      setCommissions(response || []);
    } catch (error: any) {
      console.error('Error fetching commissions:', error);
      if (error.response?.status === 401) {
        toast.error('Sessao expirada. Por favor, faca login novamente.');
      } else if (error.response?.status === 403) {
        toast.error('Acesso negado. Voce precisa ser um administrador.');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao carregar comissoes');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchCommissionHistory = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const response = await referralService.getPayoutHistory();
      setCommissionHistory(response || []);
    } catch (error: any) {
      console.error('Error fetching commission history:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar historico de comissoes');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const approveCommission = async (id: string, coldwalletTxId?: string) => {
    try {
      setIsProcessing(true);
      await referralService.approvePayout(id, { coldwalletTxId });
      toast.success('Comissao aprovada com sucesso!');
      setSelectedCommission(null);
      if (commissionView === 'pending') {
        fetchCommissions();
      } else {
        fetchCommissionHistory();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aprovar comissao');
    } finally {
      setIsProcessing(false);
    }
  };

  const completeCommission = async (id: string, coldwalletTxId: string) => {
    try {
      setIsProcessing(true);
      await referralService.completePayout(id, coldwalletTxId);
      toast.success('Pagamento concluido!');
      setSelectedCommission(null);
      fetchCommissionHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao concluir pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectCommission = async (id: string, reason: string) => {
    try {
      setIsProcessing(true);
      await referralService.rejectPayout(id, { statusReason: reason });
      toast.success('Comissao rejeitada');
      setSelectedCommission(null);
      if (commissionView === 'pending') {
        fetchCommissions();
      } else {
        fetchCommissionHistory();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao rejeitar comissao');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== COLLATERAL FUNCTIONS ====================

  const fetchCollateralWithdrawals = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const response = await collateralService.getPendingWithdrawals();
      setCollateralWithdrawals(response || []);
    } catch (error: any) {
      console.error('Error fetching collateral withdrawals:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar saques de colateral');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchCollateralHistory = async () => {
    if (isFetching) return;
    try {
      setIsFetching(true);
      setLoading(true);
      const statusParam = collateralStatusFilter === 'ALL' ? undefined : collateralStatusFilter;
      const response = await collateralService.getWithdrawalHistory(statusParam);
      setCollateralHistory(response || []);
    } catch (error: any) {
      console.error('Error fetching collateral history:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar histórico de colateral');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const approveCollateralWithdrawal = async (id: string, coldwalletTxId?: string, adminNotes?: string) => {
    try {
      setIsProcessing(true);
      await collateralService.approveWithdrawal(id, { coldwalletTxId, adminNotes });
      toast.success('Saque de colateral aprovado com sucesso!');
      setSelectedCollateralWithdrawal(null);
      setShowCollateralApproveModal(false);
      setCollateralTxId('');
      setCollateralAdminNotes('');
      if (collateralView === 'pending') {
        fetchCollateralWithdrawals();
      } else {
        fetchCollateralHistory();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aprovar saque de colateral');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectCollateralWithdrawal = async (id: string, adminNotes: string) => {
    try {
      setIsProcessing(true);
      await collateralService.rejectWithdrawal(id, { adminNotes });
      toast.success('Saque de colateral rejeitado');
      setSelectedCollateralWithdrawal(null);
      setShowCollateralRejectModal(false);
      setCollateralRejectReason('');
      if (collateralView === 'pending') {
        fetchCollateralWithdrawals();
      } else {
        fetchCollateralHistory();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao rejeitar saque de colateral');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawalApprove = async (withdrawal: WithdrawalRequest) => {
    setIsProcessing(true);
    try {
      const result = await withdrawalService.adminApprove(withdrawal.id);
      setSelectedWithdrawal(result);
      setEulenData({
        address: result.eulenDepositAddress,
        amountBRL: result.eulenDepositAmountCents / 100,
        amountCents: result.eulenDepositAmountCents,
      });
      setShowEulenModal(true);
      toast.success('Saque aprovado! Envie o DePix para a Eulen.');
      fetchWithdrawals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aprovar saque');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEulenSend = async () => {
    if (!selectedWithdrawal) return;
    setIsProcessing(true);
    try {
      await withdrawalService.adminConfirmSend(selectedWithdrawal.id);
      toast.success('Envio confirmado! Monitorando status da Eulen...');
      setShowEulenModal(false);
      setSelectedWithdrawal(null);
      setEulenData(null);
      fetchWithdrawals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao confirmar envio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawalReject = async () => {
    if (!selectedWithdrawal) return;
    setIsProcessing(true);
    try {
      await withdrawalService.adminReject(selectedWithdrawal.id, withdrawalRejectReason);
      toast.success('Saque rejeitado');
      setShowWithdrawalRejectModal(false);
      setSelectedWithdrawal(null);
      setWithdrawalRejectReason('');
      fetchWithdrawals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao rejeitar saque');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewReceipt = async (withdrawal: WithdrawalRequest) => {
    try {
      const result = await withdrawalService.adminGetReceipt(withdrawal.id);
      setReceiptData(result);
      setSelectedWithdrawal(withdrawal);
      setShowReceiptModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar comprovante');
    }
  };

  // Legacy handler for backward compatibility
  const handleWithdrawalApproval = async () => {
    if (!selectedWithdrawal || !approvalAction) return;
    if (approvalAction === 'approve') {
      await handleWithdrawalApprove(selectedWithdrawal);
    } else {
      setShowWithdrawalRejectModal(true);
    }
    setShowApprovalModal(false);
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

  const openWithdrawalApproval = (withdrawal: WithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setSelectedApiRequest(null);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const openApiRequestApproval = (request: ApiKeyRequest, action: 'approve' | 'reject') => {
    setSelectedApiRequest(request);
    setSelectedWithdrawal(null);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'text-cyan-600 dark:text-cyan-400';
      case 'PENDING': return 'text-yellow-600 dark:text-yellow-400';
      case 'APPROVED': return 'text-green-600 dark:text-green-400';
      case 'REJECTED': return 'text-red-600 dark:text-red-400';
      case 'PROCESSING': return 'text-blue-600 dark:text-blue-400';
      case 'COMPLETED': return 'text-green-700 dark:text-green-500';
      case 'FAILED': return 'text-red-700 dark:text-red-500';
      case 'CANCELLED': return 'text-[var(--text-muted)]';
      case 'EXPIRED': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'bg-cyan-100 dark:bg-cyan-500/20';
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-500/20';
      case 'APPROVED': return 'bg-green-100 dark:bg-green-500/20';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-500/20';
      case 'PROCESSING': return 'bg-blue-100 dark:bg-blue-500/20';
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-600/20';
      case 'FAILED': return 'bg-red-100 dark:bg-red-600/20';
      case 'CANCELLED': return 'bg-[var(--bg-elevated)]/20';
      case 'EXPIRED': return 'bg-orange-100 dark:bg-orange-500/20';
      default: return 'bg-[var(--bg-elevated)]/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AWAITING_DEPOSIT': return 'Aguardando Deposito';
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'PROCESSING': return 'Processando';
      case 'COMPLETED': return 'Concluido';
      case 'FAILED': return 'Falhou';
      case 'CANCELLED': return 'Cancelado';
      case 'EXPIRED': return 'Expirado';
      case 'REVOKED': return 'Revogado';
      default: return status;
    }
  };

  const getEulenStatusLabel = (status: string) => {
    switch (status) {
      case 'unsent': return 'Nao enviado';
      case 'sending': return 'Enviando';
      case 'sent': return 'Enviado';
      case 'error': return 'Erro';
      case 'canceled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return status || '-';
    }
  };

  const getEulenStatusColor = (status: string) => {
    switch (status) {
      case 'unsent': return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/20';
      case 'sending': return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20';
      case 'sent': return 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/20';
      case 'error': return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20';
      case 'canceled': return 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20';
      case 'refunded': return 'text-[var(--accent)] bg-[var(--accent-soft)]';
      default: return 'text-[var(--text-muted)] bg-[var(--bg-elevated)]/20';
    }
  };

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 dark:text-yellow-400';
      case 'APPROVED': return 'text-green-600 dark:text-green-400';
      case 'REJECTED': return 'text-red-600 dark:text-red-400';
      case 'REVOKED': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getApiStatusBgColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-500/20';
      case 'APPROVED': return 'bg-green-100 dark:bg-green-500/20';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-500/20';
      case 'REVOKED': return 'bg-orange-100 dark:bg-orange-500/20';
      default: return 'bg-[var(--bg-elevated)]/20';
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
      <h1 className="text-3xl font-bold gradient-text mb-8 text-[var(--text-primary)]">Gerenciamento de Solicitações</h1>

      {/* Main Tab Navigation */}
      <div className="mb-8 relative">
        <div className="relative bg-[var(--bg-card)]/50 rounded-xl backdrop-blur-xl p-1">
          {/* Left Gradient Indicator */}
          {showLeftGradient && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent pointer-events-none z-10 rounded-l-xl md:hidden flex items-center pl-2">
              <div className="w-1.5 h-8 bg-[var(--accent)] rounded-full animate-pulse" />
            </div>
          )}

          {/* Right Gradient Indicator */}
          {showRightGradient && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent pointer-events-none z-10 rounded-r-xl md:hidden flex items-center justify-end pr-2">
              <div className="w-1.5 h-8 bg-[var(--accent)] rounded-full animate-pulse" />
            </div>
          )}

          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max md:min-w-0 md:grid md:grid-cols-6">
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'withdrawals'
                    ? 'bg-[var(--accent)] text-white shadow-lg'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
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
                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'api'
                    ? 'bg-[var(--accent)] text-white shadow-lg'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Key size={20} />
                <div className="text-left">
                  <div className="text-sm">Chaves API</div>
                  <div className="text-xs opacity-80">{apiRequests.length} pendentes</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'commissions'
                    ? 'bg-[var(--accent)] text-white shadow-lg'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Gift size={20} />
                <div className="text-left">
                  <div className="text-sm">Comissões</div>
                  <div className="text-xs opacity-80">{commissions.length} pendentes</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('collateral')}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'collateral'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Gem size={20} />
                <div className="text-left">
                  <div className="text-sm">Colateral</div>
                  <div className="text-xs opacity-80">{collateralWithdrawals.length} pendentes</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg p-2">
            <div className="flex space-x-2">
              <button onClick={() => setWithdrawalView('pending')} className={`px-4 py-2 rounded-md text-sm transition-all ${withdrawalView === 'pending' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}>
                <Clock className="inline mr-1.5" size={14} />Pendentes ({withdrawals.length})
              </button>
              <button onClick={() => setWithdrawalView('processing')} className={`px-4 py-2 rounded-md text-sm transition-all ${withdrawalView === 'processing' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}>
                <ArrowUpRight className="inline mr-1.5" size={14} />Em Processamento ({processingWithdrawals.length})
              </button>
              <button onClick={() => setWithdrawalView('history')} className={`px-4 py-2 rounded-md text-sm transition-all ${withdrawalView === 'history' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}>
                <History className="inline mr-1.5" size={14} />Historico
              </button>
            </div>
            {withdrawalView === 'history' && (
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as WithdrawalStatus | 'ALL'); setCurrentPage(1); }} className="px-3 py-1.5 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500">
                <option value="ALL">Todos</option>
                <option value="AWAITING_DEPOSIT">Aguardando Deposito</option>
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="PROCESSING">Processando</option>
                <option value="COMPLETED">Concluido</option>
                <option value="FAILED">Falhou</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="EXPIRED">Expirado</option>
              </select>
            )}
          </div>

          {/* PENDENTES */}
          {withdrawalView === 'pending' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Carregando...</div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Nenhum saque pendente</div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="bg-[var(--bg-card)]/50 border border-[var(--border-default)] rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-[var(--text-muted)]" />
                          <span className="font-medium text-[var(--text-primary)]">{w.user.username}</span>
                          <span className="text-sm text-[var(--text-muted)]">{w.user.email}</span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">Solicitado em {new Date(w.requestedAt).toLocaleString('pt-BR')}</div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(w.status)} ${getStatusBgColor(w.status)}`}>
                        {getStatusLabel(w.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Valor Bruto</p>
                        <p className="text-[var(--text-primary)] font-medium">{formatCurrency(w.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Taxa Atlas</p>
                        <p className="text-[var(--text-secondary)]">{formatCurrency(w.fee)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Valor Liquido PIX</p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(w.netAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">DePix Recebido</p>
                        <p className="text-[var(--text-primary)]">{w.receivedAmount ? `R$ ${w.receivedAmount.toFixed(2)}` : '-'}</p>
                        {w.excessAmount && w.excessAmount > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">Excedente: R$ {w.excessAmount.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Chave PIX</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[var(--text-secondary)] font-mono text-xs">{w.pixKey || '-'}</p>
                          {w.pixKey && (
                            <button onClick={() => handleCopy(w.pixKey)} className="text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400"><Copy size={12} /></button>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{w.pixKeyType}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">CPF/CNPJ</p>
                        <p className="text-[var(--text-secondary)] text-xs">{w.cpfCnpj || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Nome</p>
                        <p className="text-[var(--text-secondary)] text-xs">{w.fullName || '-'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
                      <button
                        onClick={() => handleWithdrawalApprove(w)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <Check size={14} />Aprovar
                      </button>
                      <button
                        onClick={() => { setSelectedWithdrawal(w); setShowWithdrawalRejectModal(true); }}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <X size={14} />Rejeitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* EM PROCESSAMENTO */}
          {withdrawalView === 'processing' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Carregando...</div>
              ) : processingWithdrawals.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Nenhum saque em processamento</div>
              ) : (
                processingWithdrawals.map((w) => (
                  <div key={w.id} className="bg-[var(--bg-card)]/50 border border-[var(--border-default)] rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{w.user.username}</span>
                        <span className="text-sm text-[var(--text-muted)] ml-2">{w.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(w.status)} ${getStatusBgColor(w.status)}`}>
                          {getStatusLabel(w.status)}
                        </span>
                        {w.eulenStatus && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getEulenStatusColor(w.eulenStatus)}`}>
                            Eulen: {getEulenStatusLabel(w.eulenStatus)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Valor PIX</p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(w.netAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Chave PIX</p>
                        <p className="text-[var(--text-secondary)] font-mono text-xs">{w.pixKey || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted)] text-xs">Eulen ID</p>
                        <p className="text-[var(--text-secondary)] font-mono text-xs">{w.eulenWithdrawalId?.substring(0, 16) || '-'}...</p>
                      </div>
                    </div>
                    {w.status === 'APPROVED' && w.eulenDepositAddress && (
                      <div className="bg-[var(--bg-primary)]/50 rounded-lg p-3 space-y-2 border border-blue-500/20">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Envie DePix para Eulen:</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-secondary)] break-all">{w.eulenDepositAddress}</span>
                          <button onClick={() => handleCopy(w.eulenDepositAddress)} className="text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 shrink-0"><Copy size={12} /></button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">Valor: R$ {w.eulenDepositAmountCents ? (w.eulenDepositAmountCents / 100).toFixed(2) : '-'}</p>
                        <button
                          onClick={() => { setSelectedWithdrawal(w); handleConfirmEulenSend(); }}
                          disabled={isProcessing}
                          className="mt-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          Confirmar Envio para Eulen
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div className="text-center pt-2">
                <button onClick={() => fetchProcessingWithdrawals()} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Atualizar</button>
              </div>
            </div>
          )}

          {/* HISTORICO */}
          {withdrawalView === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-[var(--bg-elevated)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Chave PIX</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">Carregando...</td></tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">Nenhum saque encontrado</td></tr>
                    ) : (
                      paginatedHistory.map((w) => (
                        <tr key={w.id} className="hover:bg-[var(--bg-elevated)]">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{w.user.username}</p>
                            <p className="text-xs text-[var(--text-muted)]">{w.user.email}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm text-[var(--text-primary)]">{formatCurrency(w.amount)}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Liq: {formatCurrency(w.netAmount)}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-mono text-[var(--text-secondary)]">{w.pixKey || '-'}</p>
                            <p className="text-xs text-[var(--text-muted)]">{w.pixKeyType}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(w.status)} ${getStatusBgColor(w.status)}`}>
                              {getStatusLabel(w.status)}
                            </span>
                            {w.statusReason && <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[150px] truncate" title={w.statusReason}>{w.statusReason}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-secondary)]">
                            {new Date(w.requestedAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {w.status === 'COMPLETED' && (
                              <button onClick={() => handleViewReceipt(w)} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-xs flex items-center gap-1">
                                <FileText size={14} />Comprovante
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-[var(--border-default)] flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)]">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, withdrawalHistory.length)} de {withdrawalHistory.length}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 text-xs bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded disabled:opacity-50 hover:bg-[var(--bg-elevated)]">Anterior</button>
                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 text-xs bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded disabled:opacity-50 hover:bg-[var(--bg-elevated)]">Proximo</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Eulen Modal */}
      {showEulenModal && eulenData && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-xl border border-[var(--border-hover)] shadow-2xl">
            <div className="p-5 border-b border-[var(--border-default)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Enviar DePix para Eulen</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Saque de {selectedWithdrawal.user.username} - {formatCurrency(selectedWithdrawal.netAmount)} via PIX</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Endereco Eulen (copie e envie DePix)</label>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-hover)]">
                  <span className="text-xs font-mono text-[var(--text-primary)] break-all flex-1">{eulenData.address}</span>
                  <button onClick={() => handleCopy(eulenData.address)} className="text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 shrink-0"><Copy size={16} /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Valor DePix a enviar</label>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-hover)]">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {eulenData.amountBRL.toFixed(2)}</span>
                  <button onClick={() => handleCopy(eulenData.amountBRL.toFixed(2))} className="text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 ml-auto"><Copy size={16} /></button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border-default)] flex gap-3">
              <button onClick={() => { setShowEulenModal(false); setEulenData(null); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                Fechar
              </button>
              <button onClick={handleConfirmEulenSend} disabled={isProcessing} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors">
                {isProcessing ? 'Confirmando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showWithdrawalRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-xl border border-[var(--border-hover)] shadow-2xl">
            <div className="p-5 border-b border-[var(--border-default)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Rejeitar Saque</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">{selectedWithdrawal.user.username} - {formatCurrency(selectedWithdrawal.amount)}</p>
            </div>
            <div className="p-5">
              <label className="text-xs text-[var(--text-muted)] block mb-1.5">Motivo da rejeicao</label>
              <textarea
                value={withdrawalRejectReason}
                onChange={(e) => setWithdrawalRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Informe o motivo..."
              />
            </div>
            <div className="p-5 border-t border-[var(--border-default)] flex gap-3">
              <button onClick={() => { setShowWithdrawalRejectModal(false); setWithdrawalRejectReason(''); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleWithdrawalReject} disabled={isProcessing} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors">
                {isProcessing ? 'Rejeitando...' : 'Confirmar Rejeicao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <WithdrawalReceipt
          isOpen={showReceiptModal}
          onClose={() => { setShowReceiptModal(false); setReceiptData(null); }}
          receiptData={receiptData.receiptData}
          withdrawal={receiptData.withdrawal}
        />
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Secondary Navigation for API Keys */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setApiView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  apiView === 'pending'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({apiRequests.length})
              </button>
              <button
                onClick={() => setApiView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  apiView === 'history'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
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
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500"
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
              <div className="px-6 py-4 border-b border-[var(--border-default)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Solicitações de API Key Pendentes</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-[var(--bg-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Motivo de Uso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        URL do Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Volume Est.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Carregando...
                        </td>
                      </tr>
                    ) : apiRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Nenhuma solicitação de API pendente
                        </td>
                      </tr>
                    ) : (
                      apiRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-[var(--bg-elevated)]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{request.user?.username}</p>
                              <p className="text-sm text-[var(--text-muted)]">{request.user?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[var(--text-secondary)]">{request.usageReason}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={request.serviceUrl} target="_blank" rel="noopener noreferrer"
                               className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              <Globe size={14} />
                              {request.serviceUrl}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-[var(--text-secondary)]">{request.estimatedVolume}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                              {request.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <p className="text-[var(--text-secondary)]">{new Date(request.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-[var(--text-muted)]">{new Date(request.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openApiRequestApproval(request, 'approve')}
                                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                                title="Aprovar"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => openApiRequestApproval(request, 'reject')}
                                className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
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
              <div className="px-6 py-4 border-b border-[var(--border-default)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Histórico de API Keys</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-[var(--bg-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Motivo de Uso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        URL do Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Processado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Carregando...
                        </td>
                      </tr>
                    ) : paginatedApiHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Nenhuma solicitação de API encontrada
                        </td>
                      </tr>
                    ) : (
                      paginatedApiHistory.map((request) => (
                        <tr key={request.id} className="hover:bg-[var(--bg-elevated)]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{request.user?.username}</p>
                              <p className="text-sm text-[var(--text-muted)]">{request.user?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[var(--text-secondary)]" title={request.usageReason}>
                              {request.usageReason.substring(0, 50)}
                              {request.usageReason.length > 50 && '...'}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={request.serviceUrl} target="_blank" rel="noopener noreferrer"
                               className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              <Globe size={14} />
                              {request.serviceUrl.substring(0, 30)}...
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
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
                              <p className="text-[var(--text-secondary)]">{new Date(request.createdAt).toLocaleDateString('pt-BR')}</p>
                              <p className="text-[var(--text-muted)]">{new Date(request.createdAt).toLocaleTimeString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {request.approvedAt ? (
                              <div className="text-sm">
                                <p className="text-[var(--text-secondary)]">{new Date(request.approvedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[var(--text-muted)]">{new Date(request.approvedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : request.rejectedAt ? (
                              <div className="text-sm">
                                <p className="text-[var(--text-secondary)]">{new Date(request.rejectedAt).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[var(--text-muted)]">{new Date(request.rejectedAt).toLocaleTimeString('pt-BR')}</p>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedApiRequest(request);
                                setShowApiDetailsModal(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
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
                <div className="px-6 py-4 border-t border-[var(--border-default)] flex justify-between items-center">
                  <div className="text-sm text-[var(--text-muted)]">
                    Mostrando {((apiCurrentPage - 1) * itemsPerPage) + 1} a {Math.min(apiCurrentPage * itemsPerPage, apiHistory.length)} de {apiHistory.length} registros
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApiCurrentPage(apiCurrentPage - 1)}
                      disabled={apiCurrentPage === 1}
                      className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-elevated)]"
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
                              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }).filter(Boolean)}
                    <button
                      onClick={() => setApiCurrentPage(apiCurrentPage + 1)}
                      disabled={apiCurrentPage === totalApiPages}
                      className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-elevated)]"
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-hover)] rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-[var(--bg-card)] px-6 pt-6 pb-4 border-b border-[var(--border-default)] z-10">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Detalhes do Saque</h2>
              </div>

            <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Informações do Usuário</h3>
                <p className="text-[var(--text-primary)]">Username: {selectedWithdrawal.user.username}</p>
                <p className="text-[var(--text-secondary)]">Email: {selectedWithdrawal.user.email}</p>
                <p className="text-[var(--text-secondary)]">ID: {selectedWithdrawal.user.id}</p>
              </div>

              {/* Amount Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Valores</h3>
                <p className="text-[var(--text-primary)]">Valor Solicitado: {formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-[var(--text-secondary)]">Taxa: {formatCurrency(selectedWithdrawal.fee)}</p>
                <p className="text-green-600 dark:text-green-400">Valor Líquido: {formatCurrency(selectedWithdrawal.netAmount)}</p>
              </div>

              {/* Payment Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Informações de Pagamento</h3>
                <p className="text-[var(--text-primary)]">Método: {selectedWithdrawal.method}</p>
                {selectedWithdrawal.method === 'PIX' ? (
                  <>
                    <p className="text-[var(--text-secondary)]">Chave PIX: {selectedWithdrawal.pixKey}</p>
                    <p className="text-[var(--text-secondary)]">Tipo de Chave: {selectedWithdrawal.pixKeyType}</p>
                    {selectedWithdrawal.cpfCnpj && <p className="text-[var(--text-secondary)]">CPF/CNPJ: {selectedWithdrawal.cpfCnpj}</p>}
                    {selectedWithdrawal.fullName && <p className="text-[var(--text-secondary)]">Nome Completo: {selectedWithdrawal.fullName}</p>}
                  </>
                ) : (
                  <p className="text-[var(--text-secondary)]">Endereço Liquid: {selectedWithdrawal.liquidAddress}</p>
                )}
              </div>

              {/* Status Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Status</h3>
                <p className="mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedWithdrawal.status)} ${getStatusBgColor(selectedWithdrawal.status)}`}>
                    {getStatusLabel(selectedWithdrawal.status)}
                  </span>
                </p>
                {selectedWithdrawal.statusReason && (
                  <p className="text-[var(--text-secondary)]">Motivo: {selectedWithdrawal.statusReason}</p>
                )}
                {selectedWithdrawal.adminNotes && (
                  <p className="text-[var(--text-secondary)]">Notas Admin: {selectedWithdrawal.adminNotes}</p>
                )}
                {selectedWithdrawal.coldwalletTxId && (
                  <p className="text-[var(--text-secondary)]">TX ID: {selectedWithdrawal.coldwalletTxId}</p>
                )}
              </div>

              {/* Dates */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Datas</h3>
                <p className="text-[var(--text-secondary)]">Solicitado: {new Date(selectedWithdrawal.requestedAt).toLocaleString('pt-BR')}</p>
                <p className="text-[var(--text-secondary)]">Agendado para: {new Date(selectedWithdrawal.scheduledFor).toLocaleString('pt-BR')}</p>
                {selectedWithdrawal.processedAt && (
                  <p className="text-[var(--text-secondary)]">Processado: {new Date(selectedWithdrawal.processedAt).toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="px-6 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg font-medium transition-colors text-[var(--text-primary)]"
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-hover)] rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-[var(--bg-card)] px-6 pt-6 pb-4 border-b border-[var(--border-default)] z-10 rounded-t-xl">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Detalhes da Solicitação de API Key</h2>
              </div>

            <div className="p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Informações do Usuário</h3>
                <div className="flex items-center gap-2">
                  <p className="text-[var(--text-primary)]">Username: {selectedApiRequest.user?.username}</p>
                  <button onClick={() => handleCopy(selectedApiRequest.user?.username)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[var(--text-secondary)]">Email: {selectedApiRequest.user?.email}</p>
                  <button onClick={() => handleCopy(selectedApiRequest.user?.email)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[var(--text-secondary)]">ID: {selectedApiRequest.userId}</p>
                  <button onClick={() => handleCopy(selectedApiRequest.userId)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Request Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Informações da Solicitação</h3>
                <p className="text-[var(--text-primary)]">Motivo de Uso:</p>
                <div className="flex items-start gap-2 ml-2">
                  <p className="text-[var(--text-secondary)]">{selectedApiRequest.usageReason}</p>
                  <button onClick={() => handleCopy(selectedApiRequest.usageReason)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-[var(--text-primary)] mt-2">URL do Serviço:</p>
                <div className="flex items-center gap-2 ml-2">
                  <a href={selectedApiRequest.serviceUrl} target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 dark:text-blue-400 hover:underline">
                    {selectedApiRequest.serviceUrl}
                  </a>
                  <button onClick={() => handleCopy(selectedApiRequest.serviceUrl)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[var(--text-primary)]">Volume Estimado: <span className="text-[var(--text-secondary)]">{selectedApiRequest.estimatedVolume}</span></p>
                  <button onClick={() => handleCopy(selectedApiRequest.estimatedVolume)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[var(--text-primary)]">Tipo de Uso: <span className="text-[var(--text-secondary)]">
                    {selectedApiRequest.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                  </span></p>
                  <button onClick={() => handleCopy(selectedApiRequest.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Status Info */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Status</h3>
                <p className="mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApiStatusColor(selectedApiRequest.status)} ${getApiStatusBgColor(selectedApiRequest.status)}`}>
                    {getStatusLabel(selectedApiRequest.status)}
                  </span>
                </p>
                {selectedApiRequest.approvalNotes && (
                  <div className="flex items-start gap-2">
                    <p className="text-[var(--text-secondary)]">Notas: {selectedApiRequest.approvalNotes}</p>
                    <button onClick={() => handleCopy(selectedApiRequest.approvalNotes)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0" title="Copiar">
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {selectedApiRequest.approvedBy && (
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--text-secondary)]">Aprovado por: {selectedApiRequest.approvedBy}</p>
                    <button onClick={() => handleCopy(selectedApiRequest.approvedBy)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar">
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {selectedApiRequest.generatedApiKey && selectedApiRequest.status === 'APPROVED' && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-primary)]">API Key:</p>
                      <button onClick={() => handleCopy(selectedApiRequest.generatedApiKey)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Copiar API Key">
                        <Copy size={14} />
                      </button>
                    </div>
                    <code className="text-xs text-green-600 dark:text-green-400 bg-[var(--bg-card)] p-2 rounded block mt-1 break-all">
                      {selectedApiRequest.generatedApiKey}
                    </code>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Datas</h3>
                <p className="text-[var(--text-secondary)]">Solicitado: {new Date(selectedApiRequest.createdAt).toLocaleString('pt-BR')}</p>
                {selectedApiRequest.approvedAt && (
                  <p className="text-[var(--text-secondary)]">Aprovado: {new Date(selectedApiRequest.approvedAt).toLocaleString('pt-BR')}</p>
                )}
                {selectedApiRequest.rejectedAt && (
                  <p className="text-[var(--text-secondary)]">Rejeitado: {new Date(selectedApiRequest.rejectedAt).toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowApiDetailsModal(false);
                  setSelectedApiRequest(null);
                }}
                className="px-6 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg font-medium transition-colors text-[var(--text-primary)]"
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-hover)] rounded-xl max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="sticky top-0 bg-[var(--bg-card)] px-6 pt-6 pb-4 border-b border-[var(--border-default)] z-10 rounded-t-xl">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                  {approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'} Solicitação
                </h2>
              </div>

            <div className="p-6 overflow-y-auto">

            {selectedWithdrawal && (
              <div className="mb-4 p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Usuário: {selectedWithdrawal.user.username}</p>
                <p className="text-sm text-[var(--text-muted)]">Valor: {formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-sm text-[var(--text-muted)]">Método: {selectedWithdrawal.method}</p>
              </div>
            )}

            {selectedApiRequest && (
              <div className="mb-4 p-4 bg-[var(--bg-elevated)] rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Usuário: {selectedApiRequest.user?.username}</p>
                <p className="text-sm text-[var(--text-muted)]">Uso: {selectedApiRequest.usageReason}</p>
                <p className="text-sm text-[var(--text-muted)]">URL: {selectedApiRequest.serviceUrl}</p>
              </div>
            )}

            {approvalAction === 'approve' && selectedWithdrawal && selectedWithdrawal.method === 'DEPIX' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  Coldwallet Transaction ID
                </label>
                <input
                  type="text"
                  value={coldwalletTxId}
                  onChange={(e) => setColdwalletTxId(e.target.value)}
                  placeholder="ID da transação (opcional)"
                  className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500 text-[var(--text-primary)]"
                />
              </div>
            )}

            {approvalAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição"
                  className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500 h-24 text-[var(--text-primary)]"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                Notas Administrativas
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Notas internas (opcional)"
                className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500 h-20 text-[var(--text-primary)]"
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
                className="px-6 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg font-medium transition-colors text-[var(--text-primary)]"
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
                  }
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-colors text-[var(--text-primary)] ${
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

      {/* Commissions Tab Content */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Secondary Navigation for Commissions */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setCommissionView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  commissionView === 'pending'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({commissions.length})
              </button>
              <button
                onClick={() => setCommissionView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  commissionView === 'history'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <History className="inline mr-2" size={16} />
                Histórico
              </button>
            </div>
            {commissionView === 'history' && (
              <select
                value={commissionStatusFilter}
                onChange={(e) => setCommissionStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="AVAILABLE">Disponível</option>
                <option value="REQUESTED">Solicitado</option>
                <option value="PROCESSING">Processando</option>
                <option value="COMPLETED">Concluído</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            )}
          </div>

          {commissionView === 'pending' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-default)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Comissões Pendentes de Pagamento</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">Saques de comissão do programa de indicação aguardando processamento</p>
              </div>
              {commissions.length === 0 ? (
                <div className="p-8 text-center">
                  <Gift className="mx-auto text-[var(--text-muted)] mb-4" size={48} />
                  <p className="text-[var(--text-muted)]">Nenhuma comissão pendente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--bg-card)]/50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Indicador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Indicado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Endereço Liquid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Solicitado em</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[var(--text-primary)] font-medium">{commission.user?.username || 'N/A'}</span>
                              <span className="text-[var(--text-muted)] text-sm">{commission.user?.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[var(--text-secondary)]">{commission.referredUserEmail || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(commission.amount)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-secondary)] font-mono text-xs truncate max-w-[200px]">
                                {commission.liquidAddress || 'Não informado'}
                              </span>
                              {commission.liquidAddress && (
                                <button
                                  onClick={() => handleCopy(commission.liquidAddress)}
                                  className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                                >
                                  <Copy size={14} className="text-[var(--text-muted)]" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              commission.status === 'REQUESTED'
                                ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                : commission.status === 'PROCESSING'
                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                            }`}>
                              {commission.status === 'REQUESTED' ? 'Solicitado' :
                               commission.status === 'PROCESSING' ? 'Processando' : commission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--text-muted)] text-sm">
                            {commission.requestedAt ? new Date(commission.requestedAt).toLocaleString('pt-BR') : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {commission.status === 'REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedCommission(commission);
                                      setShowCommissionModal(true);
                                    }}
                                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                    title="Aprovar"
                                  >
                                    <Check size={16} className="text-white" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCommission(commission);
                                      setShowCommissionRejectModal(true);
                                    }}
                                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                    title="Rejeitar"
                                  >
                                    <X size={16} className="text-white" />
                                  </button>
                                </>
                              )}
                              {commission.status === 'PROCESSING' && (
                                <button
                                  onClick={() => {
                                    setSelectedCommission(commission);
                                    setShowCommissionCompleteModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-sm"
                                >
                                  Concluir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {commissionView === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-default)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Histórico de Comissões</h2>
              </div>
              {commissionHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <History className="mx-auto text-[var(--text-muted)] mb-4" size={48} />
                  <p className="text-[var(--text-muted)]">Nenhum histórico encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--bg-card)]/50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Indicador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Indicado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">TX ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {commissionHistory
                        .filter(c => commissionStatusFilter === 'ALL' || c.status === commissionStatusFilter)
                        .map((commission) => (
                        <tr key={commission.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[var(--text-primary)] font-medium">{commission.user?.username || 'N/A'}</span>
                              <span className="text-[var(--text-muted)] text-sm">{commission.user?.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[var(--text-secondary)]">{commission.referredUserEmail || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(commission.amount)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              commission.status === 'COMPLETED'
                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                : commission.status === 'REJECTED'
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                : commission.status === 'PROCESSING'
                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {commission.status === 'COMPLETED' ? 'Concluído' :
                               commission.status === 'REJECTED' ? 'Rejeitado' :
                               commission.status === 'PROCESSING' ? 'Processando' :
                               commission.status === 'REQUESTED' ? 'Solicitado' :
                               commission.status === 'AVAILABLE' ? 'Disponível' : commission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {commission.coldwalletTxId ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-secondary)] font-mono text-xs truncate max-w-[150px]">
                                  {commission.coldwalletTxId}
                                </span>
                                <button
                                  onClick={() => handleCopy(commission.coldwalletTxId)}
                                  className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                                >
                                  <Copy size={14} className="text-[var(--text-muted)]" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[var(--text-muted)] text-sm">
                            {commission.updatedAt ? new Date(commission.updatedAt).toLocaleString('pt-BR') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Commission Approve Modal */}
      {showCommissionModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-hover)]">
            <div className="p-6 border-b border-[var(--border-default)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Aprovar Pagamento de Comissão</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Indicador:</span>
                  <span className="text-[var(--text-primary)]">{selectedCommission.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(selectedCommission.amount)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[var(--text-muted)]">Endereço Liquid:</span>
                  <span className="text-[var(--text-primary)] font-mono text-sm break-all">{selectedCommission.liquidAddress}</span>
                </div>
              </div>
              <p className="text-[var(--text-muted)] text-sm">
                Ao aprovar, o status será alterado para &quot;Processando&quot;.
                Após realizar o pagamento, clique em &quot;Concluir&quot; e informe o TX ID.
              </p>
            </div>
            <div className="p-6 border-t border-[var(--border-default)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCommissionModal(false);
                  setSelectedCommission(null);
                }}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (selectedCommission) {
                    await approveCommission(selectedCommission.id);
                    setShowCommissionModal(false);
                    setSelectedCommission(null);
                  }
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Aprovando...' : 'Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Reject Modal */}
      {showCommissionRejectModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-hover)]">
            <div className="p-6 border-b border-[var(--border-default)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Rejeitar Pagamento de Comissão</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Indicador:</span>
                  <span className="text-[var(--text-primary)]">{selectedCommission.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(selectedCommission.amount)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Motivo da rejeição *
                </label>
                <textarea
                  value={commissionRejectReason}
                  onChange={(e) => setCommissionRejectReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-default)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCommissionRejectModal(false);
                  setSelectedCommission(null);
                  setCommissionRejectReason('');
                }}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (selectedCommission && commissionRejectReason.trim()) {
                    await rejectCommission(selectedCommission.id, commissionRejectReason);
                    setShowCommissionRejectModal(false);
                    setSelectedCommission(null);
                    setCommissionRejectReason('');
                  }
                }}
                disabled={isProcessing || !commissionRejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Complete Modal */}
      {showCommissionCompleteModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-[var(--border-hover)]">
            <div className="p-6 border-b border-[var(--border-default)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Concluir Pagamento</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Indicador:</span>
                  <span className="text-[var(--text-primary)]">{selectedCommission.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(selectedCommission.amount)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[var(--text-muted)]">Endereço Liquid:</span>
                  <span className="text-[var(--text-primary)] font-mono text-sm break-all">{selectedCommission.liquidAddress}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  TX ID (Coldwallet) *
                </label>
                <input
                  type="text"
                  value={commissionTxId}
                  onChange={(e) => setCommissionTxId(e.target.value)}
                  placeholder="Informe o ID da transação..."
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-default)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCommissionCompleteModal(false);
                  setSelectedCommission(null);
                  setCommissionTxId('');
                }}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (selectedCommission && commissionTxId.trim()) {
                    await completeCommission(selectedCommission.id, commissionTxId);
                    setShowCommissionCompleteModal(false);
                    setSelectedCommission(null);
                    setCommissionTxId('');
                  }
                }}
                disabled={isProcessing || !commissionTxId.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Concluindo...' : 'Concluir Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== COLLATERAL TAB ==================== */}
      {activeTab === 'collateral' && (
        <div className="space-y-6">
          {/* Secondary Navigation */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setCollateralView('pending')}
                className={`px-4 py-2 rounded-md transition-all ${
                  collateralView === 'pending'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Clock className="inline mr-2" size={16} />
                Pendentes ({collateralWithdrawals.length})
              </button>
              <button
                onClick={() => setCollateralView('history')}
                className={`px-4 py-2 rounded-md transition-all ${
                  collateralView === 'history'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <History className="inline mr-2" size={16} />
                Histórico
              </button>
            </div>
            {collateralView === 'history' && (
              <select
                value={collateralStatusFilter}
                onChange={(e) => setCollateralStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hover)] rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="AWAITING_APPROVAL">Aguardando Aprovação</option>
                <option value="APPROVED">Aprovado</option>
                <option value="PROCESSING">Processando</option>
                <option value="COMPLETED">Concluído</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            )}
          </div>

          {/* Pending Collateral Withdrawals */}
          {collateralView === 'pending' && (
            <div className="glass-card overflow-hidden border-cyan-500/20">
              <div className="px-6 py-4 border-b border-[var(--border-default)] bg-gradient-to-r from-cyan-500/10 to-transparent">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Gem className="text-cyan-600 dark:text-cyan-400" size={24} />
                  Saques de Colateral Pendentes
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-[var(--bg-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Carteira Liquid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Carregando...
                        </td>
                      </tr>
                    ) : collateralWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Nenhum saque de colateral pendente
                        </td>
                      </tr>
                    ) : (
                      collateralWithdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                  @{withdrawal.user?.username}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {withdrawal.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                              {formatCurrency(withdrawal.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {withdrawal.liquidAddress && (
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-1 rounded max-w-[200px] truncate">
                                  {withdrawal.liquidAddress}
                                </code>
                                <button
                                  onClick={() => handleCopy(withdrawal.liquidAddress)}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                  title="Copiar endereço"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {new Date(withdrawal.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                              Aguardando
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedCollateralWithdrawal(withdrawal);
                                  setShowCollateralApproveModal(true);
                                }}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                              >
                                <Check size={14} />
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCollateralWithdrawal(withdrawal);
                                  setShowCollateralRejectModal(true);
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                              >
                                <X size={14} />
                                Rejeitar
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

          {/* Collateral History */}
          {collateralView === 'history' && (
            <div className="glass-card overflow-hidden border-cyan-500/20">
              <div className="px-6 py-4 border-b border-[var(--border-default)] bg-gradient-to-r from-cyan-500/10 to-transparent">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <History className="text-cyan-600 dark:text-cyan-400" size={24} />
                  Histórico de Saques de Colateral
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead className="bg-[var(--bg-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Carteira
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Solicitado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Processado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        TX ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Carregando...
                        </td>
                      </tr>
                    ) : collateralHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Nenhum registro encontrado
                        </td>
                      </tr>
                    ) : (
                      collateralHistory.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              @{withdrawal.user?.username}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {withdrawal.user?.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                              {formatCurrency(withdrawal.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {withdrawal.liquidAddress && (
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-1 rounded max-w-[150px] truncate">
                                  {withdrawal.liquidAddress}
                                </code>
                                <button
                                  onClick={() => handleCopy(withdrawal.liquidAddress)}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {new Date(withdrawal.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {withdrawal.processedAt
                              ? new Date(withdrawal.processedAt).toLocaleString('pt-BR')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {withdrawal.status === 'COMPLETED' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30">
                                Concluído
                              </span>
                            )}
                            {withdrawal.status === 'APPROVED' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30">
                                Aprovado
                              </span>
                            )}
                            {withdrawal.status === 'PROCESSING' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                                Processando
                              </span>
                            )}
                            {withdrawal.status === 'AWAITING_APPROVAL' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                Aguardando
                              </span>
                            )}
                            {withdrawal.status === 'REJECTED' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30" title={withdrawal.adminNotes}>
                                Rejeitado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {withdrawal.coldwalletTxId && (
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-1 rounded max-w-[100px] truncate">
                                  {withdrawal.coldwalletTxId}
                                </code>
                                <button
                                  onClick={() => handleCopy(withdrawal.coldwalletTxId)}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            )}
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

      {/* Collateral Approve Modal */}
      {showCollateralApproveModal && selectedCollateralWithdrawal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-cyan-500/30">
            <div className="p-6 border-b border-[var(--border-default)] bg-gradient-to-r from-cyan-500/10 to-transparent">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                Aprovar Saque de Colateral
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Usuário:</span>
                  <span className="text-[var(--text-primary)]">@{selectedCollateralWithdrawal.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{formatCurrency(selectedCollateralWithdrawal.amount)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[var(--text-muted)]">Carteira Liquid:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-[var(--text-primary)] font-mono text-sm break-all bg-[var(--bg-elevated)] px-2 py-1 rounded">
                      {selectedCollateralWithdrawal.liquidAddress}
                    </code>
                    <button
                      onClick={() => handleCopy(selectedCollateralWithdrawal.liquidAddress)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  TX ID (Coldwallet)
                </label>
                <input
                  type="text"
                  value={collateralTxId}
                  onChange={(e) => setCollateralTxId(e.target.value)}
                  placeholder="Informe o ID da transação (opcional)..."
                  className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Notas do Admin
                </label>
                <textarea
                  value={collateralAdminNotes}
                  onChange={(e) => setCollateralAdminNotes(e.target.value)}
                  placeholder="Notas internas (opcional)..."
                  className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-default)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCollateralApproveModal(false);
                  setSelectedCollateralWithdrawal(null);
                  setCollateralTxId('');
                  setCollateralAdminNotes('');
                }}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => approveCollateralWithdrawal(
                  selectedCollateralWithdrawal.id,
                  collateralTxId || undefined,
                  collateralAdminNotes || undefined
                )}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Aprovando...' : 'Aprovar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collateral Reject Modal */}
      {showCollateralRejectModal && selectedCollateralWithdrawal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-md w-full border border-red-500/30">
            <div className="p-6 border-b border-[var(--border-default)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <XCircle className="text-red-600 dark:text-red-400" size={24} />
                Rejeitar Saque de Colateral
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Usuário:</span>
                  <span className="text-[var(--text-primary)]">@{selectedCollateralWithdrawal.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Valor:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{formatCurrency(selectedCollateralWithdrawal.amount)}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ Ao rejeitar, o valor será restaurado ao colateral do usuário.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Motivo da rejeição *
                </label>
                <textarea
                  value={collateralRejectReason}
                  onChange={(e) => setCollateralRejectReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--border-default)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCollateralRejectModal(false);
                  setSelectedCollateralWithdrawal(null);
                  setCollateralRejectReason('');
                }}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => rejectCollateralWithdrawal(
                  selectedCollateralWithdrawal.id,
                  collateralRejectReason
                )}
                disabled={isProcessing || !collateralRejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Rejeitando...' : 'Rejeitar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mt-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Saques Pendentes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{withdrawals.length}</p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">API Keys Pendentes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{apiRequests.length}</p>
            </div>
            <Clock className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Comissões Pendentes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{commissions.length}</p>
            </div>
            <Gift className="text-[var(--accent)]" size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Colateral Pendente</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{collateralWithdrawals.length}</p>
            </div>
            <Gem className="text-cyan-500" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}