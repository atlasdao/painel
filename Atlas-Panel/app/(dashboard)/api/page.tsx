'use client';

import { useState, useEffect } from 'react';
import { apiKeyRequestService } from '@/app/lib/services';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Key, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy, 
  Eye, 
  EyeOff,
  Globe,
  Activity,
  FileText,
  Shield,
  RefreshCw,
  Terminal,
  Code,
  Info,
  ArrowRight,
  User
} from 'lucide-react';

interface ApiKeyRequest {
  id: string;
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
}

export default function ApiPage() {
  const [apiKeyRequests, setApiKeyRequests] = useState<ApiKeyRequest[]>([]);
  const [activeApiKeys, setActiveApiKeys] = useState<ApiKeyRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'documentation' | 'requests'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [requestData, setRequestData] = useState({
    usageReason: '',
    serviceUrl: '',
    estimatedVolume: '',
    usageType: 'SINGLE_CPF' as 'SINGLE_CPF' | 'MULTIPLE_CPF'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchApiKeyRequests();
    fetchActiveApiKeys();
  }, []);

  const fetchApiKeyRequests = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await apiKeyRequestService.getMyRequests();
      setApiKeyRequests(data);
    } catch (error) {
      console.error('Error fetching API key requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveApiKeys = async () => {
    try {
      const data = await apiKeyRequestService.getMyApiKeys();
      setActiveApiKeys(data);
    } catch (error) {
      console.error('Error fetching active API keys:', error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!requestData.usageReason || requestData.usageReason.length < 10) {
      toast.error('Por favor, forneça uma descrição detalhada do uso (mínimo 10 caracteres)');
      return;
    }
    
    if (!requestData.serviceUrl || !requestData.serviceUrl.startsWith('http')) {
      toast.error('Por favor, forneça uma URL válida (deve começar com http:// ou https://)');
      return;
    }
    
    if (!requestData.estimatedVolume) {
      toast.error('Por favor, informe o volume estimado de transações');
      return;
    }
    
    setIsSubmitting(true);

    try {
      await apiKeyRequestService.createRequest(requestData);
      toast.success('Solicitação enviada com sucesso!');
      setShowRequestForm(false);
      setRequestData({
        usageReason: '',
        serviceUrl: '',
        estimatedVolume: '',
        usageType: 'SINGLE_CPF'
      });
      fetchApiKeyRequests();
      setActiveTab('requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Erro ao enviar solicitação';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, message = 'Copiado para a área de transferência!') => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const toggleApiKeyVisibility = (requestId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
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

  const hasPendingRequest = apiKeyRequests.some(r => r.status === 'PENDING');
  const approvedRequests = activeApiKeys.filter(r => r.status === 'APPROVED' && r.generatedApiKey);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando informações da API...</p>
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
              API de Integração
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie suas chaves e integrações com a API
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => fetchApiKeyRequests(true)}
              disabled={refreshing}
              className="btn-outline transition duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nova Solicitação</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'documentation'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Documentação
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Solicitações
            {apiKeyRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
                {apiKeyRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Shield className="w-8 h-8 text-blue-400" />
                <span className={`text-2xl font-bold ${activeApiKeys.length > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {activeApiKeys.length} {activeApiKeys.length === 1 ? 'Chave Ativa' : 'Chaves Ativas'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">Status da API</h3>
              <p className="text-sm text-gray-400 mt-1">
                {activeApiKeys.length > 0 ? 'Suas chaves API estão prontas para uso' : 'Solicite acesso para começar'}
              </p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">{apiKeyRequests.length}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Solicitações</h3>
              <p className="text-sm text-gray-400 mt-1">Total de solicitações realizadas</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Globe className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-white">v1</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Versão da API</h3>
              <p className="text-sm text-gray-400 mt-1">Versão estável atual</p>
            </div>
          </div>

          {/* Active API Keys */}
          {approvedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Suas Chaves API Ativas ({approvedRequests.length})
              </h3>
              {approvedRequests.map((apiKey) => (
                <div key={apiKey.id} className="bg-green-900/20 border border-green-700 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-semibold text-green-400 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {apiKey.serviceUrl}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {apiKey.usageType === 'SINGLE_CPF' ? 'CPF Único' : 'Múltiplos CPFs'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-400">Chave API:</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="flex-1 bg-gray-900 px-3 py-2 rounded text-sm font-mono text-green-400">
                              {showApiKey[apiKey.id] ? apiKey.generatedApiKey : '••••••••••••••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleApiKeyVisibility(apiKey.id)}
                              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 hover-lift text-white rounded-lg transition duration-200"
                              title="Mostrar/Ocultar"
                            >
                              {showApiKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(apiKey.generatedApiKey!, 'Chave API copiada!')}
                              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 hover-lift text-white rounded-lg transition duration-200"
                              title="Copiar"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <label className="text-xs text-gray-400">Volume:</label>
                            <p className="text-gray-300">{apiKey.estimatedVolume}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Aprovada em:</label>
                            <p className="text-gray-300">
                              {apiKey.approvedAt ? formatDate(apiKey.approvedAt) : '-'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Motivo:</label>
                            <p className="text-gray-300 truncate" title={apiKey.usageReason}>
                              {apiKey.usageReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {hasPendingRequest && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-yellow-400 font-semibold">Solicitação Pendente</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Sua solicitação está sendo analisada. Você receberá uma notificação assim que for aprovada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {approvedRequests.length === 0 && !hasPendingRequest && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-blue-400 font-semibold">Comece a Integrar</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Solicite acesso à API para começar a integrar pagamentos PIX em sua aplicação.
                  </p>
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Solicitar Acesso</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentation' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Documentação da API
            </h2>
            
            {activeApiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Você precisa de uma chave API aprovada para ver a documentação</p>
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
                >
                  Solicitar Acesso
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Endpoint Examples */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Endpoints Disponíveis</h3>
                  
                  <div className="space-y-4">
                    {/* Generate QR Code */}
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-blue-400 font-medium">Gerar QR Code PIX</h4>
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded">POST</span>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto mb-3">
{`${process.env.NEXT_PUBLIC_API_URL}/pix/qrcode`}
                      </pre>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-400 hover:text-white">Ver exemplo</summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Request:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/pix/qrcode \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10.50,
    "depixAddress": "VJL...",
    "description": "Pagamento #123"
  }'`}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Response:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "qrCode": "00020126580014BR.GOV.BCB.PIX...",
  "transactionId": "abc123...",
  "amount": 10.50
}`}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </div>

                    {/* Check Status */}
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-blue-400 font-medium">Verificar Status da Transação</h4>
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded">GET</span>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto mb-3">
{`${process.env.NEXT_PUBLIC_API_URL}/pix/deposit/{transactionId}/status`}
                      </pre>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-400 hover:text-white">Ver exemplo</summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Request:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`curl -X GET ${process.env.NEXT_PUBLIC_API_URL}/pix/deposit/abc123/status \\
  -H "X-API-Key: YOUR_API_KEY"`}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Response:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "transactionId": "abc123...",
  "status": "COMPLETED",
  "amount": 10.50,
  "createdAt": "2024-01-01T12:00:00Z",
  "completedAt": "2024-01-01T12:05:00Z"
}`}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </div>

                    {/* Get Limits */}
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-blue-400 font-medium">Consultar Limites</h4>
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded">GET</span>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto mb-3">
{`${process.env.NEXT_PUBLIC_API_URL}/pix/limits`}
                      </pre>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-400 hover:text-white">Ver exemplo</summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Request:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`curl -X GET ${process.env.NEXT_PUBLIC_API_URL}/pix/limits \\
  -H "X-API-Key: YOUR_API_KEY"`}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Response:</p>
                            <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "dailyLimit": 6000,
  "monthlyLimit": 180000,
  "dailyUsed": 1500,
  "monthlyUsed": 45000
}`}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <h3 className="text-yellow-400 font-semibold mb-2 flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Notas Importantes
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                    <li>Use o header <code className="text-yellow-400">X-API-Key</code> para autenticação</li>
                    <li>Todos os valores monetários devem ser enviados em reais (BRL)</li>
                    <li>O endereço DePix é obrigatório para gerar QR codes</li>
                    <li>Limite de rate: 100 requisições por minuto</li>
                    <li>Respostas em formato JSON com UTF-8</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="glass-card shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Histórico de Solicitações</h2>
              
              {apiKeyRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma solicitação encontrada</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Faça sua primeira solicitação para começar
                  </p>
                  {!hasPendingRequest && (
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
                    >
                      Fazer Solicitação
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeyRequests.map((request) => (
                    <div key={request.id} className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{request.serviceUrl}</h3>
                            <p className="text-sm text-gray-400">
                              Solicitado em {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="text-xs text-gray-400">Motivo do Uso:</label>
                          <p className="text-sm text-gray-300">{request.usageReason}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Volume Estimado:</label>
                          <p className="text-sm text-gray-300">{request.estimatedVolume}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Tipo de Uso:</label>
                          <p className="text-sm text-gray-300">
                            {request.usageType === 'SINGLE_CPF' ? 'CPF/CNPJ Único' : 'Múltiplos CPF/CNPJ'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Status:</label>
                          <p className="text-sm text-gray-300">
                            {request.status === 'PENDING' && 'Aguardando aprovação'}
                            {request.status === 'APPROVED' && 'Aprovado e ativo'}
                            {request.status === 'REJECTED' && 'Rejeitado pelo administrador'}
                            {request.status === 'REVOKED' && 'Revogado'}
                          </p>
                        </div>
                      </div>
                      
                      {request.approvalNotes && (
                        <div className="mt-3 p-3 bg-gray-800 rounded">
                          <label className="text-xs text-gray-400">Observações do Admin:</label>
                          <p className="text-sm text-gray-300 mt-1">{request.approvalNotes}</p>
                        </div>
                      )}
                      
                      {request.status === 'APPROVED' && request.generatedApiKey && (
                        <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
                          <label className="text-xs text-green-400">Chave API:</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="flex-1 text-xs font-mono text-green-400">
                              {showApiKey[request.id] ? request.generatedApiKey : '••••••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleApiKeyVisibility(request.id)}
                              className="p-1 text-gray-400 hover:text-white"
                            >
                              {showApiKey[request.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(request.generatedApiKey!, 'Chave copiada!')}
                              className="p-1 text-gray-400 hover:text-white"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="modal-backdrop">
          <div className="glass-card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold gradient-text mb-6">Solicitar Acesso à API</h2>
            
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Para que você precisa da API? *
                </label>
                <textarea
                  value={requestData.usageReason}
                  onChange={(e) => setRequestData({ ...requestData, usageReason: e.target.value })}
                  className="w-full input-modern"
                  rows={4}
                  required
                  minLength={10}
                  placeholder="Descreva detalhadamente como pretende usar a API, qual o objetivo da integração..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Seja específico sobre o caso de uso para acelerar a aprovação
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL do Serviço *
                  </label>
                  <input
                    type="url"
                    value={requestData.serviceUrl}
                    onChange={(e) => setRequestData({ ...requestData, serviceUrl: e.target.value })}
                    className="w-full input-modern"
                    required
                    placeholder="https://exemplo.com"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    URL do site ou aplicação que usará a API
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Volume Estimado *
                  </label>
                  <input
                    type="text"
                    value={requestData.estimatedVolume}
                    onChange={(e) => setRequestData({ ...requestData, estimatedVolume: e.target.value })}
                    className="w-full input-modern"
                    required
                    placeholder="100-500 transações/mês"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Estimativa mensal de transações
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Uso *
                </label>
                <select
                  value={requestData.usageType}
                  onChange={(e) => setRequestData({ ...requestData, usageType: e.target.value as any })}
                  className="w-full input-modern"
                  required
                >
                  <option value="SINGLE_CPF">CPF/CNPJ Único - Pagamentos centralizados em meu nome</option>
                  <option value="MULTIPLE_CPF">Múltiplos CPF/CNPJ - Processar pagamentos para terceiros</option>
                </select>
                <div className="mt-2 p-3 bg-gray-900 rounded-lg">
                  {requestData.usageType === 'SINGLE_CPF' ? (
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div className="text-xs text-gray-400">
                        <p className="font-medium text-blue-400">CPF/CNPJ Único</p>
                        <p>Todos os pagamentos serão processados e centralizados em seu CPF ou CNPJ.</p>
                        <p className="mt-1">Ideal para: lojas próprias, serviços pessoais, consultorias.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div className="text-xs text-gray-400">
                        <p className="font-medium text-purple-400">Múltiplos CPF/CNPJ</p>
                        <p>Você processará pagamentos em nome de diferentes pessoas ou empresas.</p>
                        <p className="mt-1">Ideal para: marketplaces, plataformas, agregadores de pagamento.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Importante:</h3>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                  <li>A aprovação geralmente leva de 1 a 2 dias úteis</li>
                  <li>Você receberá uma notificação quando a solicitação for processada</li>
                  <li>Forneça informações verdadeiras e completas para agilizar o processo</li>
                  <li>Uso indevido da API pode resultar em suspensão permanente</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="btn-outline transition duration-200"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Enviar Solicitação</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}