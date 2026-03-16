'use client';

import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/app/lib/terminology';
import type { UnifiedActivityItem } from '@/app/types';

interface ActivityFeedProps {
  items: UnifiedActivityItem[];
  loading?: boolean;
}

function StatusDot({ status }: { status: UnifiedActivityItem['status'] }) {
  if (status === 'confirmed') return null;
  const color = status === 'pending' ? 'var(--color-warning)' : 'var(--color-error)';
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: 6, height: 6, background: color, flexShrink: 0 }}
    />
  );
}

function ActivityItem({ item }: { item: UnifiedActivityItem }) {
  const isIn = item.direction === 'in';
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(item.timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  })();

  const displayAmount = formatCurrency(item.amount, item.asset);
  const sign = isIn ? '+' : '-';

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: isIn ? 'var(--color-success)' : 'var(--text-primary)' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {item.counterparty || item.assetLabel}
          </span>
          <StatusDot status={item.status} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {item.note || timeAgo}
        </span>
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span
          className="text-sm font-semibold"
          style={{ color: isIn ? 'var(--color-success)' : 'var(--text-primary)' }}
        >
          {sign} {displayAmount}
        </span>
        {item.note && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {timeAgo}
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="rounded-full animate-pulse"
        style={{ width: 36, height: 36, background: 'var(--bg-elevated)' }}
      />
      <div className="flex-1 flex flex-col gap-2">
        <div
          className="h-3 w-24 rounded animate-pulse"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <div
          className="h-2.5 w-16 rounded animate-pulse"
          style={{ background: 'var(--bg-elevated)' }}
        />
      </div>
      <div
        className="h-3.5 w-20 rounded animate-pulse"
        style={{ background: 'var(--bg-elevated)' }}
      />
    </div>
  );
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  return (
    <div className="px-4 pb-24">
      <h3
        className="text-sm font-semibold mb-2 pt-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Atividade recente
      </h3>

      {loading ? (
        <div>
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
        >
          <Clock size={24} style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma atividade ainda
          </span>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
