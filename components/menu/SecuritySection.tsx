'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SecuritySectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SecuritySection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
}: SecuritySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="atlas-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 text-left cursor-pointer"
        style={{ padding: '1.25rem 1.5rem', minHeight: 48 }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            background: 'var(--accent-soft)',
            color: 'var(--text-primary)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      {open && (
        <div
          className="animate-fade-in"
          style={{
            padding: '0 1.5rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            paddingTop: '1.25rem',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
