'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import { adminService, pixService } from '@/app/lib/services';
import { DashboardStats, Transaction, Balance, User } from '@/app/types';
import { isAdmin } from '@/app/types/user-role';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  DollarSign,
  Activity,
  CreditCard,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  Award,
  ChevronRight,
  ChevronLeft,
  PiggyBank,
  AlertCircle,
  Store,
  FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatBuyerName } from '@/app/lib/format-buyer-name';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Fun loading messages that rotate
  const loadingMessages = [
    "Contando suas moedas digitais...",
    "Aquecendo os servidores...",
    "Preparando sua experiência incrível...",
    "Quase lá, só mais um segundo...",
    "Organizando seus pixels financeiros..."
  ];
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getPersonalizedGreeting = (username?: string) => {
    const hour = new Date().getHours();
    const name = username?.split(' ')[0] || 'Explorador';

    // Fixed time-based greetings
    if (hour >= 5 && hour < 12) {
      return `Bom dia, ${name}!`;
    } else if (hour >= 12 && hour < 18) {
      return `Boa tarde, ${name}!`;
    } else {
      return `Boa noite, ${name}!`;
    }
  };

  const animateBalance = (targetBalance: number) => {
    let current = 0;
    const increment = targetBalance / 30;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetBalance) {
        current = targetBalance;
        clearInterval(timer);
      }
      setAnimatedBalance(current);
    }, 30);
  };

  const forceRefreshUserCache = async () => {
    console.log('🧹 Dashboard: Forcing user cache refresh...');
    // Force auth service to fetch fresh user data
    await authService.refreshUserDataInBackground();
  };

  // Load transactions with pagination
  const loadTransactionsPage = async (page: number, isAdminUser: boolean) => {
    setLoadingTransactions(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;

      if (isAdminUser) {
        // First get total count by fetching a large batch
        const allTransactions = await adminService.getAllTransactions({ limit: 1000 });
        setTotalTransactions(allTransactions?.length || 0);

        // Then get paginated results
        const transactionsData = await adminService.getAllTransactions({
          limit: ITEMS_PER_PAGE,
          offset
        });
        setRecentTransactions(transactionsData || []);
      } else {
        // First get total count
        const allTransactions = await pixService.getTransactions({ limit: 1000 });
        setTotalTransactions(allTransactions?.length || 0);

        // Then get paginated results
        const transactionsData = await pixService.getTransactions({
          limit: ITEMS_PER_PAGE,
          offset
        });
        setRecentTransactions(transactionsData || []);
      }

      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading transactions page:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadDashboardData = async (isRefresh = false) => {
    console.log('🚀 Dashboard: Starting loadDashboardData, isRefresh:', isRefresh);
    if (isRefresh) {
      setRefreshing(true);
      // Force cache refresh when manually refreshing
      await forceRefreshUserCache();
    } else {
      setLoading(true);
    }

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('⏰ Dashboard: Loading timeout - forcing loading to false');
      setLoading(false);
      setRefreshing(false);
      toast.error('Tempo limite excedido ao carregar o dashboard');
    }, 15000); // 15 second timeout for refresh

    try {
      console.log('📡 Dashboard: Fetching current user...');
      const currentUser = await authService.getCurrentUser();
      console.log('✅ Dashboard: Current user:', currentUser);

      if (!currentUser) {
        console.error('❌ Dashboard: No user returned from authService');
        throw new Error('Usuário não encontrado');
      }

      setUser(currentUser);
      setGreeting(getPersonalizedGreeting(currentUser?.username));
      console.log('🔍 Dashboard: User commerceMode status:', {
        username: currentUser?.username,
        commerceMode: currentUser?.commerceMode,
        isAdmin: isAdmin(currentUser?.role)
      });

      if (isAdmin(currentUser?.role)) {
        console.log('👨‍💼 Dashboard: Loading admin dashboard...');
        // Admin Dashboard - force fresh data on refresh
        const [statsData, allTransactionsData, transactionsData] = await Promise.all([
          adminService.getDashboardStats().catch(err => {
            console.error('❌ Dashboard: Error loading stats:', err);
            return null;
          }),
          adminService.getAllTransactions({ limit: 1000 }).catch(err => {
            console.error('❌ Dashboard: Error loading all transactions for count:', err);
            return [];
          }),
          adminService.getAllTransactions({ limit: ITEMS_PER_PAGE }).catch(err => {
            console.error('❌ Dashboard: Error loading transactions:', err);
            return [];
          }),
        ]);
        console.log('✅ Dashboard: Admin data loaded:', { statsData, transactionsData });
        setStats(statsData);
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
        setCurrentPage(1);
      } else {
        console.log('👤 Dashboard: Loading user dashboard...');
        // User Dashboard - force fresh data on refresh
        const [balanceData, allTransactionsData, transactionsData] = await Promise.all([
          pixService.getBalance().catch(err => {
            console.error('❌ Dashboard: Error loading balance:', err);
            return { available: 0, pending: 0, total: 0 };
          }),
          pixService.getTransactions({ limit: 1000 }).catch(err => {
            console.error('❌ Dashboard: Error loading all transactions for count:', err);
            return [];
          }),
          pixService.getTransactions({ limit: ITEMS_PER_PAGE }).catch(err => {
            console.error('❌ Dashboard: Error loading transactions:', err);
            return [];
          }),
        ]);
        console.log('✅ Dashboard: User data loaded:', { balanceData, transactionsData });
        setBalance(balanceData);
        if (isRefresh) {
          // Animate balance change on refresh
          animateBalance(balanceData?.available || 0);
        } else {
          animateBalance(balanceData?.available || 0);
        }
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
        setCurrentPage(1);
      }

      clearTimeout(timeoutId);
      console.log('✅ Dashboard: Data loaded successfully, setting loading to false');

      // For refresh, show success message and don't delay loading state
      if (isRefresh) {
        toast.success('Dashboard atualizado com sucesso!');
      } else {
        setTimeout(() => {
          setLoading(false);
          setShowWelcome(true);
        }, 1000);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Dashboard: Error loading dashboard data:', error);

      if (isRefresh) {
        toast.error('Erro ao atualizar dashboard: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      } else {
        toast.error('Erro ao carregar dados do dashboard');
      }
      setLoading(false);
    } finally {
      setRefreshing(false);
      console.log('🏁 Dashboard: loadDashboardData completed');
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
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'PENDING':
        return {
          label,
          color: 'text-yellow-400 bg-yellow-900/50',
          icon: <Clock className="w-4 h-4" />
        };
      case 'PROCESSING':
        return {
          label,
          color: 'text-blue-400 bg-blue-900/50',
          icon: <Activity className="w-4 h-4" />
        };
      case 'FAILED':
        return {
          label,
          color: 'text-red-400 bg-red-900/50',
          icon: <XCircle className="w-4 h-4" />
        };
      case 'EXPIRED':
        return {
          label,
          color: 'text-orange-400 bg-orange-900/50',
          icon: <Clock className="w-4 h-4" />
        };
      default:
        return {
          label,
          color: 'text-gray-400 bg-gray-700',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          label: 'Depósito',
          icon: <ArrowDownLeft className="w-5 h-5 text-green-400" />,
          color: 'text-green-400'
        };
      case 'WITHDRAW':
        return {
          label: 'Saque',
          icon: <ArrowUpRight className="w-5 h-5 text-red-400" />,
          color: 'text-red-400'
        };
      case 'TRANSFER':
        return {
          label: 'Transferência',
          icon: <Activity className="w-5 h-5 text-blue-400" />,
          color: 'text-blue-400'
        };
      default:
        return {
          label: type,
          icon: <Activity className="w-5 h-5 text-gray-400" />,
          color: 'text-gray-400'
        };
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const isAdminUser = isAdmin(user?.role);

  const quickActions = [
    {
      title: 'Fazer Depósito',
      icon: ArrowDownLeft,
      href: '/deposit',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      title: 'Ver Transações',
      icon: Activity,
      href: '/transactions',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      title: 'Configurações',
      icon: Zap,
      href: '/settings',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />

      {/* Animated Welcome Header */}
      <div className={`mb-8 flex justify-between items-center ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}>
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            {greeting}
            {animatedBalance > 10000 && (
              <Award className="w-8 h-8 text-yellow-500 animate-float" />
            )}
          </h1>
          <p className="text-gray-400 mt-2">
            {isAdminUser
              ? 'Painel de Administração - Visão geral do sistema'
              : 'Seu painel financeiro pessoal está pronto!'}
          </p>
        </div>
        <button
          onClick={async () => {
            console.log('🔄 Dashboard: Manual refresh triggered');
            await loadDashboardData(true);
          }}
          disabled={refreshing}
          className="btn-pop bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Commerce Mode Warning */}
      {!isAdminUser && user && user.commerceMode !== true && (
        <div className={`mb-8 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-6 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                Modo Comércio Desativado
              </h3>
              <p className="text-yellow-200/80 mb-4">
                Você precisa habilitar o Modo Comércio para ter acesso completo a todas as funcionalidades do painel, incluindo recebimento de múltiplos CPF/CNPJ, Links de Pagamento, geração de pagamentos especiais, API, webhooks, etc.
              </p>
              <a
                href="/commerce"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 btn-pop"
              >
                <Store className="w-4 h-4" />
                <span>Habilitar Modo Comércio</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isAdminUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <a
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-r ${action.color} ${action.hoverColor} rounded-lg p-6 text-white transition-all transform hover:scale-105 btn-pop ${
                showWelcome ? 'animate-bounce-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <action.icon className="w-8 h-8 mb-3" />
                  <h3 className="text-lg font-semibold">{action.title}</h3>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isAdminUser ? (
          <>
            {/* Admin Stats */}
            <div className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total de Usuários</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.totalUsers || 0}
                  </p>
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats?.activeUsers || 0} ativos
                  </p>
                </div>
                <div className={`w-14 h-14 bg-blue-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 0 ? 'animate-float' : ''}`}>
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>

            <div className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
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
                <div className={`w-14 h-14 bg-purple-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 1 ? 'animate-float' : ''}`}>
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </div>

            <div className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
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
                <div className={`w-14 h-14 bg-green-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 2 ? 'animate-float' : ''}`}>
                  <DollarSign className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </div>

            <div className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '500ms' }}>
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
                <div className={`w-14 h-14 bg-emerald-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 3 ? 'animate-float' : ''}`}>
                  <Target className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* User Stats */}
            <div
              className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '200ms' }}
              onMouseEnter={() => setHoveredCard(0)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Saldo Disponível</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(animatedBalance)}
                  </p>
                  {animatedBalance === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Faça seu primeiro depósito!
                    </p>
                  )}
                </div>
                <div className={`w-14 h-14 bg-green-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 0 ? 'animate-float' : ''}`}>
                  <Wallet className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </div>

            <div
              className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '300ms' }}
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Em Processamento</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(balance?.pending || 0)}
                  </p>
                </div>
                <div className={`w-14 h-14 bg-yellow-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 1 ? 'animate-pulse' : ''}`}>
                  <Clock className="w-7 h-7 text-yellow-400" />
                </div>
              </div>
            </div>

            <div
              className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '400ms' }}
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Movimentado</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(balance?.total || 0)}
                  </p>
                </div>
                <div className={`w-14 h-14 bg-blue-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 2 ? 'animate-float' : ''}`}>
                  <PiggyBank className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>

            <div
              className={`stat-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '500ms' }}
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
            >
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
                <div className={`w-14 h-14 bg-purple-900/30 rounded-lg flex items-center justify-center ${hoveredCard === 3 ? 'animate-float' : ''}`}>
                  <Activity className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className={`glass-card relative ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center">
            <Activity className="mr-2 w-5 h-5 md:w-6 md:h-6" />
            <span className="hidden sm:inline">{isAdminUser ? 'Transações Recentes do Sistema' : 'Suas Transações Recentes'}</span>
            <span className="sm:hidden">Transações</span>
          </h2>
          <a
            href="/transactions"
            className="text-xs md:text-sm text-blue-400 hover:text-blue-300 transition-colors btn-pop"
          >
            Ver todas →
          </a>
        </div>

        {/* Loading overlay for pagination */}
        {loadingTransactions && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-gray-300 text-sm">Carregando...</span>
            </div>
          </div>
        )}

        {recentTransactions.length === 0 && !loadingTransactions ? (
          <div className="p-8 md:p-12 text-center">
            <Activity className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm md:text-base">Nenhuma transação encontrada</p>
            {!isAdminUser && (
              <a
                href="/deposit"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors btn-pop text-sm md:text-base"
              >
                Fazer primeiro depósito
              </a>
            )}
          </div>
        ) : recentTransactions.length > 0 ? (
          <>
            {/* Mobile View - Cards */}
            <div className="block md:hidden divide-y divide-gray-700">
              {recentTransactions.map((transaction, index) => {
                const typeInfo = getTransactionTypeInfo(transaction.type);
                const statusInfo = getStatusInfo(transaction.status);

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 hover:bg-gray-700/30 transition-colors ${
                      showWelcome ? 'animate-slide-up' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${700 + index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={typeInfo.color}>
                          {typeInfo.icon}
                        </div>
                        {transaction.status === 'COMPLETED' && (
                          <button
                            onClick={() => window.open(`/payment-confirmation/${transaction.id}`, '_blank')}
                            className="text-gray-400 hover:text-blue-400 transition-colors"
                            title="Ver comprovante"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Valor:</span>
                        <span className="text-base font-bold text-white">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      {isAdminUser && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Usuário:</span>
                          <span className="text-sm text-gray-300">
                            {transaction.user?.username || transaction.userId?.slice(0, 8) || '-'}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Cliente:</span>
                        <span className="text-sm text-gray-300 truncate ml-2 max-w-[180px]">
                          {formatBuyerName(transaction.buyerName)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-gray-700">
                        <span className="text-xs text-gray-400">Data:</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    {isAdminUser && (
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Usuário
                      </th>
                    )}
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Comprovante
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentTransactions.map((transaction, index) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    const statusInfo = getStatusInfo(transaction.status);

                    return (
                      <tr
                        key={transaction.id}
                        className={`hover:bg-gray-700/30 transition-colors ${
                          showWelcome ? 'animate-slide-up' : 'opacity-0'
                        }`}
                        style={{ animationDelay: `${700 + index * 50}ms` }}
                      >
                        <td className="py-4 px-6">
                          <div className={`flex items-center ${typeInfo.color}`}>
                            {typeInfo.icon}
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
                          <span className="text-sm text-gray-300">
                            {formatBuyerName(transaction.buyerName)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} btn-pop`}>
                            {statusInfo.icon}
                            <span className="ml-1">{statusInfo.label}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-400">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {transaction.status === 'COMPLETED' ? (
                            <button
                              onClick={() => window.open(`/payment-confirmation/${transaction.id}`, '_blank')}
                              className="text-gray-400 hover:text-blue-400 transition-colors btn-pop"
                              title="Ver comprovante"
                            >
                              <FileText className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalTransactions > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-700 gap-4">
                <div className="text-sm text-gray-400">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalTransactions)} de {totalTransactions} transações
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTransactionsPage(currentPage - 1, isAdminUser)}
                    disabled={currentPage === 1 || loadingTransactions}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalTransactions / ITEMS_PER_PAGE)) }, (_, i) => {
                      const totalPages = Math.ceil(totalTransactions / ITEMS_PER_PAGE);
                      let pageNum;

                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadTransactionsPage(pageNum, isAdminUser)}
                          disabled={loadingTransactions}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          } disabled:opacity-50`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => loadTransactionsPage(currentPage + 1, isAdminUser)}
                    disabled={currentPage >= Math.ceil(totalTransactions / ITEMS_PER_PAGE) || loadingTransactions}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Mobile Pagination Controls */}
        {recentTransactions.length > 0 && totalTransactions > ITEMS_PER_PAGE && (
          <div className="block md:hidden p-4 border-t border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-gray-400 text-center">
                Página {currentPage} de {Math.ceil(totalTransactions / ITEMS_PER_PAGE)} ({totalTransactions} transações)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadTransactionsPage(currentPage - 1, isAdminUser)}
                  disabled={currentPage === 1 || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                  {currentPage}
                </span>
                <button
                  onClick={() => loadTransactionsPage(currentPage + 1, isAdminUser)}
                  disabled={currentPage >= Math.ceil(totalTransactions / ITEMS_PER_PAGE) || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Additional Info */}
      {isAdminUser && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className={`glass-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '800ms' }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                Métricas de Performance
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Transações Pendentes</span>
                    <span className="text-xl font-bold text-yellow-400">{stats.pendingTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.pendingTransactions || 0) * 10, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Transações Concluídas</span>
                    <span className="text-xl font-bold text-green-400">{stats.completedTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.completedTransactions || 0) / 2, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Transações Falhadas</span>
                    <span className="text-xl font-bold text-red-400">{stats.failedTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.failedTransactions || 0) * 20, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`glass-card card-lift ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '900ms' }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                Estatísticas de Usuários
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-400">Usuários Ativos</span>
                    </div>
                    <span className="text-xl font-bold text-green-400">{stats.activeUsers || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm text-gray-400">Novos Hoje</span>
                    </div>
                    <span className="text-xl font-bold text-blue-400">{stats.newUsersToday || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Registros nas últimas 24h</p>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm text-gray-400">Taxa de Retenção</span>
                    </div>
                    <span className="text-xl font-bold text-purple-400">{stats.retentionRate || 85}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-1.5 rounded-full" style={{ width: `${stats.retentionRate || 85}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}