'use client';

import { memo, useMemo } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { WalletTransaction } from '@/app/lib/wallet/wallet-types';
import WalletTransactionItem from './WalletTransactionItem';
import WalletTransactionDetail from './WalletTransactionDetail';
import { useState } from 'react';

interface WalletTransactionsProps {
  transactions: WalletTransaction[];
  loading: boolean;
  onViewAll?: () => void;
}

function WalletTransactionsInner({ transactions, loading, onViewAll }: WalletTransactionsProps) {
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const displayedTxs = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Loading skeleton
  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transações Recentes</h3>
          <div className="h-3.5 w-16 rounded-md skeleton-shimmer" />
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-default)]">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-9 h-9 rounded-full flex-shrink-0 skeleton-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded-md skeleton-shimmer" style={{ width: `${60 + (i % 3) * 12}px`, animationDelay: `${i * 80 + 40}ms` }} />
                <div className="h-3 rounded-md skeleton-shimmer" style={{ width: `${72 + (i % 2) * 20}px`, animationDelay: `${i * 80 + 80}ms` }} />
              </div>
              <div className="space-y-2 flex flex-col items-end">
                <div className="h-3.5 rounded-md skeleton-shimmer" style={{ width: `${80 + (i % 3) * 8}px`, animationDelay: `${i * 80 + 40}ms` }} />
                <div className="h-3 w-14 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 80 + 80}ms` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] px-1">Transações Recentes</h3>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhuma transação</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Suas transações aparecerão aqui</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transações Recentes</h3>
          {transactions.length > 5 && onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline transition-colors"
            >
              Ver todas ({transactions.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Transaction list — max 5 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl divide-y divide-[var(--border-default)] overflow-hidden">
          {displayedTxs.map(tx => (
            <WalletTransactionItem
              key={tx.txid}
              tx={tx}
              onClick={setSelectedTx}
            />
          ))}
        </div>

        {/* View all button — shows when > 5 txs */}
        {transactions.length > 5 && onViewAll && (
          <button
            onClick={onViewAll}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[var(--accent)] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
          >
            Ver todas ({transactions.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Detail modal */}
      <WalletTransactionDetail
        tx={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </>
  );
}

export default memo(WalletTransactionsInner);
