import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isAnimated?: boolean;
  delay?: number;
  onHover?: () => void;
  onLeave?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  isAnimated = false,
  delay = 0,
  onHover,
  onLeave,
}) => {
  return (
    <div
      className={`stat-card card-lift ${
        isAnimated ? 'animate-slide-up' : ''
      }`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-2 flex items-center gap-1 ${
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={`w-14 h-14 ${iconBgColor} rounded-lg flex items-center justify-center transition-all duration-300 ${
            isAnimated ? 'animate-float' : ''
          }`}
        >
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};