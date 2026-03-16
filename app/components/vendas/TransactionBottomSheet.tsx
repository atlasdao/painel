'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '@/app/types';
import { translateStatus } from '@/app/lib/translations';
import { pixService } from '@/app/lib/services';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  X,
  Copy,
  Search,
  Link2,
  QrCode,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

interface TransactionBottomSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

// --- Helpers ---

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const formatDate = (date: string | Date) =>
  new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return <ArrowDownLeft className="text-green-600 dark:text-green-400" size={24} />;
    case 'WITHDRAW':
      return <ArrowUpRight className="text-red-600 dark:text-red-400" size={24} />;
    case 'TRANSFER':
      return <RefreshCw className="text-blue-600 dark:text-blue-400" size={24} />;
    default:
      return <AlertCircle className="text-[var(--text-muted)]" size={24} />;
  }
};

const getTransactionLabel = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return 'PIX Recebido';
    case 'WITHDRAW':
      return 'Saque';
    case 'TRANSFER':
      return 'Transferencia';
    default:
      return type;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="text-blue-500" size={16} />;
    case 'PENDING':
      return <Clock className="text-yellow-500" size={16} />;
    case 'PROCESSING':
      return <CheckCircle className="text-green-500" size={16} />;
    case 'IN_REVIEW':
      return <Search className="text-purple-500" size={16} />;
    case 'FAILED':
      return <XCircle className="text-red-500" size={16} />;
    case 'EXPIRED':
      return <Clock className="text-orange-500" size={16} />;
    case 'CANCELLED':
      return <XCircle className="text-gray-500" size={16} />;
    default:
      return <AlertCircle className="text-[var(--text-muted)]" size={16} />;
  }
};

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-blue-500';
    case 'PENDING':
      return 'bg-yellow-500';
    case 'PROCESSING':
      return 'bg-green-500';
    case 'IN_REVIEW':
      return 'bg-purple-500';
    case 'FAILED':
      return 'bg-red-500';
    case 'EXPIRED':
      return 'bg-orange-500';
    case 'CANCELLED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

const getPaymentMethod = (metadata: string | undefined) => {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    if (parsed.paymentLinkId && parsed.shortCode) {
      return {
        icon: <Link2 className="text-blue-600 dark:text-blue-400" size={16} />,
        label: 'Link de Pagamento',
      };
    }
    if (parsed.isQrCodePayment && !parsed.paymentLinkId) {
      return {
        icon: <QrCode className="text-purple-600 dark:text-purple-400" size={16} />,
        label: 'QR Code (API)',
      };
    }
  } catch {
    // ignore
  }
  return null;
};

// --- Bottom Sheet / Modal Component ---

export default function TransactionBottomSheet({
  transaction,
  open,
  onClose,
}: TransactionBottomSheetProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Drag state for mobile bottom sheet
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);

  // Detect desktop vs mobile
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Animate in/out & lock body scroll
  useEffect(() => {
    if (open) {
      // Small delay so the CSS transition is visible
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // --- Drag-to-dismiss (mobile only) ---

  const handleDragStart = useCallback(
    (e: React.TouchEvent) => {
      if (isDesktop) return;
      dragStartY.current = e.touches[0].clientY;
      currentTranslateY.current = 0;
    },
    [isDesktop]
  );

  const handleDragMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDesktop || dragStartY.current === null || !sheetRef.current) return;

      const deltaY = e.touches[0].clientY - dragStartY.current;

      // Only allow dragging down
      if (deltaY < 0) return;

      currentTranslateY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
    },
    [isDesktop]
  );

  const handleDragEnd = useCallback(() => {
    if (isDesktop || !sheetRef.current) return;

    // Reset transition
    sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

    if (currentTranslateY.current > 120) {
      // Dismiss
      sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      // Snap back
      sheetRef.current.style.transform = 'translateY(0)';
    }

    dragStartY.current = null;
    currentTranslateY.current = 0;
  }, [isDesktop, onClose]);

  // Copy helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Share helper
  const handleShare = async () => {
    if (!transaction) return;
    const text = `Transacao ${getTransactionLabel(transaction.type)} - ${formatCurrency(transaction.amount)} - ${translateStatus(transaction.status)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Detalhes da Transacao', text });
      } catch {
        // user cancelled
      }
    } else {
      await copyToClipboard(text, 'Detalhes');
    }
  };

  // Check status
  const checkStatus = async () => {
    if (!transaction) return;
    setIsChecking(true);
    try {
      const toastId = 'check-status';
      toast.loading('Verificando status...', { id: toastId });
      await pixService.checkDepositStatus(transaction.id);
      toast.success('Status atualizado!', { id: toastId });
    } catch {
      toast.error('Erro ao verificar status', { id: 'check-status' });
    } finally {
      setIsChecking(false);
    }
  };

  if (!open || !transaction) return null;

  const paymentMethod = getPaymentMethod(transaction.metadata);
  const amountColor = transaction.type === 'DEPOSIT' ? '#10b981' : '#ef4444';

  // --- Detail row helper ---
  const DetailRow = ({
    label,
    value,
    copyable,
    mono,
    extra,
  }: {
    label: string;
    value: string;
    copyable?: boolean;
    mono?: boolean;
    extra?: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between py-3 border-b border-[var(--border-default)] last:border-0 gap-3">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        {extra}
        <span
          className={`text-sm text-[var(--text-primary)] text-right break-all ${
            mono ? 'font-mono text-xs' : ''
          }`}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="text-[var(--accent)] flex-shrink-0 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label={`Copiar ${label}`}
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );

  // --- Inner content shared between sheet and modal ---
  const content = (
    <>
      {/* Transaction type icon + label */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="p-3 bg-[var(--bg-elevated)] rounded-full mb-3">
          {getTransactionIcon(transaction.type)}
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {getTransactionLabel(transaction.type)}
        </h3>
      </div>

      {/* Large amount */}
      <div
        className="text-center mb-6 py-4 rounded-xl"
        style={{
          backgroundColor: `${amountColor}15`,
          border: `2px solid ${amountColor}40`,
        }}
      >
        <span className="text-3xl font-bold" style={{ color: amountColor }}>
          {transaction.type === 'DEPOSIT' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </div>

      {/* Details */}
      <div className="bg-[var(--bg-elevated)] rounded-xl px-4">
        <DetailRow
          label="Status"
          value={translateStatus(transaction.status)}
          extra={
            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(transaction.status)}`} />
          }
        />

        <DetailRow
          label="Data"
          value={formatDate(transaction.createdAt)}
        />

        {transaction.processedAt && (
          <DetailRow
            label="Processado"
            value={formatDate(transaction.processedAt)}
          />
        )}

        <DetailRow
          label="Tipo"
          value={
            transaction.type === 'DEPOSIT'
              ? 'PIX'
              : transaction.type === 'WITHDRAW'
              ? 'Saque'
              : 'Transferencia'
          }
        />

        {transaction.buyerName && (
          <DetailRow label="De/Para" value={transaction.buyerName} />
        )}

        {paymentMethod && (
          <DetailRow
            label="Metodo"
            value={paymentMethod.label}
            extra={paymentMethod.icon}
          />
        )}

        {transaction.description && (
          <DetailRow label="Descricao" value={transaction.description} />
        )}

        <DetailRow
          label="ID"
          value={transaction.id}
          copyable
          mono
        />

        {transaction.pixKey && (
          <DetailRow
            label="Carteira"
            value={transaction.pixKey}
            copyable
            mono
          />
        )}

        {transaction.errorMessage && (
          <div className="py-3 border-b border-[var(--border-default)] last:border-0">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Erro
            </span>
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {transaction.errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => copyToClipboard(transaction.id, 'ID')}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--bg-elevated)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors min-h-[48px] border border-[var(--border-default)]"
        >
          <Copy size={16} />
          Copiar ID
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--bg-elevated)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors min-h-[48px] border border-[var(--border-default)]"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>

      {/* Check Status button for pending */}
      {(transaction.status === 'PENDING' ||
        transaction.status === 'PROCESSING' ||
        transaction.status === 'IN_REVIEW') && (
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
          {isChecking ? 'Verificando...' : 'Verificar Status'}
        </button>
      )}
    </>
  );

  // --- Portal rendering ---

  const portalContent = isDesktop ? (
    // --- Desktop: Centered modal ---
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-5"
      onClick={onClose}
      style={{
        backgroundColor: isVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
        style={{
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: isVisible ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Detalhes da Transacao
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)] text-[var(--text-primary)] rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {content}
        </div>
      </div>
    </div>
  ) : (
    // --- Mobile: Bottom sheet ---
    <div
      className="fixed inset-0 z-[999999]"
      onClick={onClose}
      style={{
        backgroundColor: isVisible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl shadow-2xl"
        style={{
          maxHeight: '90vh',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto px-5 pb-8"
          style={{
            maxHeight: 'calc(90vh - 24px)',
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}
