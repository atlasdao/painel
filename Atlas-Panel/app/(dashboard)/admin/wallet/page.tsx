'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import WalletSetup from '@/app/components/wallet/WalletSetup';
import WalletUnlock from '@/app/components/wallet/WalletUnlock';
import WalletDashboard from '@/app/components/wallet/WalletDashboard';
import Cookies from 'js-cookie';

const SETUP_KEY = 'atlas_wallet_setup';

export default function WalletPage() {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    try {
      const userCookie = Cookies.get('user');
      if (userCookie) {
        const user = JSON.parse(userCookie);
        setUserId(user.id);
      }
    } catch {
      // ignore
    }
  }, []);

  const wallet = useWallet(userId);

  // SYNCHRONOUS check: is there a pending setup in sessionStorage?
  // This is the ultimate fallback — even if hook state is wrong, this catches it.
  const hasSetupPending = typeof window !== 'undefined' && !!sessionStorage.getItem(SETUP_KEY);

  if (wallet.state === 'loading' && !hasSetupPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Carregando carteira...</p>
        </div>
      </div>
    );
  }

  // Setup flow: show WalletSetup if state is setup/no-wallet OR sessionStorage has pending setup
  if (wallet.state === 'no-wallet' || wallet.state === 'setup' || hasSetupPending) {
    return (
      <div className="py-8 px-4">
        <WalletSetup
          onCreateWallet={wallet.generateMnemonic}
          onImportWallet={wallet.importMnemonic}
          onSetupComplete={wallet.completeSetup}
          restoredWords={wallet.setupWords}
        />
      </div>
    );
  }

  if (wallet.state === 'locked' || wallet.state === 'unlocking') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletUnlock
          onUnlock={wallet.unlock}
          error={wallet.error}
        />
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-6">
      <WalletDashboard
        balances={wallet.balances}
        balanceLoading={wallet.balanceLoading}
        transactions={wallet.transactions}
        txLoading={wallet.txLoading}
        utxos={wallet.utxos}
        currentAddress={wallet.currentAddress}
        wasmReady={wallet.wasmReady}
        settings={wallet.settings}
        usdBrlRate={wallet.prices?.USDT_BRL || 0}
        onNewAddress={wallet.generateNewAddress}
        onTxSent={wallet.handleTxBroadcast}
        onViewSeed={wallet.getMnemonic}
        onDeleteWallet={wallet.deleteWallet}
        onUpdateSettings={wallet.updateSettings}
      />
    </div>
  );
}
