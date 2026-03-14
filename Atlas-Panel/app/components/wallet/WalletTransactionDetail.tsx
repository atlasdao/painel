'use client';

import { useState, useMemo } from 'react';
import { X, Copy, Check, ExternalLink, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { WalletTransaction } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

interface WalletTransactionDetailProps {
  tx: WalletTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function getAssetInfo(assetId: string) {
  if (assetId === LIQUID_ASSETS.DEPIX.id) return { name: 'Depix', prefix: 'R$ ', color: 'emerald', isStablecoin: true };
  if (assetId === LIQUID_ASSETS.USDT.id) return { name: 'L-USDT', prefix: '$ ', color: 'green', isStablecoin: true };
  if (assetId === LIQUID_ASSETS.LBTC.id) return { name: 'L-BTC', prefix: '', color: 'orange', isStablecoin: false };
  return { name: 'Token', prefix: '', color: 'zinc', isStablecoin: false };
}

function formatAmount(sats: bigint, isStablecoin: boolean): string {
  const divisor = BigInt(10 ** 8);
  const whole = sats / divisor;
  const frac = (sats < BigInt(0) ? -sats % divisor : sats % divisor).toString().padStart(8, '0');
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (isStablecoin) return `${wholeStr},${frac.slice(0, 2)}`;
  const trimmed = frac.replace(/0+$/, '').padEnd(2, '0');
  return `${wholeStr},${trimmed}`;
}

const EXPLORER_URL = 'https://blockstream.info/liquid/tx';

const CIRCLE_STYLES: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-500' },
};

export default function WalletTransactionDetail({ tx, isOpen, onClose }: WalletTransactionDetailProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const asset = useMemo(() => tx ? getAssetInfo(tx.asset) : null, [tx?.asset]);
  const formattedAmount = useMemo(
    () => (tx && asset ? formatAmount(tx.amount, asset.isStablecoin) : ''),
    [tx?.amount, asset],
  );

  if (!isOpen || !tx || !asset) return null;

  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isIncoming = tx.type === 'incoming';
  const style = CIRCLE_STYLES[asset.color] || CIRCLE_STYLES.zinc;

  const dateTimeStr = tx.blockTime
    ? new Date(tx.blockTime * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div
          className="bg-[var(--bg-card)] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Detalhes</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* ─── Amount hero ─── */}
            <div className="text-center py-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${style.bg}`}>
                {isIncoming
                  ? <ArrowDownLeft className={`w-6 h-6 ${style.text}`} />
                  : <ArrowUpRight className={`w-6 h-6 ${style.text}`} />
                }
              </div>

              <p className={`text-2xl font-bold tabular-nums ${
                isIncoming ? 'text-emerald-500' : 'text-[var(--text-primary)]'
              }`}>
                {isIncoming ? '+' : '−'}{asset.prefix}{formattedAmount}
              </p>

              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-[var(--text-muted)]">{asset.name}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {isIncoming ? 'Recebido' : 'Enviado'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-2">
                <div className={`w-2 h-2 rounded-full ${
                  tx.confirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`} />
                <span className={`text-xs font-medium ${
                  tx.confirmed ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {tx.confirmed ? 'Confirmado' : 'Pendente'}
                </span>
              </div>
            </div>

            {/* ─── Info rows ─── */}
            <div className="bg-[var(--bg-tertiary)] rounded-xl divide-y divide-[var(--border-default)]">
              {/* TXID */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)]">ID da Transação</span>
                  <button
                    onClick={() => handleCopy(tx.txid, 'txid')}
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'txid' ? (
                      <><Check className="w-3 h-3" /> Copiado</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copiar</>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-[var(--text-primary)] break-all leading-relaxed">
                  {tx.txid}
                </p>
              </div>

              {/* Date + Time */}
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)]">Data e hora</span>
                <span className="text-sm text-[var(--text-primary)]">{dateTimeStr}</span>
              </div>

              {/* Block Height */}
              {tx.blockHeight && (
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)]">Bloco</span>
                  <span className="text-sm font-mono text-[var(--text-primary)]">
                    #{tx.blockHeight.toLocaleString('pt-BR')}
                  </span>
                </div>
              )}

              {/* Asset */}
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)]">Ativo</span>
                <span className="text-sm text-[var(--text-primary)] font-medium">{asset.name}</span>
              </div>

              {/* Network */}
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)]">Rede</span>
                <span className="text-sm text-[var(--text-primary)]">Liquid Network</span>
              </div>
            </div>

            {/* Explorer link */}
            <a
              href={`${EXPLORER_URL}/${tx.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-sm font-medium border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no explorador
            </a>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
