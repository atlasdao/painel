'use client';

import { ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

interface DepositCTAProps {
  balance: number;
  onReceiveOpen: () => void;
}

export function DepositCTA({ balance, onReceiveOpen }: DepositCTAProps) {
  if (balance > 0) return null;

  return (
    <div
      className="mx-4 rounded-xl p-5 flex flex-col gap-3 animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            background: 'var(--accent-soft)',
          }}
        >
          <ArrowDownLeft size={18} style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Adicione dinheiro à sua conta
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Receba via PIX, Bitcoin ou transferência de outro usuário Atlas
          </span>
        </div>
      </div>
      <button
        onClick={onReceiveOpen}
        className="atlas-btn text-sm"
        style={{ minHeight: 44 }}
      >
        Adicionar dinheiro
      </button>
    </div>
  );
}
