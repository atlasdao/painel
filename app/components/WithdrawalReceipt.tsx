'use client';

import { useRef, useState } from 'react';
import { X, Download, CheckCircle, Copy } from 'lucide-react';

interface ReceiptData {
  senderName: string;
  senderCnpj: string;
  senderInstitution: string;
  recipientName: string;
  recipientCpfCnpj: string;
  recipientPixKey: string;
  amount: number;
  date: string;
  transactionId: string;
  bankTxId?: string;
  authCode: string;
}

interface WithdrawalReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
  withdrawal?: {
    id: string;
    amount: number;
    fee: number;
    netAmount: number;
  };
}

function maskCpfCnpj(value: string): string {
  if (!value) return '***';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return `***.***.${clean.substring(6, 9)}-**`;
  }
  if (clean.length === 14) {
    return `**.***.${clean.substring(4, 7)}/${clean.substring(8, 12)}-**`;
  }
  return value;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function WithdrawalReceipt({ isOpen, onClose, receiptData, withdrawal }: WithdrawalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState('');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#09090b',
        useCORS: true,
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const yOffset = (297 - imgHeight) / 2;

      pdf.setFillColor(9, 9, 11);
      pdf.rect(0, 0, 210, 297, 'F');
      pdf.addImage(imgData, 'PNG', 10, Math.max(10, yOffset), imgWidth, imgHeight);

      const filename = `comprovante-saque-${receiptData.transactionId.substring(0, 8)}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Comprovante de Transferencia</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 space-y-6 bg-zinc-950">
          {/* Status */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-lg font-semibold text-blue-400">Transferencia realizada</p>
            <p className="text-3xl font-bold text-zinc-50">{formatCurrency(receiptData.amount)}</p>
            <p className="text-sm text-zinc-500">{formatDate(receiptData.date)}</p>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Sender */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Remetente</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nome</span>
                <span className="text-sm text-zinc-200 font-medium">{receiptData.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">CNPJ</span>
                <span className="text-sm text-zinc-200 font-medium">{receiptData.senderCnpj}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Instituicao</span>
                <span className="text-sm text-zinc-200 font-medium">{receiptData.senderInstitution}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Recipient */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recebedor</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nome</span>
                <span className="text-sm text-zinc-200 font-medium">{receiptData.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">CPF/CNPJ</span>
                <span className="text-sm text-zinc-200 font-medium">{maskCpfCnpj(receiptData.recipientCpfCnpj)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Chave PIX</span>
                <span className="text-sm text-zinc-200 font-medium">{receiptData.recipientPixKey}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Transaction Details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Detalhes</p>
            <div className="space-y-2">
              {withdrawal && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Valor bruto</span>
                    <span className="text-sm text-zinc-200">{formatCurrency(withdrawal.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Taxa</span>
                    <span className="text-sm text-zinc-200">- {formatCurrency(withdrawal.fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Valor transferido</span>
                    <span className="text-sm text-blue-400 font-medium">{formatCurrency(withdrawal.netAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">ID da transacao</span>
                <button
                  onClick={() => copyToClipboard(receiptData.transactionId, 'txid')}
                  className="flex items-center gap-1 text-sm text-zinc-300 hover:text-blue-400 transition-colors"
                >
                  <span className="font-mono text-xs">{receiptData.transactionId.substring(0, 16)}...</span>
                  {copied === 'txid' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {receiptData.authCode && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Autenticacao</span>
                  <button
                    onClick={() => copyToClipboard(receiptData.authCode, 'auth')}
                    className="flex items-center gap-1 text-sm text-zinc-300 hover:text-blue-400 transition-colors"
                  >
                    <span className="font-mono text-xs">{receiptData.authCode.substring(0, 16)}...</span>
                    {copied === 'auth' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[var(--border-default)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
