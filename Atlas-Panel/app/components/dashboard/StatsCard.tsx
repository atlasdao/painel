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
      className={`atlas-card ${
        isAnimated ? 'animate-slide-up' : ''
      }`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-2">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-2 flex items-center gap-1 ${
                trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center`}
        >
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};
