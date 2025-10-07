'use client';

import { useState, useEffect } from 'react';
import { Key, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '@/app/lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface ApiKeyRequest {
  id: string;
  usageReason: string;
  serviceUrl: string;
  estimatedVolume: string;
  usageType?: 'SINGLE_CPF' | 'MULTIPLE_CPF';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  approvalNotes?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export default function ApiKeysPage() {
  const [requests, setRequests] = useState<ApiKeyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    usageReason: '',
    serviceUrl: '',
    estimatedVolume: '',
    usageType: 'SINGLE_CPF' as 'SINGLE_CPF' | 'MULTIPLE_CPF'
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api-key-requests/my-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.usageReason || !formData.serviceUrl || !formData.estimatedVolume) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setSubmitting(true);
    
    try {
      await api.post('/api-key-requests', formData);
      toast.success('Solicitação enviada com sucesso!');
      setShowForm(false);
      setFormData({
        usageReason: '',
        serviceUrl: '',
        estimatedVolume: '',
        usageType: 'SINGLE_CPF'
      });
      fetchRequests();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao enviar solicitação';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded-full">
            <Clock size={12} />
            Pendente
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-400 bg-green-900/20 border border-green-500/30 rounded-full">
            <CheckCircle size={12} />
            Aprovado
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 bg-red-900/20 border border-red-500/30 rounded-full">
            <XCircle size={12} />
            Rejeitado
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-900/20 border border-gray-500/30 rounded-full">
            <XCircle size={12} />
            Revogado
          </span>
        );
      default:
        return null;
    }
  };

  const hasPendingRequest = requests.some(r => r.status === 'PENDING');
  const hasApprovedRequest = requests.some(r => r.status === 'APPROVED');

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Chaves de API</h1>
          <p className="text-gray-400">
            Gerencie suas solicitações de chaves de API para integração com sistemas externos
          </p>
        </div>

        {/* Alert for pending or approved requests */}
        {hasPendingRequest && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-400 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-400 font-medium">Solicitação pendente</p>
                <p className="text-gray-300 text-sm mt-1">
                  Você já possui uma solicitação pendente de aprovação. Aguarde a análise do administrador.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasApprovedRequest && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-400 mt-0.5" size={20} />
              <div>
                <p className="text-green-400 font-medium">Chave de API ativa</p>
                <p className="text-gray-300 text-sm mt-1">
                  Você já possui uma chave de API aprovada e ativa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Request Form */}
        {!showForm && !hasPendingRequest && !hasApprovedRequest && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Key size={20} />
              Solicitar Chave de API
            </button>
          </div>
        )}

        {showForm && (
          <div className="glass-card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Nova Solicitação de Chave de API</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Motivo da utilização da API *
                </label>
                <textarea
                  className="input-field bg-gray-700 border-gray-600 text-white"
                  rows={3}
                  placeholder="Descreva como você pretende usar a API..."
                  value={formData.usageReason}
                  onChange={(e) => setFormData({ ...formData, usageReason: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Endereço do serviço online *
                </label>
                <input
                  type="url"
                  className="input-field bg-gray-700 border-gray-600 text-white"
                  placeholder="https://exemplo.com.br"
                  value={formData.serviceUrl}
                  onChange={(e) => setFormData({ ...formData, serviceUrl: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Estimativa de volume de pagamentos *
                </label>
                <input
                  type="text"
                  className="input-field bg-gray-700 border-gray-600 text-white"
                  placeholder="Ex: 100-500 transações por mês"
                  value={formData.estimatedVolume}
                  onChange={(e) => setFormData({ ...formData, estimatedVolume: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tipo de utilização *
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="usageType"
                      value="SINGLE_CPF"
                      checked={formData.usageType === 'SINGLE_CPF'}
                      onChange={(e) => setFormData({ ...formData, usageType: e.target.value as 'SINGLE_CPF' | 'MULTIPLE_CPF' })}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-white font-medium">CPF/CNPJ Único</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Vou centralizar todos os pagamentos em um único CPF ou CNPJ
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="usageType"
                      value="MULTIPLE_CPF"
                      checked={formData.usageType === 'MULTIPLE_CPF'}
                      onChange={(e) => setFormData({ ...formData, usageType: e.target.value as 'SINGLE_CPF' | 'MULTIPLE_CPF' })}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-white font-medium">Múltiplos CPF/CNPJ</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Vou processar pagamentos de diferentes CPF ou CNPJ (marketplace, plataforma, etc)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Enviar Solicitação
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Histórico de Solicitações</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Key className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-400">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-gray-900 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-medium mb-1">
                        {request.serviceUrl}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Solicitado em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-500 text-sm">Motivo:</span>
                      <p className="text-gray-300 text-sm">{request.usageReason}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Volume estimado:</span>
                      <p className="text-gray-300 text-sm">{request.estimatedVolume}</p>
                    </div>
                    {request.usageType && (
                      <div>
                        <span className="text-gray-500 text-sm">Tipo de utilização:</span>
                        <p className="text-gray-300 text-sm">
                          {request.usageType === 'SINGLE_CPF' ? 'CPF/CNPJ Único' : 'Múltiplos CPF/CNPJ'}
                        </p>
                      </div>
                    )}

                    {request.approvalNotes && (
                      <div className="mt-3 p-3 bg-gray-800 rounded">
                        <span className="text-gray-500 text-sm">Observações do administrador:</span>
                        <p className="text-gray-300 text-sm mt-1">{request.approvalNotes}</p>
                      </div>
                    )}

                    {request.approvedAt && (
                      <p className="text-green-400 text-sm">
                        Aprovado em {new Date(request.approvedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    {request.rejectedAt && (
                      <p className="text-red-400 text-sm">
                        Rejeitado em {new Date(request.rejectedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}