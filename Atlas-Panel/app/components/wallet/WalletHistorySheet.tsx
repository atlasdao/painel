'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import type { WalletTransaction } from '@/app/lib/wallet/wallet-types';
import WalletTransactionItem from './WalletTransactionItem';
import WalletTransactionDetail from './WalletTransactionDetail';

interface WalletHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: WalletTransaction[];
  loading: boolean;
}

type FilterType = 'all' | 'incoming' | 'outgoing';

export default function WalletHistorySheet({ isOpen, onClose, transactions, loading }: WalletHistorySheetProps) {
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTxs = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(tx => tx.type === filter);
  }, [transactions, filter]);

  const incomingCount = transactions.filter(tx => tx.type === 'incoming').length;
  const outgoingCount = transactions.filter(tx => tx.type === 'outgoing').length;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: transactions.length },
    { key: 'incoming', label: 'Recebidos', count: incomingCount },
    { key: 'outgoing', label: 'Enviados', count: outgoingCount },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-card)] safe-area-top">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex-1">Histórico</h2>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {filteredTxs.length} {filteredTxs.length === 1 ? 'transação' : 'transações'}
          </span>
        </div>

        {/* Filter tabs */}
        {(incomingCount > 0 && outgoingCount > 0) && (
          <div className="px-4 pt-3 pb-1 bg-[var(--bg-card)]">
            <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-0.5">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filter === f.key
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction list — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && transactions.length === 0 ? (
            <div className="divide-y divide-[var(--border-default)]">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-9 h-9 rounded-full flex-shrink-0 skeleton-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded-md skeleton-shimmer" style={{ width: `${60 + (i % 3) * 12}px` }} />
                    <div className="h-3 rounded-md skeleton-shimmer" style={{ width: `${72 + (i % 2) * 20}px` }} />
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                    <div className="h-3.5 rounded-md skeleton-shimmer" style={{ width: `${80 + (i % 3) * 8}px` }} />
                    <div className="h-3 w-14 rounded-md skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {filter === 'all' ? 'Nenhuma transação' : filter === 'incoming' ? 'Nenhuma transação recebida' : 'Nenhuma transação enviada'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {filter === 'all' ? 'Suas transações aparecerão aqui' : 'Tente outro filtro'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {filteredTxs.map(tx => (
                <WalletTransactionItem
                  key={tx.txid}
                  tx={tx}
                  onClick={setSelectedTx}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction detail modal — on top of history */}
      <WalletTransactionDetail
        tx={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </>
  );
}
