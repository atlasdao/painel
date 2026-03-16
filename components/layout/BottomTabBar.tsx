'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, ScanLine, ShoppingBag, Menu } from 'lucide-react';

interface BottomTabBarProps {
  onScanOpen: () => void;
}

const tabs = [
  { label: 'Início', icon: Home, href: '/dash' },
  { label: 'Scan', icon: ScanLine, href: null },
  { label: 'Vendas', icon: ShoppingBag, href: '/dash/vendas' },
  { label: 'Menu', icon: Menu, href: '/dash/menu' },
] as const;

export function BottomTabBar({ onScanOpen }: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string | null) => {
    if (!href) return false;
    if (href === '/dash') return pathname === '/dash';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom"
      style={{
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          const isScan = tab.label === 'Scan';

          return (
            <button
              key={tab.label}
              onClick={() => {
                if (isScan) {
                  onScanOpen();
                } else if (tab.href) {
                  router.push(tab.href);
                }
              }}
              className="flex flex-col items-center justify-center gap-0.5"
              style={{
                minWidth: 64,
                minHeight: 48,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}
              aria-label={tab.label}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
