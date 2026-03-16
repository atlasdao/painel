'use client';

import { Clock } from 'lucide-react';
import type { ReactNode } from 'react';

interface ComingSoonCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function ComingSoonCard({ title, description, icon }: ComingSoonCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex items-start gap-3"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        opacity: 0.6,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}
      >
        {icon || <Clock size={18} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          <span
            className="atlas-badge"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              fontSize: '0.625rem',
            }}
          >
            <Clock size={9} />
            Em Breve
          </span>
        </div>
        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </span>
      </div>
    </div>
  );
}
