'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Eye,
  TrendingUp,
  Loader
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  description?: string;
  externalId?: string;
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentTransactions();
  }, []);

  const loadRecentTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/transactions?limit=10&orderBy=createdAt&order=desc');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      // Set empty array on error to avoid UI issues
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const numValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}min atrás`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400 bg-green-400/10';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'FAILED':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluída';
      case 'PENDING':
        return 'Pendente';
      case 'FAILED':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Transações Recentes
            </h3>
            <p className="text-sm text-gray-400">
              Carregando atividade recente...
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-premium p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Transações Recentes
            </h3>
            <p className="text-sm text-gray-400">
              Últimas {transactions.length} atividades
            </p>
          </div>
        </div>

        <a
          href="/transactions"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          Ver mais
        </a>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma transação recente</p>
          <p className="text-sm text-gray-500 mt-1">
            Suas transações aparecerão aqui quando realizadas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              {/* Transaction Type Icon */}
              <div className={`p-2 rounded-lg ${
                transaction.type === 'DEPOSIT'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {transaction.type === 'DEPOSIT' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium truncate">
                    {transaction.type === 'DEPOSIT' ? 'Depósito' : 'Saque'}
                  </p>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
              </div>

              {/* Transaction Amount */}
              <div className="text-right">
                <p className={`font-semibold font-mono ${
                  transaction.type === 'DEPOSIT'
                    ? 'text-green-400'
                    : 'text-orange-400'
                }`}>
                  {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer with action */}
      {transactions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <a
            href="/transactions"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-blue-400 rounded-lg transition-all duration-200 font-medium"
          >
            <Eye className="w-4 h-4" />
            Ver todas as transações
          </a>
        </div>
      )}
    </div>
  );
}