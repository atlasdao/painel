'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/app/lib/auth';
import { adminService, pixService } from '@/app/lib/services';
import { DashboardStats, Transaction, Balance, User } from '@/app/types';
import { isAdmin } from '@/app/types/user-role';
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wallet,
  PiggyBank,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus, getStatusColor } from '@/app/lib/translations';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      if (isAdmin(currentUser?.role)) {
        // Dashboard do Admin
        const [statsData, transactionsData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getAllTransactions({ limit: 10 }),
        ]);
        setStats(statsData);
        setRecentTransactions(transactionsData);
      } else {
        // Dashboard do Usuário
        const [balanceData, transactionsData] = await Promise.all([
          pixService.getBalance(),
          pixService.getTransactions({ limit: 10 }),
        ]);
        setBalance(balanceData);
        setRecentTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    });
  };

  const getStatusInfo = (status: string) => {
    const label = translateStatus(status);
    
    switch (status) {
      case 'COMPLETED':
        return {
          label,
          color: 'text-green-400 bg-green-900/50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'PENDING':
        return {
          label,
          color: 'text-yellow-400 bg-yellow-900/50',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'PROCESSING':
        return {
          label,
          color: 'text-blue-400 bg-blue-900/50',
          icon: <Activity className="w-4 h-4" />,
        };
      case 'FAILED':
        return {
          label,
          color: 'text-red-400 bg-red-900/50',
          icon: <XCircle className="w-4 h-4" />,
        };
      case 'EXPIRED':
        return {
          label,
          color: 'text-orange-400 bg-orange-900/50',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'CANCELLED':
        return {
          label,
          color: 'text-gray-400 bg-gray-700',
          icon: <XCircle className="w-4 h-4" />,
        };
      default:
        return {
          label,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdminUser = isAdmin(user?.role);

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {new Date().getHours() < 12 ? 'Bom dia' : 
             new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, {user?.username}!
          </h1>
          <p className="text-gray-400 mt-2">
            {isAdminUser 
              ? 'Painel de Administração - Visão geral do sistema' 
              : 'Seu painel financeiro pessoal'}
          </p>
        </div>
        <button
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Quick Actions */}
      {!isAdminUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <a
            href="/deposit"
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg p-6 text-white transition-all transform hover:scale-105"
          >
            <ArrowDownLeft className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold">Fazer Depósito</h3>
            <p className="text-sm opacity-90 mt-1">Adicione fundos à sua conta</p>
          </a>
          
          <a
            href="/transactions"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-6 text-white transition-all transform hover:scale-105"
          >
            <Activity className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold">Ver Transações</h3>
            <p className="text-sm opacity-90 mt-1">Histórico completo</p>
          </a>
          
          <a
            href="/settings"
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg p-6 text-white transition-all transform hover:scale-105"
          >
            <Wallet className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold">Configurações</h3>
            <p className="text-sm opacity-90 mt-1">Gerencie sua conta</p>
          </a>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isAdminUser ? (
          // Admin Stats
          <>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total de Usuários</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.totalUsers || 0}
                  </p>
                  <p className="text-xs text-green-400 mt-2">
                    +{stats?.activeUsers || 0} ativos
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transações Hoje</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.todayTransactions || 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Total: {stats?.totalTransactions || 0}
                  </p>
                </div>
                <div className="w-14 h-14 bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Volume Total</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(stats?.totalVolume || 0)}
                  </p>
                  <p className="text-xs text-green-400 mt-2">
                    +{formatCurrency(stats?.todayVolume || 0)} hoje
                  </p>
                </div>
                <div className="w-14 h-14 bg-green-900/30 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.successRate || 95}%
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {stats?.failedTransactions || 0} falhas
                  </p>
                </div>
                <div className="w-14 h-14 bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
            </div>
          </>
        ) : (
          // User Stats
          <>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Saldo Disponível</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(balance?.available || 0)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Em Processamento</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(balance?.pending || 0)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-7 h-7 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Movimentado</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(balance?.total || 0)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <PiggyBank className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transações</p>
                  <p className="text-3xl font-bold text-white">
                    {recentTransactions.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {recentTransactions.filter(t => t.status === 'PENDING').length} pendentes
                  </p>
                </div>
                <div className="w-14 h-14 bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="mr-2" />
            {isAdminUser ? 'Transações Recentes do Sistema' : 'Suas Transações Recentes'}
          </h2>
          <a
            href="/transactions"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver todas →
          </a>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma transação encontrada</p>
            {!isAdminUser && (
              <a
                href="/deposit"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    ID
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  {isAdminUser && (
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
                {recentTransactions.map((transaction) => {
                  const typeInfo = getTransactionTypeInfo(transaction.type);
                  const statusInfo = getStatusInfo(transaction.status);
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-xs text-gray-400 font-mono">
                          {transaction.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          {typeInfo.icon}
                          <span className={`ml-2 font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                      </td>
                      {isAdminUser && (
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-300">
                            {transaction.user?.username || transaction.userId?.slice(0, 8) || '-'}
                          </span>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
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

      {/* Additional Info for Admin */}
      {isAdminUser && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="mr-2" />
              Métricas de Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transações Pendentes</span>
                <span className="text-yellow-400 font-semibold">{stats.pendingTransactions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transações Concluídas</span>
                <span className="text-green-400 font-semibold">{stats.completedTransactions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Transações Falhadas</span>
                <span className="text-red-400 font-semibold">{stats.failedTransactions || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Users className="mr-2" />
              Estatísticas de Usuários
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Usuários Ativos</span>
                <span className="text-green-400 font-semibold">{stats.activeUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Novos Hoje</span>
                <span className="text-blue-400 font-semibold">{stats.newUsersToday || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Taxa de Retenção</span>
                <span className="text-purple-400 font-semibold">{stats.retentionRate || 85}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}