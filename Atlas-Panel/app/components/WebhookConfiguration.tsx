'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { toast } from 'sonner';
import {
  Webhook as WebhookIcon,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Send,
  History,
  Shield,
  RefreshCw,
  X,
  Loader,
  Eye,
  EyeOff,
  TestTube,
  Code,
  Key
} from 'lucide-react';
import {
  Webhook,
  WebhookConfig,
  WebhookEvent,
  WebhookEventType,
  WEBHOOK_EVENTS,
  webhookEventDescriptions
} from '@/app/types/webhook';

interface WebhookConfigurationProps {
  paymentLinkId: string;
  onWebhookChange?: () => void;
}

export default function WebhookConfiguration({
  paymentLinkId,
  onWebhookChange
}: WebhookConfigurationProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<string>>(new Set());
  const [webhookEvents, setWebhookEvents] = useState<Record<string, WebhookEvent[]>>({});
  const [showingSecrets, setShowingSecrets] = useState<Set<string>>(new Set());
  const [testingWebhooks, setTestingWebhooks] = useState<Set<string>>(new Set());
  const [deletingWebhooks, setDeletingWebhooks] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<WebhookConfig>({
    name: '',
    url: '',
    events: ['payment.completed'] as WebhookEventType[],
    active: true,
    headers: {},
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000
    }
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    loadWebhooks();
  }, [paymentLinkId]);

  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/payment-link/${paymentLinkId}/webhooks`);
      setWebhooks(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar webhooks');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWebhookEvents = async (webhookId: string) => {
    try {
      const response = await api.get(`/payment-link/${paymentLinkId}/webhook-events`, {
        params: { webhookId }
      });
      setWebhookEvents(prev => ({
        ...prev,
        [webhookId]: response.data
      }));
    } catch (error: any) {
      toast.error('Erro ao carregar eventos do webhook');
      console.error(error);
    }
  };

  const handleCreateWebhook = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Convert custom headers array to object
      const headers = customHeaders.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const webhookData = {
        ...formData,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      };

      const response = await api.post(`/payment-link/${paymentLinkId}/webhook`, webhookData);

      // Show the secret once when creating
      if (response.data.secret) {
        toast.success(
          <div className="flex flex-col gap-2">
            <span>Webhook criado com sucesso!</span>
            <div className="mt-2 p-2 bg-zinc-800 rounded border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Segredo do webhook (copie agora!):</p>
              <code className="text-xs text-green-400 break-all">{response.data.secret}</code>
            </div>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success('Webhook criado com sucesso!');
      }

      setWebhooks([...webhooks, response.data]);
      setShowCreateForm(false);
      resetForm();
      onWebhookChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar webhook');
      console.error(error);
    }
  };

  const handleUpdateWebhook = async () => {
    if (!editingWebhook || !formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Convert custom headers array to object
      const headers = customHeaders.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const webhookData = {
        ...formData,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      };

      const response = await api.patch(`/payment-link/webhook/${editingWebhook.id}`, webhookData);

      toast.success('Webhook atualizado com sucesso!');
      setWebhooks(webhooks.map(w => w.id === editingWebhook.id ? response.data : w));
      setEditingWebhook(null);
      resetForm();
      onWebhookChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar webhook');
      console.error(error);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Tem certeza que deseja deletar este webhook?')) {
      return;
    }

    setDeletingWebhooks(new Set([...deletingWebhooks, webhookId]));

    try {
      await api.delete(`/payment-link/webhook/${webhookId}`);
      toast.success('Webhook deletado com sucesso!');
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      onWebhookChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar webhook');
      console.error(error);
    } finally {
      const newDeleting = new Set(deletingWebhooks);
      newDeleting.delete(webhookId);
      setDeletingWebhooks(newDeleting);
    }
  };

  const handleTestWebhook = async (webhookId: string, eventType?: WebhookEventType) => {
    setTestingWebhooks(new Set([...testingWebhooks, webhookId]));

    try {
      const response = await api.post(`/payment-link/webhook/${webhookId}/test`, {
        eventType: eventType || 'payment.completed'
      });

      if (response.data.success) {
        toast.success('Teste enviado com sucesso!');
      } else {
        toast.error(`Teste falhou: ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao testar webhook');
      console.error(error);
    } finally {
      const newTesting = new Set(testingWebhooks);
      newTesting.delete(webhookId);
      setTestingWebhooks(newTesting);
    }
  };

  const toggleWebhookExpansion = (webhookId: string) => {
    const newExpanded = new Set(expandedWebhooks);
    if (newExpanded.has(webhookId)) {
      newExpanded.delete(webhookId);
    } else {
      newExpanded.add(webhookId);
      // Load events when expanding
      if (!webhookEvents[webhookId]) {
        loadWebhookEvents(webhookId);
      }
    }
    setExpandedWebhooks(newExpanded);
  };

  const toggleSecretVisibility = (webhookId: string) => {
    const newShowing = new Set(showingSecrets);
    if (newShowing.has(webhookId)) {
      newShowing.delete(webhookId);
    } else {
      newShowing.add(webhookId);
    }
    setShowingSecrets(newShowing);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: ['payment.completed'] as WebhookEventType[],
      active: true,
      headers: {},
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 1000
      }
    });
    setCustomHeaders([]);
    setShowAdvancedSettings(false);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events as WebhookEventType[],
      active: webhook.active,
      headers: webhook.headers || {},
      retryPolicy: webhook.retryPolicy || {
        maxRetries: 3,
        retryDelay: 1000
      }
    });

    // Convert headers object to array for editing
    if (webhook.headers) {
      setCustomHeaders(
        Object.entries(webhook.headers).map(([key, value]) => ({ key, value }))
      );
    }

    setShowCreateForm(true);
  };

  const copyWebhookSecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Segredo copiado para a área de transferência!');
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...customHeaders];
    newHeaders[index][field] = value;
    setCustomHeaders(newHeaders);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WebhookIcon className="h-5 w-5 text-zinc-400" />
          <h3 className="text-lg font-medium">Webhooks</h3>
          <span className="text-sm text-zinc-500">
            ({webhooks.length} configurado{webhooks.length !== 1 ? 's' : ''})
          </span>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700
                     text-white rounded transition-colors text-sm"
        >
          {showCreateForm ? (
            <>
              <X className="h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Adicionar Webhook
            </>
          )}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="border border-zinc-800 rounded-lg p-4 space-y-4 bg-zinc-900/50">
          <h4 className="font-medium">
            {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Nome do Webhook *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                         focus:outline-none focus:border-green-500 transition-colors"
                placeholder="Ex: Meu Sistema"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                URL do Webhook *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                         focus:outline-none focus:border-green-500 transition-colors"
                placeholder="https://exemplo.com/webhook"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Eventos para Receber *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map(event => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          events: [...formData.events, event] as WebhookEventType[]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          events: formData.events.filter(e => e !== event) as WebhookEventType[]
                        });
                      }
                    }}
                    className="rounded border-zinc-700 bg-zinc-800 text-green-500"
                  />
                  <span className="text-sm">
                    {webhookEventDescriptions[event]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configurações Avançadas
              {showAdvancedSettings ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvancedSettings && (
              <div className="mt-4 space-y-4 pl-6">
                {/* Active Status */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-800 text-green-500"
                  />
                  <span className="text-sm">Webhook Ativo</span>
                </label>

                {/* Custom Headers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-zinc-400">Headers Customizados</label>
                    <button
                      type="button"
                      onClick={addCustomHeader}
                      className="text-xs text-green-500 hover:text-green-400"
                    >
                      + Adicionar Header
                    </button>
                  </div>
                  {customHeaders.map((header, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                        placeholder="Nome do Header"
                        className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm
                                 focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                        placeholder="Valor"
                        className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm
                                 focus:outline-none focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomHeader(index)}
                        className="p-1 text-red-500 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Retry Policy */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Máximo de Tentativas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.retryPolicy?.maxRetries || 3}
                      onChange={(e) => setFormData({
                        ...formData,
                        retryPolicy: {
                          ...formData.retryPolicy,
                          maxRetries: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm
                               focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Delay entre Tentativas (ms)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max="60000"
                      step="1000"
                      value={formData.retryPolicy?.retryDelay || 1000}
                      onChange={(e) => setFormData({
                        ...formData,
                        retryPolicy: {
                          ...formData.retryPolicy,
                          retryDelay: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm
                               focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingWebhook(null);
                resetForm();
              }}
              className="px-4 py-2 border border-zinc-700 hover:border-zinc-600 rounded
                       transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded
                       transition-colors text-sm"
            >
              {editingWebhook ? 'Salvar Alterações' : 'Criar Webhook'}
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 && !showCreateForm && (
        <div className="border border-zinc-800 rounded-lg p-8 text-center">
          <WebhookIcon className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Nenhum webhook configurado</p>
          <p className="text-sm text-zinc-500 mt-1">
            Configure webhooks para receber notificações de pagamentos
          </p>
        </div>
      )}

      {webhooks.map(webhook => (
        <div
          key={webhook.id}
          className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50"
        >
          {/* Webhook Header */}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{webhook.name}</h4>
                  {webhook.active ? (
                    <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded">
                      Inativo
                    </span>
                  )}
                  {webhook.failureCount > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded">
                      {webhook.failureCount} falha{webhook.failureCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-1 font-mono break-all">
                  {webhook.url}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span>{webhook.events.length} evento{webhook.events.length !== 1 ? 's' : ''}</span>
                  {webhook.lastTriggeredAt && (
                    <span>
                      Último disparo: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTestWebhook(webhook.id)}
                  disabled={testingWebhooks.has(webhook.id)}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                  title="Testar webhook"
                >
                  {testingWebhooks.has(webhook.id) ? (
                    <Loader className="h-4 w-4 animate-spin text-zinc-500" />
                  ) : (
                    <TestTube className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
                <button
                  onClick={() => handleEditWebhook(webhook)}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                  title="Editar webhook"
                >
                  <Edit2 className="h-4 w-4 text-zinc-400" />
                </button>
                <button
                  onClick={() => handleDeleteWebhook(webhook.id)}
                  disabled={deletingWebhooks.has(webhook.id)}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                  title="Deletar webhook"
                >
                  {deletingWebhooks.has(webhook.id) ? (
                    <Loader className="h-4 w-4 animate-spin text-zinc-500" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
                <button
                  onClick={() => toggleWebhookExpansion(webhook.id)}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  {expandedWebhooks.has(webhook.id) ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedWebhooks.has(webhook.id) && (
            <div className="border-t border-zinc-800">
              {/* Secret */}
              {webhook.secret && (
                <div className="px-4 py-3 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-400">Segredo do Webhook</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSecretVisibility(webhook.id)}
                        className="p-1 hover:bg-zinc-800 rounded"
                      >
                        {showingSecrets.has(webhook.id) ? (
                          <EyeOff className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyWebhookSecret(webhook.secret!)}
                        className="p-1 hover:bg-zinc-800 rounded"
                      >
                        <Copy className="h-4 w-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                  <code className="block mt-2 px-3 py-2 bg-zinc-800 rounded text-xs font-mono break-all">
                    {showingSecrets.has(webhook.id)
                      ? webhook.secret
                      : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
              )}

              {/* Events */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <label className="text-sm text-zinc-400 block mb-2">Eventos Configurados</label>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map(event => (
                    <span
                      key={event}
                      className="px-2 py-1 bg-zinc-800 text-xs rounded"
                    >
                      {webhookEventDescriptions[event as WebhookEventType]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Headers */}
              {webhook.headers && Object.keys(webhook.headers).length > 0 && (
                <div className="px-4 py-3 border-b border-zinc-800">
                  <label className="text-sm text-zinc-400 block mb-2">Headers Customizados</label>
                  <div className="space-y-1">
                    {Object.entries(webhook.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-zinc-500">{key}:</span>
                        <span className="text-zinc-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Events */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-400">Eventos Recentes</label>
                  <button
                    onClick={() => loadWebhookEvents(webhook.id)}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                {webhookEvents[webhook.id] && webhookEvents[webhook.id].length > 0 ? (
                  <div className="space-y-2">
                    {webhookEvents[webhook.id].slice(0, 5).map(event => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {event.status === 'SUCCESS' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : event.status === 'FAILED' ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                          )}
                          <span className="text-zinc-400">{event.eventType}</span>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-500">
                          <span>{event.attempts}/{event.maxAttempts} tentativas</span>
                          {event.responseCode && (
                            <span>HTTP {event.responseCode}</span>
                          )}
                          <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Nenhum evento registrado</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}