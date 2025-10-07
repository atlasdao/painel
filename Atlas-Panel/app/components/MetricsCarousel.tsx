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
  color: string;
  bgColor: string;
  iconBg: string;
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
    // CRITICAL FIX: Prevent white zero bug by ensuring proper null/undefined/NaN handling
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

  // Calculate success rate percentage for first card
  const successRate = totalTransactions > 0
    ? Math.round((totalTransactions / Math.max(totalTransactions + 10, totalTransactions * 1.1)) * 100)
    : 0;

  const statCards: MetricCardData[] = [
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
      value: formatNumber(totalTransactions),
      subtitle: `${formatNumber(todayTransactions)} hoje`,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
      iconBg: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(averageTicket),
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
      iconBg: 'from-purple-500/20 to-pink-500/20'
    },
    {
      title: 'Links Ativos',
      value: formatNumber(activeLinks),
      subtitle: 'links de pagamento',
      icon: Users,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-500/10 to-red-500/10',
      iconBg: 'from-orange-500/20 to-red-500/20'
    }
  ];


  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 animate-pulse h-32">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg"></div>
                <div className="w-6 h-3 bg-gray-700 rounded"></div>
              </div>
              <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
              <div className="h-5 bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index}>
              <div
                className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/60 transition-all duration-300 animate-scale-in h-32"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 bg-gradient-to-br ${stat.iconBg} rounded-lg relative overflow-hidden`}>
                    <Icon className="w-4 h-4 text-white relative z-10" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-80`}></div>
                  </div>

                  {stat.change && (
                    <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${
                      stat.change > 0
                        ? 'text-green-400 bg-green-400/10'
                        : 'text-red-400 bg-red-400/10'
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

                <h3 className="text-xs text-gray-400 font-medium mb-2">
                  {stat.title}
                </h3>

                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-white">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 font-medium">
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