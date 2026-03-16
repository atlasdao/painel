'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export interface MenuGridItem {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface MenuGridProps {
  items: MenuGridItem[];
}

export function MenuGrid({ items }: MenuGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            if (item.onClick) {
              item.onClick();
            } else if (item.href) {
              router.push(item.href);
            }
          }}
          className="atlas-card flex flex-col items-center justify-center gap-2 cursor-pointer"
          style={{ minHeight: 96, padding: '1.25rem 0.75rem' }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: '0.75rem',
              background: 'var(--accent-soft)',
              color: 'var(--text-primary)',
            }}
          >
            {item.icon}
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
