'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/app/lib/api';
import { profileService } from '@/app/lib/services';
import { toast, Toaster } from 'sonner';
import {
  Store,
  Lock,
  Link,
  QrCode,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  DollarSign,
  Users,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
  ChevronRight,
  CreditCard,
  Monitor,
  Eye,
  EyeOff,
  Download,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import PaymentLinksManager from '@/app/components/PaymentLinksManager';
import QRCodeGenerator from '@/app/components/QRCodeGenerator';
import CommerceLockScreen from '@/app/components/CommerceLockScreen';
import CommerceStats from '@/app/components/CommerceStats';
import TodayRevenueCard from '@/app/components/TodayRevenueCard';
import MetricsCarousel from '@/app/components/MetricsCarousel';
import RecentTransactionsSection from '@/app/components/RecentTransactionsSection';
import RecentTransactions from '@/app/components/RecentTransactions';
import FloatingActionMenu from '@/app/components/FloatingActionMenu';
import ConfettiCelebration from '@/app/components/ConfettiCelebration';
import { PeriodOption } from '@/app/components/PeriodFilter';

export default function CommercePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'qrcode' | 'pos'>('links');
  const [hasCommerceAccess, setHasCommerceAccess] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTicket: 0,
    activeLinks: 0,
    monthlyRevenue: 0,
    monthlyGrowth: 0,
    todayRevenue: 0,
    todayTransactions: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Period filter state - FIXED: proper boundary setting
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0); // Start of day 6 days ago

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999); // End of today

    return {
      id: '7d',
      label: 'Últimos 7 dias',
      value: '7d',
      startDate,
      endDate
    };
  });

  // Refs to prevent multiple initialization and track component state
  const initializationRef = useRef(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) {
      return;
    }

    initializationRef.current = true;
    isUnmountedRef.current = false;

    const initializePage = async () => {
      // Set up a failsafe timeout
      const timeout = setTimeout(() => {
        if (isUnmountedRef.current) return; // Don't update state if unmounted

        console.warn('Page loading timeout - forcing completion');
        setIsLoading(false);
        setStatsLoading(false);
        toast.error('Carregamento demorou muito. Página carregada com dados limitados.');
      }, 15000); // 15 second failsafe

      setLoadingTimeout(timeout);

      try {
        // Set a maximum timeout for loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Loading timeout')), 10000); // 10 second timeout
        });

        // Load profile first as it's critical for page display
        await Promise.race([loadUserProfile(), timeoutPromise]);

        // Load stats in parallel, but don't block page loading if it fails
        loadCommerceStats().catch((error) => {
          console.warn('Commerce stats failed to load, continuing with default values:', error);
        });

        // Clear timeout if successful
        clearTimeout(timeout);
      } catch (error) {
        if (isUnmountedRef.current) return; // Don't update state if unmounted

        console.error('Page initialization failed:', error);
        // Force loading to complete even if there's an error
        setIsLoading(false);
        setStatsLoading(false);
        toast.error('Erro ao carregar página. Alguns dados podem não estar disponíveis.');
        clearTimeout(timeout);
      }
    };

    initializePage();

    // Cleanup timeout on unmount
    return () => {
      isUnmountedRef.current = true;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  // Generate chart data from real transaction data for dynamic period range
  const generateChartData = useCallback((transactions: any[], period: PeriodOption) => {
    const data: any[] = [];
    const { startDate, endDate } = period;

    // Calculate the number of days in the period
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const maxDataPoints = 30; // Maximum number of bars for mobile responsiveness

    // Determine aggregation strategy based on period length
    let aggregationDays = 1; // Daily aggregation by default
    if (daysDiff > maxDataPoints) {
      aggregationDays = Math.ceil(daysDiff / maxDataPoints);
    }

    // Group transactions by date period
    const periodStats: { [key: string]: { revenue: number; count: number; startDate: Date; endDate: Date } } = {};

    // Initialize periods with zero values - FIXED: proper boundary setting
    for (let i = 0; i < Math.ceil(daysDiff / aggregationDays); i++) {
      const periodStart = new Date(startDate);
      periodStart.setDate(periodStart.getDate() + (i * aggregationDays));
      // FIXED: Set to start of day in local timezone
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + aggregationDays - 1);
      // FIXED: Set to end of day in local timezone
      periodEnd.setHours(23, 59, 59, 999);

      // Don't exceed the original end date
      if (periodEnd > endDate) {
        periodEnd.setTime(endDate.getTime());
        // Ensure we still have end-of-day if original endDate allows it
        if (periodEnd.getHours() === 0 && periodEnd.getMinutes() === 0 && periodEnd.getSeconds() === 0) {
          periodEnd.setHours(23, 59, 59, 999);
        }
      }

      const periodKey = `${periodStart.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}`;
      periodStats[periodKey] = {
        revenue: 0,
        count: 0,
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd)
      };
    }

    // Process transactions and group by appropriate period
    transactions.forEach((transaction: any) => {
      if (transaction.status === 'COMPLETED') {
        try {
          // Use processedAt for completed transactions, fallback to createdAt
          const transactionDateStr = transaction.processedAt || transaction.createdAt;
          const transactionDate = new Date(transactionDateStr);

          // Validate date parsing
          if (isNaN(transactionDate.getTime())) {
            console.warn('Invalid transaction date:', transactionDateStr);
            return;
          }

          // Find which period this transaction belongs to
          for (const [periodKey, periodData] of Object.entries(periodStats)) {
            const startTime = periodData.startDate.getTime();
            const endTime = periodData.endDate.getTime();
            const transactionTime = transactionDate.getTime();

            const isInRange = transactionTime >= startTime && transactionTime <= endTime;

            if (isInRange) {
              periodStats[periodKey].revenue += Number(transaction.amount) || 0;
              periodStats[periodKey].count += 1;
              break;
            }
          }
        } catch (error) {
          console.warn('Error processing transaction date:', error);
        }
      }
    });

    // Convert to chart data format
    const revenues = Object.values(periodStats).map(period => period.revenue);
    const transactionCounts = Object.values(periodStats).map(period => period.count);
    const maxRevenue = Math.max(...revenues, 1); // Avoid division by zero
    const maxTransactions = Math.max(...transactionCounts, 1); // Avoid division by zero

    // Sort periods by start date and create chart data
    const sortedPeriods = Object.entries(periodStats).sort(([, a], [, b]) =>
      a.startDate.getTime() - b.startDate.getTime()
    );

    sortedPeriods.forEach(([, periodData]) => {
      // Use revenue amount for bar height - days with higher revenue have higher bars
      const percentage = maxRevenue > 0 ? Math.round((periodData.revenue / maxRevenue) * 100) : 0;

      // Format date label based on aggregation
      let dateLabel: string;
      if (aggregationDays === 1) {
        // Daily: show day/month
        dateLabel = periodData.startDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      } else if (aggregationDays <= 7) {
        // Weekly: show day range
        dateLabel = `${periodData.startDate.getDate()}`;
        if (periodData.startDate.getDate() !== periodData.endDate.getDate()) {
          dateLabel += `-${periodData.endDate.getDate()}`;
        }
      } else {
        // Monthly: show month/year or week range
        dateLabel = periodData.startDate.toLocaleDateString('pt-BR', {
          month: 'short'
        });
      }

      data.push({
        date: dateLabel,
        revenue: periodData.revenue,
        transactions: periodData.count,
        percentage: Math.max(15, percentage), // Minimum 15% for visual purposes
        fullDate: periodData.startDate.toLocaleDateString('pt-BR'),
        endDate: periodData.endDate.toLocaleDateString('pt-BR')
      });
    });

    return data;
  }, []);

  const loadCommerceStats = useCallback(async (period?: PeriodOption) => {
    if (isUnmountedRef.current) return; // Don't load if unmounted
    setStatsLoading(true);

    const currentPeriod = period || selectedPeriod;

    try {
      // Try to load payment links and transactions with fallbacks
      let links = [];
      let transactions = [];

      try {
        const linksResponse = await api.get('/payment-links');
        links = Array.isArray(linksResponse.data) ? linksResponse.data : [];
      } catch (error) {
        console.warn('Payment links API not available, using empty data');
        links = [];
      }

      try {
        // For commerce page, use user's own transactions (PIX endpoint)
        // Build URL with date range parameters - send full ISO datetime for proper filtering
        const startDateStr = currentPeriod.startDate.toISOString();
        const endDateStr = currentPeriod.endDate.toISOString();
        const transactionsUrl = `/pix/transactions?type=DEPOSIT&status=COMPLETED&limit=1000&startDate=${startDateStr}&endDate=${endDateStr}`;

        const transactionsResponse = await api.get(transactionsUrl);
        transactions = Array.isArray(transactionsResponse.data) ? transactionsResponse.data : [];
      } catch (error) {
        console.warn('Transactions API not available, using empty data');
        transactions = [];

        // Fallback to PIX endpoint without date filtering if primary fails
        try {
          const fallbackResponse = await api.get('/pix/transactions?type=DEPOSIT&status=COMPLETED&limit=1000');
          transactions = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
        } catch (fallbackError) {
          console.warn('Fallback PIX transactions API also failed');
          transactions = [];
        }
      }

      // Calculate stats from the data with safety checks
      const totalRevenue = links.reduce((sum: number, link: any) => {
        const amount = Number(link.totalAmount) || 0;
        return sum + amount;
      }, 0);

      const totalTransactions = links.reduce((sum: number, link: any) => {
        const payments = Number(link.totalPayments) || 0;
        return sum + payments;
      }, 0);

      const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const activeLinks = links.filter((link: any) => link.isActive).length;

      // Calculate period stats - ONLY include COMPLETED transactions
      const periodTransactions = transactions.filter((t: any) => {
        try {
          // Use processedAt for completed transactions, fallback to createdAt
          const transactionDate = new Date(t.processedAt || t.createdAt);
          return transactionDate >= currentPeriod.startDate &&
                 transactionDate <= currentPeriod.endDate &&
                 t.status === 'COMPLETED';
        } catch {
          return false;
        }
      });
      const periodRevenue = periodTransactions.reduce((sum: number, t: any) => {
        const amount = Number(t.amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate monthly stats - ONLY include COMPLETED transactions
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyTransactions = transactions.filter((t: any) => {
        try {
          // Use processedAt for completed transactions, fallback to createdAt
          const transactionDate = new Date(t.processedAt || t.createdAt);
          return transactionDate >= startOfMonth && t.status === 'COMPLETED';
        } catch {
          return false;
        }
      });
      const monthlyRevenue = monthlyTransactions.reduce((sum: number, t: any) => {
        const amount = Number(t.amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate growth from previous month's data
      let monthlyGrowth = 0;
      try {
        const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const previousMonthTransactions = transactions.filter((t: any) => {
          try {
            // Use processedAt for completed transactions, fallback to createdAt
            const transactionDate = new Date(t.processedAt || t.createdAt);
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
        console.warn('Error calculating monthly growth:', error);
        monthlyGrowth = 0;
      }

      // Generate chart data from transactions for the selected period
      const chartDataForPeriod = generateChartData(transactions, currentPeriod);

      if (!isUnmountedRef.current) {
        setStats({
          totalRevenue,
          totalTransactions,
          averageTicket,
          activeLinks,
          monthlyRevenue,
          monthlyGrowth,
          todayRevenue: periodRevenue,
          todayTransactions: periodTransactions.length
        });
        setChartData(chartDataForPeriod);
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        console.error('Error loading commerce stats:', error);
        // Set default empty stats if everything fails
        setStats({
          totalRevenue: 0,
          totalTransactions: 0,
          averageTicket: 0,
          activeLinks: 0,
          monthlyRevenue: 0,
          monthlyGrowth: 0,
          todayRevenue: 0,
          todayTransactions: 0
        });
        setChartData([]);
      }
    } finally {
      if (!isUnmountedRef.current) {
        setStatsLoading(false);
      }
    }
  }, [generateChartData, selectedPeriod]);

  const loadUserProfile = useCallback(async () => {
    if (isUnmountedRef.current) return; // Don't load if unmounted
    setIsLoading(true);
    try {
      const profile = await profileService.getProfile();

      if (!isUnmountedRef.current) {
        setUserProfile(profile);

        // Check if user has full commerce access (both validated and commerce mode active)
        const hasFullCommerceAccess = profile.commerceMode && profile.isAccountValidated;
        setHasCommerceAccess(hasFullCommerceAccess);
      }

    } catch (error: any) {
      if (isUnmountedRef.current) return; // Don't update state if unmounted

      console.error('Error loading profile:', error);

      // Handle authentication errors
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Redirecionando para login...');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error('Erro ao carregar perfil. Usando dados padrão.');
        // Set a minimal profile to prevent blocking
        setUserProfile({
          commerceMode: false,
          isAccountValidated: false,
          defaultWalletAddress: null
        });
        setHasCommerceAccess(false);
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle period filter changes
  const handlePeriodChange = useCallback((newPeriod: PeriodOption) => {
    setSelectedPeriod(newPeriod);
    // Reload data with new period
    loadCommerceStats(newPeriod);
  }, [loadCommerceStats]);

  const tabs = [
    { id: 'links', label: 'Links de Pagamento', icon: Link },
    { id: 'qrcode', label: 'Gerar QR Code', icon: QrCode },
    { id: 'pos', label: 'POS', icon: Monitor },
  ];

  // Celebration trigger for successful actions
  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // Smooth scroll utility function
  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  // Handle floating action menu actions
  const handleCreateLink = () => {
    setActiveTab('links');
    // Smooth scroll to the content area for Payment Links
    setTimeout(() => scrollToElement('commerce-content'), 100);
    // Add a subtle celebration for engagement
    toast.success('Vamos criar um novo link de pagamento!', {
      duration: 2000,
    });
  };

  const handleCreateQR = () => {
    setActiveTab('qrcode');
    // Smooth scroll to the content area for QR Code
    setTimeout(() => scrollToElement('commerce-content'), 100);
    toast.success('Hora de gerar um QR Code!', {
      duration: 2000,
    });
  };

  const handlePOS = () => {
    setActiveTab('pos');
    // Smooth scroll to the content area for POS
    setTimeout(() => scrollToElement('commerce-content'), 100);
    toast.success('🚀 POS Terminal chegando em breve!', {
      duration: 2500,
    });
  };



  // Enhanced tab switching with animations and haptic feedback
  const handleTabSwitch = (newTab: string) => {
    if (newTab === activeTab) return;

    // Add a subtle celebration for tab switching (engagement)
    triggerCelebration();

    setActiveTab(newTab as 'links' | 'qrcode' | 'pos');

    // Provide contextual feedback
    const tabMessages = {
      links: 'Links de pagamento selecionados 🔗',
      qrcode: 'Gerador de QR Code ativo 📱',
      pos: 'POS em desenvolvimento 💻'
    };

    toast.success(tabMessages[newTab as keyof typeof tabMessages], {
      duration: 1500,
    });
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white -m-6 pb-12">
      <Toaster position="top-right" />

      <div className="w-full">
        {/* Optimized Compact Header */}
        <div className="mb-6 pt-6 px-4 md:px-6 animate-fade-in-down">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
                Modo Comércio
              </h1>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-green-400 font-medium">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Ativo
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">Atualizado {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commerce Access Check */}
        {isLoading ? (
          <div className="px-4 md:px-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Verificando acesso ao modo comércio...</p>
            </div>
          </div>
        ) : !userProfile?.isAccountValidated ? (
          <div className="px-4 md:px-6">
            <CommerceLockScreen
              isAccountValidated={userProfile?.isAccountValidated}
              commerceMode={userProfile?.commerceMode}
            />
          </div>
        ) : !hasCommerceAccess ? (
          <div className="px-4 md:px-6">
            <CommerceLockScreen
              isAccountValidated={userProfile?.isAccountValidated}
              commerceMode={userProfile?.commerceMode}
            />
          </div>
        ) : (
          <>
            {/* Today's Revenue Card - Top Priority */}
            <div className="mb-8 px-4 md:px-6 animate-slide-in-up animate-stagger-1">
              <TodayRevenueCard
                todayRevenue={stats.todayRevenue}
                todayTransactions={stats.todayTransactions}
                monthlyRevenue={stats.monthlyRevenue}
                chartData={chartData}
                isLoading={statsLoading}
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                statsLoading={statsLoading}
              />
            </div>

            {/* Other Metrics as Carousel */}
            <div className="mb-10 px-4 md:px-6 animate-slide-in-up animate-stagger-2">
              <MetricsCarousel
                totalRevenue={stats.totalRevenue}
                totalTransactions={stats.totalTransactions}
                averageTicket={stats.averageTicket}
                activeLinks={stats.activeLinks}
                todayTransactions={stats.todayTransactions}
                monthlyGrowth={stats.monthlyGrowth}
                isLoading={statsLoading}
              />
            </div>

            {/* Recent Transactions Section */}
            <div className="mb-10 px-4 md:px-6 animate-slide-in-up animate-stagger-3">
              <RecentTransactionsSection
                maxTransactions={7}
              />
            </div>

            {/* Premium Tab Navigation - Enhanced with Payment Links Styling */}
            <div id="commerce-tabs" className="tab-commerce-premium mb-10 px-4 md:px-6 animate-scale-in animate-stagger-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`tab-item-premium focus-commerce touch-target ${
                      activeTab === tab.id ? 'active' : ''
                    }`}
                    aria-label={`Navegar para ${tab.label}`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${
                      activeTab === tab.id ? 'scale-110' : ''
                    }`} />
                    <span className="ml-2">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Enhanced Content Container with Payment Links Styling */}
            <div id="commerce-content" className="glass-card-premium p-6 md:p-8 mx-4 md:mx-6 mb-12 animate-slide-in-up animate-stagger-5">
              {/* Payment Links Tab */}
              {activeTab === 'links' && (
                <PaymentLinksManager
                  defaultWallet={userProfile?.defaultWalletAddress}
                />
              )}

              {/* QR Code Generator Tab */}
              {activeTab === 'qrcode' && (
                <QRCodeGenerator
                  defaultWallet={userProfile?.defaultWalletAddress}
                />
              )}

              {/* POS Tab - Coming Soon */}
              {activeTab === 'pos' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                      <Monitor className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <h2 className="commerce-heading-section">
                        POS Terminal
                      </h2>
                      <p className="text-gray-400">
                        Sistema de ponto de venda completo e integrado
                      </p>
                    </div>
                  </div>

                  <div className="glass-card-premium p-8 border border-blue-500/20">
                    <div className="text-center py-12">
                      <div className="relative inline-block mb-8">
                        <Monitor className="w-24 h-24 mx-auto mb-4 text-blue-400/30" />
                        <div className="absolute inset-0 animate-pulse">
                          <Monitor className="w-24 h-24 mx-auto text-blue-400/60" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-bounce">
                          NOVO
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-4">
                        🚀 POS Terminal em Desenvolvimento
                      </h3>

                      <p className="text-gray-300 max-w-2xl mx-auto mb-6 text-lg leading-relaxed">
                        Transforme qualquer dispositivo em um terminal de pagamento inteligente!
                        Aceite PIX e converta automaticamente para criptomoedas de forma transparente.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
                        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-6 rounded-xl border border-blue-500/20">
                          <CreditCard className="w-8 h-8 text-blue-400 mb-3" />
                          <h4 className="text-white font-semibold mb-2">PIX para Depix</h4>
                          <p className="text-gray-400 text-sm">Converta pagamentos PIX automaticamente em Depix</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 rounded-xl border border-purple-500/20">
                          <Monitor className="w-8 h-8 text-purple-400 mb-3" />
                          <h4 className="text-white font-semibold mb-2">Gestão de Produtos</h4>
                          <p className="text-gray-400 text-sm">Cadastre produtos, controle estoque e organize seu catálogo</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 p-6 rounded-xl border border-green-500/20">
                          <div className="w-8 h-8 text-green-400 mb-3 flex items-center justify-center">
                            📄
                          </div>
                          <h4 className="text-white font-semibold mb-2">Faturas Inteligentes</h4>
                          <p className="text-gray-400 text-sm">Crie faturas profissionais com QR codes automáticos</p>
                        </div>

                        <div className="hidden md:block bg-gradient-to-br from-yellow-900/30 to-orange-900/30 p-6 rounded-xl border border-yellow-500/20">
                          <div className="w-8 h-8 text-yellow-400 mb-3 flex items-center justify-center">
                            👥
                          </div>
                          <h4 className="text-white font-semibold mb-2">Fácil para Colaboradores</h4>
                          <p className="text-gray-400 text-sm">Interface simples, ideal para pessoas sem conhecimento técnico</p>
                        </div>

                        <div className="hidden md:block bg-gradient-to-br from-red-900/30 to-pink-900/30 p-6 rounded-xl border border-red-500/20">
                          <div className="w-8 h-8 text-red-400 mb-3 flex items-center justify-center">
                            📊
                          </div>
                          <h4 className="text-white font-semibold mb-2">Relatórios Avançados</h4>
                          <p className="text-gray-400 text-sm">Análises detalhadas de vendas e performance em tempo real</p>
                        </div>

                        <div className="hidden md:block bg-gradient-to-br from-indigo-900/30 to-blue-900/30 p-6 rounded-xl border border-indigo-500/20">
                          <div className="w-8 h-8 text-indigo-400 mb-3 flex items-center justify-center">
                            ⚡
                          </div>
                          <h4 className="text-white font-semibold mb-2">Vendas Ultrarrápidas</h4>
                          <p className="text-gray-400 text-sm">Checkout otimizado para transações em segundos</p>
                        </div>
                      </div>

                      <div className="mt-8 max-w-md mx-auto">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                          <span>Progresso</span>
                          <span>75%</span>
                        </div>
                        <div className="progress-commerce">
                          <div className="progress-fill" style={{ width: '75%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Lançamento em breve
                        </p>
                      </div>

                      <div className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 px-6 py-3 rounded-full">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        <span className="text-blue-400 font-medium">Em desenvolvimento ativo</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

        {/* Floating Action Menu - Only for authenticated commerce users */}
        {hasCommerceAccess && (
          <FloatingActionMenu
            onCreateLink={handleCreateLink}
            onCreateQR={handleCreateQR}
            onPOS={handlePOS}
          />
        )}


        {/* Celebration Animation */}
        <ConfettiCelebration isActive={showCelebration} />
      </div>
    </div>
  );
}