'use client';

import { TrendingUp, Filter, Calendar, X } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

interface PeriodOption {
  id: string;
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

interface TodayRevenueCardProps {
  todayRevenue: number;
  todayTransactions: number;
  monthlyRevenue: number;
  chartData?: ChartData[];
  isLoading?: boolean;
  className?: string;
  selectedPeriod?: PeriodOption;
  onPeriodChange?: (period: PeriodOption) => void;
  statsLoading?: boolean;
}

export default function TodayRevenueCard({
  todayRevenue,
  todayTransactions,
  monthlyRevenue,
  chartData = [],
  isLoading = false,
  className = '',
  selectedPeriod,
  onPeriodChange,
  statsLoading = false
}: TodayRevenueCardProps) {
  const [selectedBar, setSelectedBar] = useState<ChartData | null>(null);
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowPeriodFilter(false);
        setShowCustomDatePicker(false);
      }
    };

    if (showPeriodFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPeriodFilter]);

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

  // Period filter options - FIXED: Proper day boundaries for consistent date matching
  // Use useMemo to ensure consistent dates during component lifecycle
  const periodOptions: PeriodOption[] = useMemo(() => {
    const now = new Date();

    return [
      {
        id: '7d',
        label: 'Últimos 7 dias',
        value: '7d',
        startDate: (() => {
          const start = new Date(now);
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0); // Start of day 6 days ago
          return start;
        })(),
        endDate: (() => {
          const end = new Date(now);
          end.setHours(23, 59, 59, 999); // End of today
          return end;
        })()
      },
      {
        id: '14d',
        label: 'Últimos 14 dias',
        value: '14d',
        startDate: (() => {
          const start = new Date(now);
          start.setDate(start.getDate() - 13);
          start.setHours(0, 0, 0, 0); // Start of day 13 days ago
          return start;
        })(),
        endDate: (() => {
          const end = new Date(now);
          end.setHours(23, 59, 59, 999); // End of today
          return end;
        })()
      },
      {
        id: '30d',
        label: 'Últimos 30 dias',
        value: '30d',
        startDate: (() => {
          const start = new Date(now);
          start.setDate(start.getDate() - 29);
          start.setHours(0, 0, 0, 0); // Start of day 29 days ago
          return start;
        })(),
        endDate: (() => {
          const end = new Date(now);
          end.setHours(23, 59, 59, 999); // End of today
          return end;
        })()
      },
      {
        id: 'lastMonth',
        label: 'Mês passado',
        value: 'lastMonth',
        startDate: (() => {
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          start.setHours(0, 0, 0, 0); // Start of first day of last month
          return start;
        })(),
        endDate: (() => {
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          end.setHours(23, 59, 59, 999); // End of last day of last month
          return end;
        })()
      }
    ];
  }, []); // Empty dependency array to calculate once on mount

  const handlePeriodSelect = (period: PeriodOption) => {
    if (onPeriodChange) {
      onPeriodChange(period);
    }
    setShowPeriodFilter(false);
    setShowCustomDatePicker(false);
  };

  const handleCustomDateSelect = () => {
    if (customStartDate && customEndDate) {
      const customPeriod: PeriodOption = {
        id: 'custom',
        label: `${new Date(customStartDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${new Date(customEndDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        value: 'custom',
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate)
      };

      if (onPeriodChange) {
        onPeriodChange(customPeriod);
      }

      setShowPeriodFilter(false);
      setShowCustomDatePicker(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`glass-card-premium p-8 animate-pulse ${className}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl"></div>
              <div>
                <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-24"></div>
              </div>
            </div>
            <div className="h-12 bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-40"></div>
          </div>
          <div className="lg:text-right">
            <div className="glass-card-premium p-4 border border-gray-700/50">
              <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded w-32 mb-1"></div>
              <div className="h-4 bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card-premium p-6 md:p-8 animate-slide-in-up ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  {selectedPeriod?.id === '7d' || selectedPeriod?.id === '1d' || !selectedPeriod
                    ? 'Receita de Hoje'
                    : 'Receita do Período'}
                </h3>

                {/* Compact Filter Icon */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowPeriodFilter(!showPeriodFilter)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors touch-target"
                    title="Filtrar período"
                  >
                    <Filter className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>

                  {/* PWA-Native Mobile-First Dropdown */}
                  {showPeriodFilter && (
                    <>
                      {/* Mobile Implementation - Full Screen Bottom Sheet */}
                      <div className="lg:hidden">
                        {/* Mobile Backdrop */}
                        <div
                          className="fixed inset-0 bg-black/50 z-[9998] animate-fade-in"
                          onClick={() => {
                            setShowPeriodFilter(false);
                            setShowCustomDatePicker(false);
                          }}
                        />

                        {/* Mobile Bottom Sheet */}
                        <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
                          <div className="glass-card-premium border border-gray-700/50 rounded-t-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
                            {/* Mobile Handle Bar */}
                            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-lg font-semibold text-white">Período</h4>
                              <button
                                onClick={() => {
                                  setShowPeriodFilter(false);
                                  setShowCustomDatePicker(false);
                                }}
                                className="p-2 rounded-full hover:bg-gray-700/50 transition-colors touch-target"
                              >
                                <X className="w-5 h-5 text-gray-400" />
                              </button>
                            </div>

                            <div className="space-y-3">
                              {periodOptions.map((period) => (
                                <button
                                  key={period.id}
                                  onClick={() => handlePeriodSelect(period)}
                                  className={`w-full text-left p-4 rounded-xl text-base font-medium transition-all duration-200 touch-target ${
                                    selectedPeriod?.id === period.id
                                      ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                                      : 'hover:bg-gray-700/50 text-gray-300 hover:scale-[0.98] active:scale-95'
                                  }`}
                                >
                                  {period.label}
                                </button>
                              ))}

                              {/* Custom Date Range Option - Mobile */}
                              <div className="border-t border-gray-700/50 pt-4 mt-4">
                                {!showCustomDatePicker ? (
                                  <button
                                    onClick={() => setShowCustomDatePicker(true)}
                                    className="w-full text-left p-4 rounded-xl text-base font-medium transition-all duration-200 touch-target hover:bg-gray-700/50 text-gray-300 flex items-center gap-3 hover:scale-[0.98] active:scale-95"
                                  >
                                    <Calendar className="w-5 h-5 text-purple-400" />
                                    Período personalizado
                                  </button>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Período Personalizado</span>
                                      <button
                                        onClick={() => setShowCustomDatePicker(false)}
                                        className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm text-gray-400 mb-2 font-medium">Data inicial</label>
                                        <input
                                          type="date"
                                          value={customStartDate}
                                          onChange={(e) => setCustomStartDate(e.target.value)}
                                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600/50 text-white text-base focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm text-gray-400 mb-2 font-medium">Data final</label>
                                        <input
                                          type="date"
                                          value={customEndDate}
                                          onChange={(e) => setCustomEndDate(e.target.value)}
                                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600/50 text-white text-base focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                                        />
                                      </div>
                                      <button
                                        onClick={handleCustomDateSelect}
                                        disabled={!customStartDate || !customEndDate}
                                        className="w-full mt-4 px-4 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-base font-semibold rounded-xl transition-all duration-200 touch-target hover:scale-[0.98] active:scale-95 shadow-lg shadow-purple-500/20 disabled:shadow-none"
                                      >
                                        Aplicar período
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Implementation - Professional Dropdown */}
                      <div className="hidden lg:block">
                        {/* Desktop Backdrop */}
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => {
                            setShowPeriodFilter(false);
                            setShowCustomDatePicker(false);
                          }}
                        />

                        {/* Desktop Dropdown - Professional Design with Smart Height Management */}
                        <div className="absolute top-0 left-full ml-1 w-56 z-[9999] animate-fade-in">
                          <div className="bg-gray-900/98 backdrop-blur-2xl border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden lg:max-h-[min(400px,calc(100vh-100px))] lg:overflow-y-auto"
                               style={{
                                 boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                                 transform: 'translateX(min(0px, calc(100vw - 100% - 20px)))',
                                 scrollBehavior: 'smooth',
                                 scrollSnapType: 'y proximity'
                               }}>
                            {/* Compact Elegant Header */}
                            <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-600/50 px-3 py-2.5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-white tracking-wide">Filtrar Período</h4>
                                <button
                                  onClick={() => {
                                    setShowPeriodFilter(false);
                                    setShowCustomDatePicker(false);
                                  }}
                                  className="p-1 rounded-full hover:bg-white/10 transition-all duration-200"
                                >
                                  <X className="w-3.5 h-3.5 text-gray-300 hover:text-white" />
                                </button>
                              </div>
                            </div>

                            {/* Optimized Period Options */}
                            <div className="p-3">
                              <div className="space-y-1.5">
                                {periodOptions.map((period) => (
                                  <button
                                    key={period.id}
                                    onClick={() => handlePeriodSelect(period)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                                      selectedPeriod?.id === period.id
                                        ? 'bg-gradient-to-r from-purple-600/30 to-purple-500/30 text-purple-200 border border-purple-400/40 shadow-lg shadow-purple-500/20'
                                        : 'hover:bg-gray-700/50 text-gray-300 hover:text-white hover:shadow-md'
                                    }`}
                                  >
                                    <span className="block">{period.label}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Compact Custom Date Range */}
                              <div className="border-t border-gray-600/50 mt-3 pt-3 scroll-snap-align-start">
                                {!showCustomDatePicker ? (
                                  <button
                                    onClick={() => setShowCustomDatePicker(true)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-gray-700/50 text-gray-300 hover:text-white flex items-center gap-2 group hover:shadow-md"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                                    <span>Período personalizado</span>
                                  </button>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Personalizado</span>
                                      <button
                                        onClick={() => setShowCustomDatePicker(false)}
                                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <div className="space-y-2.5">
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Data inicial</label>
                                        <input
                                          type="date"
                                          value={customStartDate}
                                          onChange={(e) => setCustomStartDate(e.target.value)}
                                          className="w-full px-2.5 py-2 rounded-lg bg-gray-800/70 border border-gray-600/60 text-white text-xs placeholder-gray-400 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Data final</label>
                                        <input
                                          type="date"
                                          value={customEndDate}
                                          onChange={(e) => setCustomEndDate(e.target.value)}
                                          className="w-full px-2.5 py-2 rounded-lg bg-gray-800/70 border border-gray-600/60 text-white text-xs placeholder-gray-400 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-200"
                                        />
                                      </div>
                                      <button
                                        onClick={handleCustomDateSelect}
                                        disabled={!customStartDate || !customEndDate}
                                        className="w-full mt-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 disabled:shadow-none transform hover:scale-[1.02] disabled:hover:scale-100"
                                      >
                                        Aplicar período
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {selectedPeriod?.label || 'Performance em tempo real'}
              </p>
            </div>
          </div>

          <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2 font-mono">
            {formatCurrency(todayRevenue)}
          </p>
          <p className="text-base text-gray-300 font-medium">
            {formatNumber(todayTransactions)} transaç{todayTransactions !== 1 ? 'ões' : 'ão'} realizada{todayTransactions !== 1 ? 's' : ''} nos {selectedPeriod?.label?.toLowerCase() || 'no período'}
          </p>
        </div>

        <div className="lg:text-right">
          <div className="glass-card-premium p-4 border border-gray-700/50">
            <p className="commerce-text-label mb-2">Receita Mensal</p>
            <p className="text-xl md:text-2xl font-bold text-white mb-1 font-mono">
              {formatCurrency(monthlyRevenue)}
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
                  Receita do dia
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-400">
                  {formatCurrency(selectedBar.revenue)}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedBar.transactions} transação{selectedBar.transactions !== 1 ? 'ões' : ''} realizada{selectedBar.transactions !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Chart with proper mobile constraints - show if there's data OR chart points */}
        {chartData.length > 0 ? (
          <div className="overflow-hidden px-1">
            <div className="flex items-end gap-0.5 sm:gap-1 md:gap-2 h-16 md:h-20 max-w-full">
              {chartData.map((data, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 max-w-[32px] sm:max-w-[45px] md:max-w-[60px] bg-gradient-to-t from-purple-500/60 to-purple-500/20 rounded-t-lg transition-all duration-300 hover:from-purple-500/80 hover:to-purple-500/40 hover:scale-105 cursor-pointer touch-target"
                  style={{
                    height: `${Math.max(data.percentage, 15)}%`,
                    minHeight: '8px', // Ensure minimum visibility
                    animationDelay: `${i * 70 + 600}ms`
                  }}
                  onClick={() => setSelectedBar(selectedBar?.date === data.date ? null : data)}
                  title={`${data.date}: ${formatCurrency(data.revenue)} - ${formatNumber(data.transactions)} transações`}
                >
                  {/* Debug info for development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-0 left-0 text-xs text-white bg-black/50 p-1 z-10 opacity-0 hover:opacity-100 transition-opacity">
                      {data.percentage}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              Nenhuma venda no período selecionado
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {selectedPeriod ? `${selectedPeriod.label}: ` : ''}Os gráficos aparecerão quando houver transações
            </p>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="flex justify-between items-center mt-3 px-2 md:px-4">
            <p className="text-xs text-gray-500">
              {selectedPeriod?.label || 'Últimos 7 dias'} {selectedBar ? `• Clique novamente para fechar` : `• Clique nas barras para detalhes`}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Receita por período</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}