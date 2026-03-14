'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import { adminService, pixService } from '@/app/lib/services';
import { getAccountContext } from '@/app/lib/api';
import { DashboardStats, Transaction, Balance, User } from '@/app/types';
import { isAdmin } from '@/app/types/user-role';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  DollarSign,
  Activity,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  ChevronRight,
  ChevronLeft,
  PiggyBank,
  AlertCircle,
  Store,
  FileText,
  Calendar,
  Coins
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatBuyerName } from '@/app/lib/format-buyer-name';
import SystemWarningBanner from '@/app/components/SystemWarningBanner';

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Auto-refresh state for transactions
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Collaborator context - AUXILIAR cannot see balances
  const [isAuxiliarMode, setIsAuxiliarMode] = useState(false);

  // Date filter state for admin dashboard
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    // Check if user is AUXILIAR collaborator
    const accountContext = getAccountContext();
    setIsAuxiliarMode(accountContext.isCollaborating && accountContext.role === 'AUXILIAR');

    loadDashboardData();
  }, []);

  // Auto-refresh transactions every 30 seconds
  useEffect(() => {
    if (loading) return;

    const countdownInterval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [loading]);

  // Trigger auto-refresh when countdown reaches 0
  useEffect(() => {
    if (loading) return;

    if (autoRefreshCountdown === 30 && !isAutoRefreshing) {
      // Check if we've already loaded once (showWelcome is true after initial load)
      if (showWelcome) {
        refreshTransactionsOnly();
      }
    }
  }, [autoRefreshCountdown, loading, showWelcome]);

  // Function to refresh only transactions (silent, no toast)
  const refreshTransactionsOnly = async () => {
    if (isAutoRefreshing || loadingTransactions) return;

    setIsAutoRefreshing(true);
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;

      const isAdminUser = isAdmin(currentUser?.role);

      if (isAdminUser) {
        const [allTransactionsData, transactionsData] = await Promise.all([
          adminService.getAllTransactions({ limit: 1000 }),
          adminService.getAllTransactions({
            limit: ITEMS_PER_PAGE,
            offset: (currentPage - 1) * ITEMS_PER_PAGE
          })
        ]);
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
      } else {
        const [allTransactionsData, transactionsData] = await Promise.all([
          pixService.getTransactions({ limit: 1000 }),
          pixService.getTransactions({
            limit: ITEMS_PER_PAGE,
            offset: (currentPage - 1) * ITEMS_PER_PAGE
          })
        ]);
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Auto-refresh transactions error:', error);
    } finally {
      setIsAutoRefreshing(false);
    }
  };

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

  const forceRefreshUserCache = async () => {
    console.log('Dashboard: Forcing user cache refresh...');
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
      toast.error('Erro ao carregar transacoes');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadDashboardData = async (isRefresh = false) => {
    console.log('Dashboard: Starting loadDashboardData, isRefresh:', isRefresh);
    if (isRefresh) {
      setRefreshing(true);
      // Force cache refresh when manually refreshing
      await forceRefreshUserCache();
    } else {
      setLoading(true);
    }

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Dashboard: Loading timeout - forcing loading to false');
      setLoading(false);
      setRefreshing(false);
      toast.error('Tempo limite excedido ao carregar o dashboard');
    }, 15000); // 15 second timeout for refresh

    try {
      console.log('Dashboard: Fetching current user...');
      const currentUser = await authService.getCurrentUser();
      console.log('Dashboard: Current user:', currentUser);

      if (!currentUser) {
        console.error('Dashboard: No user returned from authService');
        throw new Error('Usuario nao encontrado');
      }

      setUser(currentUser);
      setGreeting(getPersonalizedGreeting(currentUser?.username));
      console.log('Dashboard: User commerceMode status:', {
        username: currentUser?.username,
        commerceMode: currentUser?.commerceMode,
        isAdmin: isAdmin(currentUser?.role)
      });

      if (isAdmin(currentUser?.role)) {
        console.log('Dashboard: Loading admin dashboard...');
        // Admin Dashboard - force fresh data on refresh
        // Build date filter params
        const dateParams: { startDate?: string; endDate?: string } = {};
        if (dateFilter.startDate) dateParams.startDate = dateFilter.startDate;
        if (dateFilter.endDate) dateParams.endDate = dateFilter.endDate;

        const [statsData, allTransactionsData, transactionsData] = await Promise.all([
          adminService.getDashboardStats(dateParams).catch(err => {
            console.error('Dashboard: Error loading stats:', err);
            return null;
          }),
          adminService.getAllTransactions({ limit: 1000 }).catch(err => {
            console.error('Dashboard: Error loading all transactions for count:', err);
            return [];
          }),
          adminService.getAllTransactions({ limit: ITEMS_PER_PAGE }).catch(err => {
            console.error('Dashboard: Error loading transactions:', err);
            return [];
          }),
        ]);
        console.log('Dashboard: Admin data loaded:', { statsData, transactionsData });
        setStats(statsData);
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
        setCurrentPage(1);
      } else {
        console.log('Dashboard: Loading user dashboard...');
        // User Dashboard - force fresh data on refresh
        const [balanceData, allTransactionsData, transactionsData] = await Promise.all([
          pixService.getBalance().catch(err => {
            console.error('Dashboard: Error loading balance:', err);
            return { available: 0, pending: 0, total: 0 };
          }),
          pixService.getTransactions({ limit: 1000 }).catch(err => {
            console.error('Dashboard: Error loading all transactions for count:', err);
            return [];
          }),
          pixService.getTransactions({ limit: ITEMS_PER_PAGE }).catch(err => {
            console.error('Dashboard: Error loading transactions:', err);
            return [];
          }),
        ]);
        console.log('Dashboard: User data loaded:', { balanceData, transactionsData });
        setBalance(balanceData);
        setTotalTransactions(allTransactionsData?.length || 0);
        setRecentTransactions(transactionsData || []);
        setCurrentPage(1);
      }

      clearTimeout(timeoutId);
      console.log('Dashboard: Data loaded successfully, setting loading to false');

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
      console.error('Dashboard: Error loading dashboard data:', error);

      if (isRefresh) {
        toast.error('Erro ao atualizar dashboard: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      } else {
        toast.error('Erro ao carregar dados do dashboard');
      }
      setLoading(false);
    } finally {
      setRefreshing(false);
      console.log('Dashboard: loadDashboardData completed');
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
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getStatusInfo = (status: string) => {
    const label = translateStatus(status);
    switch (status) {
      case 'COMPLETED':
        return {
          label,
          color: 'text-blue-900 bg-blue-200 dark:text-blue-400 dark:bg-blue-900/50',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'PENDING':
        return {
          label,
          color: 'text-yellow-900 bg-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/50',
          icon: <Clock className="w-4 h-4" />
        };
      case 'PROCESSING':
        return {
          label,
          color: 'text-green-900 bg-green-200 dark:text-green-400 dark:bg-green-900/50',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'IN_REVIEW':
        return {
          label,
          color: 'text-purple-900 bg-purple-200 dark:text-purple-400 dark:bg-purple-900/50',
          icon: <Activity className="w-4 h-4" />
        };
      case 'FAILED':
        return {
          label,
          color: 'text-red-900 bg-red-200 dark:text-red-400 dark:bg-red-900/50',
          icon: <XCircle className="w-4 h-4" />
        };
      case 'EXPIRED':
        return {
          label,
          color: 'text-orange-900 bg-orange-200 dark:text-orange-400 dark:bg-orange-900/50',
          icon: <Clock className="w-4 h-4" />
        };
      default:
        return {
          label,
          color: 'text-[var(--text-muted)] bg-[var(--bg-elevated)]',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          label: 'Deposito',
          icon: <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />,
          color: 'text-green-600 dark:text-green-400'
        };
      case 'WITHDRAW':
        return {
          label: 'Saque',
          icon: <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />,
          color: 'text-red-600 dark:text-red-400'
        };
      case 'TRANSFER':
        return {
          label: 'Transferencia',
          icon: <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          color: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          label: type,
          icon: <Activity className="w-5 h-5 text-[var(--text-muted)]" />,
          color: 'text-[var(--text-muted)]'
        };
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const isAdminUser = isAdmin(user?.role);

  const quickActions = [
    {
      title: 'Fazer Deposito',
      icon: ArrowDownLeft,
      href: '/deposit',
    },
    {
      title: 'Ver Transacoes',
      icon: Activity,
      href: '/transactions',
    },
    {
      title: 'Configuracoes',
      icon: Zap,
      href: '/settings',
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />

      {/* System Warnings Banner */}
      <SystemWarningBanner />

      {/* Welcome Header */}
      <div className={`mb-8 flex justify-between items-center ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            {greeting}
          </h1>
          <p className="text-[var(--text-muted)] mt-2">
            {isAdminUser
              ? 'Painel de Administracao - Visao geral do sistema'
              : 'Seu painel financeiro pessoal esta pronto!'}
          </p>
        </div>
        <button
          onClick={async () => {
            console.log('Dashboard: Manual refresh triggered');
            await loadDashboardData(true);
          }}
          disabled={refreshing}
          className="bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 text-[var(--text-primary)] px-4 py-2 rounded-lg transition duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border-default)] hover:border-[var(--border-hover)]"
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
                Modo Comercio Desativado
              </h3>
              <p className="text-yellow-200/80 mb-4">
                Voce precisa habilitar o Modo Comercio para ter acesso completo a todas as funcionalidades do painel, incluindo recebimento de multiplos CPF/CNPJ, Links de Pagamento, geracao de pagamentos especiais, API, webhooks, etc.
              </p>
              <a
                href="/commerce"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                <Store className="w-4 h-4" />
                <span>Habilitar Modo Comercio</span>
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
              className={`atlas-card bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 text-[var(--text-primary)] transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] ${
                showWelcome ? 'animate-bounce-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-3">
                    <action.icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-lg font-semibold">{action.title}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Date Filter for Admin */}
      {isAdminUser && (
        <div className={`mb-6 atlas-card bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '150ms' }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Filtrar por periodo:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">De:</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="text-sm py-1.5 px-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">Ate:</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="text-sm py-1.5 px-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
              <button
                onClick={() => loadDashboardData(true)}
                disabled={refreshing}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Aplicar
              </button>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  onClick={() => {
                    setDateFilter({ startDate: '', endDate: '' });
                    setTimeout(() => loadDashboardData(true), 100);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm underline"
                >
                  Limpar filtro
                </button>
              )}
            </div>
          </div>
          {(dateFilter.startDate || dateFilter.endDate) && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Dados filtrados por periodo personalizado
            </p>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isAdminUser ? (
          <>
            {/* Admin Stats */}
            <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Contribuicoes</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(stats?.totalContributions || 0)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Taxa de 0.5% por transacao
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Coins className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Transacoes Hoje</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {stats?.todayTransactions || 0}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Total: {stats?.totalTransactions || 0}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[var(--accent)]" />
                </div>
              </div>
            </div>

            <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Volume Total</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(stats?.totalVolume || 0)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    +{formatCurrency(stats?.todayVolume || 0)} hoje
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '500ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {stats?.successRate || 95}%
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {stats?.failedTransactions || 0} falhas
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </>
        ) : isAuxiliarMode ? (
          /* AUXILIAR Mode - No balance visibility */
          <div className={`col-span-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-4 p-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">Modo Auxiliar</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Como auxiliar, voce pode criar QR codes, links de pagamento e visualizar transacoes.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* User Stats - Full access for OWNER and GESTOR */}
            <div
              className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Saldo Disponivel</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(balance?.available || 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div
              className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">A Receber</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(balance?.pending || 0)}
                  </p>
                  {(balance?.pending || 0) > 0 && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Proxima: {(() => {
                        const now = new Date();
                        const hour = now.getHours();
                        const next = new Date(now);
                        if (hour < 6) {
                          next.setHours(6, 0, 0, 0);
                        } else if (hour < 18) {
                          next.setHours(18, 0, 0, 0);
                        } else {
                          next.setDate(next.getDate() + 1);
                          next.setHours(6, 0, 0, 0);
                        }
                        return next.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                      })()}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div
              className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '400ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Total Movimentado</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(balance?.total || 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div
              className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Transacoes</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {recentTransactions.length}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {recentTransactions.filter(t => t.status === 'PENDING').length} pendentes
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[var(--accent)]" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className={`atlas-card bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl relative ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] flex items-center">
              <Activity className="mr-2 w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{isAdminUser ? 'Transacoes Recentes do Sistema' : 'Suas Transacoes Recentes'}</span>
              <span className="sm:hidden">Transacoes</span>
            </h2>
            {/* Auto-refresh indicator - clickable */}
            <button
              onClick={() => {
                if (!isAutoRefreshing) {
                  setAutoRefreshCountdown(30);
                  refreshTransactionsOnly();
                }
              }}
              disabled={isAutoRefreshing}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                isAutoRefreshing
                  ? 'text-[var(--accent)] bg-[var(--accent-soft)] border-[var(--accent)]/20 cursor-wait'
                  : 'text-[var(--text-secondary)] bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer'
              }`}
              title={isAutoRefreshing ? 'Atualizando...' : 'Clique para atualizar agora'}
            >
              <RefreshCw className={`w-3 h-3 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
              <span>{isAutoRefreshing ? '...' : `${autoRefreshCountdown}s`}</span>
            </button>
          </div>
          <a
            href="/transactions"
            className="text-xs md:text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Ver todas
          </a>
        </div>

        {/* Loading overlay for pagination */}
        {loadingTransactions && (
          <div className="absolute inset-0 bg-[var(--bg-primary)]/50 flex items-center justify-center z-10 rounded-xl">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-[var(--accent)] animate-spin" />
              <span className="text-[var(--text-secondary)] text-sm">Carregando...</span>
            </div>
          </div>
        )}

        {recentTransactions.length === 0 && !loadingTransactions ? (
          <div className="p-8 md:p-12 text-center">
            <Activity className="w-10 h-10 md:w-12 md:h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm md:text-base">Nenhuma transacao encontrada</p>
            {!isAdminUser && (
              <a
                href="/deposit"
                className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm md:text-base"
              >
                Fazer primeiro deposito
              </a>
            )}
          </div>
        ) : recentTransactions.length > 0 ? (
          <>
            {/* Mobile View - Cards */}
            <div className="block md:hidden divide-y divide-[var(--border-default)]">
              {recentTransactions.map((transaction, index) => {
                const typeInfo = getTransactionTypeInfo(transaction.type);
                const statusInfo = getStatusInfo(transaction.status);

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800/40 transition-colors ${
                      showWelcome ? 'animate-slide-up' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${700 + index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={typeInfo.color}>
                          {typeInfo.icon}
                        </div>
                        {(transaction.status === 'COMPLETED' || transaction.status === 'PROCESSING') && (
                          <button
                            onClick={() => window.open(`/payment-confirmation/${transaction.id}`, '_blank')}
                            className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
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
                        <span className="text-xs text-[var(--text-muted)]">Valor:</span>
                        <span className="text-base font-bold text-[var(--text-primary)]">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      {isAdminUser && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)]">Usuario:</span>
                          <span className="text-sm text-[var(--text-secondary)]">
                            {transaction.user?.username || transaction.userId?.slice(0, 8) || '-'}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">Cliente:</span>
                        <span className="text-sm text-[var(--text-secondary)] truncate ml-2 max-w-[180px]">
                          {formatBuyerName(transaction.buyerName)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-[var(--border-default)]">
                        <span className="text-xs text-[var(--text-muted)]">Data:</span>
                        <span className="text-xs text-[var(--text-muted)]">
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
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Tipo
                    </th>
                    {isAdminUser && (
                      <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Usuario
                      </th>
                    )}
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Comprovante
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {recentTransactions.map((transaction, index) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    const statusInfo = getStatusInfo(transaction.status);

                    return (
                      <tr
                        key={transaction.id}
                        className={`hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800/40 transition-colors ${
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
                            <span className="text-sm text-[var(--text-secondary)]">
                              {transaction.user?.username || transaction.userId?.slice(0, 8) || '-'}
                            </span>
                          </td>
                        )}
                        <td className="py-4 px-6">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {formatBuyerName(transaction.buyerName)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
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
                          <span className="text-sm text-[var(--text-muted)]">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {(transaction.status === 'COMPLETED' || transaction.status === 'PROCESSING') ? (
                            <button
                              onClick={() => window.open(`/payment-confirmation/${transaction.id}`, '_blank')}
                              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                              title="Ver comprovante"
                            >
                              <FileText className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
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
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[var(--border-default)] gap-4">
                <div className="text-sm text-[var(--text-muted)]">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalTransactions)} de {totalTransactions} transacoes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTransactionsPage(currentPage - 1, isAdminUser)}
                    disabled={currentPage === 1 || loadingTransactions}
                    className="flex items-center gap-1 px-3 py-2 bg-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors text-sm border border-[var(--border-default)]"
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
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 text-[var(--text-secondary)] border border-[var(--border-default)]'
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
                    className="flex items-center gap-1 px-3 py-2 bg-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors text-sm border border-[var(--border-default)]"
                  >
                    <span className="hidden sm:inline">Proxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Mobile Pagination Controls */}
        {recentTransactions.length > 0 && totalTransactions > ITEMS_PER_PAGE && (
          <div className="block md:hidden p-4 border-t border-[var(--border-default)]">
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-[var(--text-muted)] text-center">
                Pagina {currentPage} de {Math.ceil(totalTransactions / ITEMS_PER_PAGE)} ({totalTransactions} transacoes)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadTransactionsPage(currentPage - 1, isAdminUser)}
                  disabled={currentPage === 1 || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 bg-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors text-sm border border-[var(--border-default)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">
                  {currentPage}
                </span>
                <button
                  onClick={() => loadTransactionsPage(currentPage + 1, isAdminUser)}
                  disabled={currentPage >= Math.ceil(totalTransactions / ITEMS_PER_PAGE) || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 bg-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors text-sm border border-[var(--border-default)]"
                >
                  Proxima
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
          <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '800ms' }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center">
                <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-xl flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                </div>
                Metricas de Performance
              </h3>
              <div className="space-y-4">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Transacoes Pendentes</span>
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-[var(--border-default)] rounded-full h-1.5">
                    <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.pendingTransactions || 0) * 10, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Transacoes Concluidas</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.completedTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-[var(--border-default)] rounded-full h-1.5">
                    <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.completedTransactions || 0) / 2, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Transacoes Falhadas</span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failedTransactions || 0}</span>
                  </div>
                  <div className="w-full bg-[var(--border-default)] rounded-full h-1.5">
                    <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${Math.min((stats.failedTransactions || 0) * 20, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl ${showWelcome ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '900ms' }}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center">
                <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-xl flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-[var(--accent)]" />
                </div>
                Estatisticas de Usuarios
              </h3>
              <div className="space-y-4">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-[var(--text-muted)]">Usuarios Ativos</span>
                    </div>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.activeUsers || 0}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Ultimos 30 dias</p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm text-[var(--text-muted)]">Novos Hoje</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.newUsersToday || 0}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Registros nas ultimas 24h</p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-lg p-4 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                      <span className="text-sm text-[var(--text-muted)]">Taxa de Retencao</span>
                    </div>
                    <span className="text-xl font-bold text-[var(--accent)]">{stats.retentionRate || 85}%</span>
                  </div>
                  <div className="w-full bg-[var(--border-default)] rounded-full h-1.5">
                    <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${stats.retentionRate || 85}%` }}></div>
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
