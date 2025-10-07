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
    // Refresh every 30 seconds
    const interval = setInterval(fetchLimits, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'danger': return 'text-red-400';
      default: return 'text-gray-400';
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
    if (percentage < 50) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (percentage < 80) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    return 'bg-gradient-to-r from-red-500 to-pink-500';
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
    // Early validation - if data is null or missing required fields, show fallback
    if (!data || typeof data !== 'object') {
      return (
        <div className="glass-card p-6 border border-red-500/20">
          <p className="text-red-400">Dados inválidos para {key}</p>
        </div>
      );
    }

    // Special rendering for single transaction limit (static display)
    if (data.displayType === 'static') {
      return (
        <div className="glass-card p-6 hover:scale-105 transition-all duration-300 border border-purple-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                {icon}
              </div>
              <div>
                <h4 className="text-sm text-gray-400">{data.title}</h4>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.limit)}
                </p>
              </div>
            </div>
            <Zap className="w-5 h-5 text-purple-400" />
          </div>

          {data.largestToday !== undefined && (
            <div className="pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400">Maior transação hoje:</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(data.largestToday)}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Regular progress bar card
    return (
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300 border border-blue-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              {icon}
            </div>
            <h4 className="text-sm font-medium text-gray-300">{data.title}</h4>
          </div>
          <Clock className="w-4 h-4 text-gray-500" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-white">
              {formatCurrency(data.used)}
            </span>
            <span className="text-sm text-gray-400">
              / {formatCurrency(data.limit)}
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(safePercentage(data.percentage))}`}
                style={{ width: `${safePercentage(data.percentage)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              Disponível: {formatCurrency(data.remaining)}
            </span>
            <span className="text-gray-500">
              {Math.round(safePercentage(data.percentage))}%
            </span>
          </div>

          {data.resetsIn && (
            <div className="pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-500">
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
      <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl backdrop-blur-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700/50 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-gray-700/50 rounded-lg"></div>
            <div className="h-40 bg-gray-700/50 rounded-lg"></div>
            <div className="h-40 bg-gray-700/50 rounded-lg"></div>
            <div className="h-40 bg-gray-700/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="p-6 bg-gray-800/50 rounded-xl backdrop-blur-xl">
        <p className="text-gray-400">Nenhum limite disponível</p>
      </div>
    );
  }

  try {
    const status = limits.status as StatusInfo;

    return (
      <div className="p-6 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl backdrop-blur-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-400" />
            Meus Limites
          </h3>

          {status && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 ${getStatusColor(status.type)}`}>
              {getStatusIcon(status.type)}
              <span className="text-sm font-medium">{status.title}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Daily Personal Limit */}
          {limits.limits?.dailyPersonal && (
            renderLimitCard('dailyPersonal', limits.limits.dailyPersonal,
              <Shield className="w-5 h-5 text-green-400" />)
          )}

          {/* Single Transaction Limit - Static Display */}
          {limits.limits?.singleTransaction && (
            renderLimitCard('singleTransaction', limits.limits.singleTransaction,
              <CreditCard className="w-5 h-5 text-purple-400" />)
          )}

          {/* Daily API/Commerce Limit */}
          {limits.limits?.dailyApi && (
            renderLimitCard('dailyApi', limits.limits.dailyApi,
              <Zap className="w-5 h-5 text-yellow-400" />)
          )}

          {/* Monthly API/Commerce Limit */}
          {limits.limits?.monthlyApi && (
            renderLimitCard('monthlyApi', limits.limits.monthlyApi,
              <TrendingUp className="w-5 h-5 text-orange-400" />)
          )}
        </div>

      </div>
    );
  } catch (renderError) {
    console.error('UserLimitsDisplay render error:', renderError);
    return (
      <div className="p-6 bg-gradient-to-br from-red-800/30 to-red-900/30 rounded-xl backdrop-blur-xl border border-red-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertCircle className="w-7 h-7 text-red-400" />
            Erro nos Limites
          </h3>
        </div>
        <div className="p-4 rounded-lg border bg-red-900/20 border-red-500/30">
          <p className="text-red-300">
            Erro ao renderizar os limites. Dados podem estar malformados.
          </p>
          <p className="text-xs text-red-400 mt-2">
            Erro: {renderError instanceof Error ? renderError.message : 'Erro desconhecido'}
          </p>
        </div>
      </div>
    );
  }
}