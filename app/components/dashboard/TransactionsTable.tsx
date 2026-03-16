import React from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Transaction } from '@/app/types';
import { translateStatus } from '@/app/lib/translations';

interface TransactionsTableProps {
  transactions: Transaction[];
  isAdmin?: boolean;
  isAnimated?: boolean;
  onViewAll?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  isAdmin = false,
  isAnimated = false,
  onViewAll,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Recebido em sua carteira';
      case 'PROCESSING':
        return 'Pago. Liberacao na proxima remessa';
      case 'PENDING':
        return 'Aguardando pagamento';
      case 'IN_REVIEW':
        return 'Contate o suporte';
      case 'FAILED':
        return 'Pagamento cancelado ou nao concluido';
      case 'EXPIRED':
        return 'Tempo limite excedido';
      default:
        return '';
    }
  };

  const getStatusInfo = (status: string) => {
    const label = translateStatus(status);
    const tooltip = getStatusTooltip(status);
    switch (status) {
      case 'COMPLETED':
        return {
          label,
          tooltip,
          color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'PENDING':
        return {
          label,
          tooltip,
          color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'PROCESSING':
        return {
          label,
          tooltip,
          color: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/10',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'IN_REVIEW':
        return {
          label,
          tooltip,
          color: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10',
          icon: <Activity className="w-4 h-4" />,
        };
      case 'FAILED':
        return {
          label,
          tooltip,
          color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10',
          icon: <XCircle className="w-4 h-4" />,
        };
      case 'EXPIRED':
        return {
          label,
          tooltip,
          color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10',
          icon: <Clock className="w-4 h-4" />,
        };
      default:
        return {
          label,
          tooltip,
          color: 'text-[var(--text-muted)] bg-[var(--bg-elevated)]',
          icon: <AlertCircle className="w-4 h-4" />,
        };
    }
  };

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          label: 'Deposito',
          icon: <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />,
          color: 'text-green-600 dark:text-green-400',
        };
      case 'WITHDRAW':
        return {
          label: 'Saque',
          icon: <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />,
          color: 'text-red-600 dark:text-red-400',
        };
      case 'TRANSFER':
        return {
          label: 'Transferencia',
          icon: <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          color: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          label: type,
          icon: <Activity className="w-5 h-5 text-[var(--text-muted)]" />,
          color: 'text-[var(--text-muted)]',
        };
    }
  };

  return (
    <div
      className={`atlas-card overflow-hidden ${isAnimated ? 'animate-slide-up' : ''}`}
      style={{ animationDelay: '600ms' }}
    >
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center">
          <Activity className="mr-2 w-5 h-5" />
          {isAdmin
            ? 'Transacoes Recentes do Sistema'
            : 'Suas Transacoes Recentes'}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-[var(--accent)] hover:opacity-80 transition-colors"
          >
            Ver todas
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="p-12 text-center">
          <Activity className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Nenhuma transacao encontrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Tipo
                </th>
                {isAdmin && (
                  <th className="text-left py-3 px-6 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Usuario
                  </th>
                )}
                <th className="text-left py-3 px-6 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Data/Hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {transactions.map((transaction, index) => {
                const typeInfo = getTransactionTypeInfo(transaction.type);
                const statusInfo = getStatusInfo(transaction.status);

                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-[var(--bg-elevated)] transition-colors ${
                      isAnimated ? 'animate-slide-up' : ''
                    }`}
                    style={{ animationDelay: `${700 + index * 50}ms` }}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {typeInfo.icon}
                        <span className={`font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="py-4 px-6">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {transaction.user?.username ||
                            transaction.userId?.slice(0, 8) ||
                            '-'}
                        </span>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} cursor-help`}
                        title={statusInfo.tooltip}
                      >
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[var(--text-muted)]">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
