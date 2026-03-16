'use client';

import { useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AssetBalance, PriceData } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

type CurrencyKey = 'brl' | 'usd' | 'btc';

interface UnifiedBalanceCardProps {
  assetBalances: AssetBalance[];
  prices: PriceData | null;
  loading?: boolean;
}

const chips: { key: CurrencyKey; label: string }[] = [
  { key: 'brl', label: 'Reais' },
  { key: 'usd', label: 'Dolares' },
  { key: 'btc', label: 'Bitcoin' },
];

function formatBalance(amount: number, currency: CurrencyKey): string {
  switch (currency) {
    case 'brl':
      return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'usd':
      return `US$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'btc':
      return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC`;
  }
}

export function UnifiedBalanceCard({ assetBalances, prices, loading }: UnifiedBalanceCardProps) {
  const [active, setActive] = useState<CurrencyKey>('brl');
  const [hidden, setHidden] = useState(false);

  const balances = useMemo(() => {
    // Total fiat value in BRL from all assets
    const totalBrl = assetBalances.reduce((sum, b) => sum + b.fiatValue, 0);

    // Convert to USD using USDT_BRL rate
    const usdRate = prices?.USDT_BRL || 1;
    const totalUsd = usdRate > 0 ? totalBrl / usdRate : 0;

    // Get BTC balance directly from LBTC asset
    const lbtcBalance = assetBalances.find(b => b.assetId === LIQUID_ASSETS.LBTC.id);
    const totalBtc = lbtcBalance ? Number(lbtcBalance.amount) / 1e8 : 0;

    return { brl: totalBrl, usd: totalUsd, btc: totalBtc };
  }, [assetBalances, prices]);

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4">
      {/* Balance */}
      <div className="flex flex-col items-center gap-1">
        {loading && assetBalances.length === 0 ? (
          <div
            className="h-10 w-48 rounded-lg animate-pulse"
            style={{ background: 'var(--bg-elevated)' }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {hidden ? '****' : formatBalance(balances[active], active)}
            </span>
            <button
              onClick={() => setHidden(!hidden)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Conta Atlas
        </span>
      </div>

      {/* Currency chips */}
      <div className="flex items-center gap-2">
        {chips.map((chip) => {
          const isActive = active === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setActive(chip.key)}
              className="text-xs font-medium rounded-full transition-all"
              style={{
                minHeight: 32,
                padding: '0.375rem 0.875rem',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--accent)' : '1px solid var(--border-default)',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
