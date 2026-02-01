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
        return 'Pago. Liberação na próxima remessa';
      case 'PENDING':
        return 'Aguardando pagamento';
      case 'IN_REVIEW':
        return 'Contate o suporte';
      case 'FAILED':
        return 'Pagamento cancelado ou não concluído';
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
          color: 'text-blue-400 bg-blue-900/50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'PENDING':
        return {
          label,
          tooltip,
          color: 'text-yellow-400 bg-yellow-900/50',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'PROCESSING':
        return {
          label,
          tooltip,
          color: 'text-green-400 bg-green-900/50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'IN_REVIEW':
        return {
          label,
          tooltip,
          color: 'text-purple-400 bg-purple-900/50',
          icon: <Activity className="w-4 h-4" />,
        };
      case 'FAILED':
        return {
          label,
          tooltip,
          color: 'text-red-400 bg-red-900/50',
          icon: <XCircle className="w-4 h-4" />,
        };
      case 'EXPIRED':
        return {
          label,
          tooltip,
          color: 'text-orange-400 bg-orange-900/50',
          icon: <Clock className="w-4 h-4" />,
        };
      default:
        return {
          label,
          tooltip,
          color: 'text-gray-400 bg-gray-700',
          icon: <AlertCircle className="w-4 h-4" />,
        };
    }
  };

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          label: 'Depósito',
          icon: <ArrowDownLeft className="w-5 h-5 text-green-400" />,
          color: 'text-green-400',
        };
      case 'WITHDRAW':
        return {
          label: 'Saque',
          icon: <ArrowUpRight className="w-5 h-5 text-red-400" />,
          color: 'text-red-400',
        };
      case 'TRANSFER':
        return {
          label: 'Transferência',
          icon: <Activity className="w-5 h-5 text-blue-400" />,
          color: 'text-blue-400',
        };
      default:
        return {
          label: type,
          icon: <Activity className="w-5 h-5 text-gray-400" />,
          color: 'text-gray-400',
        };
    }
  };

  return (
    <div
      className={`glass-card ${isAnimated ? 'animate-slide-up' : ''}`}
      style={{ animationDelay: '600ms' }}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Activity className="mr-2" />
          {isAdmin
            ? 'Transações Recentes do Sistema'
            : 'Suas Transações Recentes'}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors btn-pop"
          >
            Ver todas →
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="p-12 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma transação encontrada</p>
          {!isAdmin && (
            <a
              href="/deposit"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors btn-pop"
            >
              Fazer primeiro depósito
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                {isAdmin && (
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Usuário
                  </th>
                )}
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Data/Hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map((transaction, index) => {
                const typeInfo = getTransactionTypeInfo(transaction.type);
                const statusInfo = getStatusInfo(transaction.status);

                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-700/30 transition-colors ${
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
                        <span className="text-sm text-gray-300">
                          {transaction.user?.username ||
                            transaction.userId?.slice(0, 8) ||
                            '-'}
                        </span>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} btn-pop cursor-help`}
                        title={statusInfo.tooltip}
                      >
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-400">
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