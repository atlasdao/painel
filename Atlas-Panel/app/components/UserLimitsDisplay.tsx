'use client';

import { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield
} from 'lucide-react';

interface LimitData {
  title: string;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  percentage: number | null;
  resetsIn: string;
  displayType?: string;
  largestToday?: number | null;
  formatted?: string;
}

interface StatusInfo {
  type: 'safe' | 'warning' | 'danger';
  title: string;
  message: string;
  recommendation?: string;
  percentageUsed: number;
}

export default function UserLimitsDisplay() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setLoading(true);

        const response = await api.get('/profile/limits');

        setLimits(response.data);
      } catch (err: any) {
        console.error('UserLimitsDisplay: Error:', err);
        setError(err.response?.data?.message || err.message || 'Erro ao carregar limites');
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
    const interval = setInterval(fetchLimits, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'safe': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'danger': return 'text-red-600 dark:text-red-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'danger': return <XCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const safePercentage = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
      return 0;
    }
    return Math.max(0, Math.min(100, percentage));
  };

  const renderLimitCard = (key: string, data: LimitData, icon: React.ReactNode) => {
    if (!data || typeof data !== 'object') {
      return (
        <div className="atlas-card border-red-300 dark:border-red-500/20">
          <p className="text-red-600 dark:text-red-400">Dados invalidos para {key}</p>
        </div>
      );
    }

    if (data.displayType === 'static') {
      return (
        <div className="atlas-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="atlas-icon">
                {icon}
              </div>
              <div>
                <h4 className="text-sm text-[var(--text-muted)]">{data.title}</h4>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.limit)}
                </p>
              </div>
            </div>
            <Zap className="w-5 h-5 text-[var(--accent)]" />
          </div>

          {data.largestToday !== undefined && (
            <div className="pt-3 border-t border-[var(--border-default)]">
              <p className="text-sm text-[var(--text-muted)]">Maior transacao hoje:</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCurrency(data.largestToday)}
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="atlas-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="atlas-icon">
              {icon}
            </div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)]">{data.title}</h4>
          </div>
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {formatCurrency(data.used)}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              / {formatCurrency(data.limit)}
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(safePercentage(data.percentage))}`}
                style={{ width: `${safePercentage(data.percentage)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">
              Disponivel: {formatCurrency(data.remaining)}
            </span>
            <span className="text-[var(--text-muted)]">
              {Math.round(safePercentage(data.percentage))}%
            </span>
          </div>

          {data.resetsIn && (
            <div className="pt-2 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3 inline mr-1" />
                Reseta em {data.resetsIn}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="atlas-card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--skeleton-bg)] rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-[var(--skeleton-bg)] rounded-lg"></div>
            <div className="h-40 bg-[var(--skeleton-bg)] rounded-lg"></div>
            <div className="h-40 bg-[var(--skeleton-bg)] rounded-lg"></div>
            <div className="h-40 bg-[var(--skeleton-bg)] rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="atlas-card">
        <p className="text-[var(--text-muted)]">Nenhum limite disponivel</p>
      </div>
    );
  }

  try {
    const status = limits.status as StatusInfo;

    return (
      <div className="atlas-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Shield className="w-6 h-6 text-[var(--accent)]" />
            Meus Limites
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {limits.limits?.dailyPersonal && (
            renderLimitCard('dailyPersonal', limits.limits.dailyPersonal,
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />)
          )}

          {limits.limits?.singleTransaction && (
            renderLimitCard('singleTransaction', limits.limits.singleTransaction,
              <CreditCard className="w-5 h-5 text-[var(--accent)]" />)
          )}

          {limits.limits?.dailyApi && (
            renderLimitCard('dailyApi', limits.limits.dailyApi,
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />)
          )}

          {limits.limits?.monthlyApi && (
            renderLimitCard('monthlyApi', limits.limits.monthlyApi,
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />)
          )}
        </div>

      </div>
    );
  } catch (renderError) {
    console.error('UserLimitsDisplay render error:', renderError);
    return (
      <div className="p-6 bg-red-100 dark:bg-red-500/10 rounded-xl border border-red-300 dark:border-red-500/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            Erro nos Limites
          </h3>
        </div>
        <div className="p-4 rounded-lg border bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/20">
          <p className="text-red-700 dark:text-red-300">
            Erro ao renderizar os limites. Dados podem estar malformados.
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            Erro: {renderError instanceof Error ? renderError.message : 'Erro desconhecido'}
          </p>
        </div>
      </div>
    );
  }
}
