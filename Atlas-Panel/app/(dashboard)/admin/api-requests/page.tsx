'use client';

import { useState, useEffect } from 'react';
import { apiKeyRequestService } from '@/app/lib/services';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Key, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Globe,
  User,
  Calendar,
  FileText,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Check,
  X,
  Copy,
  Shield,
  Activity,
  Database,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Link,
  CreditCard
} from 'lucide-react';

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

export default function AdminApiRequestsPage() {
  const [requests, setRequests] = useState<ApiKeyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApiKeyRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await apiKeyRequestService.getPendingRequests();
      setRequests(data);
      toast.success('Solicitações carregadas');
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      const result = await apiKeyRequestService.approveRequest(selectedRequest.id, { 
        approvalNotes: approvalNotes || undefined 
      });
      
      // Copy API key to clipboard if returned
      if (result.apiKey) {
        navigator.clipboard.writeText(result.apiKey);
        toast.success('API Key gerada e copiada para a área de transferência!');
      } else {
        toast.success('Solicitação aprovada com sucesso!');
      }
      
      setShowApprovalModal(false);
      setApprovalNotes('');
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao aprovar solicitação';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Por favor, forneça um motivo para a rejeição');
      return;
    }
    
    setIsProcessing(true);
    try {
      await apiKeyRequestService.rejectRequest(selectedRequest.id, { 
        approvalNotes: rejectionReason 
      });
      toast.success('Solicitação rejeitada');
      setShowRejectionModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao rejeitar solicitação';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetails = (request: ApiKeyRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const openApprovalModal = (request: ApiKeyRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const openRejectionModal = (request: ApiKeyRequest) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
  };

  const toggleRow = (requestId: string) => {
    setExpandedRow(expandedRow === requestId ? null : requestId);
  };

  const toggleApiKeyVisibility = (requestId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
            <XCircle className="w-3 h-3 mr-1" />
            Revogado
          </span>
        );
      default:
        return null;
    }
  };

  const getUsageTypeBadge = (type: string) => {
    if (type === 'SINGLE_CPF') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
          <User className="w-3 h-3 mr-1" />
          CPF Único
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/50 text-purple-400">
        <CreditCard className="w-3 h-3 mr-1" />
        Múltiplos CPFs
      </span>
    );
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus.toUpperCase();
    const matchesSearch = searchTerm === '' || 
      request.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.serviceUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.usageReason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando solicitações de API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center">
              <Key className="mr-3" />
              Solicitações de API Key
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie as solicitações de acesso à API do sistema
            </p>
          </div>
          <button
            onClick={() => loadRequests(true)}
            disabled={refreshing}
            className="btn-outline transition duration-200 flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{requests.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Aprovadas</p>
                <p className="text-2xl font-bold text-green-400">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por usuário, email, URL ou motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg transition duration-200 ${
                  filterStatus === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Todas ({requests.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg transition duration-200 ${
                  filterStatus === 'pending' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Pendentes ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg transition duration-200 ${
                  filterStatus === 'approved' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Aprovadas ({approvedCount})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg transition duration-200 ${
                  filterStatus === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Rejeitadas ({rejectedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Pending Alert */}
        {pendingCount > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-yellow-400 font-semibold">Atenção Necessária</h3>
                <p className="text-gray-300 text-sm mt-1">
                  Você tem {pendingCount} solicitação{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''} aguardando análise.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="glass-card p-12">
            <div className="text-center">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Nenhuma solicitação encontrada</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchTerm ? 'Tente ajustar seus filtros de busca' : 'As solicitações aparecerão aqui quando forem criadas'}
              </p>
            </div>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="glass-card overflow-hidden">
              {/* Main Row */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-white text-lg">
                          {request.user?.username || 'Usuário'}
                        </h3>
                        {getStatusBadge(request.status)}
                        {getUsageTypeBadge(request.usageType)}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{request.user?.email || '-'}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">{request.serviceUrl}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">{request.estimatedVolume}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">{formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {request.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openApprovalModal(request)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
                          title="Aprovar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRejectionModal(request)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
                          title="Rejeitar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleRow(request.id)}
                      className="p-2 bg-gray-700/50 hover:bg-gray-600/50 hover-lift text-white rounded-lg transition duration-200"
                      title="Ver detalhes"
                    >
                      {expandedRow === request.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRow === request.id && (
                <div className="border-t border-gray-700 p-6 bg-gray-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Motivo da Solicitação</h4>
                      <p className="text-gray-300 bg-gray-800 p-3 rounded">{request.usageReason}</p>
                    </div>
                    
                    {request.approvalNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">
                          {request.status === 'REJECTED' ? 'Motivo da Rejeição' : 'Observações'}
                        </h4>
                        <p className="text-gray-300 bg-gray-800 p-3 rounded">{request.approvalNotes}</p>
                      </div>
                    )}
                    
                    {request.generatedApiKey && (
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-green-400 mb-2">Chave API Gerada</h4>
                        <div className="flex items-center space-x-2 bg-green-900/20 border border-green-700 p-3 rounded">
                          <code className="flex-1 font-mono text-sm text-green-400">
                            {showApiKey[request.id] ? request.generatedApiKey : '••••••••••••••••••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => toggleApiKeyVisibility(request.id)}
                            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 hover-lift text-white rounded transition duration-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(request.generatedApiKey!)}
                            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 hover-lift text-white rounded transition duration-200"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>ID: {request.id}</span>
                    <div className="flex items-center space-x-4">
                      {request.approvedAt && (
                        <span>Aprovado em: {formatDate(request.approvedAt)}</span>
                      )}
                      {request.rejectedAt && (
                        <span>Rejeitado em: {formatDate(request.rejectedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="modal-backdrop">
          <div className="glass-card p-6 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold gradient-text mb-6">Aprovar Solicitação</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Usuário</label>
                    <p className="text-white font-medium">{selectedRequest.user?.username}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Email</label>
                    <p className="text-white font-medium">{selectedRequest.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Serviço</label>
                    <p className="text-white font-medium">{selectedRequest.serviceUrl}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Tipo de Uso</label>
                    <p className="text-white font-medium">
                      {selectedRequest.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  placeholder="Adicione observações sobre a aprovação..."
                />
              </div>

              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-400">
                  ⚡ Ao aprovar, uma chave API será gerada automaticamente e enviada ao usuário.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalNotes('');
                }}
                className="btn-outline transition duration-200"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200 flex items-center space-x-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aprovando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Aprovar e Gerar API Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="modal-backdrop">
          <div className="glass-card p-6 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold gradient-text mb-6">Rejeitar Solicitação</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Usuário</label>
                    <p className="text-white font-medium">{selectedRequest.user?.username}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Email</label>
                    <p className="text-white font-medium">{selectedRequest.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Serviço</label>
                    <p className="text-white font-medium">{selectedRequest.serviceUrl}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Volume</label>
                    <p className="text-white font-medium">{selectedRequest.estimatedVolume}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Motivo da Rejeição <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  required
                  placeholder="Explique o motivo da rejeição..."
                />
              </div>

              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">
                  ⚠️ O usuário será notificado sobre a rejeição e o motivo informado.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="btn-outline transition duration-200"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200 flex items-center space-x-2"
                disabled={isProcessing || !rejectionReason}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rejeitando...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Rejeitar Solicitação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}