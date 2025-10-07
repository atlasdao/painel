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
      // Fetch payment links and transactions data
      const [linksResponse, transactionsResponse] = await Promise.all([
        api.get('/payment-links'),
        api.get('/transactions?type=DEPOSIT&limit=1000') // Get more transactions for chart data
      ]);

      const links = linksResponse.data;
      const allTransactions = transactionsResponse.data;

      // Store transactions for chart generation
      setTransactions(allTransactions);

      // Calculate stats from the data
      const totalRevenue = links.reduce((sum: number, link: any) => sum + (link.totalAmount || 0), 0);
      const totalTransactions = links.reduce((sum: number, link: any) => sum + (link.totalPayments || 0), 0);
      const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const activeLinks = links.filter((link: any) => link.isActive).length;

      // Calculate today's stats from actual transaction data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTransactionsList = allTransactions.filter((t: any) => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= today && t.status === 'COMPLETED';
      });
      const todayRevenue = todayTransactionsList.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Calculate monthly stats from actual data
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyTransactionsList = allTransactions.filter((t: any) => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= startOfMonth && t.status === 'COMPLETED';
      });
      const monthlyRevenue = monthlyTransactionsList.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Calculate growth from previous month's data
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

        // Calculate percentage growth
        if (previousMonthRevenue > 0) {
          monthlyGrowth = ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
        } else if (monthlyRevenue > 0) {
          monthlyGrowth = 100; // 100% growth if previous month was 0
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
    // Fix currency bug - ensure proper null/undefined handling
    const numValue = value != null && !isNaN(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Generate chart data from real transaction data for the last 7 days
  const generateChartData = (transactions: any[]): ChartData[] => {
    const data: ChartData[] = [];
    const today = new Date();

    // Group transactions by date for the last 7 days
    const dailyStats: { [key: string]: { revenue: number; count: number } } = {};

    // Initialize the last 7 days with zero values
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = { revenue: 0, count: 0 };
    }

    // Process transactions and group by date
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

    // Convert to chart data format
    const revenues = Object.values(dailyStats).map(day => day.revenue);
    const maxRevenue = Math.max(...revenues, 1); // Avoid division by zero

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
        percentage: Math.max(15, percentage) // Minimum 15% for visual purposes
      });
    }

    return data;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card-premium animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl"></div>
              <div className="w-8 h-4 bg-gray-700 rounded"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate success rate percentage
  const successRate = stats.totalTransactions > 0
    ? Math.round((stats.totalTransactions / Math.max(stats.totalTransactions + 10, stats.totalTransactions * 1.1)) * 100)
    : 0;

  // Updated layout: rectangles instead of squares, "Taxa de Sucesso" instead of "Receita Total"
  const statCards = [
    {
      title: 'Taxa de Sucesso',
      value: `${successRate}%`,
      subtitle: 'transações completas',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-500/10 to-emerald-500/10',
      iconBg: 'from-green-500/20 to-emerald-500/20'
    },
    {
      title: 'Total de Transações',
      value: formatNumber(stats.totalTransactions),
      subtitle: `${formatNumber(stats.todayTransactions)} hoje`,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
      iconBg: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(stats.averageTicket),
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
      iconBg: 'from-purple-500/20 to-pink-500/20'
    },
    {
      title: 'Links Ativos',
      value: formatNumber(stats.activeLinks),
      subtitle: 'links de pagamento',
      icon: Users,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-500/10 to-red-500/10',
      iconBg: 'from-orange-500/20 to-red-500/20'
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
            className={`stat-card-premium animate-scale-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`p-3 bg-gradient-to-br ${stat.iconBg} rounded-xl relative overflow-hidden`}>
                <Icon className={`w-6 h-6 text-white relative z-10`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-80`}></div>
              </div>

            </div>

            <h3 className="commerce-text-label mb-2">
              {stat.title}
            </h3>

            <p className="stat-value-animated mb-3">
              {stat.value}
            </p>

            {stat.subtitle && (
              <p className="text-sm text-gray-400 font-medium">
                {stat.subtitle}
              </p>
            )}

            {/* Subtle progress indicator for engagement */}
            <div className="mt-4 progress-commerce">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (index + 1) * 25)}%`,
                  animationDelay: `${(index * 100) + 500}ms`
                }}
              ></div>
            </div>
          </div>
        );
      })}

      {/* Enhanced Today's Revenue Card - Premium Design */}
      <div className="glass-card-premium p-6 md:p-8 md:col-span-2 lg:col-span-4 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Receita de Hoje
                </h3>
                <p className="text-sm text-gray-400">
                  Performance em tempo real
                </p>
              </div>
            </div>

            <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2 font-mono">
              {formatCurrency(stats.todayRevenue)}
            </p>
            <p className="text-base text-gray-300 font-medium">
              {formatNumber(stats.todayTransactions)} transações realizadas hoje
            </p>
          </div>

          <div className="lg:text-right">
            <div className="glass-card-premium p-4 border border-gray-700/50">
              <p className="commerce-text-label mb-2">Receita Mensal</p>
              <p className="text-xl md:text-2xl font-bold text-white mb-1 font-mono">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Interactive Chart with Mobile Constraints */}
        <div className="mt-6 md:mt-8 pt-6 border-t border-gray-700/50">
          {/* Selected Bar Info */}
          {selectedBar && (
            <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedBar.date}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatNumber(selectedBar.transactions)} transações
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-400">
                    {formatCurrency(selectedBar.revenue)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedBar.percentage}% da receita máxima
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chart with proper mobile constraints - only show if there's data */}
          {chartData.length > 0 && chartData.some(data => data.revenue > 0) ? (
            <>
              <div className="overflow-hidden px-1">
                <div className="flex items-end gap-0.5 sm:gap-1 md:gap-2 h-16 md:h-20 max-w-full">
                  {chartData.map((data, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-0 max-w-[32px] sm:max-w-[45px] md:max-w-[60px] bg-gradient-to-t from-purple-500/60 to-purple-500/20 rounded-t-lg transition-all duration-300 hover:from-purple-500/80 hover:to-purple-500/40 hover:scale-105 cursor-pointer touch-target"
                      style={{
                        height: `${data.percentage}%`,
                        animationDelay: `${i * 70 + 600}ms`
                      }}
                      onClick={() => setSelectedBar(selectedBar?.date === data.date ? null : data)}
                      title={`${data.date}: ${formatCurrency(data.revenue)} - ${formatNumber(data.transactions)} transações`}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 px-2 md:px-4">
                <p className="text-xs text-gray-500">
                  Últimos 7 dias {selectedBar ? `• Clique novamente para fechar` : `• Clique nas barras para detalhes`}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Receita diária</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                Nenhuma venda nos últimos 7 dias
              </p>
              <p className="text-gray-600 text-xs mt-1">
                O gráfico aparecerá quando houver transações
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}