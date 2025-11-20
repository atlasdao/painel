'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { toast } from 'sonner';
import { Save, Trash2, Plus, Globe, Lock, AlertCircle, CheckCircle, Clock, Shuffle, Edit, X } from 'lucide-react';

interface WebhookConfigurationProps {
  paymentLinkId: string;
  onWebhookChange?: () => void;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
  status: 'active' | 'failed' | 'pending';
}

const AVAILABLE_EVENTS = [
  { value: 'payment.created', label: 'Pagamento Criado', description: 'Quando um cliente acessa o link e gera um QR/PIX para pagamento' },
  { value: 'payment.confirmed', label: 'Pagamento Confirmado', description: 'Quando o pagamento é confirmado e processado' },
  { value: 'payment.failed', label: 'Pagamento Falhado', description: 'Quando um pagamento falha ou é rejeitado' },
  { value: 'payment.expired', label: 'Pagamento Expirado', description: 'Quando um pagamento expira sem ser processado' }
];

export default function WebhookConfiguration({ paymentLinkId, onWebhookChange }: WebhookConfigurationProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[],
    secret: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [editWebhookData, setEditWebhookData] = useState({
    url: '',
    events: [] as string[],
    secret: ''
  });

  useEffect(() => {
    loadWebhooks();
  }, [paymentLinkId]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payment-links/${paymentLinkId}/webhooks`);
      setWebhooks(response.data || []);
    } catch (error: any) {
      console.error('Error loading webhooks:', error);
      // If webhooks endpoint doesn't exist, show empty state
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) {
      toast.error('URL e pelo menos um evento são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const response = await api.post(`/payment-links/${paymentLinkId}/webhooks`, newWebhook);

      setWebhooks([...webhooks, response.data]);
      setNewWebhook({ url: '', events: [], secret: '' });
      setShowAddForm(false);
      toast.success('Webhook configurado com sucesso!');
      onWebhookChange?.();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      toast.error('Erro ao configurar webhook: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await api.delete(`/payment-links/${paymentLinkId}/webhooks/${webhookId}`);
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      toast.success('Webhook removido com sucesso!');
      onWebhookChange?.();
    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      toast.error('Erro ao remover webhook');
    }
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await api.patch(`/payment-links/${paymentLinkId}/webhooks/${webhookId}`, { isActive });
      setWebhooks(webhooks.map(w => w.id === webhookId ? { ...w, isActive } : w));
      toast.success(isActive ? 'Webhook ativado!' : 'Webhook desativado!');
      onWebhookChange?.();
    } catch (error: any) {
      console.error('Error toggling webhook:', error);
      toast.error('Erro ao atualizar webhook');
    }
  };

  const handleEventToggle = (eventValue: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const handleEditEventToggle = (eventValue: string) => {
    setEditWebhookData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const startEditing = (webhook: Webhook) => {
    setEditingWebhook(webhook.id);
    setEditWebhookData({
      url: webhook.url,
      events: webhook.events,
      secret: '' // Don't pre-fill secret for security
    });
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingWebhook(null);
    setEditWebhookData({ url: '', events: [], secret: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingWebhook || !editWebhookData.url || editWebhookData.events.length === 0) {
      toast.error('URL e pelo menos um evento são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const updateData: any = {
        url: editWebhookData.url,
        events: editWebhookData.events,
        isActive: true
      };

      // Only include secret if it's not empty
      if (editWebhookData.secret.trim()) {
        updateData.secret = editWebhookData.secret;
      }

      const response = await api.patch(`/payment-links/${paymentLinkId}/webhooks/${editingWebhook}`, updateData);

      setWebhooks(webhooks.map(w => w.id === editingWebhook ? response.data : w));
      setEditingWebhook(null);
      setEditWebhookData({ url: '', events: [], secret: '' });
      toast.success('Webhook atualizado com sucesso!');
      onWebhookChange?.();
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      toast.error('Erro ao atualizar webhook: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const generateRandomSecret = (isEdit = false) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-!@#$%&*';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (isEdit) {
      setEditWebhookData(prev => ({ ...prev, secret: result }));
    } else {
      setNewWebhook(prev => ({ ...prev, secret: result }));
    }

    toast.success('Secret seguro gerado!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Webhooks Configurados</h3>
          <p className="text-sm text-gray-400">Receba notificações em tempo real sobre eventos de pagamento</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Webhook
        </button>
      </div>

      {/* Existing Webhooks */}
      {webhooks.length > 0 && (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-white">{webhook.url}</span>
                    {getStatusIcon(webhook.status)}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs"
                      >
                        {AVAILABLE_EVENTS.find(e => e.value === event)?.label || event}
                      </span>
                    ))}
                  </div>
                  {webhook.secret && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Lock className="w-3 h-3" />
                      <span>Webhook protegido com secret</span>
                    </div>
                  )}
                  {webhook.lastTriggered && (
                    <div className="text-sm text-gray-400 mt-1">
                      Último disparo: {new Date(webhook.lastTriggered).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={webhook.isActive}
                      onChange={(e) => handleToggleWebhook(webhook.id, e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
                      webhook.isActive ? 'bg-purple-600' : 'bg-gray-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        webhook.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                  <button
                    onClick={() => startEditing(webhook)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded transition-colors"
                    title="Editar webhook"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded transition-colors"
                    title="Excluir webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Webhook Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Novo Webhook</h4>

          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL do Webhook *
              </label>
              <input
                type="url"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                placeholder="https://sua-api.com/webhook"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Events Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Eventos *
              </label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                      className="mt-0.5 w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div>
                      <div className="text-white font-medium">{event.label}</div>
                      <div className="text-sm text-gray-400">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Secret Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Secret (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  placeholder="Chave secreta para validação"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => generateRandomSecret(false)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  title="Gerar secret aleatório seguro"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Usado para verificar a autenticidade dos webhooks (recomendado)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveWebhook}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Webhook'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Webhook Form */}
      {editingWebhook && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Editar Webhook</h4>
            <button
              onClick={cancelEditing}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-600 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL do Webhook *
              </label>
              <input
                type="url"
                value={editWebhookData.url}
                onChange={(e) => setEditWebhookData({ ...editWebhookData, url: e.target.value })}
                placeholder="https://sua-api.com/webhook"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Events Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Eventos *
              </label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={editWebhookData.events.includes(event.value)}
                      onChange={() => handleEditEventToggle(event.value)}
                      className="mt-0.5 w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div>
                      <div className="text-white font-medium">{event.label}</div>
                      <div className="text-sm text-gray-400">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Secret Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Novo Secret (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editWebhookData.secret}
                  onChange={(e) => setEditWebhookData({ ...editWebhookData, secret: e.target.value })}
                  placeholder="Nova chave secreta (deixe vazio para manter atual)"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => generateRandomSecret(true)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  title="Gerar novo secret aleatório seguro"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Deixe vazio para manter o secret atual
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {webhooks.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Nenhum webhook configurado</h3>
          <p className="text-gray-400 mb-4">
            Configure webhooks para receber notificações automáticas sobre eventos de pagamento.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            Adicionar Primeiro Webhook
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">Como funcionam os webhooks?</h4>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• Notificações são enviadas automaticamente para sua URL quando eventos ocorrem</li>
          <li>• Use o secret para verificar a autenticidade das requisições</li>
          <li>• Sua URL deve responder com status 200 para confirmar o recebimento</li>
          <li>• Tentativas de reenvio automáticas em caso de falha</li>
        </ul>
      </div>
    </div>
  );
}