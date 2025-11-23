'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  CheckCircle,
  Download,
  Share2,
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  User,
  Hash,
  DollarSign,
  Smartphone,
  Shield,
  Lock,
  Sparkles,
  Check,
  Copy,
  Printer,
  Mail
} from 'lucide-react';
import { triggerConfetti } from '@/app/lib/confetti';

interface PaymentConfirmationClientProps {
  paymentId: string;
}

interface PaymentData {
  id: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  paidAt: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerDocument?: string;
  transactionId: string;
  method: string;
}

export default function PaymentConfirmationClient({ paymentId }: PaymentConfirmationClientProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, [paymentId]);

  // Mark as shown (confetti removed)
  useEffect(() => {
    if (!showConfetti && paymentData) {
      setShowConfetti(true);
    }
  }, [paymentData, showConfetti]);

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment-confirmation/${paymentId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }

      const data = await response.json();

      setPaymentData({
        id: data.id || paymentId,
        amount: data.amount || 0,
        description: data.description || 'Pagamento PIX',
        status: data.status || 'paid',
        createdAt: data.createdAt || new Date().toISOString(),
        paidAt: data.paidAt || data.processedAt || new Date().toISOString(),
        buyerName: data.buyerName || data.metadata?.payerName,
        buyerEmail: undefined, // Don't show email
        buyerDocument: data.buyerDocument || data.metadata?.payerTaxNumber,
        transactionId: data.transactionId || data.externalId || paymentId,
        method: 'PIX'
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Erro ao carregar dados do pagamento');
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(dateString));
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(dateString));
  };

  const handleCopyTransactionId = () => {
    if (paymentData?.transactionId) {
      navigator.clipboard.writeText(paymentData.transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Use native print dialog - user can save as PDF
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share && paymentData) {
      try {
        await navigator.share({
          title: 'Comprovante de Pagamento',
          text: `Pagamento confirmado - ${formatCurrency(paymentData.amount)} - ${paymentData.transactionId}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyTransactionId();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-20 animate-ping" />
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-green-600 to-emerald-600 rounded-full">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl text-white font-semibold mb-4">Carregando comprovante</h2>
          <div className="w-48 mx-auto">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                style={{
                  animation: 'fastProgress 0.8s ease-out forwards'
                }}
              />
            </div>
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

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-0 bg-red-500/10 blur-3xl animate-pulse" />
          <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 sm:p-10 text-center shadow-2xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Erro ao carregar</h1>
            <p className="text-slate-300 mb-8 text-sm sm:text-base">{error || 'Comprovante não encontrado'}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-semibold rounded-2xl transition-all transform hover:scale-105 text-sm sm:text-base"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>

      {/* Desktop & Tablet Layout */}
      <div className="hidden sm:flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          {/* Header Actions - Desktop */}
          <div className="flex items-center justify-between mb-6 no-print">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                title="Imprimir"
              >
                <Printer className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                title="Baixar PDF"
              >
                <Download className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                title="Compartilhar"
              >
                <Share2 className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Receipt Card - Desktop */}
          <div className="relative print-full-width">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 blur-3xl no-print" />
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 px-6 sm:px-8 py-8 sm:py-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pagamento Confirmado!</h1>
                  <p className="text-green-100 text-sm sm:text-base">Transação realizada com sucesso</p>
                </div>
              </div>

              {/* Amount Display */}
              <div className="px-6 sm:px-8 py-8 bg-gradient-to-br from-slate-50 to-white border-b-2 border-dashed border-slate-200">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider mb-2">Valor Pago</p>
                  <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(paymentData.amount)}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
                {/* Transaction ID */}
                <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Hash className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">ID da Transação</p>
                      <p className="text-sm font-mono font-semibold text-slate-900 break-all">{paymentData.transactionId}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyTransactionId}
                    className="ml-3 p-2 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copiar ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Payment Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">Data</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(paymentData.paidAt)}</p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">Horário</p>
                      <p className="text-sm font-semibold text-slate-900">{formatTime(paymentData.paidAt)}</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">Método</p>
                      <p className="text-sm font-semibold text-slate-900">{paymentData.method}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-green-600">Pago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {paymentData.description && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">Descrição</p>
                    <p className="text-sm text-slate-900">{paymentData.description}</p>
                  </div>
                )}

                {/* Buyer Info */}
                {(paymentData.buyerName || paymentData.buyerDocument) && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Dados do Pagador</p>

                    {paymentData.buyerName && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Nome</p>
                          <p className="text-sm font-medium text-slate-900">{paymentData.buyerName}</p>
                        </div>
                      </div>
                    )}

                    {paymentData.buyerDocument && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <CreditCard className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">CPF/CNPJ</p>
                          <p className="text-sm font-medium text-slate-900">{paymentData.buyerDocument}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 py-6 bg-gradient-to-br from-slate-50 to-white border-t border-slate-200">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg blur-sm opacity-50" />
                    <div className="relative p-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                      <Image
                        src="/atlas-logo.jpg"
                        alt="Atlas"
                        width={32}
                        height={32}
                        className="rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Atlas Pay</h2>
                    <p className="text-xs text-slate-500">Pagamentos seguros e rápidos</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-green-600" />
                    Seguro
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Criptografado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 px-4 py-6 text-center relative overflow-hidden no-print">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Pagamento Confirmado!</h1>
            <p className="text-green-100 text-sm">Transação realizada com sucesso</p>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 bg-white">
          {/* Amount Display */}
          <div className="px-4 py-6 bg-gradient-to-br from-slate-50 to-white border-b-2 border-dashed border-slate-200">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Valor Pago</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {formatCurrency(paymentData.amount)}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="px-4 py-5 space-y-4">
            {/* Transaction ID */}
            <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <Hash className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 mb-0.5">ID da Transação</p>
                  <p className="text-xs font-mono font-semibold text-slate-900 break-all">{paymentData.transactionId}</p>
                </div>
              </div>
              <button
                onClick={handleCopyTransactionId}
                className="ml-2 p-1.5 active:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
            </div>

            {/* Payment Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 mb-0.5">Data</p>
                  <p className="text-xs font-semibold text-slate-900">{formatDate(paymentData.paidAt)}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 mb-0.5">Horário</p>
                  <p className="text-xs font-semibold text-slate-900">{formatTime(paymentData.paidAt)}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-cyan-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 mb-0.5">Método</p>
                  <p className="text-xs font-semibold text-slate-900">{paymentData.method}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-xs font-semibold text-green-600">Pago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {paymentData.description && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-500 mb-1.5">Descrição</p>
                <p className="text-xs text-slate-900">{paymentData.description}</p>
              </div>
            )}

            {/* Buyer Info */}
            {(paymentData.buyerName || paymentData.buyerDocument) && (
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Dados do Pagador</p>

                {paymentData.buyerName && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Nome</p>
                      <p className="text-xs font-medium text-slate-900">{paymentData.buyerName}</p>
                    </div>
                  </div>
                )}

                {paymentData.buyerDocument && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                      <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">CPF/CNPJ</p>
                      <p className="text-xs font-medium text-slate-900">{paymentData.buyerDocument}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-5 bg-gradient-to-br from-slate-50 to-white border-t border-slate-200 mt-auto">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg blur-sm opacity-50" />
                <div className="relative p-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Image
                    src="/atlas-logo.jpg"
                    alt="Atlas"
                    width={28}
                    height={28}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Atlas Pay</h2>
                <p className="text-[10px] text-slate-500">Pagamentos seguros</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-600" />
                Seguro
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-600" />
                Protegido
              </span>
            </div>

            {/* Mobile Actions */}
            <div className="grid grid-cols-3 gap-2 no-print">
              <button
                onClick={handleShare}
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Compartilhar</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Baixar</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-medium">Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
