'use client';

import { useState } from 'react';
import { api } from '@/app/lib/api';
import { toast } from 'sonner';
import {
  QrCode,
  Copy,
  Download,
  DollarSign,
  User,
  CheckCircle,
  Loader,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import QRCode from 'qrcode';
import { triggerConfetti } from '@/app/lib/confetti';

interface QRCodeGeneratorProps {
  defaultWallet?: string;
}

interface GeneratedQR {
  qrCode: string;
  pixCode: string;
  transactionId: string;
  expiresAt: string;
  status: 'pending' | 'completed' | 'expired';
}

export default function QRCodeGenerator({ defaultWallet }: QRCodeGeneratorProps) {
  const [formData, setFormData] = useState({
    amount: '',
    payerCpf: '',
    walletAddress: defaultWallet || ''
  });
  const [useCustomWallet, setUseCustomWallet] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<GeneratedQR | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showFirstTimeWarning, setShowFirstTimeWarning] = useState(true);

  const validateCPF = (cpf: string) => {
    // Remove non-digits
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length !== 11 && cleaned.length !== 14) {
      return false;
    }

    // Basic CPF validation (11 digits)
    if (cleaned.length === 11) {
      // Check if all digits are the same
      if (/^(\d)\1+$/.test(cleaned)) {
        return false;
      }
      // You could add more sophisticated CPF validation here
      return true;
    }

    // Basic CNPJ validation (14 digits)
    if (cleaned.length === 14) {
      // Check if all digits are the same
      if (/^(\d)\1+$/.test(cleaned)) {
        return false;
      }
      // You could add more sophisticated CNPJ validation here
      return true;
    }

    return false;
  };

  const formatCPFCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length <= 11) {
      // Format as CPF: 000.000.000-00
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // Format as CNPJ: 00.000.000/0000-00
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleGenerateQR = async () => {
    if (!formData.amount || parseFloat(formData.amount.replace(',', '.')) <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    // Validate amount limits (Commerce Mode: NO level limits, only max per transaction)
    const amountValue = parseFloat(formData.amount.replace(',', '.'));
    const minAmount = 1;
    const maxAmount = formData.payerCpf ? 5000 : 3000;

    if (amountValue < minAmount) {
      toast.error(`Valor mínimo permitido: R$ ${minAmount.toFixed(2)}`);
      return;
    }

    if (amountValue > maxAmount) {
      toast.error(`Valor máximo por transação: R$ ${maxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      return;
    }

    if (formData.payerCpf && !validateCPF(formData.payerCpf)) {
      toast.error('CPF/CNPJ inválido');
      return;
    }

    // Handle wallet validation
    if (useCustomWallet && !formData.walletAddress) {
      toast.error('Digite o endereço DePix personalizado');
      return;
    }

    if (!useCustomWallet && !defaultWallet) {
      toast.error('Configure uma carteira padrão ou use uma carteira personalizada');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount.replace(',', '.')), // Handle comma decimal separator
        payerCpfCnpj: formData.payerCpf ? formData.payerCpf.replace(/\D/g, '') : undefined,
        depixAddress: useCustomWallet ? formData.walletAddress : defaultWallet,
        isCommerceRequest: true // Flag to indicate this is from commerce page, not deposit page
      };

      const response = await api.post('/pix/qrcode', payload);

      // Generate QR code image from the PIX code
      const qrCodeData = response.data.qrCode || response.data.pixCode;
      const qrCodeDataUrl = response.data.qrCodeImage || await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setGeneratedQR({
        qrCode: qrCodeDataUrl,
        pixCode: qrCodeData,
        transactionId: response.data.transactionId,
        expiresAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(), // 18 minutes from now
        status: 'pending'
      });

      toast.success('QR Code gerado com sucesso!');
      triggerConfetti.basic();

      // Start checking payment status
      startStatusPolling(response.data.transactionId);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao gerar QR Code';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const startStatusPolling = (transactionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/pix/deposit/${transactionId}/status`);

        if (response.data.status === 'COMPLETED' || response.data.status === 'completed') {
          setGeneratedQR(prev => prev ? { ...prev, status: 'completed' } : null);
          toast.success('Pagamento recebido com sucesso!');
          triggerConfetti.success();
          clearInterval(interval);
        } else if (response.data.status === 'EXPIRED' || response.data.status === 'expired') {
          setGeneratedQR(prev => prev ? { ...prev, status: 'expired' } : null);
          clearInterval(interval);
        } else if (response.data.status === 'FAILED' || response.data.status === 'failed') {
          setGeneratedQR(prev => prev ? { ...prev, status: 'expired' } : null);
          toast.error('Pagamento falhou ou foi cancelado');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000); // Check every 5 seconds

    // Clear interval after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const copyPixCode = () => {
    if (!generatedQR?.pixCode) return;

    navigator.clipboard.writeText(generatedQR.pixCode);
    toast.success('Código PIX copiado!');
  };

  const downloadQRCode = () => {
    if (!generatedQR?.qrCode) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = generatedQR.qrCode;
    downloadLink.download = `qrcode-pix-${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code baixado!');
  };

  const handleReset = () => {
    setGeneratedQR(null);
    setFormData({
      amount: '',
      payerCpf: '',
      walletAddress: defaultWallet || ''
    });
    setUseCustomWallet(false);
  };

  const formatCurrency = (value: string) => {
    // Allow decimal input with comma or dot
    const cleanValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numericValue = parseFloat(cleanValue);

    if (isNaN(numericValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <QrCode className="text-purple-400" size={24} />
        Gerar QR Code Manual
      </h2>

      {/* Info Box */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-400">
          Gere QR Codes PIX que podem receber pagamento de qualquer CPF ou CNPJ.
          Ideal para pagamentos presenciais ou vendas diretas.
        </p>
      </div>

      {/* First Time Purchase Warning */}
      {showFirstTimeWarning && (
        <div className="relative p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
          <button
            onClick={() => setShowFirstTimeWarning(false)}
            className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-300 transition-colors"
            aria-label="Fechar aviso"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start gap-3 pr-6">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium mb-1">
                Aviso para Clientes Novos
              </p>
              <p className="text-yellow-300/90 text-sm">
                Clientes que nunca compraram DePix possuem um limite de <strong>R$ 500,00</strong> na primeira compra.
                Após 24 horas da primeira transação, poderão realizar compras com os limites normais (até R$ 3.000 ou R$ 5.000 com CPF/CNPJ).
              </p>
            </div>
          </div>
        </div>
      )}

      {!generatedQR ? (
        /* QR Code Generation Form */
        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Valor do Pagamento *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.amount}
                onChange={(e) => {
                  // Allow decimal input with comma or dot
                  const value = e.target.value.replace(/[^\d,.-]/g, '');
                  setFormData({ ...formData, amount: value });
                }}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Limites: R$ 1,00 (mínimo) a R$ {formData.payerCpf ? '5.000,00' : '3.000,00'} {formData.payerCpf ? '(com CPF/CNPJ)' : '(sem CPF/CNPJ)'} por transação
            </p>
          </div>


          {/* Payer CPF/CNPJ Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              CPF/CNPJ do Pagador (opcional)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.payerCpf}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                  setFormData({ ...formData, payerCpf: value });
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para aceitar pagamento de qualquer CPF/CNPJ (limite de R$ 3.000 por transação). Com CPF/CNPJ específico o limite é R$ 5.000
            </p>
          </div>

          {/* Custom Wallet Toggle - Only show if user has default wallet */}
          {defaultWallet ? (
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <label className="text-sm font-medium text-white">
                Usar carteira personalizada
              </label>
              <button
                type="button"
                onClick={() => setUseCustomWallet(!useCustomWallet)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useCustomWallet ? 'bg-purple-600' : 'bg-gray-500'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useCustomWallet ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ) : null}

          {/* Show wallet input when: no default wallet OR custom wallet enabled */}
          {(!defaultWallet || useCustomWallet) && (
            <div className="transition-all duration-300 ease-in-out">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Endereço DePix {!defaultWallet ? '(Obrigatório)' : ''}
              </label>
              <input
                type="text"
                value={formData.walletAddress}
                onChange={(e) => {
                  setFormData({ ...formData, walletAddress: e.target.value });
                  // Auto-enable custom wallet when user starts typing
                  if (e.target.value && !useCustomWallet) {
                    setUseCustomWallet(true);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                placeholder={defaultWallet ? "Endereço DePix personalizado" : "Insira o endereço DePix"}
                required={!defaultWallet || useCustomWallet}
              />
              {!defaultWallet && (
                <p className="text-xs text-gray-400 mt-1">
                  Configure uma carteira padrão nas configurações para tornar este campo opcional
                </p>
              )}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateQR}
            disabled={isGenerating || !formData.amount}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Gerando QR Code...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Gerar QR Code PIX
              </span>
            )}
          </button>
        </div>
      ) : (
        /* Generated QR Code Display */
        <div className="space-y-6">
          {/* Status Banner */}
          {generatedQR.status === 'completed' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Pagamento recebido com sucesso!
              </p>
            </div>
          )}

          {generatedQR.status === 'expired' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                QR Code expirado. Gere um novo código.
              </p>
            </div>
          )}

          {generatedQR.status === 'pending' && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 flex items-center gap-2">
                <Clock className="w-5 h-5 animate-pulse" />
                Aguardando pagamento...
              </p>
            </div>
          )}

          {/* QR Code Display */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* QR Code Image */}
            <div className="flex-shrink-0">
              <div className="bg-white p-4 rounded-xl">
                <img
                  src={generatedQR.qrCode}
                  alt="QR Code PIX"
                  className="w-64 h-64"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </button>
              </div>
            </div>

            {/* QR Code Details */}
            <div className="flex-1 space-y-4">
              {/* Transaction Info */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Detalhes do Pagamento</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor:</span>
                    <span className="text-white font-medium">
                      {formatCurrency(formData.amount)}
                    </span>
                  </div>


                  {formData.payerCpf && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">CPF/CNPJ:</span>
                      <span className="text-white">{formatCPFCNPJ(formData.payerCpf)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-400">ID da Transação:</span>
                    <span className="text-white font-mono text-sm">{generatedQR.transactionId}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Expira em:</span>
                    <span className="text-white">
                      {new Date(generatedQR.expiresAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* PIX Copy Code */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Código PIX Copia e Cola</h3>
                  <button
                    onClick={copyPixCode}
                    className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
                <code className="block p-3 bg-gray-900 rounded text-xs text-gray-300 break-all">
                  {generatedQR.pixCode}
                </code>
              </div>

              {/* Actions */}
              <button
                onClick={handleReset}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Gerar Novo QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-gray-800/30 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400" />
          Como funciona?
        </h3>
        <ol className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-medium">1.</span>
            Defina o valor e informações do pagamento
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-medium">2.</span>
            Gere o QR Code PIX instantaneamente
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-medium">3.</span>
            O pagador escaneia o código com qualquer app de banco
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-medium">4.</span>
            O pagamento é processado e creditado na sua conta
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-medium">5.</span>
            Você recebe confirmação em tempo real
          </li>
        </ol>
      </div>
    </div>
  );
}