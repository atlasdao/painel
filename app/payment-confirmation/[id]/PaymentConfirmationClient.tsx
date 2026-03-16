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
  User,
  Hash,
  Shield,
  Lock,
  Check,
  Copy,
  Printer,
  AlertCircle
} from 'lucide-react';

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

  useEffect(() => {
    fetchPaymentData();
  }, [paymentId]);

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
        buyerEmail: undefined,
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 animate-pulse" />
          </div>
          <h2 className="text-lg sm:text-xl text-[var(--text-primary)] font-semibold mb-4">Carregando comprovante</h2>
          <div className="w-48 mx-auto">
            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ animation: 'fastProgress 0.8s ease-out forwards' }}
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="max-w-md w-full atlas-card p-6 sm:p-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">Erro ao carregar</h1>
          <p className="text-[var(--text-secondary)] mb-8 text-sm sm:text-base">{error || 'Comprovante nao encontrado'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 sm:px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
          >
            Voltar ao inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
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
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-xl transition-colors"
                title="Imprimir"
              >
                <Printer className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-xl transition-colors"
                title="Baixar PDF"
              >
                <Download className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-xl transition-colors"
                title="Compartilhar"
              >
                <Share2 className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>

          {/* Receipt Card - Desktop */}
          <div className="print-full-width">
            <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden">
              {/* Header */}
              <div className="bg-green-600 px-6 sm:px-8 py-8 sm:py-10 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pagamento Confirmado!</h1>
                <p className="text-green-100 text-sm sm:text-base">Transacao realizada com sucesso</p>
              </div>

              {/* Amount Display */}
              <div className="px-6 sm:px-8 py-8 border-b-2 border-dashed border-zinc-200 bg-zinc-50">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-zinc-500 uppercase tracking-wider mb-2">Valor Pago</p>
                  <p className="text-4xl sm:text-5xl font-bold text-green-600">
                    {formatCurrency(paymentData.amount)}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
                {/* Transaction ID */}
                <div className="flex items-start justify-between p-4 bg-zinc-50 rounded-xl">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Hash className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 mb-1">ID da Transacao</p>
                      <p className="text-sm font-mono font-semibold text-zinc-900 break-all">{paymentData.transactionId}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyTransactionId}
                    className="ml-3 p-2 hover:bg-zinc-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copiar ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-500" />
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
                      <p className="text-xs text-zinc-500 mb-1">Data</p>
                      <p className="text-sm font-semibold text-zinc-900">{formatDate(paymentData.paidAt)}</p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 mb-1">Horario</p>
                      <p className="text-sm font-semibold text-zinc-900">{formatTime(paymentData.paidAt)}</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 mb-1">Metodo</p>
                      <p className="text-sm font-semibold text-zinc-900">{paymentData.method}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-green-600">Pago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {paymentData.description && (
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-2">Descricao</p>
                    <p className="text-sm text-zinc-900">{paymentData.description}</p>
                  </div>
                )}

                {/* Buyer Info */}
                {(paymentData.buyerName || paymentData.buyerDocument) && (
                  <div className="space-y-3 pt-4 border-t border-zinc-200">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Dados do Pagador</p>

                    {paymentData.buyerName && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Nome</p>
                          <p className="text-sm font-medium text-zinc-900">{paymentData.buyerName}</p>
                        </div>
                      </div>
                    )}

                    {paymentData.buyerDocument && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <CreditCard className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">CPF/CNPJ</p>
                          <p className="text-sm font-medium text-zinc-900">{paymentData.buyerDocument}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 py-6 bg-zinc-50 border-t border-zinc-200">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Image
                    src="/atlas-logo.jpg"
                    alt="Atlas"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Atlas Pay</h2>
                    <p className="text-xs text-zinc-500">Pagamentos seguros e rapidos</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
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
        <div className="bg-green-600 px-4 py-6 text-center no-print">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Pagamento Confirmado!</h1>
          <p className="text-green-100 text-sm">Transacao realizada com sucesso</p>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 bg-white">
          {/* Amount Display */}
          <div className="px-4 py-6 bg-zinc-50 border-b-2 border-dashed border-zinc-200">
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Valor Pago</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(paymentData.amount)}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="px-4 py-5 space-y-4">
            {/* Transaction ID */}
            <div className="flex items-start justify-between p-3 bg-zinc-50 rounded-xl">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <Hash className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 mb-0.5">ID da Transacao</p>
                  <p className="text-xs font-mono font-semibold text-zinc-900 break-all">{paymentData.transactionId}</p>
                </div>
              </div>
              <button
                onClick={handleCopyTransactionId}
                className="ml-2 p-1.5 active:bg-zinc-200 rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
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
                  <p className="text-[10px] text-zinc-500 mb-0.5">Data</p>
                  <p className="text-xs font-semibold text-zinc-900">{formatDate(paymentData.paidAt)}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Horario</p>
                  <p className="text-xs font-semibold text-zinc-900">{formatTime(paymentData.paidAt)}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-cyan-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Metodo</p>
                  <p className="text-xs font-semibold text-zinc-900">{paymentData.method}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-xs font-semibold text-green-600">Pago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {paymentData.description && (
              <div className="p-3 bg-zinc-50 rounded-xl">
                <p className="text-[10px] text-zinc-500 mb-1.5">Descricao</p>
                <p className="text-xs text-zinc-900">{paymentData.description}</p>
              </div>
            )}

            {/* Buyer Info */}
            {(paymentData.buyerName || paymentData.buyerDocument) && (
              <div className="space-y-2.5 pt-3 border-t border-zinc-200">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Dados do Pagador</p>

                {paymentData.buyerName && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">Nome</p>
                      <p className="text-xs font-medium text-zinc-900">{paymentData.buyerName}</p>
                    </div>
                  </div>
                )}

                {paymentData.buyerDocument && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                      <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">CPF/CNPJ</p>
                      <p className="text-xs font-medium text-zinc-900">{paymentData.buyerDocument}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-5 bg-zinc-50 border-t border-zinc-200 mt-auto">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Atlas Pay</h2>
                <p className="text-[10px] text-zinc-500">Pagamentos seguros</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500 mb-4">
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
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-100 active:bg-zinc-200 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-medium">Compartilhar</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-100 active:bg-zinc-200 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-medium">Baixar</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-100 active:bg-zinc-200 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-medium">Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
