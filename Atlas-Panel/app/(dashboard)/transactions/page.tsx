'use client';

// 🔴🔴🔴 BUILD TIMESTAMP: 2025-01-23 19:30 🔴🔴🔴
import { useState, useEffect, useCallback, useRef } from 'react';
import { pixService } from '@/app/lib/services';
import { Transaction } from '@/app/types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  TrendingUp,
  CreditCard,
  DollarSign,
  Calendar,
  ChevronDown,
  Loader,
  Search,
  FileText,
  Download
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { translateStatus } from '@/app/lib/translations';
import TransactionDetailModal from '@/app/components/TransactionDetailModal';
import { DropdownPortal } from '@/components/DropdownPortal';

// Transaction type definitions
interface PeriodOption {
  id: string;
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

// Status and type styling functions
const getStatusBadge = (status: string) => {
  const statusStyles = {
    'COMPLETED': 'bg-green-500/20 text-green-400 border-green-500/30',
    'PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'PROCESSING': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'IN_REVIEW': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'FAILED': 'bg-red-500/20 text-red-400 border-red-500/30',
    'EXPIRED': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'CANCELLED': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  return statusStyles[status as keyof typeof statusStyles] || statusStyles['EXPIRED'];
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
    case 'WITHDRAW':
      return <ArrowUpRight className="w-4 h-4 text-red-400" />;
    case 'TRANSFER':
      // Legacy support for existing transfer transactions in database
      return <CreditCard className="w-4 h-4 text-blue-400" />;
    default:
      return <DollarSign className="w-4 h-4 text-gray-400" />;
  }
};

const getAmountClass = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return 'text-green-400';
    case 'WITHDRAW':
      return 'text-red-400';
    case 'TRANSFER':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
};

export default function TransactionsPage() {
  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAW'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'IN_REVIEW' | 'EXPIRED' | 'CANCELLED'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>({
    id: '7d',
    label: 'Últimos 7 dias',
    value: '7d',
    startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  // Modal and UI states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Refs for preventing memory leaks
  const isUnmountedRef = useRef(false);
  const filterRef = useRef<HTMLElement>(null);

  // Period options (calculated fresh each time to avoid stale dates)
  const getPeriodOptions = (): PeriodOption[] => [
    {
      id: '24h',
      label: 'Últimas 24h',
      value: '24h',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      id: '7d',
      label: 'Últimos 7 dias',
      value: '7d',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      id: '30d',
      label: 'Últimos 30 dias',
      value: '30d',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      id: '90d',
      label: 'Últimos 90 dias',
      value: '90d',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    }
  ];

  const periodOptions = getPeriodOptions();

  // Load transactions function
  const loadTransactions = useCallback(async (isLoadMore = false, refresh = false) => {
    if (isUnmountedRef.current) return;

    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = isLoadMore ? transactions.length : 0;

      const params: any = {
        limit: itemsPerPage,
        offset,
        startDate: selectedPeriod.startDate,
        endDate: selectedPeriod.endDate
      };

      // Add filters if not 'all'
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const newTransactions = await pixService.getTransactions(params);

      if (!isUnmountedRef.current) {
        if (isLoadMore) {
          setTransactions(prev => [...prev, ...newTransactions]);
        } else {
          setTransactions(newTransactions);
        }

        // Check if there are more transactions to load
        setHasMore(newTransactions.length === itemsPerPage);

        if (!isLoadMore) {
          setCurrentPage(1);
        } else {
          setCurrentPage(prev => prev + 1);
        }
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        console.error('Error loading transactions:', error);
        toast.error('Erro ao carregar transações');
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [selectedPeriod, typeFilter, statusFilter, itemsPerPage]);

  // Initial load
  useEffect(() => {
    loadTransactions();

    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadTransactions();
  }, [selectedPeriod, typeFilter, statusFilter, loadTransactions]);

  // Handle filter changes
  const handlePeriodChange = (period: PeriodOption) => {
    // Get fresh dates for the selected period
    const freshPeriods = getPeriodOptions();
    const freshPeriod = freshPeriods.find(p => p.id === period.id) || period;
    setSelectedPeriod(freshPeriod);
    setShowFilters(false);
  };

  const handleTypeFilterChange = (type: typeof typeFilter) => {
    setTypeFilter(type);
  };

  const handleStatusFilterChange = (status: typeof statusFilter) => {
    setStatusFilter(status);
  };

  // Handle transaction detail view
  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(true);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      setLoading(true);
      toast.loading('Exportando transações...');

      // Load all transactions for export (with filters if any)
      const params: any = {
        startDate: selectedPeriod.startDate,
        endDate: selectedPeriod.endDate
      };

      // Add filters if not 'all'
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Load all transactions without limit for export
      const allData = await pixService.getTransactions(params);

      const headers = ['ID', 'Tipo', 'Status', 'Valor', 'Descrição', 'Data'];
      const rows = allData.map((t) => [
        t.id,
        t.type === 'DEPOSIT' ? 'Depósito' : t.type === 'WITHDRAW' ? 'Saque' : 'Transferência',
        translateStatus(t.status),
        formatCurrency(t.amount),
        t.description || '',
        formatDate(t.createdAt),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(`${allData.length} transações exportadas com sucesso!`);
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao exportar transações');
    } finally {
      setLoading(false);
    }
  };

  // Skeleton loading component
  const TransactionSkeleton = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-700/50 rounded-lg w-10 h-10"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-700 rounded w-20"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-700 rounded w-16"></div>
            <div className="h-3 bg-gray-700 rounded w-32"></div>
          </div>
          <div className="h-3 bg-gray-700 rounded w-40 mt-1"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gray-900 text-white pb-12 overflow-x-hidden -m-6">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Toaster position="top-right" />

      {/* Header Section */}
      <div className="mb-4 px-4 pt-4 animate-fade-in-down">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
              Transações
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 text-green-400 font-medium">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Atualizado
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">{transactions.length} transações</span>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            title="Exportar transações para CSV"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Exportar CSV</span>
          </button>
          <button
            onClick={exportToCSV}
            className="md:hidden p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            title="Exportar transações para CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => loadTransactions()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-4 px-4 animate-slide-in-up animate-stagger-1">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3">
          <div className="flex gap-1 w-full">
            {/* Period Filter */}
            <div className="relative flex-[1.5] min-w-0">
              <button
                ref={filterRef as React.RefObject<HTMLButtonElement>}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-2 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600/50 text-sm min-h-[44px] w-full"
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs flex-1 min-w-0 text-left" title={selectedPeriod.label}>
                  {selectedPeriod.id === '24h' ? '24h' :
                   selectedPeriod.id === '7d' ? '7 dias' :
                   selectedPeriod.id === '30d' ? '30 dias' :
                   selectedPeriod.id === '90d' ? '90 dias' : selectedPeriod.label}
                </span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>

              <DropdownPortal
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                targetRef={filterRef}
              >
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-48">
                  {periodOptions.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => handlePeriodChange(period)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedPeriod.id === period.id ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </DropdownPortal>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value as typeof typeFilter)}
              className="px-2 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] flex-1 min-w-0"
            >
              <option value="all">Tipos</option>
              <option value="DEPOSIT">Depósitos</option>
              <option value="WITHDRAW">Saques</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
              className="px-2 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] flex-1 min-w-0"
            >
              <option value="all">Status</option>
              <option value="COMPLETED">Completado</option>
              <option value="PENDING">Pendente</option>
              <option value="PROCESSING">Processando</option>
              <option value="IN_REVIEW">Em Revisão</option>
              <option value="FAILED">Falhou</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4 animate-slide-in-up animate-stagger-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="p-4 bg-gray-700/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma transação encontrada</h3>
            <p className="text-gray-400">Tente ajustar os filtros ou período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => handleTransactionClick(transaction)}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-200 cursor-pointer hover:border-purple-500/30 w-full overflow-hidden"
              >
                {/* Mobile Layout */}
                <div className="block md:hidden">
                  <div className="flex items-start gap-3 w-full overflow-hidden">
                    <div className="p-2 bg-gray-700/50 rounded-lg flex-shrink-0">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h4 className="font-medium text-white truncate flex-1 min-w-0">
                          {transaction.type === 'DEPOSIT' ? 'Depósito' :
                           transaction.type === 'WITHDRAW' ? 'Saque' : 'Transferência'}
                        </h4>
                        <span className={`font-semibold flex-shrink-0 text-right ${getAmountClass(transaction.type)}`}>
                          {transaction.type === 'WITHDRAW' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border flex-shrink-0 ${getStatusBadge(transaction.status)}`}>
                          {translateStatus(transaction.status)}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-400 text-xs text-right">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </div>
                      </div>
                      {transaction.description && (
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <p className="text-xs text-gray-500 truncate flex-1 min-w-0">
                            {transaction.description}
                          </p>
                          {transaction.status === 'COMPLETED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/payment-confirmation/${transaction.id}`, '_blank');
                              }}
                              className="text-gray-400 hover:text-blue-400 transition-colors flex-shrink-0"
                              title="Ver comprovante"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      {!transaction.description && transaction.status === 'COMPLETED' && (
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/payment-confirmation/${transaction.id}`, '_blank');
                            }}
                            className="text-gray-400 hover:text-blue-400 transition-colors"
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
                  <div className="p-2 bg-gray-700/50 rounded-lg">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">
                      {transaction.type === 'DEPOSIT' ? 'Depósito' :
                       transaction.type === 'WITHDRAW' ? 'Saque' : 'Transferência'}
                    </h4>
                    {transaction.description && (
                      <p className="text-sm text-gray-400 truncate">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-sm border ${getStatusBadge(transaction.status)}`}>
                      {translateStatus(transaction.status)}
                    </span>
                  </div>
                  <div className="text-right min-w-[120px]">
                    <div className={`font-semibold ${getAmountClass(transaction.type)}`}>
                      {transaction.type === 'WITHDRAW' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(transaction.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    {transaction.status === 'COMPLETED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/payment-confirmation/${transaction.id}`, '_blank');
                        }}
                        className="text-gray-400 hover:text-blue-400 transition-colors"
                        title="Ver comprovante"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button or Loading Skeletons */}
        {loadingMore ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <TransactionSkeleton key={`loading-${i}`} />
            ))}
          </div>
        ) : hasMore && transactions.length > 0 ? (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`Carregar mais (${itemsPerPage} transações)`}
            </button>
          </div>
        ) : null}
      </div>

      {/* Transaction Detail Modal */}
      {showModal && selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedTransaction(null);
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
}