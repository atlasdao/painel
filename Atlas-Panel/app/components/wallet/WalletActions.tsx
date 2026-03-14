'use client';

import { memo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, ArrowLeftRight, Banknote } from 'lucide-react';

interface WalletActionsProps {
  onReceive: () => void;
  onSend: () => void;
  onHistory: () => void;
  disabled?: boolean;
}

function WalletActionsInner({ onReceive, onSend, onHistory, disabled }: WalletActionsProps) {
  return (
    <div className="grid grid-cols-5 gap-1 w-full max-w-md mx-auto">
      <button
        onClick={onReceive}
        disabled={disabled}
        className="flex flex-col items-center gap-1 py-2 group disabled:opacity-50"
      >
        <div className="w-11 h-11 bg-emerald-500/15 rounded-full flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
          <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
        </div>
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">Receber</span>
      </button>

      <button
        onClick={onSend}
        disabled={disabled}
        className="flex flex-col items-center gap-1 py-2 group disabled:opacity-50"
      >
        <div className="w-11 h-11 bg-blue-500/15 rounded-full flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
          <ArrowUpRight className="w-5 h-5 text-blue-500" />
        </div>
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">Enviar</span>
      </button>

      <button
        disabled
        className="flex flex-col items-center gap-1 py-2 group disabled:opacity-60 relative"
      >
        <div className="w-11 h-11 bg-amber-500/15 rounded-full flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-amber-500" />
        </div>
        <span className="text-[10px] font-medium text-amber-500">Trocar</span>
        <span className="absolute top-0.5 right-0 text-[7px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-px rounded-full font-bold leading-tight">Breve</span>
      </button>

      <button
        disabled
        className="flex flex-col items-center gap-1 py-2 group disabled:opacity-60 relative"
      >
        <div className="w-11 h-11 bg-green-500/15 rounded-full flex items-center justify-center">
          <Banknote className="w-5 h-5 text-green-500" />
        </div>
        <span className="text-[10px] font-medium text-green-500">Sacar</span>
        <span className="absolute top-0.5 right-0 text-[7px] bg-green-500/20 text-green-600 dark:text-green-400 px-1 py-px rounded-full font-bold leading-tight">Breve</span>
      </button>

      <button
        onClick={onHistory}
        className="flex flex-col items-center gap-1 py-2 group"
      >
        <div className="w-11 h-11 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center group-hover:bg-[var(--bg-hover)] transition-colors">
          <Clock className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">Histórico</span>
      </button>
    </div>
  );
}

export default memo(WalletActionsInner);
