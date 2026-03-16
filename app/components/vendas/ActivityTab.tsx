'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { pixService } from '@/app/lib/services';
import { Transaction } from '@/app/types';
import { translateStatus } from '@/app/lib/translations';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Download,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

type FilterType = 'all' | 'received' | 'sent' | 'pending';

interface ActivityTabProps {
  isCommerce: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

// --- Styling helpers (mirroring existing patterns) ---

const getStatusBadge = (status: string) => {
  const statusStyles: Record<string, string> = {
    'COMPLETED': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
    'PENDING': 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
    'PROCESSING': 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
    'IN_REVIEW': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
    'FAILED': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
    'EXPIRED': 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30',
    'CANCELLED': 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30',
  };
  return statusStyles[status] || statusStyles['CANCELLED'];
};

const getStatusTooltip = (status: string) => {
  const tooltips: Record<string, string> = {
    'COMPLETED': 'Recebido em sua carteira',
    'PROCESSING': 'Pago. Liberacao na proxima remessa',
    'PENDING': 'Aguardando pagamento',
    'IN_REVIEW': 'Contate o suporte',
    'FAILED': 'Pagamento cancelado ou nao concluido',
    'EXPIRED': 'Tempo limite excedido',
    'CANCELLED': 'Transacao cancelada',
  };
  return tooltips[status] || '';
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'WITHDRAW':
      return <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'TRANSFER':
      return <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />;
  }
};

const getAmountColor = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return 'text-green-600 dark:text-green-400';
    case 'WITHDRAW':
      return 'text-red-600 dark:text-red-400';
    case 'TRANSFER':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-[var(--text-muted)]';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return 'Deposito';
    case 'WITHDRAW':
      return 'Saque';
    case 'TRANSFER':
      return 'Transferencia';
    default:
      return type;
  }
};

// --- Formatting helpers ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    return 'Data invalida';
  }
};

// --- Filter chip definitions ---

const filterChips: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'received', label: 'Recebido' },
  { id: 'sent', label: 'Enviado' },
  { id: 'pending', label: 'Pendente' },
];

// --- Loading Skeleton ---

function TransactionSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[var(--bg-elevated)] rounded-lg w-10 h-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-[var(--bg-elevated)] rounded w-20" />
            <div className="h-4 bg-[var(--bg-elevated)] rounded w-24" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 bg-[var(--bg-elevated)] rounded w-16" />
            <div className="h-3 bg-[var(--bg-elevated)] rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ActivityTab({ isCommerce, onTransactionClick }: ActivityTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [revenueStats, setRevenueStats] = useState({ total: 0, count: 0 });
  const [pullDistance, setPullDistance] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const isUnmountedRef = useRef(false);
  const itemsPerPage = 30;
  const PULL_THRESHOLD = 80;

  // Build API params from the active filter
  const buildParams = useCallback(
    (offset: number) => {
      const params: any = { limit: itemsPerPage, offset };

      switch (activeFilter) {
        case 'received':
          params.type = 'DEPOSIT';
          break;
        case 'sent':
          params.type = 'WITHDRAW';
          break;
        case 'pending':
          params.status = 'PENDING';
          break;
      }

      return params;
    },
    [activeFilter]
  );

  // Fetch transactions
  const loadTransactions = useCallback(
    async (isLoadMore = false) => {
      if (isUnmountedRef.current) return;

      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = isLoadMore ? transactions.length : 0;
        const params = buildParams(offset);
        const newTransactions = await pixService.getTransactions(params);

        if (isUnmountedRef.current) return;

        if (isLoadMore) {
          setTransactions((prev) => [...prev, ...newTransactions]);
        } else {
          setTransactions(newTransactions);
        }

        setHasMore(newTransactions.length === itemsPerPage);
      } catch (error) {
        if (!isUnmountedRef.current) {
          console.error('Error loading transactions:', error);
          toast.error('Erro ao carregar transacoes');
        }
      } finally {
        if (!isUnmountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams, transactions.length]
  );

  // Compute compact revenue stats for commerce users
  useEffect(() => {
    if (!isCommerce || transactions.length === 0) {
      setRevenueStats({ total: 0, count: 0 });
      return;
    }

    const completed = transactions.filter(
      (t) =>
        t.type === 'DEPOSIT' &&
        (t.status === 'COMPLETED' || t.status === 'PROCESSING')
    );
    const total = completed.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    setRevenueStats({ total, count: completed.length });
  }, [transactions, isCommerce]);

  // Initial load & reload on filter change
  useEffect(() => {
    loadTransactions();
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!hasMore || loading || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadTransactions(true);
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadTransactions]);

  // Pull-to-refresh handlers
  const handlePullTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= 0 && !refreshing && !loading) {
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing, loading]);

  const handlePullTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || pullStartY.current === null) return;
    const deltaY = e.touches[0].clientY - pullStartY.current;
    if (deltaY > 0) {
      // Dampen the pull distance for a natural feel
      setPullDistance(Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, []);

  const handlePullTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    pullStartY.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await loadTransactions(false);
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, loadTransactions]);

  // CSV export
  const exportCSV = async () => {
    try {
      toast.loading('Exportando transacoes...');

      const params = buildParams(0);
      delete params.limit;
      delete params.offset;
      const allData = await pixService.getTransactions(params);

      const headers = ['ID', 'Tipo', 'Status', 'Valor', 'Descricao', 'Data'];
      const rows = allData.map((t) => [
        t.id,
        getTypeLabel(t.type),
        translateStatus(t.status),
        formatCurrency(t.amount),
        t.description || '',
        new Date(t.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        }),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`${allData.length} transacoes exportadas com sucesso!`);
    } catch {
      toast.dismiss();
      toast.error('Erro ao exportar transacoes');
    }
  };

  return (
    <div
      id="vendas-tabpanel-activity"
      role="tabpanel"
      aria-label="Atividade de transacoes"
      ref={scrollContainerRef}
      onTouchStart={handlePullTouchStart}
      onTouchMove={handlePullTouchMove}
      onTouchEnd={handlePullTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: refreshing ? `${PULL_THRESHOLD}px` : `${pullDistance}px` }}
        >
          <RefreshCw
            className={`w-5 h-5 text-[var(--accent)] ${refreshing ? 'animate-spin' : ''}`}
            style={{
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
              transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
            }}
          />
        </div>
      )}

      {/* Compact Revenue Header (commerce only) */}
      {isCommerce && !loading && transactions.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {formatCurrency(revenueStats.total)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {revenueStats.count} {revenueStats.count === 1 ? 'venda' : 'vendas'}
            </span>
          </div>
          <button
            onClick={exportCSV}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Exportar CSV"
            aria-label="Exportar transacoes para CSV"
          >
            <Download className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      )}

      {/* Sticky Filter Chips */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)] pb-3 pt-1 -mx-1 px-1">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[40px] border ${
                  isActive
                    ? 'bg-[var(--accent)] text-white border-transparent'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                }`}
                aria-pressed={isActive}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3 mt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TransactionSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 text-center mt-2">
          <div className="p-4 bg-[var(--bg-elevated)] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Search className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Nenhuma transacao ainda
          </h3>
          <p className="text-[var(--text-muted)] text-sm">
            {activeFilter !== 'all'
              ? 'Nenhuma transacao corresponde ao filtro selecionado.'
              : 'Suas transacoes aparecerao aqui quando voce comecar a usar o sistema.'}
          </p>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors min-h-[44px]"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* Transaction List */}
      {!loading && transactions.length > 0 && (
        <div className="space-y-3 mt-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              onClick={() => onTransactionClick?.(transaction)}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer hover:border-[var(--border-hover)] w-full overflow-hidden"
              tabIndex={0}
              role="button"
              aria-label={`Ver detalhes: ${getTypeLabel(transaction.type)} de ${formatCurrency(transaction.amount)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTransactionClick?.(transaction);
                }
              }}
            >
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <div className="flex items-start gap-3 w-full overflow-hidden">
                  <div className="p-2 bg-[var(--bg-elevated)] rounded-lg flex-shrink-0">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h4 className="font-medium text-[var(--text-primary)] truncate flex-1 min-w-0 text-sm">
                        {transaction.description || getTypeLabel(transaction.type)}
                      </h4>
                      <span
                        className={`font-semibold flex-shrink-0 text-right ${getAmountColor(transaction.type)}`}
                      >
                        {transaction.type === 'WITHDRAW' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border flex-shrink-0 cursor-help ${getStatusBadge(transaction.status)}`}
                        title={getStatusTooltip(transaction.status)}
                      >
                        {translateStatus(transaction.status)}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs text-right flex-shrink-0">
                        {formatTime(transaction.createdAt)}
                      </span>
                    </div>
                    {(transaction.status === 'COMPLETED' || transaction.status === 'PROCESSING') && (
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/payment-confirmation/${transaction.id}`, '_blank');
                          }}
                          className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                          title="Ver comprovante"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex items-center gap-4">
                <div className="p-2 bg-[var(--bg-elevated)] rounded-lg">
                  {getTypeIcon(transaction.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[var(--text-primary)]">
                    {transaction.description || getTypeLabel(transaction.type)}
                  </h4>
                  {transaction.buyerName && (
                    <p className="text-sm text-[var(--text-muted)] truncate">
                      {transaction.buyerName}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm border cursor-help ${getStatusBadge(transaction.status)}`}
                    title={getStatusTooltip(transaction.status)}
                  >
                    {translateStatus(transaction.status)}
                  </span>
                </div>
                <div className="text-right min-w-[120px]">
                  <div className={`font-semibold ${getAmountColor(transaction.type)}`}>
                    {transaction.type === 'WITHDRAW' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {formatTime(transaction.createdAt)}
                  </div>
                </div>
                {(transaction.status === 'COMPLETED' || transaction.status === 'PROCESSING') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/payment-confirmation/${transaction.id}`, '_blank');
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
                    title="Ver comprovante"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="py-1">
              {loadingMore && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <TransactionSkeleton key={`more-${i}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
