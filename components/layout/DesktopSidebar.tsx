'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ScanLine,
  ShoppingBag,
  Menu,
  Users,
  BarChart3,
  Server,
  FileSearch,
  Shield,
} from 'lucide-react';
import { User } from '@/app/types';

interface DesktopSidebarProps {
  user: User | null;
  onScanOpen: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string | null;
  action?: 'scan';
}

const mainItems: NavItem[] = [
  { label: 'Início', icon: Home, href: '/dash' },
  { label: 'Scan', icon: ScanLine, href: null, action: 'scan' },
  { label: 'Vendas', icon: ShoppingBag, href: '/dash/vendas' },
  { label: 'Menu', icon: Menu, href: '/dash/menu' },
];

const adminItems: NavItem[] = [
  { label: 'Usuários', icon: Users, href: '/dash/admin/users' },
  { label: 'Transações', icon: BarChart3, href: '/dash/admin/transactions' },
  { label: 'Sistema', icon: Server, href: '/dash/admin/system' },
  { label: 'Auditoria', icon: FileSearch, href: '/dash/admin/audit' },
];

function SidebarItem({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 text-sm font-medium"
      style={{
        minHeight: 44,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-soft)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
    </button>
  );
}

export function DesktopSidebar({ user, onScanOpen }: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string | null) => {
    if (!href) return false;
    if (href === '/dash') return pathname === '/dash';
    return pathname.startsWith(href);
  };

  const isAdmin = user?.roles?.includes('ADMIN') || user?.role === 'ADMIN';

  const handleClick = (item: NavItem) => {
    if (item.action === 'scan') {
      onScanOpen();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0"
      style={{
        width: 240,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-default)',
        height: '100%',
      }}
    >
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {mainItems.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            active={isActive(item.href)}
            onClick={() => handleClick(item)}
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-3" style={{ borderTop: '1px solid var(--border-default)' }} />
            <div className="flex items-center gap-2 px-3 mb-1">
              <Shield size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Admin
              </span>
            </div>
            {adminItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                active={isActive(item.href)}
                onClick={() => handleClick(item)}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
