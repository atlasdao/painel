'use client';

import { useState, useEffect } from 'react';
import { X, Loader, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { collateralService } from '@/app/lib/services';

interface CollateralHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CollateralTransaction {
  id: string;
  type: 'DEPOSIT_PIX' | 'DEPOSIT_DEPIX' | 'WITHDRAWAL';
  status: string;
  amount: number;
  actualAmount?: number;
  fee?: number;
  previousBalance: number;
  newBalance: number;
  liquidAddress?: string;
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

type FilterType = 'all' | 'deposits' | 'withdrawals';

export default function CollateralHistoryModal({
  isOpen,
  onClose,
}: CollateralHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CollateralTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [total, setTotal] = useState(0);

  // Load transactions
  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen, filter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const typeMap: Record<FilterType, string | undefined> = {
        all: undefined,
        deposits: 'DEPOSIT_PIX,DEPOSIT_DEPIX',
        withdrawals: 'WITHDRAWAL',
      };

      const response = await collateralService.getHistory({
        type: typeMap[filter] as any,
        limit: 50,
      });

      setTransactions(response.transactions);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      COMPLETED: {
        color: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
        text: 'Concluido',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      PENDING: {
        color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
        text: 'Pendente',
        icon: <Clock className="w-3 h-3" />,
      },
      POLLING: {
        color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
        text: 'Aguardando',
        icon: <Loader className="w-3 h-3 animate-spin" />,
      },
      AWAITING_APPROVAL: {
        color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30',
        text: 'Em Analise',
        icon: <Clock className="w-3 h-3" />,
      },
      APPROVED: {
        color: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30',
        text: 'Aprovado',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      PROCESSING: {
        color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
        text: 'Processando',
        icon: <Loader className="w-3 h-3 animate-spin" />,
      },
      REJECTED: {
        color: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
        text: 'Rejeitado',
        icon: <XCircle className="w-3 h-3" />,
      },
      FAILED: {
        color: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
        text: 'Falhou',
        icon: <XCircle className="w-3 h-3" />,
      },
      EXPIRED: {
        color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30',
        text: 'Expirado',
        icon: <AlertCircle className="w-3 h-3" />,
      },
      CANCELLED: {
        color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30',
        text: 'Cancelado',
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const badge = badges[status] || badges.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const getTypeInfo = (type: string) => {
    const types: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      DEPOSIT_PIX: {
        icon: <ArrowUpCircle className="w-5 h-5" />,
        label: 'Deposito PIX',
        color: 'text-cyan-600 dark:text-cyan-400',
      },
      DEPOSIT_DEPIX: {
        icon: <ArrowUpCircle className="w-5 h-5" />,
        label: 'Deposito Depix',
        color: 'text-purple-600 dark:text-purple-400',
      },
      WITHDRAWAL: {
        icon: <ArrowDownCircle className="w-5 h-5" />,
        label: 'Saque',
        color: 'text-orange-600 dark:text-orange-400',
      },
    };

    return types[type] || types.DEPOSIT_PIX;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl animate-fadeIn overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Historico de Colateral</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 border-b border-[var(--border-default)]">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-cyan-100 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('deposits')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'deposits'
                ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            Depositos
          </button>
          <button
            onClick={() => setFilter('withdrawals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'withdrawals'
                ? 'bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            Saques
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)]">Nenhuma transacao encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions
                .filter((tx) => {
                  // Client-side filtering to ensure correct display
                  if (filter === 'deposits') {
                    return tx.type === 'DEPOSIT_PIX' || tx.type === 'DEPOSIT_DEPIX';
                  }
                  if (filter === 'withdrawals') {
                    return tx.type === 'WITHDRAWAL';
                  }
                  return true; // 'all' shows everything
                })
                .map((tx) => {
                const typeInfo = getTypeInfo(tx.type);
                const isDeposit = tx.type.startsWith('DEPOSIT');
                const displayAmount = tx.actualAmount || tx.amount;

                return (
                  <div
                    key={tx.id}
                    className="p-4 bg-[var(--bg-secondary)]/30 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-hover)]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-[var(--bg-card)] ${typeInfo.color}`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <p className="text-[var(--text-primary)] font-medium">{typeInfo.label}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {formatDate(tx.createdAt)}
                          </p>
                          {tx.adminNotes && tx.status === 'REJECTED' && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Motivo: {tx.adminNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${isDeposit ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {isDeposit ? '+' : '-'} R$ {displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    </div>

                    {/* Balance change */}
                    <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">
                        Saldo: R$ {tx.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {' '}&rarr;{' '}
                        <span className="text-[var(--text-muted)]">
                          R$ {tx.newBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                      {tx.fee && tx.fee > 0 && (
                        <span className="text-[var(--text-muted)]">
                          Taxa: R$ {tx.fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && transactions.length > 0 && (
          <div className="p-4 border-t border-[var(--border-default)]">
            <p className="text-center text-xs text-[var(--text-muted)]">
              Mostrando {transactions.length} de {total} transacoes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
