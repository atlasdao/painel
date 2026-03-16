'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  ArrowLeftRight,
  Banknote,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuickActionsProps {
  onSendOpen: () => void;
  onReceiveOpen: () => void;
}

interface ActionItem {
  label: string;
  icon: typeof ArrowUpRight;
  comingSoon: boolean;
  action: () => void;
}

export function QuickActions({ onSendOpen, onReceiveOpen }: QuickActionsProps) {
  const router = useRouter();

  const actions: ActionItem[] = [
    {
      label: 'Enviar',
      icon: ArrowUpRight,
      comingSoon: false,
      action: onSendOpen,
    },
    {
      label: 'Receber',
      icon: ArrowDownLeft,
      comingSoon: false,
      action: onReceiveOpen,
    },
    {
      label: 'Cobrar',
      icon: QrCode,
      comingSoon: false,
      action: () => router.push('/dash/vendas'),
    },
    {
      label: 'Trocar',
      icon: ArrowLeftRight,
      comingSoon: true,
      action: () => toast('Em breve', { description: 'Trocar estará disponível em breve.' }),
    },
    {
      label: 'Enviar PIX',
      icon: Banknote,
      comingSoon: true,
      action: () => toast('Em breve', { description: 'Enviar PIX estará disponível em breve.' }),
    },
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl transition-colors"
              style={{
                minHeight: 72,
                padding: '0.75rem 0.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                opacity: item.comingSoon ? 0.5 : 1,
                cursor: item.comingSoon ? 'default' : 'pointer',
              }}
            >
              {item.comingSoon && (
                <span
                  className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-medium rounded-full"
                  style={{
                    padding: '1px 5px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock size={8} />
                  Breve
                </span>
              )}
              <Icon
                size={20}
                strokeWidth={1.8}
                style={{ color: item.comingSoon ? 'var(--text-muted)' : 'var(--text-primary)' }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: item.comingSoon ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
