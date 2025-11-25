'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Copy,
  XCircle,
  Eye,
  Filter,
  QrCode,
  Wallet
} from 'lucide-react';
import { pixService } from '@/app/lib/services';
import TransactionDetailModal from './TransactionDetailModal';
import { Transaction } from '@/app/types';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Enhanced transaction styling helpers
const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'COMPLETED': 'transaction-status-professional transaction-status-completed',
    'PENDING': 'transaction-status-professional transaction-status-pending',
    'PROCESSING': 'transaction-status-professional transaction-status-processing',
    'FAILED': 'transaction-status-professional transaction-status-failed',
    'EXPIRED': 'transaction-status-professional transaction-status-expired',
    'CANCELLED': 'transaction-status-professional transaction-status-expired'
  };
  return statusMap[status] || 'transaction-status-professional transaction-status-expired';
};

const getAmountClass = (type: string) => {
  const typeMap: Record<string, string> = {
    'DEPOSIT': 'transaction-amount-display transaction-amount-deposit',
    'WITHDRAW': 'transaction-amount-display transaction-amount-withdraw',
    'TRANSFER': 'transaction-amount-display transaction-amount-transfer',
    'PAYMENT': 'transaction-amount-display transaction-amount-payment'
  };
  return typeMap[type] || 'transaction-amount-display transaction-amount-transfer';
};

const getIconContainerClass = (type: string) => {
  const typeMap: Record<string, string> = {
    'DEPOSIT': 'transaction-icon-container transaction-icon-deposit',
    'WITHDRAW': 'transaction-icon-container transaction-icon-withdraw',
    'TRANSFER': 'transaction-icon-container transaction-icon-transfer',
    'PAYMENT': 'transaction-icon-container transaction-icon-payment'
  };
  return typeMap[type] || 'transaction-icon-container transaction-icon-transfer';
};

interface RecentTransactionsSectionProps {
  className?: string;
  onViewMore?: () => void;
  maxTransactions?: number;
}

export default function RecentTransactionsSection({
  className = '',
  onViewMore,
  maxTransactions = 7
}: RecentTransactionsSectionProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'EXPIRED' | 'CANCELLED'>('all');
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRecentTransactions();
  }, []);

  // Reload transactions when filter changes
  useEffect(() => {
    loadRecentTransactions();
  }, [statusFilter]);


  const loadRecentTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build API parameters based on current filter
      const apiParams: any = { limit: maxTransactions };

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        apiParams.status = statusFilter;
      }

      const transactionsData = await pixService.getTransactions(apiParams);
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      setTransactions(transactions.slice(0, maxTransactions));
    } catch (error: any) {
      console.error('Error loading recent transactions:', error);
      setError('Erro ao carregar transações recentes');
      // Set empty array on error so UI doesn't break
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    const numValue = value != null && !isNaN(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'EXPIRED':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluída';
      case 'PENDING':
        return 'Pendente';
      case 'PROCESSING':
        return 'Processando';
      case 'FAILED':
        return 'Falhou';
      case 'EXPIRED':
        return 'Expirou';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'PROCESSING':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'FAILED':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'EXPIRED':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'CANCELLED':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
      case 'WITHDRAW':
        return <ArrowUpRight className="w-5 h-5 text-red-400" />;
      case 'TRANSFER':
        return <RefreshCw className="w-5 h-5 text-blue-400" />;
      case 'PAYMENT':
        return <CreditCard className="w-5 h-5 text-purple-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'Depósito';
      case 'WITHDRAW':
        return 'Saque';
      case 'TRANSFER':
        return 'Transferência';
      case 'PAYMENT':
        return 'Pagamento';
      default:
        return type;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You can add toast notification here if needed
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === updatedTransaction.id
          ? updatedTransaction
          : tx
      )
    );
    setSelectedTransaction(updatedTransaction);
  };

  const toggleTransactionDetails = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  // Using server-side filtering now, so no need for client-side filtering
  const filteredTransactions = transactions;


  if (loading) {
    return (
      <div className={`transaction-table-premium p-6 md:p-8 ${className}`}>
        <div className="flex items-center gap-4 mb-8">
          <div className="transaction-icon-container transaction-icon-transfer animate-pulse">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="transaction-skeleton-premium h-6 w-48 mb-3"></div>
            <div className="transaction-skeleton-premium h-4 w-32"></div>
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`transaction-skeleton-premium h-20 transaction-animate-slide-in transaction-animate-stagger-${i}`}>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`transaction-table-premium p-6 md:p-8 ${className}`}>
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="transaction-icon-container transaction-icon-transfer p-3">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="transaction-heading-primary text-xl">
              Transações Recentes
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <p className="transaction-text-caption">
                {filteredTransactions.length} de {transactions.length} transações
              </p>
              {transactions.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="transaction-text-caption text-green-400">Em tempo real</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Enhanced Quick Filters */}
          <div className="transaction-filter-premium p-3 mb-0">
            <div className="flex items-center gap-3">
              <div className="transaction-icon-container transaction-icon-transfer p-2 w-8 h-8">
                <Filter className="w-4 h-4 text-blue-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="transaction-filter-select text-sm min-w-40"
                aria-label="Filtrar transações por status"
              >
                <option value="all">📊 Todos os Status</option>
                <option value="COMPLETED">✅ Concluídas</option>
                <option value="PENDING">⏳ Pendentes</option>
                <option value="PROCESSING">🔄 Processando</option>
                <option value="FAILED">❌ Falharam</option>
                <option value="EXPIRED">⏰ Expiradas</option>
                <option value="CANCELLED">🚫 Canceladas</option>
              </select>
              <button
                onClick={loadRecentTransactions}
                className="transaction-action-btn bg-blue-600/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40 hover:text-blue-300 p-2"
                aria-label="Atualizar transações"
                title="Atualizar transações"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {transactions.length > 0 && (
            <button
              onClick={() => router.push('/transactions')}
              className="btn-commerce-premium flex items-center gap-2 px-6 py-3 transaction-focus-visible"
              aria-label="Ver todas as transações"
            >
              <span className="font-medium">Ver Todas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="transaction-icon-container transaction-icon-withdraw mx-auto mb-6 w-16 h-16">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h4 className="transaction-heading-secondary mb-3">
            Erro ao Carregar Transações
          </h4>
          <p className="transaction-text-body mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadRecentTransactions}
            className="btn-commerce-premium transaction-focus-visible"
            aria-label="Tentar carregar transações novamente"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Enhanced Empty State */}
      {!error && transactions.length === 0 && (
        <div className="text-center py-16">
          <div className="transaction-icon-container transaction-icon-transfer mx-auto mb-6 w-20 h-20">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h4 className="transaction-heading-secondary mb-3">
            Nenhuma Transação Recente
          </h4>
          <p className="transaction-text-body max-w-sm mx-auto">
            Suas transações aparecerão aqui quando você começar a usar o sistema
          </p>
        </div>
      )}

      {/* Enhanced Transactions List */}
      {!error && filteredTransactions.length > 0 && (
        <>
          {/* Enhanced Mobile View - Premium Cards */}
          <div className="space-y-4 lg:hidden">
            {filteredTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className={`transaction-mobile-card transaction-animate-slide-in transaction-animate-stagger-${(index % 5) + 1} transaction-focus-visible`}
                onClick={() => handleViewDetails(transaction)}
                tabIndex={0}
                role="button"
                aria-label={`Ver detalhes da transação ${getTransactionLabel(transaction.type)} de ${formatCurrency(transaction.amount)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewDetails(transaction);
                  }
                }}
              >
                {/* Enhanced Mobile Transaction Card */}
                <div className="flex items-center gap-4">
                  <div className={getIconContainerClass(transaction.type)}>
                    {getTransactionIcon(transaction.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="transaction-heading-secondary text-sm font-semibold truncate">
                        {transaction.description || getTransactionLabel(transaction.type)}
                      </h4>
                      <div className={`${getAmountClass(transaction.type)} text-base font-bold`}>
                        {transaction.type === 'WITHDRAW' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={getStatusClass(transaction.status)}>
                        {getStatusIcon(transaction.status)}
                        {getStatusText(transaction.status)}
                      </span>
                      <div className="transaction-text-caption">
                        {formatDateTime(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Enhanced Desktop View - Premium Table */}
          <div className="hidden lg:block">
            <div className="transaction-table-premium overflow-hidden">
              {/* Enhanced Table Header */}
              <div className="transaction-table-header">
                <div className="grid grid-cols-12 gap-4 px-6 py-4">
                  <div className="col-span-2 transaction-text-caption uppercase tracking-wider">Tipo</div>
                  <div className="col-span-2 transaction-text-caption uppercase tracking-wider">Data/Hora</div>
                  <div className="col-span-2 transaction-text-caption uppercase tracking-wider">Status</div>
                  <div className="col-span-2 transaction-text-caption uppercase tracking-wider">Valor</div>
                  <div className="col-span-3 transaction-text-caption uppercase tracking-wider">Descrição</div>
                  <div className="col-span-1 transaction-text-caption uppercase tracking-wider">Ações</div>
                </div>
              </div>

              {/* Enhanced Table Body */}
              <div className="divide-y divide-white/5">
                {filteredTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className={`transaction-table-row transaction-animate-slide-in transaction-animate-stagger-${(index % 5) + 1} transaction-focus-visible grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer`}
                    onClick={() => handleViewDetails(transaction)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalhes da transação ${getTransactionLabel(transaction.type)}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewDetails(transaction);
                      }
                    }}
                  >
                    {/* Enhanced Type Column */}
                    <div className="col-span-2 flex items-center gap-3">
                      <div className={getIconContainerClass(transaction.type)}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <span className="transaction-text-body font-medium">
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </div>

                    {/* Enhanced Date/Time Column */}
                    <div className="col-span-2 transaction-text-body">
                      {formatDateTime(transaction.createdAt)}
                    </div>

                    {/* Enhanced Status Column */}
                    <div className="col-span-2">
                      <span className={getStatusClass(transaction.status)}>
                        {getStatusIcon(transaction.status)}
                        {getStatusText(transaction.status)}
                      </span>
                    </div>

                    {/* Enhanced Value Column */}
                    <div className="col-span-2">
                      <div className={`${getAmountClass(transaction.type)} text-base font-bold`}>
                        {transaction.type === 'WITHDRAW' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>

                    {/* Enhanced Description Column */}
                    <div className="col-span-3 transaction-text-body truncate">
                      {transaction.description || '-'}
                    </div>

                    {/* Enhanced Actions Column */}
                    <div className="col-span-1 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(transaction);
                        }}
                        className="transaction-action-btn p-2 transaction-focus-visible"
                        aria-label="Ver detalhes da transação"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {transaction.status === 'PENDING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadRecentTransactions();
                          }}
                          className="transaction-action-btn bg-gradient-to-r from-yellow-600/10 to-amber-600/05 border-yellow-500/20 text-yellow-400 hover:border-yellow-500/40 hover:text-yellow-300 p-2 transaction-focus-visible"
                          aria-label="Verificar status da transação"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Empty State for Filtered Results */}
      {!error && transactions.length > 0 && filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="transaction-icon-container transaction-icon-transfer mx-auto mb-6 w-16 h-16">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="transaction-heading-secondary mb-3">
            Nenhuma transação encontrada
          </h4>
          <p className="transaction-text-body mb-6 max-w-md mx-auto">
            Nenhuma transação corresponde aos filtros selecionados
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
            }}
            className="btn-commerce-premium transaction-focus-visible"
            aria-label="Limpar todos os filtros"
          >
            <Filter className="w-4 h-4" />
            <span>Limpar Filtros</span>
          </button>
        </div>
      )}

      {/* Enhanced Mobile-optimized footer with summary */}
      {transactions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="transaction-card-premium p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="transaction-icon-container transaction-icon-transfer p-2 w-8 h-8">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="transaction-text-body font-medium text-green-400">Atualizado em tempo real</div>
                  <div className="transaction-text-caption">Última atualização: {new Date().toLocaleTimeString('pt-BR')}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center">
                  <div className="transaction-heading-secondary text-base font-bold text-green-400">
                    {transactions.filter(t => t.status === 'COMPLETED').length}
                  </div>
                  <div className="transaction-text-caption">Concluídas</div>
                </div>
                {transactions.filter(t => t.status === 'PENDING').length > 0 && (
                  <div className="text-center">
                    <div className="transaction-heading-secondary text-base font-bold text-yellow-400">
                      {transactions.filter(t => t.status === 'PENDING').length}
                    </div>
                    <div className="transaction-text-caption">Pendentes</div>
                  </div>
                )}
                {transactions.filter(t => t.status === 'FAILED').length > 0 && (
                  <div className="text-center">
                    <div className="transaction-heading-secondary text-base font-bold text-red-400">
                      {transactions.filter(t => t.status === 'FAILED').length}
                    </div>
                    <div className="transaction-text-caption">Falharam</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showModal}
        onClose={handleCloseModal}
        onTransactionUpdate={handleTransactionUpdate}
        isAdmin={false}
      />
    </div>
  );
}