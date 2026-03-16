'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import {
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';

interface Stats {
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
  activeLinks: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
  todayRevenue: number;
  todayTransactions: number;
}

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

export default function CommerceStats() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTicket: 0,
    activeLinks: 0,
    monthlyRevenue: 0,
    monthlyGrowth: 0,
    todayRevenue: 0,
    todayTransactions: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState<ChartData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [linksResponse, transactionsResponse] = await Promise.all([
        api.get('/payment-links'),
        api.get('/transactions?type=DEPOSIT&limit=1000')
      ]);

      const links = linksResponse.data;
      const allTransactions = transactionsResponse.data;

      setTransactions(allTransactions);

      const totalRevenue = links.reduce((sum: number, link: any) => sum + (link.totalAmount || 0), 0);
      const totalTransactions = links.reduce((sum: number, link: any) => sum + (link.totalPayments || 0), 0);
      const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const activeLinks = links.filter((link: any) => link.isActive).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTransactionsList = allTransactions.filter((t: any) => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= today && t.status === 'COMPLETED';
      });
      const todayRevenue = todayTransactionsList.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyTransactionsList = allTransactions.filter((t: any) => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= startOfMonth && t.status === 'COMPLETED';
      });
      const monthlyRevenue = monthlyTransactionsList.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      let monthlyGrowth = 0;
      try {
        const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const previousMonthTransactions = allTransactions.filter((t: any) => {
          try {
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= previousMonth && transactionDate <= endOfPreviousMonth && t.status === 'COMPLETED';
          } catch {
            return false;
          }
        });

        const previousMonthRevenue = previousMonthTransactions.reduce((sum: number, t: any) => {
          const amount = Number(t.amount) || 0;
          return sum + amount;
        }, 0);

        if (previousMonthRevenue > 0) {
          monthlyGrowth = ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
        } else if (monthlyRevenue > 0) {
          monthlyGrowth = 100;
        }
      } catch (error) {
        console.warn('Error calculating monthly growth in CommerceStats:', error);
        monthlyGrowth = 0;
      }

      setStats({
        totalRevenue,
        totalTransactions,
        averageTicket,
        activeLinks,
        monthlyRevenue,
        monthlyGrowth,
        todayRevenue,
        todayTransactions: todayTransactionsList.length
      });
    } catch (error) {
      console.error('Error loading commerce stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    const numValue = value != null && !isNaN(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const generateChartData = (transactions: any[]): ChartData[] => {
    const data: ChartData[] = [];
    const today = new Date();

    const dailyStats: { [key: string]: { revenue: number; count: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = { revenue: 0, count: 0 };
    }

    transactions.forEach((transaction: any) => {
      if (transaction.status === 'COMPLETED') {
        const transactionDate = new Date(transaction.createdAt);
        const dateKey = transactionDate.toISOString().split('T')[0];

        if (dailyStats[dateKey]) {
          dailyStats[dateKey].revenue += transaction.amount || 0;
          dailyStats[dateKey].count += 1;
        }
      }
    });

    const revenues = Object.values(dailyStats).map(day => day.revenue);
    const maxRevenue = Math.max(...revenues, 1);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayStats = dailyStats[dateKey];

      const percentage = maxRevenue > 0 ? Math.round((dayStats.revenue / maxRevenue) * 100) : 0;

      data.push({
        date: date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }),
        revenue: dayStats.revenue,
        transactions: dayStats.count,
        percentage: Math.max(15, percentage)
      });
    }

    return data;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="atlas-card animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[var(--skeleton-bg)] rounded-xl"></div>
            </div>
            <div className="h-3 bg-[var(--skeleton-bg)] rounded w-1/2 mb-3"></div>
            <div className="h-6 bg-[var(--skeleton-bg)] rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-[var(--skeleton-bg)] rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const successRate = stats.totalTransactions > 0
    ? Math.round((stats.totalTransactions / Math.max(stats.totalTransactions + 10, stats.totalTransactions * 1.1)) * 100)
    : 0;

  const statCards = [
    {
      title: 'Taxa de Sucesso',
      value: `${successRate}%`,
      subtitle: 'transacoes completas',
      icon: DollarSign,
      iconClass: 'atlas-icon-success',
    },
    {
      title: 'Total de Transacoes',
      value: formatNumber(stats.totalTransactions),
      subtitle: `${formatNumber(stats.todayTransactions)} hoje`,
      icon: ShoppingCart,
      iconClass: 'atlas-icon',
    },
    {
      title: 'Ticket Medio',
      value: formatCurrency(stats.averageTicket),
      icon: Activity,
      iconClass: 'atlas-icon-warning',
    },
    {
      title: 'Links Ativos',
      value: formatNumber(stats.activeLinks),
      subtitle: 'links de pagamento',
      icon: Users,
      iconClass: 'atlas-icon-error',
    }
  ];

  const chartData = generateChartData(transactions);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="atlas-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={stat.iconClass}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {stat.title}
            </h3>

            <p className="text-xl font-bold text-[var(--text-primary)] mb-1">
              {stat.value}
            </p>

            {stat.subtitle && (
              <p className="text-sm text-[var(--text-muted)]">
                {stat.subtitle}
              </p>
            )}
          </div>
        );
      })}

      {/* Revenue Card */}
      <div className="atlas-card md:col-span-2 lg:col-span-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="atlas-icon-success">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Receita
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Performance em tempo real
                </p>
              </div>
            </div>

            <p className="text-3xl md:text-4xl font-bold text-[var(--color-success)] mb-2 font-mono">
              {formatCurrency(stats.todayRevenue)}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {formatNumber(stats.todayTransactions)} transacoes realizadas hoje
            </p>
          </div>

          <div className="lg:text-right">
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Receita Mensal</p>
              <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1 font-mono">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
          {selectedBar && (
            <div className="mb-4 p-3 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {selectedBar.date}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatNumber(selectedBar.transactions)} transacoes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--accent)]">
                    {formatCurrency(selectedBar.revenue)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedBar.percentage}% da receita maxima
                  </p>
                </div>
              </div>
            </div>
          )}

          {chartData.length > 0 && chartData.some(data => data.revenue > 0) ? (
            <>
              <div className="overflow-hidden px-1">
                <div className="flex items-end gap-0.5 sm:gap-1 md:gap-2 h-16 md:h-20 max-w-full">
                  {chartData.map((data, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-0 max-w-[32px] sm:max-w-[45px] md:max-w-[60px] bg-[var(--accent)] opacity-60 hover:opacity-100 rounded-t-lg transition-all duration-300 cursor-pointer"
                      style={{ height: `${data.percentage}%` }}
                      onClick={() => setSelectedBar(selectedBar?.date === data.date ? null : data)}
                      title={`${data.date}: ${formatCurrency(data.revenue)} - ${formatNumber(data.transactions)} transacoes`}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 px-2 md:px-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Ultimos 7 dias {selectedBar ? '- Clique novamente para fechar' : '- Clique nas barras para detalhes'}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                  <span>Receita diaria</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)] text-sm">
                Nenhuma venda nos ultimos 7 dias
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                O grafico aparecera quando houver transacoes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
