'use client';

import { useState, useEffect, useRef } from 'react';
import { pixService, accountValidationService } from '@/app/lib/services';
import { DollarSign, Copy, Check, QrCode, Loader, CheckCircle, Clock, AlertCircle, Shield, Info } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import QRCode from 'qrcode';
import { translateStatus } from '@/app/lib/translations';

export default function DepositPage() {
  const [amount, setAmount] = useState('1.00');
  const [pixAddress, setPixAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode: string;
    pixKey: string;
    expiresAt: Date;
    transactionId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    isValidated: boolean;
    validationPaymentId?: string;
    validatedAt?: string;
    limits?: any;
    reputation?: any;
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDepixAddress, setValidationDepixAddress] = useState('');
  const [validationRequirements, setValidationRequirements] = useState<{
    amount: number;
    description: string;
    benefits: string[];
  } | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    if (!pixAddress) {
      toast.error('Por favor, insira o Endereço DePix');
      return;
    }

    setLoading(true);
    try {
      // Usar a rota de geração de QR Code
      const amountInReais = parseFloat(amount);
      const description = 'Depósito PIX';
      
      const response = await pixService.generateQRCode({
        amount: amountInReais,
        depixAddress: pixAddress, // Campo obrigatório agora
        description,
        expirationMinutes: 30,
      });
      
      if (response.qrCode || response.qrCodeImage) {
        // A API retorna qrCodeImage (imagem) e qrCode (texto para copiar)
        setQrCodeData({
          qrCode: response.qrCodeImage, // Imagem do QR Code
          pixKey: response.qrCode || '', // Texto para copiar e colar
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          transactionId: response.transactionId,
        });
        setPaymentStatus('pending');
        toast.success('QR Code gerado com sucesso!');
        
        // Iniciar polling para verificar status do pagamento
        if (response.transactionId) {
          startPollingPaymentStatus(response.transactionId);
        }
      } else {
        toast.error('Erro ao gerar QR Code');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast.error('Erro ao criar depósito');
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar status do pagamento regular
  const checkPaymentStatus = async (transactionId: string) => {
    try {
      const status = await pixService.checkDepositStatus(transactionId);
      
      if (status.status === 'COMPLETED') {
        setPaymentStatus('completed');
        stopPolling();
        toast.success('Pagamento confirmado com sucesso!');
        
        // Resetar formulário após alguns segundos
        setTimeout(() => {
          resetForm();
        }, 5000);
      } else if (status.status === 'PROCESSING') {
        setPaymentStatus('processing');
        toast('Pagamento recebido, processando conversão para DePix...', {
          icon: 'ℹ️',
        });
      } else if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
        setPaymentStatus('failed');
        stopPolling();
        if (status.status === 'EXPIRED') {
          toast.error('QR Code expirado');
        } else {
          toast.error('Pagamento falhou ou foi cancelado');
        }
      }
      
      // Stop polling if backend indicates we should
      if (status.shouldStopPolling) {
        stopPolling();
      }
      
      return status;
    } catch (error) {
      console.error('Error checking payment status:', error);
      
      // Handle service unavailable errors gracefully
      if (error.response?.status === 503 || error.response?.status >= 500) {
        // Service temporarily unavailable - continue polling without user notification
        console.log('Payment service temporarily unavailable, will retry...');
        return { 
          status: 'PENDING', 
          message: 'Service temporarily unavailable, retrying...',
          shouldStopPolling: false 
        };
      }
      
      // Handle network/connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) {
        console.log('Network error, will retry...');
        return { 
          status: 'PENDING', 
          message: 'Connection issue, retrying...',
          shouldStopPolling: false 
        };
      }
      
      // For other errors, show user-friendly message but continue polling
      console.log('Payment status check failed, will retry...');
      return { 
        status: 'PENDING', 
        message: 'Status check failed, retrying...',
        shouldStopPolling: false 
      };
    }
  };

  // Função específica para verificar status do pagamento de validação
  const checkValidationPaymentStatus = async (transactionId: string) => {
    try {
      // Primeiro, verificar se a conta já foi validada (verificação rápida)
      try {
        const currentValidationStatus = await accountValidationService.getValidationStatus();
        if (currentValidationStatus.isValidated) {
          setPaymentStatus('completed');
          stopPolling();
          toast.success('Conta validada com sucesso!');
          
          // Recarregar a página para mostrar a interface completa
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (error) {
        console.log('Error checking validation status:', error);
      }

      // Se ainda não está validada, tentar manual check primeiro
      try {
        await accountValidationService.manualValidationCheck();
        // Se o manual check foi bem-sucedido, verificar novamente o status
        const updatedValidationStatus = await accountValidationService.getValidationStatus();
        if (updatedValidationStatus.isValidated) {
          setPaymentStatus('completed');
          stopPolling();
          toast.success('Conta validada com sucesso!');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (error) {
        console.log('Manual validation check failed, trying direct deposit status check...');
      }

      // Se manual check não funcionou, verificar status na Eulen API
      const status = await pixService.checkDepositStatus(transactionId);
      
      if (status.status === 'COMPLETED') {
        // Se pagamento foi confirmado, procurar pela transação de validação completada
        setPaymentStatus('processing');
        toast('Pagamento confirmado! Processando validação de conta...', {
          icon: '⏳',
        });
        
        // Continuar polling para verificar quando a validação for processada
        
      } else if (status.status === 'PROCESSING') {
        setPaymentStatus('processing');
        if (paymentStatus !== 'processing') {
          toast('Pagamento recebido, processando confirmação...', {
            icon: 'ℹ️',
          });
        }
      } else if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
        setPaymentStatus('failed');
        stopPolling();
        if (status.status === 'EXPIRED') {
          toast.error('QR Code de validação expirado');
        } else {
          toast.error('Pagamento de validação falhou ou foi cancelado');
        }
      }
      
      return status;
    } catch (error) {
      console.error('Error checking validation payment status:', error);
      
      // Handle service unavailable errors gracefully
      if (error.response?.status === 503 || error.response?.status >= 500) {
        // Service temporarily unavailable - continue polling without user notification
        console.log('Payment service temporarily unavailable, will retry...');
        return { 
          status: 'PENDING', 
          message: 'Service temporarily unavailable, retrying...',
          shouldStopPolling: false 
        };
      }
      
      // Handle network/connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) {
        console.log('Network error, will retry...');
        return { 
          status: 'PENDING', 
          message: 'Connection issue, retrying...',
          shouldStopPolling: false 
        };
      }
      
      // For other errors, show user-friendly message but continue polling
      console.log('Payment status check failed, will retry...');
      return { 
        status: 'PENDING', 
        message: 'Status check failed, retrying...',
        shouldStopPolling: false 
      };
    }
  };

  // Iniciar polling para pagamento regular
  const startPollingPaymentStatus = (transactionId: string) => {
    // Verificar imediatamente
    checkPaymentStatus(transactionId);
    
    // Configurar polling a cada 3 segundos
    pollingInterval.current = setInterval(() => {
      checkPaymentStatus(transactionId);
    }, 3000);
  };

  // Iniciar polling específico para pagamento de validação
  const startPollingValidationPaymentStatus = (transactionId: string) => {
    // Verificar imediatamente
    checkValidationPaymentStatus(transactionId);
    
    // Configurar polling a cada 3 segundos
    pollingInterval.current = setInterval(() => {
      checkValidationPaymentStatus(transactionId);
    }, 3000);
  };

  // Parar polling
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setQrCodeData(null);
    setAmount('1.00');
    setPixAddress('');
    setPaymentStatus(null);
    stopPolling();
  };

  const fetchValidationRequirements = async () => {
    try {
      const requirements = await accountValidationService.getValidationRequirements();
      setValidationRequirements(requirements);
    } catch (error) {
      console.error('Error fetching validation requirements:', error);
    }
  };

  // Check validation status on mount
  useEffect(() => {
    checkValidationStatus();
    fetchValidationRequirements();
    return () => {
      stopPolling();
    };
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

  const handleValidationPayment = async () => {
    if (!validationDepixAddress) {
      toast.error('Por favor, informe o endereço DePix');
      return;
    }
    
    setLoading(true);
    try {
      const payment = await accountValidationService.createValidationPayment(validationDepixAddress);
      
      console.log('Payment response:', payment);
      
      if (payment.qrCode && typeof payment.qrCode === 'string' && payment.qrCode.length > 0) {
        console.log('Generating QR Code for:', payment.qrCode);
        
        // Gerar QR Code para validação
        const dataUrl = await QRCode.toDataURL(payment.qrCode, {
          type: 'image/png',
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
          width: 300,
        });
        
        console.log('QR Code generated, dataUrl length:', dataUrl.length);
        
        setQrCodeData({
          qrCode: dataUrl,
          pixKey: payment.qrCode,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          transactionId: payment.transactionId,
        });
        setPaymentStatus('pending');
        setShowValidationModal(false);
        toast.success('QR Code de validação gerado!');
        
        if (payment.transactionId) {
          startPollingValidationPaymentStatus(payment.transactionId);
        }
      } else {
        console.error('Invalid qrCode in payment response:', payment);
        console.error('qrCode type:', typeof payment.qrCode, 'value:', payment.qrCode);
        toast.error('QR Code não foi gerado corretamente - dados inválidos recebidos do servidor');
      }
    } catch (error) {
      console.error('Error creating validation payment:', error);
      toast.error('Erro ao criar pagamento de validação');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount((parseFloat(value) / 100).toFixed(2));
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <h1 className="text-3xl font-bold mb-8 text-white">Adquirir DePix</h1>

      {/* Show loading state */}
      {loadingValidation ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin text-blue-500" size={48} />
        </div>
      ) : (
        <>
          {/* Show validation requirement if not validated */}
          {!validationStatus?.isValidated ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-6 mb-8">
                <div className="flex items-center mb-4">
                  <Shield className="text-yellow-400 mr-3" size={32} />
                  <h2 className="text-2xl font-bold text-yellow-400">Validação de Conta Necessária</h2>
                </div>
                
                <p className="text-gray-300 mb-6">
                  Para começar a adquirir DePix, você precisa validar sua conta com um pagamento único de <strong>R$ {validationRequirements?.amount ? (validationRequirements.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,00'}</strong>.
                </p>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowValidationModal(true)}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Shield className="mr-2" size={20} />
                    Validar Conta por R$ {validationRequirements?.amount ? (validationRequirements.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,00'}
                  </button>
                </div>
              </div>

              {/* Show QR Code for validation payment */}
              {qrCodeData && (
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                    <QrCode className="mr-2 text-yellow-400" />
                    QR Code de Validação
                  </h2>
                  
                  {/* Payment Status */}
                  {paymentStatus === 'pending' && (
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="animate-pulse text-yellow-400" size={24} />
                        <span className="text-yellow-400 font-semibold">Aguardando Pagamento de Validação...</span>
                      </div>
                    </div>
                  )}
                  
                  {paymentStatus === 'completed' && (
                    <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="text-green-400" size={24} />
                        <span className="text-green-400 font-semibold">Conta Validada com Sucesso!</span>
                      </div>
                      <p className="text-center text-sm text-gray-400 mt-2">
                        Recarregando página...
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-center mb-4">
                    <img
                      src={qrCodeData.qrCode}
                      alt="QR Code Validação"
                      className="w-64 h-64"
                    />
                  </div>
                  
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Código PIX Copia e Cola:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={qrCodeData.pixKey}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(qrCodeData.pixKey)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
                      >
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-400 mt-4">
                    <p className="font-semibold text-white">Valor: R$ {validationRequirements?.amount ? (validationRequirements.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,00'}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Show user limits and reputation info */}
              {validationStatus?.limits && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Limite Diário</p>
                      <p className="text-2xl font-bold text-white">
                        R$ {validationStatus.limits.daily?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Nível</p>
                      <p className="text-2xl font-bold text-blue-400">
                        Tier {validationStatus.limits.tier}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Progresso para Próximo Nível</p>
                      <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(validationStatus.limits.progressToNextTier || 0, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {validationStatus.limits.progressToNextTier?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
        {/* Deposit Form */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
            <DollarSign className="mr-2 text-green-400" />
            Informações do Depósito
          </h2>

          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor do Depósito
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  R$
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Endereço DePix
              </label>
              <input
                type="text"
                value={pixAddress}
                onChange={(e) => setPixAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder="Endereço DePix"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin mr-2" size={20} />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="mr-2" size={20} />
                  Gerar QR Code PIX
                </>
              )}
            </button>
          </form>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">Como funciona:</h3>
            <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
              <li>Digite o valor que deseja depositar</li>
              <li>Clique em "Gerar QR Code PIX"</li>
              <li>Escaneie o QR Code com seu app bancário</li>
              <li>Confirme o pagamento</li>
              <li>O valor será creditado automaticamente</li>
            </ol>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
            <QrCode className="mr-2 text-blue-400" />
            QR Code PIX
          </h2>

          {qrCodeData ? (
            <div className="space-y-4">
              {/* Payment Status Indicator */}
              {paymentStatus && (
                <div className={`p-4 rounded-lg border ${
                  paymentStatus === 'pending' ? 'bg-yellow-900/20 border-yellow-800' :
                  paymentStatus === 'processing' ? 'bg-blue-900/20 border-blue-800' :
                  paymentStatus === 'completed' ? 'bg-green-900/20 border-green-800' :
                  'bg-red-900/20 border-red-800'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    {paymentStatus === 'pending' && (
                      <>
                        <Clock className="animate-pulse text-yellow-400" size={24} />
                        <span className="text-yellow-400 font-semibold">Aguardando Pagamento...</span>
                      </>
                    )}
                    {paymentStatus === 'processing' && (
                      <>
                        <Loader className="animate-spin text-blue-400" size={24} />
                        <span className="text-blue-400 font-semibold">Processando Conversão para DePix...</span>
                      </>
                    )}
                    {paymentStatus === 'completed' && (
                      <>
                        <CheckCircle className="text-green-400" size={24} />
                        <span className="text-green-400 font-semibold">Pagamento Confirmado!</span>
                      </>
                    )}
                    {paymentStatus === 'failed' && (
                      <>
                        <AlertCircle className="text-red-400" size={24} />
                        <span className="text-red-400 font-semibold">Pagamento Falhou</span>
                      </>
                    )}
                  </div>
                  {paymentStatus === 'pending' && (
                    <p className="text-center text-sm text-gray-400 mt-2">
                      Escaneie o QR Code ou copie o código PIX para realizar o pagamento
                    </p>
                  )}
                  {paymentStatus === 'completed' && (
                    <p className="text-center text-sm text-gray-400 mt-2">
                      Seus DePix foram enviados para o endereço configurado
                    </p>
                  )}
                </div>
              )}

              {/* QR Code Image - Hide when payment is completed */}
              {paymentStatus !== 'completed' && (
                <div className="flex justify-center">
                  <img
                    src={qrCodeData.qrCode}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>
              )}

              {/* PIX Copy Code - Hide when payment is completed */}
              {paymentStatus !== 'completed' && (
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Código PIX Copia e Cola:</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={qrCodeData.pixKey}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(qrCodeData.pixKey)}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Expiration Timer - Hide when payment is completed */}
              {paymentStatus !== 'completed' && (
                <div className="text-center text-sm text-gray-400">
                  <p>QR Code válido por 30 minutos</p>
                  <p className="font-semibold text-white">
                    Valor: {formatCurrency((parseFloat(amount) * 100).toString())}
                  </p>
                </div>
              )}

              {/* New Deposit Button - Show different text based on status */}
              <button
                onClick={() => {
                  resetForm();
                }}
                className={`w-full py-2 px-4 rounded-lg transition duration-200 ${
                  paymentStatus === 'completed' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {paymentStatus === 'completed' ? 'Adquirir Mais DePix' : 'Cancelar e Adquirir DePix'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <QrCode size={64} className="mb-4" />
              <p className="text-center text-gray-400">
                O QR Code aparecerá aqui após<br />
                você gerar o depósito
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deposits */}
      <div className="mt-8 bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-white">Aquisições Recentes</h2>
        <div className="text-sm text-gray-400">
          <p>Seus depósitos recentes aparecerão aqui</p>
        </div>
      </div>
            </>
          )}
        </>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center">
              <Shield className="mr-2 text-yellow-400" size={24} />
              Validação de Conta
            </h2>
            
            <p className="text-gray-300 mb-4">
              Para gerar o QR Code de validação, informe o endereço DePix onde você deseja receber os créditos após a validação.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Endereço DePix
              </label>
              <input
                type="text"
                value={validationDepixAddress}
                onChange={(e) => setValidationDepixAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-400"
                placeholder="Insira seu endereço DePix"
                required
              />
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm">
                <strong>Valor da validação:</strong> R$ {validationRequirements?.amount ? (validationRequirements.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,00'}<br/>
                Após o pagamento, sua conta será validada automaticamente.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationDepixAddress('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleValidationPayment}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={loading || !validationDepixAddress}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={16} />
                    Gerando...
                  </>
                ) : (
                  'Gerar QR Code'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}