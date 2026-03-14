'use client';

import { useState, useMemo, memo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AssetBalance, WalletSettings } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

interface WalletBalanceCardProps {
  balances: AssetBalance[];
  loading: boolean;
  displayCurrency?: WalletSettings['displayCurrency'];
  usdBrlRate?: number;
}

function formatFiat(value: number, currency: 'BRL' | 'USD'): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCrypto(sats: bigint, precision: number): string {
  const divisor = BigInt(10 ** precision);
  const whole = sats / divisor;
  const frac = sats % divisor;
  const fracStr = frac.toString().padStart(precision, '0');
  const trimmed = fracStr.replace(/0+$/, '').padEnd(2, '0');
  return `${whole.toLocaleString('pt-BR')},${trimmed}`;
}

const ASSET_ICON_URLS: Record<string, string> = {
  [LIQUID_ASSETS.LBTC.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.LBTC.id}/icon`,
  [LIQUID_ASSETS.DEPIX.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.DEPIX.id}/icon`,
  [LIQUID_ASSETS.USDT.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.USDT.id}/icon`,
};

function AssetIcon({ balance }: { balance: AssetBalance }) {
  const iconUrl = ASSET_ICON_URLS[balance.assetId];
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={balance.ticker}
        className="w-6 h-6 rounded-full object-cover"
      />
    );
  }

  const color = balance.metadata?.iconColor || 'violet';
  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
    green: { bg: 'bg-green-500/20', text: 'text-green-500' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
    violet: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
  };
  const c = colorMap[color] || colorMap.violet;
  const prefix = balance.metadata?.prefix || balance.ticker.slice(0, 2);
  return (
    <div className={`w-6 h-6 ${c.bg} rounded-full flex items-center justify-center`}>
      <span className={`text-[10px] font-bold ${c.text}`}>{prefix}</span>
    </div>
  );
}

function WalletBalanceCardInner({ balances, loading, displayCurrency = 'BRL', usdBrlRate = 0 }: WalletBalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  const totalFiat = useMemo(() => {
    const totalBrl = balances.reduce((sum, b) => sum + b.fiatValue, 0);
    if (displayCurrency === 'USD' && usdBrlRate > 0) return totalBrl / usdBrlRate;
    return totalBrl;
  }, [balances, displayCurrency, usdBrlRate]);

  const visibleBalances = useMemo(() => {
    return balances.filter(b => b.amount > BigInt(0) || b.metadata?.isKnown);
  }, [balances]);

  return (
    <div className="space-y-3">
      {/* Main balance */}
      <div className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/80 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />

        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-xs text-white/70 font-medium">Saldo Total</p>
            {loading && balances.length === 0 ? (
              <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-0.5 tabular-nums">
                {hidden ? '****' : formatFiat(totalFiat, displayCurrency)}
              </p>
            )}
          </div>
          <button
            onClick={() => setHidden(!hidden)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {hidden ? <EyeOff className="w-5 h-5 text-white/70" /> : <Eye className="w-5 h-5 text-white/70" />}
          </button>
        </div>
      </div>

      {/* Asset cards - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {visibleBalances.map(b => (
          <div key={b.assetId} className="flex-shrink-0 flex-1 min-w-[140px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <AssetIcon balance={b} />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {b.metadata?.name || b.ticker}
              </span>
            </div>
            {loading && b.amount === BigInt(0) ? (
              <div className="h-5 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            ) : (
              <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                {hidden ? '****' : `${b.metadata?.prefix || ''}${formatCrypto(b.amount, b.metadata?.precision || 8)}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(WalletBalanceCardInner);
