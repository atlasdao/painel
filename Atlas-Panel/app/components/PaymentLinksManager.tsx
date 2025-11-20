'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { toast } from 'sonner';
import {
  Link,
  Plus,
  QrCode,
  Copy,
  Trash2,
  ExternalLink,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader,
  TrendingUp,
  Users,
  Calendar,
  MoreVertical,
  Share2,
  Download,
  Shield,
  ChevronDown,
  ChevronUp,
  Wallet,
  X,
  Webhook
} from 'lucide-react';
import QRCode from 'qrcode';
import { accountValidationService } from '@/app/lib/services';
import WebhookConfiguration from './WebhookConfiguration';
// import { triggerConfetti } from '@/app/lib/confetti';

interface PaymentLink {
  id: string;
  shortCode: string;
  amount?: number;
  isCustomAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
  walletAddress: string;
  description?: string;
  totalPayments: number;
  totalAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
}

interface PaymentLinksManagerProps {
  defaultWallet?: string;
}

export default function PaymentLinksManager({ defaultWallet }: PaymentLinksManagerProps) {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLink, setEditingLink] = useState<PaymentLink | null>(null);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [key: string]: string }>({});
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    isValidated: boolean;
    validationPaymentId?: string;
    validatedAt?: string;
    limits?: any;
    reputation?: any;
  } | null>(null);
  const [validationRequirements, setValidationRequirements] = useState<{
    amount: number;
    description: string;
    benefits: string[];
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(true);
  const [showDescription, setShowDescription] = useState(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('payment-links-description-dismissed');
      return dismissed !== 'true';
    }
    return true;
  });
  const [showWebhookConfig, setShowWebhookConfig] = useState<string | null>(null);

  // Session storage keys
  const FORM_STORAGE_KEY = 'payment-links-form-data';
  const EDIT_FORM_STORAGE_KEY = 'payment-links-edit-form-data';

  // Initialize form data with session storage
  const getInitialFormData = () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (saved) {
          const parsedData = JSON.parse(saved);
          return {
            ...parsedData,
            walletAddress: defaultWallet || parsedData.walletAddress || '',
          };
        }
      } catch (error) {
        console.warn('Failed to load form data from session storage:', error);
      }
    }
    return {
      amount: '',
      description: '',
      isCustomAmount: false,
      minAmount: '',
      maxAmount: '',
      walletAddress: defaultWallet || '',
      useDefaultWallet: true,
      selectedWalletType: 'LIQUID' as 'LIQUID',
      showAdvancedConfigs: false,
      customWalletAddress: ''
    };
  };

  // Initialize edit form data
  const getInitialEditFormData = () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(EDIT_FORM_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load edit form data from session storage:', error);
      }
    }
    return {
      amount: '',
      description: '',
      isCustomAmount: false,
      minAmount: '',
      maxAmount: '',
      walletAddress: '',
      isActive: true
    };
  };

  const [formData, setFormDataState] = useState(getInitialFormData);
  const [editFormData, setEditFormDataState] = useState(getInitialEditFormData);

  // Custom setFormData that automatically saves to session storage
  const setFormData = (newData: any) => {
    const updatedData = typeof newData === 'function' ? newData(formData) : newData;
    setFormDataState(updatedData);

    // Save to session storage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(updatedData));
      } catch (error) {
        console.warn('Failed to save form data to session storage:', error);
      }
    }
  };

  // Custom setEditFormData that automatically saves to session storage
  const setEditFormData = (newData: any) => {
    const updatedData = typeof newData === 'function' ? newData(editFormData) : newData;
    setEditFormDataState(updatedData);

    // Save to session storage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(EDIT_FORM_STORAGE_KEY, JSON.stringify(updatedData));
      } catch (error) {
        console.warn('Failed to save edit form data to session storage:', error);
      }
    }
  };

  // Clear form data from session storage when form is reset
  const clearFormData = () => {
    const defaultData = {
      amount: '',
      description: '',
      isCustomAmount: false,
      minAmount: '',
      maxAmount: '',
      walletAddress: defaultWallet || '',
      useDefaultWallet: true,
      selectedWalletType: 'LIQUID' as 'LIQUID',
      showAdvancedConfigs: false,
      customWalletAddress: ''
    };

    setFormDataState(defaultData);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear form data from session storage:', error);
      }
    }
  };

  // Clear edit form data from session storage when form is reset
  const clearEditFormData = () => {
    const defaultData = {
      amount: '',
      description: '',
      isCustomAmount: false,
      minAmount: '',
      maxAmount: '',
      walletAddress: '',
      isActive: true
    };

    setEditFormDataState(defaultData);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(EDIT_FORM_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear edit form data from session storage:', error);
      }
    }
  };

  const dismissDescription = () => {
    setShowDescription(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('payment-links-description-dismissed', 'true');
    }
  };

  useEffect(() => {
    checkValidationStatus();
    loadPaymentLinks();
  }, []);

  const checkValidationStatus = async () => {
    setLoadingValidation(true);
    try {
      const [status, requirements] = await Promise.all([
        accountValidationService.getValidationStatus(),
        accountValidationService.getValidationRequirements()
      ]);
      setValidationStatus(status);
      setValidationRequirements(requirements);
    } catch (error: any) {
      console.error('Error checking validation status:', error);
      // If validation check fails, assume not validated
      setValidationStatus({ isValidated: false });

      // Get current validation amount robustly
      try {
        const validationAmount = await accountValidationService.getCurrentValidationAmount();
        setValidationRequirements({
          amount: validationAmount,
          description: `Pagamento único de R$ ${validationAmount.toFixed(2).replace('.', ',')} para validar sua conta`,
          benefits: ['Gerar depósitos ilimitados', 'Acesso completo às funcionalidades']
        });
      } catch (fallbackError) {
        console.error('Error getting current validation amount:', fallbackError);
        // This should rarely happen now
        setValidationRequirements({
          amount: 2.0, // Use admin default instead of hardcoded 1.0
          description: 'Pagamento único de R$ 2,00 para validar sua conta',
          benefits: ['Gerar depósitos ilimitados', 'Acesso completo às funcionalidades']
        });
      }
    } finally {
      setLoadingValidation(false);
    }
  };

  const loadPaymentLinks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/payment-links');
      setPaymentLinks(response.data);

      // Generate QR codes for each link
      const qrCodes: { [key: string]: string } = {};
      for (const link of response.data) {
        const url = `${window.location.origin}/pay/${link.shortCode}`;
        qrCodes[link.id] = await QRCode.toDataURL(url);
      }
      setQrCodeUrls(qrCodes);
    } catch (error) {
      console.error('Error loading payment links:', error);
      toast.error('Erro ao carregar links de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to safely convert string to number
  const sanitizeNumber = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  };

  const handleCreateLink = async () => {
    // Enhanced validation with better error messages
    if (formData.isCustomAmount) {
      const minAmount = sanitizeNumber(formData.minAmount);
      const maxAmount = sanitizeNumber(formData.maxAmount);

      if (!minAmount && !maxAmount) {
        toast.error('Para valores personalizados, defina pelo menos um valor mínimo ou máximo');
        return;
      }

      if (minAmount && minAmount <= 0) {
        toast.error('O valor mínimo deve ser maior que zero');
        return;
      }

      if (maxAmount && maxAmount <= 0) {
        toast.error('O valor máximo deve ser maior que zero');
        return;
      }

      if (minAmount && maxAmount && minAmount >= maxAmount) {
        toast.error('O valor mínimo deve ser menor que o valor máximo');
        return;
      }
    } else {
      const amount = sanitizeNumber(formData.amount);
      if (!amount || amount <= 0) {
        toast.error('Digite um valor válido para o pagamento');
        return;
      }
    }

    // Enhanced wallet validation
    const selectedWallet = formData.showAdvancedConfigs && !formData.useDefaultWallet
      ? formData.customWalletAddress
      : defaultWallet;

    if (!selectedWallet || selectedWallet.trim().length === 0) {
      toast.error('Configure uma carteira para recebimento');
      return;
    }

    // Validate wallet address format based on selected type
    if (formData.showAdvancedConfigs && !formData.useDefaultWallet) {
      if (!formData.customWalletAddress.trim()) {
        toast.error('Digite um endereço de carteira válido');
        return;
      }
      // Basic validation for LIQUID wallet address
      const walletAddress = formData.customWalletAddress.trim();
      // Add any LIQUID-specific validation here if needed
    }

    try {
      // Sanitize all numeric inputs before sending to API
      const payload = {
        amount: formData.isCustomAmount ? undefined : sanitizeNumber(formData.amount),
        isCustomAmount: formData.isCustomAmount,
        minAmount: formData.isCustomAmount ? sanitizeNumber(formData.minAmount) : undefined,
        maxAmount: formData.isCustomAmount ? sanitizeNumber(formData.maxAmount) : undefined,
        description: formData.description || undefined,
        walletAddress: selectedWallet.trim()
      };


      const response = await api.post('/payment-links', payload);

      toast.success('Link de pagamento criado com sucesso!');
      // triggerConfetti.success();

      // Generate QR code for the new link
      const url = `${window.location.origin}/pay/${response.data.shortCode}`;
      const qrCode = await QRCode.toDataURL(url);
      setQrCodeUrls(prev => ({ ...prev, [response.data.id]: qrCode }));

      // Add to list
      setPaymentLinks(prev => [response.data, ...prev]);

      // Reset form and clear session storage
      clearFormData();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('❌ Payment link creation failed:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message
      });

      let errorMessage = 'Erro ao criar link de pagamento';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Dados inválidos. Verifique os valores informados e tente novamente.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns momentos.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      toast.error(errorMessage);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/payment-links/${id}`);
      setPaymentLinks(prev => prev.filter(link => link.id !== id));
      toast.success('Link removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover link');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleLink = async (link: PaymentLink) => {
    try {
      const response = await api.patch(`/payment-links/${link.id}/toggle`);
      const updatedLink = response.data;

      // Update the link in the local state
      setPaymentLinks(prev => prev.map(l =>
        l.id === link.id ? updatedLink : l
      ));

      toast.success(
        updatedLink.isActive
          ? 'Link de pagamento ativado!'
          : 'Link de pagamento desativado!'
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status do link');
    }
  };

  const handleEditLink = (link: PaymentLink) => {
    setEditingLink(link);
    setEditFormData({
      amount: link.amount ? link.amount.toString() : '',
      description: link.description || '',
      isCustomAmount: link.isCustomAmount,
      minAmount: link.minAmount ? link.minAmount.toString() : '',
      maxAmount: link.maxAmount ? link.maxAmount.toString() : '',
      walletAddress: link.walletAddress,
      isActive: link.isActive
    });
    setShowEditForm(true);
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    // Enhanced validation with better error messages
    if (editFormData.isCustomAmount) {
      const minAmount = sanitizeNumber(editFormData.minAmount);
      const maxAmount = sanitizeNumber(editFormData.maxAmount);

      if (!minAmount && !maxAmount) {
        toast.error('Para valores personalizados, defina pelo menos um valor mínimo ou máximo');
        return;
      }

      if (minAmount && minAmount <= 0) {
        toast.error('O valor mínimo deve ser maior que zero');
        return;
      }

      if (maxAmount && maxAmount <= 0) {
        toast.error('O valor máximo deve ser maior que zero');
        return;
      }

      if (minAmount && maxAmount && minAmount >= maxAmount) {
        toast.error('O valor mínimo deve ser menor que o valor máximo');
        return;
      }
    } else {
      const amount = sanitizeNumber(editFormData.amount);
      if (!amount || amount <= 0) {
        toast.error('Digite um valor válido para o pagamento');
        return;
      }
    }

    // Enhanced wallet validation
    if (!editFormData.walletAddress || editFormData.walletAddress.trim().length === 0) {
      toast.error('Endereço da carteira é obrigatório');
      return;
    }

    try {
      // Sanitize all numeric inputs before sending to API
      const payload = {
        amount: editFormData.isCustomAmount ? undefined : sanitizeNumber(editFormData.amount),
        isCustomAmount: editFormData.isCustomAmount,
        minAmount: editFormData.isCustomAmount ? sanitizeNumber(editFormData.minAmount) : undefined,
        maxAmount: editFormData.isCustomAmount ? sanitizeNumber(editFormData.maxAmount) : undefined,
        description: editFormData.description || undefined,
        walletAddress: editFormData.walletAddress.trim(),
        isActive: editFormData.isActive
      };


      const response = await api.patch(`/payment-links/${editingLink.id}`, payload);

      toast.success('Link de pagamento atualizado com sucesso!');

      // Generate new QR code for the updated link if payment details changed
      if (payload.amount !== undefined || payload.walletAddress !== undefined || payload.description !== undefined) {
        const url = `${window.location.origin}/pay/${response.data.shortCode}`;
        const qrCode = await QRCode.toDataURL(url);
        setQrCodeUrls(prev => ({ ...prev, [response.data.id]: qrCode }));
      }

      // Update in list
      setPaymentLinks(prev => prev.map(link =>
        link.id === editingLink.id ? response.data : link
      ));

      // Reset form and clear session storage
      clearEditFormData();
      setShowEditForm(false);
      setEditingLink(null);
    } catch (error: any) {
      console.error('❌ Payment link update failed:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message
      });

      let errorMessage = 'Erro ao atualizar link de pagamento';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Dados inválidos. Verifique os valores informados e tente novamente.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Link de pagamento não encontrado.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns momentos.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      toast.error(errorMessage);
    }
  };

  const copyLink = (shortCode: string) => {
    const url = `${window.location.origin}/pay/${shortCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const shareLink = async (link: PaymentLink) => {
    const url = `${window.location.origin}/pay/${link.shortCode}`;
    const text = link.description || 'Link de pagamento';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Link de Pagamento',
          text: text,
          url: url
        });
      } catch (err) {
        // Share cancelled or failed silently
      }
    } else {
      copyLink(link.shortCode);
    }
  };

  const downloadQRCode = (link: PaymentLink) => {
    const qrCodeUrl = qrCodeUrls[link.id];
    if (!qrCodeUrl) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = qrCodeUrl;
    downloadLink.download = `qrcode-${link.shortCode}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code baixado!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 native-scroll">
      <div className="flex items-center justify-between mb-6">
        <h2 className="native-heading-2 flex items-center gap-3">
          <Link className="text-purple-400" size={24} />
          Links de Pagamento
        </h2>

        {validationStatus?.isValidated ? (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="native-button flex items-center gap-2 touch-target"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Criar Novo Link</span>
            <span className="sm:hidden">Criar</span>
          </button>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-600/50 text-gray-400 rounded-lg cursor-not-allowed opacity-50 touch-target"
          >
            <Shield size={20} />
            <span className="hidden sm:inline">Validação Necessária</span>
            <span className="sm:hidden">Validar</span>
          </button>
        )}
      </div>

      {/* Validation Status Info */}
      {loadingValidation ? (
        <div className="mb-6 p-4 glass-card animate-bounce-in">
          <div className="flex items-center gap-3">
            <Loader className="text-gray-400 animate-spin" size={20} />
            <p className="text-gray-400">Verificando status de validação...</p>
          </div>
        </div>
      ) : !validationStatus?.isValidated ? (
        <div className="mb-6 p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Shield className="text-yellow-400 flex-shrink-0" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-400 font-semibold text-lg mb-2">Validação de Conta Necessária</h3>
              <p className="text-gray-300 mb-5 leading-relaxed">
                Para criar links de pagamento, você precisa validar sua conta primeiro.
                O processo é simples e requer apenas um pagamento de <strong className="text-white">
                  R$ {validationRequirements?.amount ? validationRequirements.amount.toFixed(2).replace('.', ',') : '2,00'}
                </strong>.
              </p>

              <a
                href="/deposit"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl touch-target"
              >
                <Shield size={18} />
                Validar Conta Agora
              </a>
            </div>
          </div>
        </div>
      ) : showDescription ? (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <QrCode className="text-blue-400 mt-0.5" size={20} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-blue-400 font-medium">Links de Pagamento Rápido</p>
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle size={16} />
                  <span className="text-sm">Conta Validada</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm">
                Crie links personalizados para receber pagamentos. Cada link gera um QR Code PIX
                que é renovado automaticamente a cada 28 minutos ou após cada pagamento.
              </p>
              {validationStatus?.limits && (
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-600/30 rounded">
                  <p className="text-blue-300 text-sm font-medium mb-1">Seus Limites Atuais:</p>
                  <p className="text-blue-300 text-sm">
                    Limite diário: <strong>R$ {validationStatus.limits.currentDailyLimit}</strong>
                    (Tier {validationStatus.limits.limitTier})
                  </p>
                  {validationStatus.reputation && (
                    <p className="text-blue-300 text-sm">
                      Reputação: <strong>{validationStatus.reputation.reputationScore.toFixed(1)}</strong>
                      ({validationStatus.reputation.totalApprovedCount} pagamentos aprovados)
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={dismissDescription}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors touch-target text-gray-400 hover:text-gray-300 flex-shrink-0"
              title="Ocultar esta mensagem permanentemente"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Enhanced Create Form */}
      {showCreateForm && (
        <div className="glass-card-premium p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
              <Plus className="text-purple-400" size={20} />
            </div>
            <h3 className="text-xl font-bold text-white">Criar Novo Link de Pagamento</h3>
          </div>

          <div className="space-y-5">
            {/* Custom Amount Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="customAmount"
                checked={formData.isCustomAmount}
                onChange={(e) => setFormData({ ...formData, isCustomAmount: e.target.checked })}
                className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="customAmount" className="text-gray-300">
                Permitir valor personalizado
              </label>
            </div>

            {/* Amount Fields */}
            {formData.isCustomAmount ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Valor Mínimo
                  </label>
                  <input
                    type="number"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                    placeholder="10.00"
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Valor Máximo
                  </label>
                  <input
                    type="number"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    placeholder="1000.00"
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Valor do Pagamento
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="100.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                  style={{ fontSize: '16px' }}
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Pagamento do pedido #123"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Advanced Configurations Section */}
            <div className="border-t border-gray-700 pt-5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, showAdvancedConfigs: !formData.showAdvancedConfigs })}
                className="flex items-center justify-between w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-all duration-200 touch-target"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                    <Wallet className="text-blue-400" size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-medium">Configurações Avançadas</h4>
                    <p className="text-gray-400 text-sm">Selecionar carteira e opções extras</p>
                  </div>
                </div>
                {formData.showAdvancedConfigs ? (
                  <ChevronUp className="text-gray-400" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400" size={20} />
                )}
              </button>

              {/* Collapsible Advanced Content */}
              {formData.showAdvancedConfigs && (
                <div className="mt-4 space-y-4 animate-slide-down">
                  {/* Use Default Wallet Toggle */}
                  <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="useDefaultWallet"
                        checked={formData.useDefaultWallet}
                        onChange={(e) => setFormData({ ...formData, useDefaultWallet: e.target.checked, customWalletAddress: '' })}
                        className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="useDefaultWallet" className="text-gray-300 font-medium">
                        Usar carteira padrão
                      </label>
                    </div>
                    {defaultWallet && formData.useDefaultWallet && (
                      <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded border">
                        <strong>Carteira Padrão:</strong> {defaultWallet.substring(0, 20)}...
                      </div>
                    )}
                  </div>

                  {/* Custom Wallet Configuration */}
                  {!formData.useDefaultWallet && (
                    <div className="space-y-4">
                      {/* LIQUID Wallet Type Info */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">
                          Tipo de Carteira
                        </label>
                        <div className="p-4 border-2 border-blue-500 bg-blue-500/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Wallet className="text-blue-400" size={20} />
                            </div>
                            <div>
                              <p className="text-blue-300 font-medium">Liquid Bitcoin</p>
                              <p className="text-blue-400/80 text-sm">Carteira Liquid Network</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom Wallet Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Endereço da Carteira
                        </label>
                        <input
                          type="text"
                          value={formData.customWalletAddress}
                          onChange={(e) => setFormData({ ...formData, customWalletAddress: e.target.value })}
                          placeholder="Digite o endereço da carteira"
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                          style={{ fontSize: '16px' }}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Endereço da carteira para recebimento dos pagamentos
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Enhanced Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={handleCreateLink}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl touch-target flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Criar Link de Pagamento
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-all duration-200 touch-target"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit Form Modal */}
      {showEditForm && editingLink && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card-premium max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                  <Edit className="text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">Editar Link de Pagamento</h3>
                  <p className="text-gray-400 text-sm">
                    Código: {editingLink.shortCode} • Criado em {new Date(editingLink.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingLink(null);
                    clearEditFormData();
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors touch-target"
                  title="Fechar"
                >
                  <XCircle className="text-gray-400" size={20} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Status Toggle */}
                <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium mb-1">Status do Link</h4>
                      <p className="text-gray-400 text-sm">
                        {editFormData.isActive ? 'Link ativo e funcionando' : 'Link desativado temporariamente'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editFormData.isActive ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                      title={editFormData.isActive ? 'Desativar link' : 'Ativar link'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editFormData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Custom Amount Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editCustomAmount"
                    checked={editFormData.isCustomAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, isCustomAmount: e.target.checked })}
                    className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="editCustomAmount" className="text-gray-300">
                    Permitir valor personalizado
                  </label>
                </div>

                {/* Amount Fields */}
                {editFormData.isCustomAmount ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Valor Mínimo
                      </label>
                      <input
                        type="number"
                        value={editFormData.minAmount}
                        onChange={(e) => setEditFormData({ ...editFormData, minAmount: e.target.value })}
                        placeholder="10.00"
                        min="0.01"
                        step="0.01"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Valor Máximo
                      </label>
                      <input
                        type="number"
                        value={editFormData.maxAmount}
                        onChange={(e) => setEditFormData({ ...editFormData, maxAmount: e.target.value })}
                        placeholder="1000.00"
                        min="0.01"
                        step="0.01"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Valor do Pagamento
                    </label>
                    <input
                      type="number"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      placeholder="100.00"
                      min="0.01"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Ex: Pagamento do pedido #123"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Endereço da Carteira
                  </label>
                  <input
                    type="text"
                    value={editFormData.walletAddress}
                    onChange={(e) => setEditFormData({ ...editFormData, walletAddress: e.target.value })}
                    placeholder="Digite o endereço da carteira"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none touch-target"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ Alterar a carteira invalidará o QR Code atual
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-700">
                  <button
                    onClick={handleUpdateLink}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl touch-target flex items-center justify-center gap-2"
                  >
                    <Edit size={18} />
                    Atualizar Link
                  </button>
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingLink(null);
                      clearEditFormData();
                    }}
                    className="px-6 py-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-all duration-200 touch-target"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Links Grid */}
      {validationStatus?.isValidated ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentLinks.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center">
              <Link className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-400">Nenhum link de pagamento criado</p>
              <p className="text-gray-500 text-sm mt-2">
                Clique em "Criar Novo Link" para criar seu primeiro link de pagamento
              </p>
            </div>
          ) : (
            paymentLinks.map((link) => (
              <div key={link.id} className="glass-card p-6">
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  {qrCodeUrls[link.id] && (
                    <img
                      src={qrCodeUrls[link.id]}
                      alt="QR Code"
                      className="w-32 h-32 bg-white p-2 rounded-lg"
                    />
                  )}
                </div>

                {/* Link Info */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Valor</p>
                    {link.isCustomAmount ? (
                      <div>
                        <p className="text-lg font-bold text-blue-400">Valor Personalizado</p>
                        {(link.minAmount || link.maxAmount) && (
                          <p className="text-sm text-gray-400">
                            {link.minAmount && `Min: ${formatCurrency(link.minAmount)}`}
                            {link.minAmount && link.maxAmount && ' - '}
                            {link.maxAmount && `Max: ${formatCurrency(link.maxAmount)}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-white">{formatCurrency(link.amount || 0)}</p>
                    )}
                  </div>

                  {link.description && (
                    <div>
                      <p className="text-sm text-gray-400">Descrição</p>
                      <p className="text-white">{link.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-400">Link</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-blue-400 bg-gray-700 px-2 py-1 rounded flex-1 truncate">
                        {window.location.origin}/pay/{link.shortCode}
                      </code>
                      <button
                        onClick={() => copyLink(link.shortCode)}
                        className="text-gray-400 hover:text-white touch-target"
                        title="Copiar link"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={`${window.location.origin}/pay/${link.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white touch-target"
                        title="Abrir link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400">Pagamentos</p>
                      <p className="text-lg font-semibold text-white">{link.totalPayments || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Recebido</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(link.totalAmount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Toggle and Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleLink(link)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          link.isActive ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        title={link.isActive ? 'Desativar link' : 'Ativar link'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          link.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className={`text-xs ${
                        link.isActive ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {link.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowWebhookConfig(link.id)}
                        className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors touch-target"
                        title="Configurar webhooks"
                      >
                        <Webhook size={16} />
                      </button>
                      <button
                        onClick={() => handleEditLink(link)}
                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors touch-target"
                        title="Editar link"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => downloadQRCode(link)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors touch-target"
                        title="Baixar QR Code"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        disabled={deletingId === link.id}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors touch-target"
                        title="Excluir link"
                      >
                        {deletingId === link.id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Webhook Configuration Modal */}
      {showWebhookConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Configuração de Webhooks</h2>
              <button
                onClick={() => setShowWebhookConfig(null)}
                className="p-2 hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <WebhookConfiguration
              paymentLinkId={showWebhookConfig}
              onWebhookChange={() => {
                // Optionally reload payment links or show a success message
                toast.success('Webhook configurado com sucesso!');
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}