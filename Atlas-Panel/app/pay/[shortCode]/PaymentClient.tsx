'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Loader,
  AlertCircle,
  CheckCircle,
  QrCode,
  Copy,
  Check,
  Clock,
  Smartphone,
  Shield,
  ArrowRight,
  Info,
  Zap,
  Lock,
  Sparkles,
  ChevronDown,
  RotateCcw,
  X,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import QRCode from 'qrcode';

import SalesClosed from '@/app/components/SalesClosed';

interface PaymentClientProps {
  shortCode: string;
  initialData?: any;
}

export default function PaymentClient({ shortCode, initialData }: PaymentClientProps) {
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(initialData || null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(29 * 60 + 50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPixCode, setShowPixCode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileStep, setMobileStep] = useState<'info' | 'payment'>('payment');
  const [isExpired, setIsExpired] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [taxNumber, setTaxNumber] = useState('');
  const [payerFullName, setPayerFullName] = useState('');
  const [needsFullName, setNeedsFullName] = useState(false);
  const [taxNumberError, setTaxNumberError] = useState('');
  const [needsTaxNumberForFixedAmount, setNeedsTaxNumberForFixedAmount] = useState(false);

  // Exit Intent & Recovery states
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  useEffect(() => {
    if (!initialData && shortCode) {
      fetchPaymentData();
    } else if (initialData && !initialData.isCustomAmount) {
      generateNewQRCode();
      setShowQrCode(true);
    }
  }, [shortCode, initialData]);

  // Redirect when payment is successful
  useEffect(() => {
    if (paymentSuccess && transactionId) {
      // Redirect to payment confirmation page after showing success
      setTimeout(() => {
        window.location.href = `/payment-confirmation/${transactionId}`;
      }, 2000);
    }
  }, [paymentSuccess, transactionId]);

  // Poll for payment status
  useEffect(() => {
    console.log('🔍 Polling check:', { qrCode: !!qrCode, transactionId, isExpired, paymentSuccess });
    if (!qrCode || !transactionId || isExpired || paymentSuccess) return;

    const checkPaymentStatus = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}/status/${transactionId}`;
        console.log('🔎 Checking payment status:', url);
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Payment status response:', data);
          // Check for paid status: includes PROCESSING (Pago), COMPLETED (Recebido),
          // and lowercase variants for API compatibility
          const status = data.status?.toLowerCase();
          if (status === 'paid' || status === 'completed' || status === 'processing' || status === 'delayed') {
            console.log('🎉 Payment detected as paid! Setting success...');
            setPaymentSuccess(true);
          }
        } else {
          console.warn('⚠️ Status check failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Error checking payment status:', error);
      }
    };

    // Check immediately, then every 3 seconds
    console.log('🚀 Starting payment polling...');
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => {
      console.log('🛑 Stopping payment polling');
      clearInterval(interval);
    };
  }, [qrCode, transactionId, isExpired, paymentSuccess, shortCode]);

  useEffect(() => {
    if (qrCode && timeLeft > 0 && !isExpired) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [qrCode, timeLeft, isExpired]);

  // Opção 1: Beforeunload Warning - Aviso ao tentar fechar/atualizar a página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Só mostra aviso se tiver QR code ativo e não tiver pago ainda
      if (qrCode && !paymentSuccess && !isExpired) {
        e.preventDefault();
        // Mensagem padrão do navegador (navegadores modernos ignoram mensagens customizadas)
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [qrCode, paymentSuccess, isExpired]);

  // Opção 2: Back Button Redirect - Captura o botão voltar
  useEffect(() => {
    if (showQrCode && !paymentSuccess && !isExpired) {
      // Push estados para capturar o back button
      window.history.pushState({ checkoutActive: true, step: 1 }, '');
      window.history.pushState({ checkoutActive: true, step: 2 }, '');

      const handlePopState = (e: PopStateEvent) => {
        // Se está tentando voltar durante o checkout ativo
        if (qrCode && !paymentSuccess && !isExpired) {
          // Push outro estado para manter na página
          window.history.pushState({ checkoutActive: true, step: 2 }, '');
          // Mostra modal de confirmação
          setShowExitModal(true);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [showQrCode, qrCode, paymentSuccess, isExpired]);

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Link de pagamento não encontrado');
        } else if (response.status === 410) {
          setError('Este link de pagamento expirou');
        } else {
          setError('Erro ao carregar dados do pagamento');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPaymentData(data);

      // Check if the payment link is active
      if (!data.isActive) {
        setLoading(false);
        return; // Will show the SalesClosed component
      }

      if (!data.isCustomAmount) {
        await generateNewQRCode();
        setShowQrCode(true);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  // Generate QR code with tax number
  const generateWithTaxNumber = async () => {
    if (!validateTaxNumber(taxNumber)) {
      setTaxNumberError('CPF/CNPJ inválido');
      return;
    }
    if (needsFullName && !payerFullName.trim()) {
      setTaxNumberError('Informe o nome completo para gerar o QR Code');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}/validate-tax-number`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: paymentData.isCustomAmount ? parseFloat(customAmount) : undefined,
            taxNumber: taxNumber.replace(/\D/g, ''),
            fullName: payerFullName.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao validar CPF/CNPJ');
      }

      const data = await response.json();
      console.log('📦 QR Code with tax number generated:', data);

      if (data.needsFullName) {
        setNeedsFullName(true);
        setTaxNumberError('Informe o nome completo para continuar');
        setIsGenerating(false);
        return;
      }

      setQrCode(data.qrCode);
      setShowQrCode(true);
      setNeedsFullName(false);

      // Store transaction ID
      if (data.transactionId) {
        setTransactionId(data.transactionId);
      }

      // Generate QR Code image
      if (data.qrCode) {
        try {
          const dataUrl = await QRCode.toDataURL(data.qrCode, {
            type: 'image/png',
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            width: 400,
          });
          setQrCodeDataUrl(dataUrl);
        } catch (qrError) {
          console.error('Error generating QR code image:', qrError);
        }
      }

      setTimeLeft(29 * 60 + 50);
      setIsExpired(false);
      setIsGenerating(false);
      setLoading(false);
    } catch (error) {
      console.error('Error generating QR code with tax number:', error);
      setTaxNumberError('Erro ao validar CPF/CNPJ. Tente novamente.');
      setIsGenerating(false);
    }
  };

  // Generate QR code with tax number for fixed amount links (> R$ 3000)
  const generateWithTaxNumberForFixed = async () => {
    if (!validateTaxNumber(taxNumber)) {
      setTaxNumberError('CPF/CNPJ inválido');
      return;
    }
    if (needsFullName && !payerFullName.trim()) {
      setTaxNumberError('Informe o nome completo para gerar o QR Code');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}/validate-tax-number`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taxNumber: taxNumber.replace(/\D/g, ''),
            fullName: payerFullName.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao validar CPF/CNPJ');
      }

      const data = await response.json();
      console.log('📦 QR Code with tax number for fixed amount generated:', data);

      if (data.needsFullName) {
        setNeedsFullName(true);
        setTaxNumberError('Informe o nome completo para continuar');
        setIsGenerating(false);
        return;
      }

      setQrCode(data.qrCode);
      setShowQrCode(true);
      setNeedsTaxNumberForFixedAmount(false);
      setNeedsFullName(false);

      // Store transaction ID
      if (data.transactionId) {
        setTransactionId(data.transactionId);
      }

      // Generate QR Code image
      if (data.qrCode) {
        try {
          const dataUrl = await QRCode.toDataURL(data.qrCode, {
            type: 'image/png',
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            width: 400,
          });
          setQrCodeDataUrl(dataUrl);
        } catch (qrError) {
          console.error('Error generating QR code image:', qrError);
        }
      }

      setTimeLeft(29 * 60 + 50);
      setIsExpired(false);
      setIsGenerating(false);
      setLoading(false);
    } catch (error) {
      console.error('Error generating QR code with tax number:', error);
      setTaxNumberError('Erro ao validar CPF/CNPJ. Tente novamente.');
      setIsGenerating(false);
    }
  };

  // CPF/CNPJ formatting function
  const formatTaxNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .substring(0, 18);
    }
  };

  // CPF/CNPJ validation function
  const validateTaxNumber = (value: string): boolean => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length === 11) {
      // Basic CPF validation
      if (/^(\d)\1{10}$/.test(numbers)) return false;
      return true; // Simplified validation for now
    } else if (numbers.length === 14) {
      // Basic CNPJ validation
      if (/^(\d)\1{13}$/.test(numbers)) return false;
      return true; // Simplified validation for now
    }

    return false;
  };

  const renderFullNameInput = () => {
    if (!needsFullName) return null;

    return (
      <div className="animate-in slide-in-from-top-2 duration-300">
        <input
          type="text"
          value={payerFullName}
          onChange={(e) => {
            setPayerFullName(e.target.value);
            setTaxNumberError('');
          }}
          placeholder="Nome completo do pagador"
          className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--accent)] placeholder-[var(--text-muted)]"
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
          Necessário apenas quando o CPF/CNPJ ainda não está salvo nos contatos do merchant.
        </p>
      </div>
    );
  };

  const generateNewQRCode = async (amount?: number) => {
    try {
      setIsGenerating(true);
      const body = amount ? JSON.stringify({ amount }) : undefined;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}/generate-qr`,
        {
          method: 'POST',
          headers: body ? { 'Content-Type': 'application/json' } : {},
          body
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      console.log('📦 QR Code response:', data);

      // Check if tax number is required (for fixed amounts > 3000)
      if (data.needsTaxNumber) {
        console.log('🔐 Tax number required for this payment');
        setNeedsTaxNumberForFixedAmount(true);
        setShowQrCode(false);
        setIsGenerating(false);
        setLoading(false);
        return;
      }

      setQrCode(data.qrCode);

      // Store transaction ID for payment confirmation
      if (data.transactionId) {
        console.log('💾 Setting transactionId:', data.transactionId);
        setTransactionId(data.transactionId);
      } else {
        console.warn('⚠️ No transactionId in response!');
      }

      if (data.qrCode) {
        try {
          const dataUrl = await QRCode.toDataURL(data.qrCode, {
            type: 'image/png',
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            width: 400,
          });

          setQrCodeDataUrl(dataUrl);
        } catch (qrError) {
          console.error('Error generating QR code image:', qrError);
        }
      }

      setTimeLeft(29 * 60 + 50);
      setIsExpired(false);
      setIsGenerating(false);
      setLoading(false);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Erro ao gerar QR Code PIX');
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Helper function to safely parse amount with comma or period as decimal separator
  const parseAmount = (value: string): number => {
    if (!value) return 0;
    // Replace comma with period for parseFloat to work correctly
    const normalizedValue = value.replace(',', '.');
    return parseFloat(normalizedValue) || 0;
  };

  // Opção 4a: Helper function para cores progressivas do timer
  const getTimerStyles = () => {
    const totalTime = 29 * 60 + 50; // 29:50
    const percentage = (timeLeft / totalTime) * 100;

    if (isExpired) {
      return {
        bgClass: 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30',
        textClass: 'text-red-600 dark:text-red-400',
        barClass: 'bg-red-500',
        iconClass: 'text-red-600 dark:text-red-400',
        message: 'QR Code expirado',
        pulse: false
      };
    }

    if (timeLeft <= 5 * 60) { // < 5 minutos - VERMELHO pulsante
      return {
        bgClass: 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40',
        textClass: 'text-red-600 dark:text-red-400',
        barClass: 'bg-red-500',
        iconClass: 'text-red-600 dark:text-red-400 animate-pulse',
        message: 'Quase expirando!',
        pulse: true
      };
    }

    if (timeLeft <= 10 * 60) { // 5-10 minutos - LARANJA
      return {
        bgClass: 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-500/40',
        textClass: 'text-orange-600 dark:text-orange-400',
        barClass: 'bg-orange-500',
        iconClass: 'text-orange-600 dark:text-orange-400',
        message: 'Pague agora para garantir',
        pulse: false
      };
    }

    if (timeLeft <= 20 * 60) { // 10-20 minutos - AMARELO
      return {
        bgClass: 'bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30',
        textClass: 'text-amber-600 dark:text-amber-400',
        barClass: 'bg-amber-500',
        iconClass: 'text-amber-600 dark:text-amber-400',
        message: 'Expira em breve',
        pulse: false
      };
    }

    // > 20 minutos - VERDE
    return {
      bgClass: 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30',
      textClass: 'text-green-600 dark:text-green-400',
      barClass: 'bg-green-500',
      iconClass: 'text-green-600 dark:text-green-400',
      message: 'Tempo suficiente',
      pulse: false
    };
  };

  // Opção 8: Copy Feedback Aprimorado
  const handleCopyCode = () => {
    if (qrCode && !isExpired) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setShowCopyFeedback(true);
      setTimeout(() => setCopied(false), 4000);
      setTimeout(() => setShowCopyFeedback(false), 5000);
    }
  };

  // Handler para fechar o exit modal e continuar
  const handleContinuePayment = () => {
    setShowExitModal(false);
  };

  // Handler para confirmar saída
  const handleConfirmExit = () => {
    setShowExitModal(false);
    // Limpa os history states e volta
    window.history.go(-3);
  };

  const handleManualReload = async () => {
    if (isExpired) {
      setIsGenerating(true);
      setIsExpired(false);
      await generateNewQRCode(paymentData?.isCustomAmount ? parseAmount(customAmount) : undefined);
      setTimeLeft(29 * 60 + 50);
      setIsGenerating(false);
    }
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Accept both comma and period as decimal separator
    if (/^\d*[.,]?\d*$/.test(value) || value === '') {
      setCustomAmount(value);
    }
  };

  const handleGenerateQR = async () => {
    // Use helper function to parse amount safely
    const amount = parseAmount(customAmount);
    if (!amount || amount <= 0) return;

    if (paymentData.minAmount && amount < paymentData.minAmount) {
      alert(`Valor mínimo: ${formatCurrency(paymentData.minAmount)}`);
      return;
    }
    if (paymentData.maxAmount && amount > paymentData.maxAmount) {
      alert(`Valor máximo: ${formatCurrency(paymentData.maxAmount)}`);
      return;
    }

    setLoading(true);
    await generateNewQRCode(amount);
    setShowQrCode(true);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-[var(--accent)] rounded-full opacity-20 animate-ping" />
            <div className="relative flex items-center justify-center w-full h-full bg-[var(--accent)] rounded-full">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl text-[var(--text-primary)] font-semibold mb-4">Carregando pagamento</h2>

          <div className="w-48 mx-auto">
            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full"
                style={{
                  animation: 'fastProgress 0.8s ease-out forwards'
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Processamento ultra-rápido
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fastProgress {
            0% { width: 0%; }
            30% { width: 45%; }
            60% { width: 75%; }
            100% { width: 95%; }
          }
        `}</style>
      </div>
    );
  }

  // Check if payment link is inactive
  if (paymentData && !paymentData.isActive) {
    return <SalesClosed />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="relative max-w-md w-full">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-10 text-center shadow-lg">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">Oops!</h1>
            <p className="text-[var(--text-secondary)] mb-8 text-sm sm:text-base">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)] text-[var(--text-primary)] font-semibold rounded-xl transition-all border border-[var(--border-default)] text-sm sm:text-base"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="relative max-w-md w-full">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-10 text-center shadow-lg">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">Pagamento Confirmado!</h1>
            <p className="text-[var(--text-secondary)] mb-4 text-sm sm:text-base">Transação realizada com sucesso</p>
            <div className="inline-block px-6 py-3 bg-green-100 dark:bg-green-900/20 rounded-2xl mb-6">
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(paymentData?.isCustomAmount ? parseAmount(customAmount) : (paymentData?.amount || 0))}
              </p>
            </div>
            <div className="p-4 bg-[var(--bg-elevated)] rounded-2xl">
              <p className="text-xs text-[var(--text-secondary)] mb-1">ID da transação</p>
              <p className="text-[var(--text-primary)] font-mono text-xs sm:text-sm">#{Date.now()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get current timer styles for progressive urgency
  const timerStyles = getTimerStyles();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Opção 3: Modal de Exit Intent */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={handleContinuePayment}
              className="absolute top-4 right-4 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>

              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Seu pagamento ainda está ativo!
              </h3>

              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Se você sair agora, perderá esta sessão de pagamento e precisará gerar um novo QR Code.
              </p>

              {/* Timer info */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-6 ${timerStyles.bgClass}`}>
                <Clock className={`w-4 h-4 ${timerStyles.iconClass}`} />
                <span className={`text-sm font-semibold ${timerStyles.textClass}`}>
                  O QR Code expira em {formatTime(timeLeft)}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleContinuePayment}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Continuar Pagamento
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="w-full py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium rounded-xl transition-all text-sm"
                >
                  Sair mesmo assim
                </button>
              </div>

              {/* Trust indicator */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs">
                <Shield className="w-3 h-3" />
                <span>Pagamento seguro via PIX</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opção 8: Copy Feedback Modal Aprimorado */}
      {showCopyFeedback && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-xl border border-green-500/30 shadow-2xl p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)] text-sm mb-1">Código copiado!</p>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                  Agora abra seu app de banco e cole o código na área PIX para pagar.
                </p>
              </div>
              <button
                onClick={() => setShowCopyFeedback(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCopyFeedback(false)}
                className="flex-1 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs rounded-lg transition-all flex items-center justify-center gap-1"
              >
                <Lightbulb className="w-3 h-3" />
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout - Improved spacing and sizing */}
      <div className="hidden lg:flex min-h-screen py-8 px-6">
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Information */}
            <div className="flex flex-col justify-center">
              <div>
                {/* Logo and Branding */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="relative">
                    <div className="hidden" />
                    <div className="relative rounded-lg">
                      <Image
                        src="/atlas-logo.jpg"
                        alt="Atlas"
                        width={48}
                        height={48}
                        className="rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                      Atlas Pay
                      <span className="px-2 py-0.5 bg-[var(--accent-soft)] rounded-full text-xs text-[var(--accent)] font-medium">
                        PRO
                      </span>
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Lock className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-[var(--text-secondary)]">Pagamento 100% Seguro</span>
                    </div>
                  </div>
                </div>

                {/* Payment Description */}
                {paymentData?.description && (
                  <div className="bg-[var(--bg-secondary)] backdrop-blur rounded-xl p-5 mb-6 border border-[var(--border-default)]">
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Descrição</h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{paymentData.description}</p>
                  </div>
                )}

                {/* Instructions */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Pague em segundos
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Smartphone, text: 'Abra seu app bancário' },
                      { icon: QrCode, text: 'Escaneie o QR Code' },
                      { icon: CheckCircle, text: 'Confirme o pagamento' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 group cursor-default">
                        <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-lg flex items-center justify-center flex-shrink-0 transition-all border border-[var(--accent)]/20">
                          <span className="text-base text-blue-400 font-bold">{index + 1}</span>
                        </div>
                        <item.icon className="w-5 h-5 text-blue-400" />
                        <p className="text-sm text-[var(--text-secondary)] flex-1">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Criado com{' '}
                  <a href="/" className="text-[var(--accent)] hover:underline">
                    Painel Atlas
                  </a>
                </p>
              </div>
            </div>

            {/* Right Column - Payment Card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-sm">
                {/* Header with Status */}
                {showQrCode && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pagamento via PIX</h2>
                    <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400 font-medium">Ativo</span>
                    </div>
                  </div>
                )}

                <div className="bg-[var(--bg-card)] backdrop-blur-2xl border border-[var(--border-default)] rounded-2xl shadow-2xl p-6">
                  {/* Payment Display */}
                  {showQrCode && (
                    <>
                      <div className="text-center mb-6">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Valor Total</p>
                        <p className="text-4xl font-bold text-[var(--text-primary)]">
                          {formatCurrency(paymentData?.isCustomAmount ? parseAmount(customAmount) : (paymentData?.amount || 0))}
                        </p>
                      </div>

                      {/* QR Code */}
                      <div className="flex items-center justify-center mb-6">
                        {qrCodeDataUrl ? (
                          <div className="relative">
                            <div className="hidden" />
                            <div className="relative bg-white rounded-2xl p-6 shadow-xl">
                              <div className="relative w-64 h-64">
                                <Image
                                  src={qrCodeDataUrl}
                                  alt="QR Code PIX"
                                  fill
                                  className={`object-contain transition-all ${isExpired ? 'grayscale opacity-50' : ''}`}
                                />
                                {/* Opção 7: Recovery Actions Inteligentes */}
                                {isExpired && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-xl">
                                    <div className="text-center p-4">
                                      <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-amber-500" />
                                      </div>
                                      <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-1">QR Code expirado</p>
                                      <p className="text-[var(--text-muted)] text-xs mb-4">Gere um novo em 1 clique</p>
                                      <button
                                        onClick={handleManualReload}
                                        disabled={isGenerating}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 mx-auto"
                                      >
                                        {isGenerating ? (
                                          <Loader className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <RotateCcw className="w-4 h-4" />
                                        )}
                                        {isGenerating ? 'Gerando...' : 'Gerar Novo QR Code'}
                                      </button>
                                      <p className="text-[var(--text-secondary)] text-[10px] mt-3 flex items-center justify-center gap-1">
                                        <Lightbulb className="w-3 h-3" />
                                        Dica: Deixe o app do banco aberto
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-center text-zinc-700 dark:text-zinc-300 text-sm font-medium mt-4 flex items-center justify-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                {isExpired ? 'QR Code expirado' : 'Escaneie para pagar'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[var(--bg-elevated)] rounded-2xl p-10 text-center">
                            <QrCode className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-3 animate-pulse" />
                            <p className="text-sm text-[var(--text-secondary)]">Gerando QR Code...</p>
                          </div>
                        )}
                      </div>

                      {/* PIX Code */}
                      {qrCode && (
                        <div className="mb-4">
                          <button
                            onClick={() => setShowPixCode(!showPixCode)}
                            className="w-full flex items-center justify-between p-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all group"
                          >
                            <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                              Prefere copiar o código?
                            </span>
                            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showPixCode ? 'rotate-180' : ''}`} />
                          </button>

                          {showPixCode && (
                            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                                <p className="text-xs text-[var(--text-muted)] font-mono break-all line-clamp-2">
                                  {qrCode}
                                </p>
                              </div>
                              <button
                                onClick={handleCopyCode}
                                disabled={isExpired}
                                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm rounded-lg transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar código PIX
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Opção 4a: Timer com Cores Progressivas */}
                      <div className={`rounded-xl p-3 ${timerStyles.bgClass} ${timerStyles.pulse ? 'animate-pulse' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${timerStyles.iconClass}`} />
                            <span className={`text-xs ${timerStyles.textClass}`}>
                              {timerStyles.message}
                            </span>
                          </div>
                          <span className={`text-lg font-bold font-mono ${timerStyles.textClass}`}>
                            {isExpired ? '00:00' : formatTime(timeLeft)}
                          </span>
                        </div>
                        <div className="mt-2 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${timerStyles.barClass}`}
                            style={{ width: isExpired ? '100%' : `${(timeLeft / (29 * 60 + 50)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Fixed Amount CPF Required (for amounts > R$ 3000) */}
                  {needsTaxNumberForFixedAmount && !showQrCode && !paymentData?.isCustomAmount && (
                    <div className="py-6">
                      <div className="space-y-5">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Informe seu CPF/CNPJ</h3>
                          <p className="text-sm text-[var(--text-secondary)]">Obrigatório para gerar o QR Code</p>
                        </div>

                        {/* Amount Display */}
                        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 text-center">
                          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Valor do pagamento</p>
                          <p className="text-3xl font-bold text-[var(--text-primary)]">
                            {formatCurrency(paymentData?.amount || 0)}
                          </p>
                        </div>

                        {/* CPF/CNPJ Input */}
                        <div className="relative group">
                          <div className={`hidden ${taxNumberError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`} />
                          <div className={`relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border overflow-hidden transition-colors ${taxNumberError ? 'border-red-500' : 'border-[var(--border-default)] focus-within:border-[var(--accent)]'}`}>
                            <input
                              type="text"
                              value={taxNumber}
                              onChange={(e) => {
                                setTaxNumber(formatTaxNumber(e.target.value));
                                setTaxNumberError('');
                                setNeedsFullName(false);
                              }}
                              placeholder="CPF ou CNPJ"
                              className="w-full px-4 py-3 bg-transparent text-[var(--text-primary)] text-center focus:outline-none placeholder-[var(--text-muted)]"
                              maxLength={18}
                              style={{ fontSize: '16px' }}
                              autoFocus
                            />
                          </div>
                        </div>
                        {taxNumberError && (
                          <p className="text-red-400 text-xs text-center">{taxNumberError}</p>
                        )}
                        {renderFullNameInput()}

                        {/* Submit Button */}
                        <button
                          onClick={generateWithTaxNumberForFixed}
                          disabled={taxNumber.replace(/\D/g, '').length < 11 || (needsFullName && !payerFullName.trim()) || isGenerating}
                          className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="hidden" />
                          <div className="relative flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all">
                            {isGenerating ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <span>Gerar QR Code</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </div>
                        </button>

                        {/* Trust indicators */}
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <Lock className="w-3 h-3" />
                            <span className="text-xs">Dados protegidos</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <Shield className="w-3 h-3" />
                            <span className="text-xs">Conexão segura</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Amount Input with Inline CPF */}
                  {paymentData?.isCustomAmount && !showQrCode && (
                    <div className="py-6">
                      {(() => {
                        const currentAmount = parseAmount(customAmount);
                        const needsCpf = true;
                        const isValidCpf = taxNumber.replace(/\D/g, '').length >= 11;
                        const canSubmit = currentAmount > 0 &&
                          (!paymentData.minAmount || currentAmount >= paymentData.minAmount) &&
                          (!paymentData.maxAmount || currentAmount <= paymentData.maxAmount) &&
                          isValidCpf &&
                          (!needsFullName || payerFullName.trim().length > 0);

                        return (
                          <div className="space-y-5">
                            <div className="text-center">
                              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Digite o valor</h3>
                              <p className="text-sm text-[var(--text-secondary)]">Escolha quanto você deseja pagar</p>
                            </div>

                            <div className="relative group">
                              <div className="hidden" />
                              <div className="relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border border-[var(--border-default)] overflow-hidden">
                                <div className="flex items-center p-4">
                                  <span className="text-2xl text-[var(--text-muted)] font-bold mr-2">R$</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={customAmount}
                                    onChange={handleAmountInput}
                                    className="flex-1 bg-transparent text-3xl font-bold text-[var(--text-primary)] text-center placeholder-[var(--text-muted)] focus:outline-none"
                                    placeholder="0,00"
                                    autoFocus
                                  />
                                </div>
                                <div className="h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600"
                                     style={{width: customAmount ? '100%' : '0%', transition: 'width 0.3s'}} />
                              </div>
                            </div>

                            {(paymentData.minAmount || paymentData.maxAmount) && (
                              <div className="flex items-center justify-between px-2">
                                {paymentData.minAmount && (
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    Mín: <span className="text-blue-400 font-semibold">{formatCurrency(paymentData.minAmount)}</span>
                                  </span>
                                )}
                                {paymentData.maxAmount && (
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    Máx: <span className="text-cyan-400 font-semibold">{formatCurrency(paymentData.maxAmount)}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Quick amounts */}
                            <div className="grid grid-cols-2 gap-2">
                              {(() => {
                                const maxAmount = paymentData.maxAmount || 500;
                                const minAmount = paymentData.minAmount || 5;
                                let suggestions = [
                                  Math.round(maxAmount),
                                  Math.round(maxAmount * 0.75),
                                  Math.round(maxAmount * 0.5),
                                  Math.round(maxAmount * 0.25)
                                ].filter(amount => amount >= minAmount);

                                if (suggestions.length < 4) {
                                  const range = maxAmount - minAmount;
                                  const step = range / 4;
                                  const evenlyDistributed = [
                                    Math.round(minAmount),
                                    Math.round(minAmount + step),
                                    Math.round(minAmount + step * 2),
                                    Math.round(minAmount + step * 3),
                                    Math.round(maxAmount)
                                  ].filter(amount => amount >= minAmount && amount <= maxAmount && !suggestions.includes(amount));
                                  suggestions = [...suggestions, ...evenlyDistributed];
                                }

                                suggestions = [...new Set(suggestions)].sort((a, b) => a - b);
                                let finalSuggestions = suggestions.slice(0, 4);

                                if (!finalSuggestions.includes(maxAmount) && finalSuggestions.length < 4) {
                                  finalSuggestions.push(maxAmount);
                                  finalSuggestions = [...new Set(finalSuggestions)].sort((a, b) => a - b);
                                } else if (!finalSuggestions.includes(maxAmount) && finalSuggestions.length === 4) {
                                  finalSuggestions[finalSuggestions.length - 1] = maxAmount;
                                  finalSuggestions = [...new Set(finalSuggestions)].sort((a, b) => a - b);
                                }

                                return finalSuggestions.map(amount => (
                                  <button
                                    key={amount}
                                    onClick={() => setCustomAmount(amount.toString())}
                                    className="py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all text-sm font-medium"
                                  >
                                    R$ {amount}
                                  </button>
                                ));
                              })()}
                            </div>

                            {/* CPF/CNPJ Field - Shows when amount requires it */}
                            {needsCpf && (
                              <div className="animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                                  <span className="text-xs text-[var(--text-muted)]">Dados do pagador</span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                                </div>
                                <div className="relative group">
                                  <div className={`hidden ${taxNumberError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`} />
                                  <div className={`relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border overflow-hidden transition-colors ${taxNumberError ? 'border-red-500' : 'border-[var(--border-default)] focus-within:border-[var(--accent)]'}`}>
                                    <input
                                      type="text"
                                      value={taxNumber}
                                      onChange={(e) => {
                                        setTaxNumber(formatTaxNumber(e.target.value));
                                        setTaxNumberError('');
                                        setNeedsFullName(false);
                                      }}
                                      placeholder="CPF ou CNPJ"
                                      className="w-full px-4 py-3 bg-transparent text-[var(--text-primary)] text-center focus:outline-none placeholder-[var(--text-muted)]"
                                      maxLength={18}
                                      style={{ fontSize: '16px' }}
                                    />
                                  </div>
                                </div>
                                {taxNumberError && (
                                  <p className="text-red-400 text-xs mt-2 text-center">{taxNumberError}</p>
                                )}
                                {renderFullNameInput()}
                              </div>
                            )}

                            <button
                              onClick={needsCpf ? generateWithTaxNumber : handleGenerateQR}
                              disabled={!canSubmit || isGenerating}
                              className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="hidden" />
                              <div className="relative flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all">
                                {isGenerating ? (
                                  <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    <span>Gerar QR Code</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </>
                                )}
                              </div>
                            </button>

                            {/* Trust indicators - only show when CPF is visible */}
                            {needsCpf && (
                              <div className="flex items-center justify-center gap-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                  <Lock className="w-3 h-3" />
                                  <span className="text-xs">Dados protegidos</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                  <Shield className="w-3 h-3" />
                                  <span className="text-xs">Conexão segura</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT - Complete Implementation */}
      <div className="lg:hidden min-h-screen flex flex-col bg-[var(--bg-primary)]">
        {/* Mobile Header */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border-b border-[var(--border-default)] sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/atlas-logo.jpg"
                  alt="Atlas"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <div>
                  <h1 className="text-lg font-bold text-[var(--text-primary)]">Atlas Pay</h1>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] text-[var(--text-secondary)]">100% Seguro</span>
                  </div>
                </div>
              </div>
              {showQrCode && (
                <div className="px-2 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center gap-1.5 shadow-lg border border-green-500/30">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white font-bold">Ativo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Content - pb-32 para acomodar o Sticky CTA */}
        <div className="flex-1 p-3 pb-32">
          {/* Compact Description and Amount for Mobile */}
          {showQrCode && (
            <div className="space-y-2 mb-3">
              {/* Description - inline compact */}
              {paymentData?.description && (
                <p className="text-xs text-[var(--text-secondary)] text-center truncate px-2">{paymentData.description}</p>
              )}

              {/* Amount Display - more compact */}
              <div className="bg-[var(--bg-card)] backdrop-blur rounded-xl p-3 border border-[var(--border-default)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Valor Total</span>
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(paymentData?.isCustomAmount ? parseAmount(customAmount) : (paymentData?.amount || 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code for Mobile - optimized size */}
          {showQrCode && qrCodeDataUrl && (
            <div className="bg-white rounded-xl p-3 shadow-2xl mb-3">
              <div className="relative" style={{ height: 'calc(100vw - 48px)', maxHeight: '320px' }}>
                <Image
                  src={qrCodeDataUrl}
                  alt="QR Code PIX"
                  fill
                  className={`object-contain transition-all ${isExpired ? 'grayscale opacity-50' : ''}`}
                />
                {/* Opção 7: Recovery Actions Mobile */}
                {isExpired && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-lg">
                    <div className="text-center p-3">
                      <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-1">QR Code expirado</p>
                      <p className="text-[var(--text-muted)] text-[11px] mb-3">Gere um novo em 1 clique</p>
                      <button
                        onClick={handleManualReload}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 text-sm mx-auto"
                      >
                      {isGenerating ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        {isGenerating ? 'Gerando...' : 'Gerar Novo'}
                      </button>
                      <p className="text-[var(--text-secondary)] text-[10px] mt-2 flex items-center justify-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Deixe o app do banco aberto
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-center text-zinc-700 dark:text-zinc-300 font-medium mt-2 text-xs flex items-center justify-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                {isExpired ? 'QR Code expirado' : 'Escaneie com o app do banco'}
              </p>
            </div>
          )}

          {/* PIX Code for Mobile - more compact */}
          {showQrCode && qrCode && (
            <div className="bg-[var(--bg-elevated)] backdrop-blur rounded-lg border border-[var(--border-default)] overflow-hidden mb-3">
              <button
                onClick={() => setShowPixCode(!showPixCode)}
                className="w-full flex items-center justify-between p-2.5 active:bg-[var(--bg-elevated)]"
              >
                <span className="text-xs text-[var(--text-primary)] font-medium">Copiar código PIX</span>
                <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform ${showPixCode ? 'rotate-180' : ''}`} />
              </button>

              {showPixCode && (
                <div className="p-2.5 pt-0 space-y-2">
                  <div className="p-2 bg-[var(--bg-elevated)] rounded">
                    <p className="text-[10px] text-[var(--text-muted)] font-mono break-all line-clamp-2">
                      {qrCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    disabled={isExpired}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar código
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Opção 4a: Timer Mobile com Cores Progressivas */}
          {showQrCode && (
            <div className={`rounded-lg p-2.5 mb-3 ${timerStyles.bgClass} ${timerStyles.pulse ? 'animate-pulse' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${timerStyles.iconClass}`} />
                  <span className={`text-[11px] ${timerStyles.textClass}`}>
                    {timerStyles.message}
                  </span>
                </div>
                <span className={`text-lg font-bold font-mono ${timerStyles.textClass}`}>
                  {isExpired ? '00:00' : formatTime(timeLeft)}
                </span>
              </div>
              <div className="mt-1.5 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timerStyles.barClass}`}
                  style={{ width: isExpired ? '100%' : `${(timeLeft / (29 * 60 + 50)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Fixed Amount CPF Required for Mobile (for amounts > R$ 3000) */}
          {needsTaxNumberForFixedAmount && !showQrCode && !paymentData?.isCustomAmount && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Informe seu CPF/CNPJ</h3>
                <p className="text-sm text-[var(--text-secondary)]">Obrigatório para gerar o QR Code</p>
              </div>

              {/* Amount Display */}
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 text-center">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Valor do pagamento</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(paymentData?.amount || 0)}
                </p>
              </div>

              {/* CPF/CNPJ Input */}
              <div className="relative group">
                <div className={`hidden ${taxNumberError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`} />
                <div className={`relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border overflow-hidden transition-colors ${taxNumberError ? 'border-red-500' : 'border-[var(--border-default)] focus-within:border-[var(--accent)]'}`}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={taxNumber}
                    onChange={(e) => {
                      setTaxNumber(formatTaxNumber(e.target.value));
                      setTaxNumberError('');
                      setNeedsFullName(false);
                    }}
                    placeholder="CPF ou CNPJ"
                    className="w-full px-4 py-3.5 bg-transparent text-[var(--text-primary)] text-center focus:outline-none placeholder-[var(--text-muted)]"
                    maxLength={18}
                    style={{ fontSize: '18px' }}
                    autoFocus
                  />
                </div>
              </div>
              {taxNumberError && (
                <p className="text-red-400 text-xs text-center">{taxNumberError}</p>
              )}
              {renderFullNameInput()}

              {/* Submit Button */}
              <button
                onClick={generateWithTaxNumberForFixed}
                disabled={taxNumber.replace(/\D/g, '').length < 11 || (needsFullName && !payerFullName.trim()) || isGenerating}
                className="w-full relative group disabled:opacity-50 disabled:active:scale-100"
              >
                <div className="hidden" />
                <div className="relative flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white font-bold rounded-xl transition-all active:scale-95">
                  {isGenerating ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Gerar QR Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  <Lock className="w-3 h-3" />
                  <span className="text-[10px]">Dados protegidos</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  <Shield className="w-3 h-3" />
                  <span className="text-[10px]">Conexão segura</span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Amount Input for Mobile with Inline CPF */}
          {paymentData?.isCustomAmount && !showQrCode && (
            <div className="space-y-4">
              {(() => {
                const currentAmount = parseAmount(customAmount);
                const needsCpf = true;
                const isValidCpf = taxNumber.replace(/\D/g, '').length >= 11;
                const canSubmit = currentAmount > 0 &&
                  (!paymentData.minAmount || currentAmount >= paymentData.minAmount) &&
                  (!paymentData.maxAmount || currentAmount <= paymentData.maxAmount) &&
                  isValidCpf &&
                  (!needsFullName || payerFullName.trim().length > 0);

                return (
                  <>
                    {/* Payment Description for Mobile */}
                    {paymentData?.description && (
                      <div className="bg-[var(--bg-card)] backdrop-blur rounded-xl p-4 border border-[var(--border-default)]">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{paymentData.description}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">
                        Digite o valor do pagamento
                      </label>

                      <div className="relative group">
                        <div className="hidden" />
                        <div className="relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border border-[var(--border-default)] overflow-hidden">
                          <div className="flex items-center p-4">
                            <span className="text-2xl text-[var(--text-muted)] font-bold mr-2">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={customAmount}
                              onChange={handleAmountInput}
                              className="flex-1 bg-transparent text-3xl font-bold text-[var(--text-primary)] text-center placeholder-[var(--text-muted)] focus:outline-none"
                              placeholder="0,00"
                              autoFocus
                            />
                          </div>
                          <div className="h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600"
                               style={{width: customAmount ? '100%' : '0%', transition: 'width 0.3s'}} />
                        </div>
                      </div>

                      {(paymentData?.minAmount || paymentData?.maxAmount) && (
                        <div className="flex items-center justify-between mt-3 px-1">
                          {paymentData.minAmount && (
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              Mín: <span className="text-blue-400 font-bold">{formatCurrency(paymentData.minAmount)}</span>
                            </span>
                          )}
                          {paymentData.maxAmount && (
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              Máx: <span className="text-cyan-400 font-bold">{formatCurrency(paymentData.maxAmount)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick amounts for Mobile */}
                    <div className="grid grid-cols-4 gap-2">
                      {(() => {
                        const maxAmount = paymentData.maxAmount || 500;
                        const minAmount = paymentData.minAmount || 5;
                        let suggestions = [
                          Math.round(maxAmount),
                          Math.round(maxAmount * 0.75),
                          Math.round(maxAmount * 0.5),
                          Math.round(maxAmount * 0.25)
                        ].filter(amount => amount >= minAmount);

                        if (suggestions.length < 4) {
                          const range = maxAmount - minAmount;
                          const step = range / 4;
                          const evenlyDistributed = [
                            Math.round(minAmount),
                            Math.round(minAmount + step),
                            Math.round(minAmount + step * 2),
                            Math.round(minAmount + step * 3),
                            Math.round(maxAmount)
                          ].filter(amount => amount >= minAmount && amount <= maxAmount && !suggestions.includes(amount));
                          suggestions = [...suggestions, ...evenlyDistributed];
                        }

                        suggestions = [...new Set(suggestions)].sort((a, b) => a - b);
                        let finalSuggestions = suggestions.slice(0, 4);

                        if (!finalSuggestions.includes(maxAmount) && finalSuggestions.length < 4) {
                          finalSuggestions.push(maxAmount);
                          finalSuggestions = [...new Set(finalSuggestions)].sort((a, b) => a - b);
                        } else if (!finalSuggestions.includes(maxAmount) && finalSuggestions.length === 4) {
                          finalSuggestions[finalSuggestions.length - 1] = maxAmount;
                          finalSuggestions = [...new Set(finalSuggestions)].sort((a, b) => a - b);
                        }

                        return finalSuggestions.map(amount => (
                          <button
                            key={amount}
                            onClick={() => setCustomAmount(amount.toString())}
                            className="py-2 bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] active:text-[var(--text-primary)] rounded-lg transition-all text-xs"
                          >
                            R$ {amount}
                          </button>
                        ));
                      })()}
                    </div>

                    {/* CPF/CNPJ Field - Shows when amount requires it */}
                    {needsCpf && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                          <span className="text-xs text-[var(--text-muted)]">Dados do pagador</span>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                        </div>
                        <div className="relative group">
                          <div className={`hidden ${taxNumberError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`} />
                          <div className={`relative bg-[var(--bg-elevated)] backdrop-blur rounded-xl border overflow-hidden transition-colors ${taxNumberError ? 'border-red-500' : 'border-[var(--border-default)] focus-within:border-[var(--accent)]'}`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={taxNumber}
                              onChange={(e) => {
                                setTaxNumber(formatTaxNumber(e.target.value));
                                setTaxNumberError('');
                                setNeedsFullName(false);
                              }}
                              placeholder="CPF ou CNPJ"
                              className="w-full px-4 py-3.5 bg-transparent text-[var(--text-primary)] text-center focus:outline-none placeholder-[var(--text-muted)]"
                              maxLength={18}
                              style={{ fontSize: '18px' }}
                            />
                          </div>
                        </div>
                        {taxNumberError && (
                          <p className="text-red-400 text-xs mt-2 text-center">{taxNumberError}</p>
                        )}
                        {renderFullNameInput()}
                      </div>
                    )}

                    <button
                      onClick={needsCpf ? generateWithTaxNumber : handleGenerateQR}
                      disabled={!canSubmit || isGenerating}
                      className="w-full relative group disabled:opacity-50 disabled:active:scale-100"
                    >
                      <div className="hidden" />
                      <div className="relative flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white font-bold rounded-xl transition-all active:scale-95">
                        {isGenerating ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>Gerar QR Code</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </div>
                    </button>

                    {/* Trust indicators - only show when CPF is visible */}
                    {needsCpf && (
                      <div className="flex items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                          <Lock className="w-3 h-3" />
                          <span className="text-[10px]">Dados protegidos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                          <Shield className="w-3 h-3" />
                          <span className="text-[10px]">Conexão segura</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Instructions for Mobile */}
          {showQrCode && (
            <div className="mt-4 bg-[var(--bg-secondary)] backdrop-blur rounded-xl p-4 border border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Como pagar
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Smartphone, text: 'Abra o app do banco' },
                  { icon: QrCode, text: 'Escolha pagar com PIX' },
                  { icon: CheckCircle, text: 'Escaneie o QR Code' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--accent-soft)] rounded-lg flex items-center justify-center flex-shrink-0 border border-[var(--accent)]/20">
                      <span className="text-sm text-blue-400 font-bold">{index + 1}</span>
                    </div>
                    <item.icon className="w-4 h-4 text-blue-400" />
                    <p className="text-sm text-[var(--text-secondary)] flex-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opção 9: Mobile Footer com Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] backdrop-blur-xl border-t border-[var(--border-default)] z-40">
          {/* Sticky CTA - Aparece quando QR code está ativo */}
          {showQrCode && qrCode && !isExpired && (
            <div className="px-4 pt-3 pb-2">
              <button
                onClick={handleCopyCode}
                disabled={isExpired}
                className="w-full relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-60" />
                <div className="relative flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]">
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Código Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copiar código PIX</span>
                      <span className="text-blue-200">•</span>
                      <span className="text-blue-100">
                        {formatCurrency(paymentData?.isCustomAmount ? parseAmount(customAmount) : (paymentData?.amount || 0))}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Recovery CTA - Aparece quando QR code expirou */}
          {showQrCode && isExpired && (
            <div className="px-4 pt-3 pb-2">
              <button
                onClick={handleManualReload}
                disabled={isGenerating}
                className="w-full relative group"
              >
                <div className="hidden" />
                <div className="relative flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 active:from-amber-600 active:to-orange-600 text-white font-bold rounded-xl transition-all active:scale-[0.98]">
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Gerando novo QR Code...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      <span>Gerar novo QR Code</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] text-[var(--text-muted)] text-center px-4 py-2">
            Criado com{' '}
            <a href="/" className="text-[var(--accent)] active:underline">
              Painel Atlas
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}
