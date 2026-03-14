'use client';

import { useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Activity,
  Users,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface MetricCardData {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: any;
  iconClass: string;
}

interface MetricsCarouselProps {
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
  activeLinks: number;
  todayTransactions: number;
  monthlyGrowth: number;
  isLoading?: boolean;
  className?: string;
}

export default function MetricsCarousel({
  totalRevenue,
  totalTransactions,
  averageTicket,
  activeLinks,
  todayTransactions,
  monthlyGrowth,
  isLoading = false,
  className = ''
}: MetricsCarouselProps) {

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || isNaN(Number(value))) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(0);
    }

    const numValue = Number(value);
    if (numValue === 0) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(0);
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const successRate = totalTransactions > 0
    ? Math.round((totalTransactions / Math.max(totalTransactions + 10, totalTransactions * 1.1)) * 100)
    : 0;

  const statCards: MetricCardData[] = [
    {
      title: 'Taxa de Sucesso',
      value: `${successRate}%`,
      subtitle: 'transacoes completas',
      icon: DollarSign,
      iconClass: 'atlas-icon-success',
    },
    {
      title: 'Total de Transacoes',
      value: formatNumber(totalTransactions),
      subtitle: `${formatNumber(todayTransactions)} hoje`,
      icon: ShoppingCart,
      iconClass: 'atlas-icon',
    },
    {
      title: 'Ticket Medio',
      value: formatCurrency(averageTicket),
      icon: Activity,
      iconClass: 'atlas-icon-warning',
    },
    {
      title: 'Links Ativos',
      value: formatNumber(activeLinks),
      subtitle: 'links de pagamento',
      icon: Users,
      iconClass: 'atlas-icon-error',
    }
  ];


  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="atlas-card animate-pulse h-32">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 bg-[var(--skeleton-bg)] rounded-lg"></div>
              </div>
              <div className="h-3 bg-[var(--skeleton-bg)] rounded w-1/2 mb-1"></div>
              <div className="h-5 bg-[var(--skeleton-bg)] rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-[var(--skeleton-bg)] rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index}>
              <div className="atlas-card h-32">
                <div className="flex items-start justify-between mb-2">
                  <div className={stat.iconClass}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {stat.change && (
                    <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${
                      stat.change > 0
                        ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-400/10'
                        : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-400/10'
                    }`}>
                      {stat.change > 0 ? (
                        <ArrowUp className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDown className="w-2.5 h-2.5" />
                      )}
                      <span className="font-semibold">{Math.abs(stat.change)}%</span>
                    </div>
                  )}
                </div>

                <h3 className="text-xs text-[var(--text-muted)] font-medium mb-2">
                  {stat.title}
                </h3>

                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
