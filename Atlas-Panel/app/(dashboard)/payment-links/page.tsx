'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { accountValidationService } from '@/app/lib/services';
import { toast, Toaster } from 'sonner';
import { Link, Plus, QrCode, Copy, Download, Trash2, ExternalLink, DollarSign, Clock, Shield, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

export default function PaymentLinksPage() {
  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [key: string]: string }>({});
  const [linkData, setLinkData] = useState({
    amount: '',
    walletAddress: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    checkValidationStatus();
    fetchPaymentLinks();
    fetchValidationRequirements();
  }, []);

  const checkValidationStatus = async () => {
    setLoadingValidation(true);
    try {
      const status = await accountValidationService.getValidationStatus();
      setValidationStatus(status);
    } catch (error: any) {
      console.error('Error checking validation status:', error);
      
      // More detailed error handling
      if (error.response?.status === 401) {
        toast.error('Usuário não autenticado. Faça login novamente.');
        // Redirect to login
        window.location.href = '/login';
      } else if (error.response?.status === 404) {
        toast.error('Serviço de validação não encontrado');
      } else if (error.response?.data?.message) {
        toast.error(`Erro: ${error.response.data.message}`);
      } else {
        toast.error('Erro ao verificar status de validação');
      }
    } finally {
      setLoadingValidation(false);
    }
  };

  const fetchValidationRequirements = async () => {
    try {
      const requirements = await accountValidationService.getValidationRequirements();
      setValidationRequirements(requirements);
    } catch (error) {
      console.error('Error fetching validation requirements:', error);
    }
  };

  const fetchPaymentLinks = async () => {
    try {
      const response = await api.get('/payment-links');
      setPaymentLinks(response.data);
      
      // Generate QR codes for each link
      response.data.forEach((link: any) => {
        generateQRCode(link.shortCode);
      });
    } catch (error) {
      console.error('Error fetching payment links:', error);
    }
  };

  const generateQRCode = async (shortCode: string) => {
    try {
      const url = `${window.location.origin}/pay/${shortCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrls(prev => ({ ...prev, [shortCode]: qrCodeDataUrl }));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/payment-links', {
        ...linkData,
        amount: parseFloat(linkData.amount)
      });
      
      toast.success('Link de pagamento criado com sucesso!');
      setShowCreateForm(false);
      setLinkData({ amount: '', walletAddress: '', description: '' });
      fetchPaymentLinks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar link de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      await api.delete(`/payment-links/${id}`);
      toast.success('Link excluído com sucesso!');
      fetchPaymentLinks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir link');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  const downloadQRCode = (shortCode: string, description: string) => {
    const qrCodeUrl = qrCodeUrls[shortCode];
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `qrcode-${shortCode}-${description || 'pagamento'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Links de Pagamento</h1>
        {validationStatus?.isValidated ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Novo Link
          </button>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
          >
            <Shield size={20} />
            Validação Necessária
          </button>
        )}
      </div>

      {/* Info Box or Validation Required */}
      {loadingValidation ? (
        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader className="text-gray-400 animate-spin" size={20} />
            <p className="text-gray-400">Verificando status de validação...</p>
          </div>
        </div>
      ) : !validationStatus?.isValidated ? (
        <div className="mb-6 p-6 bg-yellow-900/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Shield className="text-yellow-400 flex-shrink-0" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-400 font-semibold text-lg mb-2">Validação de Conta Necessária</h3>
              <p className="text-gray-300 mb-5 leading-relaxed">
                Para criar links de pagamento, você precisa validar sua conta primeiro. 
                O processo é simples e requer apenas um pagamento de <strong className="text-white">R$ {validationRequirements?.amount ? (validationRequirements.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,00'}</strong>.
              </p>
              
              <a 
                href="/deposit"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                <Shield size={18} />
                Validar Conta Agora
              </a>
            </div>
          </div>
        </div>
      ) : (
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
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Criar Link de Pagamento</h2>
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={linkData.amount}
                  onChange={(e) => setLinkData({ ...linkData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="100.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Carteira de Destino
                </label>
                <input
                  type="text"
                  value={linkData.walletAddress}
                  onChange={(e) => setLinkData({ ...linkData, walletAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Endereço da carteira"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={linkData.description}
                  onChange={(e) => setLinkData({ ...linkData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Pagamento do produto X"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando...' : 'Criar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Links Grid */}
      {validationStatus?.isValidated ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentLinks.length === 0 ? (
            <div className="col-span-full bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <Link className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-400">Nenhum link de pagamento criado</p>
              <p className="text-gray-500 text-sm mt-2">
                Clique em "Novo Link" para criar seu primeiro link de pagamento
              </p>
            </div>
          ) : (
            paymentLinks.map((link) => (
            <div key={link.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                {qrCodeUrls[link.shortCode] && (
                  <img 
                    src={qrCodeUrls[link.shortCode]} 
                    alt="QR Code"
                    className="w-32 h-32 bg-white p-2 rounded-lg"
                  />
                )}
              </div>

              {/* Link Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Valor</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(link.amount)}</p>
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
                      onClick={() => copyToClipboard(`${window.location.origin}/pay/${link.shortCode}`)}
                      className="text-gray-400 hover:text-white"
                      title="Copiar link"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      href={`${window.location.origin}/pay/${link.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white"
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

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => downloadQRCode(link.shortCode, link.description)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Download size={16} />
                    QR Code
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center gap-1 ${
                    link.isActive ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      link.isActive ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    {link.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  {link.qrCodeGeneratedAt && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      QR atualizado {new Date(link.qrCodeGeneratedAt).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}