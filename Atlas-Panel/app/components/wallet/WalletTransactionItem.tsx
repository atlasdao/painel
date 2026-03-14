'use client';

import { memo, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { WalletTransaction } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

interface WalletTransactionItemProps {
  tx: WalletTransaction;
  onClick?: (tx: WalletTransaction) => void;
}

function getAssetInfo(assetId: string) {
  if (assetId === LIQUID_ASSETS.DEPIX.id) {
    return { name: 'Depix', prefix: 'R$ ', color: 'emerald', isStablecoin: true };
  }
  if (assetId === LIQUID_ASSETS.USDT.id) {
    return { name: 'L-USDT', prefix: '$ ', color: 'green', isStablecoin: true };
  }
  if (assetId === LIQUID_ASSETS.LBTC.id) {
    return { name: 'L-BTC', prefix: '', color: 'orange', isStablecoin: false };
  }
  return { name: 'Token', prefix: '', color: 'zinc', isStablecoin: false };
}

function formatAmount(sats: bigint, isStablecoin: boolean): string {
  const divisor = BigInt(10 ** 8);
  const whole = sats / divisor;
  const frac = (sats < BigInt(0) ? -sats % divisor : sats % divisor).toString().padStart(8, '0');
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (isStablecoin) {
    return `${wholeStr},${frac.slice(0, 2)}`;
  }
  const trimmed = frac.replace(/0+$/, '').padEnd(2, '0');
  return `${wholeStr},${trimmed}`;
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const ICON_STYLES: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-500' },
  green: { bg: 'bg-green-500/15', text: 'text-green-500' },
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-500' },
  zinc: { bg: 'bg-zinc-500/15', text: 'text-zinc-500' },
};

function WalletTransactionItemInner({ tx, onClick }: WalletTransactionItemProps) {
  const isIncoming = tx.type === 'incoming';
  const asset = useMemo(() => getAssetInfo(tx.asset), [tx.asset]);
  const amount = useMemo(() => formatAmount(tx.amount, asset.isStablecoin), [tx.amount, asset.isStablecoin]);
  const time = useMemo(() => tx.blockTime ? relativeTime(tx.blockTime) : '', [tx.blockTime]);
  const style = ICON_STYLES[asset.color] || ICON_STYLES.zinc;

  return (
    <button
      onClick={() => onClick?.(tx)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors text-left"
    >
      {/* Icon — incoming uses asset color, outgoing uses accent blue */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isIncoming ? style.bg : 'bg-blue-500/15'
      }`}>
        {isIncoming
          ? <ArrowDownLeft className={`w-[18px] h-[18px] ${style.text}`} />
          : <ArrowUpRight className="w-[18px] h-[18px] text-blue-500" />
        }
      </div>

      {/* Label + asset · time */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
          {isIncoming ? (tx.confirmed ? 'Recebido' : 'Recebendo') : (tx.confirmed ? 'Enviado' : 'Enviando')}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">
          {asset.name}{time ? ` · ${time}` : ''}
        </p>
      </div>

      {/* Amount + status */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold tabular-nums leading-tight ${
          isIncoming ? 'text-emerald-500' : 'text-[var(--text-primary)]'
        }`}>
          {isIncoming ? '+' : '−'}{asset.prefix}{amount}
        </p>
        <div className="flex items-center gap-1.5 justify-end mt-1">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            tx.confirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
          }`} />
          <span className="text-[11px] text-[var(--text-muted)] leading-tight">
            {tx.confirmed ? 'Confirmado' : 'Pendente'}
          </span>
        </div>
      </div>
    </button>
  );
}

export default memo(WalletTransactionItemInner);
