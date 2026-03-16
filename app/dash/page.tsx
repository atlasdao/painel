'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import { useBiometric } from '@/app/hooks/useBiometric';
import { SimpleWalletSetup } from '@/components/home/SimpleWalletSetup';
import WalletUnlock from '@/app/components/wallet/WalletUnlock';
import WalletSendSheet from '@/app/components/wallet/WalletSendSheet';
import WalletReceiveSheet from '@/app/components/wallet/WalletReceiveSheet';
import BiometricEnrollPrompt from '@/app/components/wallet/BiometricEnrollPrompt';
import { UnifiedBalanceCard } from '@/components/home/UnifiedBalanceCard';
import { QuickActions } from '@/components/home/QuickActions';
import { BackupNudge } from '@/components/home/BackupNudge';
import { DepositCTA } from '@/components/home/DepositCTA';
import { ActivityFeed } from '@/components/home/ActivityFeed';
import { LIQUID_ASSETS, getKnownAssetMetadata } from '@/app/lib/wallet/wallet-types';
import { getAssetLabel } from '@/app/lib/terminology';
import type { UnifiedActivityItem } from '@/app/types';
import type { WalletTransaction } from '@/app/lib/wallet/wallet-types';
import Cookies from 'js-cookie';

const SETUP_KEY = 'atlas_wallet_setup';

/** Convert WalletTransaction[] from the real wallet hook into UnifiedActivityItem[] for the ActivityFeed */
function toActivityItems(transactions: WalletTransaction[]): UnifiedActivityItem[] {
  return transactions.map((tx) => {
    const isIncoming = tx.type === 'incoming';

    // Resolve asset ticker from asset id
    const meta = getKnownAssetMetadata(tx.asset);
    const ticker = meta?.ticker || tx.asset.slice(0, 8);
    const assetLabel = getAssetLabel(ticker);

    // Amount in human-readable units (divide by precision)
    const precision = meta?.precision || 8;
    const amount = Number(tx.amount) / Math.pow(10, precision);

    return {
      id: tx.txid,
      direction: isIncoming ? 'in' : 'out',
      amount,
      asset: ticker,
      assetLabel,
      status: tx.confirmed ? 'confirmed' : 'pending',
      timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString(),
      txid: tx.txid,
    };
  });
}

export default function DashHomePage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  // Get userId from cookie
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
  const biometric = useBiometric(userId);

  // Check for pending setup in sessionStorage
  const hasSetupPending = typeof window !== 'undefined' && !!sessionStorage.getItem(SETUP_KEY);

  // Biometric unlock handler
  const handleBiometricUnlock = useCallback(async () => {
    const password = await biometric.unlockWithBiometric();
    await wallet.unlock(password);
  }, [biometric.unlockWithBiometric, wallet.unlock]);

  // Setup complete handler
  const handleSetupComplete = useCallback(async () => {
    if (biometric.state.isAvailable && !biometric.state.isEnabled) {
      setShowBiometricPrompt(true);
    } else {
      wallet.completeSetup();
    }
  }, [biometric.state.isAvailable, biometric.state.isEnabled, wallet.completeSetup]);

  const handleBiometricEnrollComplete = useCallback(() => {
    setShowBiometricPrompt(false);
    wallet.completeSetup();
  }, [wallet.completeSetup]);

  const handleBiometricEnrollSkip = useCallback(() => {
    setShowBiometricPrompt(false);
    wallet.completeSetup();
  }, [wallet.completeSetup]);

  // Send sheet callback
  const handleTxSent = useCallback((details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => {
    setShowSend(false);
    wallet.handleTxBroadcast(details);
  }, [wallet.handleTxBroadcast]);

  // Convert real transactions to activity feed items
  const activityItems = useMemo(() => toActivityItems(wallet.transactions), [wallet.transactions]);

  // Total BRL balance for DepositCTA
  const totalBrl = useMemo(() => {
    return wallet.balances.reduce((sum, b) => sum + b.fiatValue, 0);
  }, [wallet.balances]);

  // Whether seed is backed up (inferred from settings)
  const seedBackedUp = !wallet.settings.showBackupReminder;

  // --- Render states ---

  // Loading state
  if (wallet.state === 'loading' && !hasSetupPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando carteira...</p>
        </div>
      </div>
    );
  }

  // Biometric enrollment after setup
  if (showBiometricPrompt && userId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BiometricEnrollPrompt
          userId={userId}
          onComplete={handleBiometricEnrollComplete}
          onSkip={handleBiometricEnrollSkip}
        />
      </div>
    );
  }

  // Wallet setup flow — v2 simplified (no seed words shown)
  if (wallet.state === 'no-wallet' || wallet.state === 'setup' || hasSetupPending) {
    return (
      <SimpleWalletSetup wallet={wallet} userId={userId!} />
    );
  }

  // Wallet locked
  if (wallet.state === 'locked' || wallet.state === 'unlocking') {
    const biometricReady = biometric.state.isAvailable && biometric.state.isEnabled && !biometric.state.isLoading;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletUnlock
          onUnlock={wallet.unlock}
          error={wallet.error}
          biometricAvailable={biometricReady}
          onBiometricUnlock={biometricReady ? handleBiometricUnlock : undefined}
        />
      </div>
    );
  }

  // --- Unlocked: main dashboard ---
  return (
    <div className="pb-24 md:pb-6 space-y-2">
      {/* Balance Card */}
      <UnifiedBalanceCard
        assetBalances={wallet.balances}
        prices={wallet.prices}
        loading={wallet.balanceLoading}
      />

      {/* Quick Actions */}
      <QuickActions
        onSendOpen={() => setShowSend(true)}
        onReceiveOpen={() => setShowReceive(true)}
      />

      {/* Backup Nudge */}
      <BackupNudge seedBackedUp={seedBackedUp} />

      {/* Deposit CTA (when balance is zero) */}
      <DepositCTA balance={totalBrl} onReceiveOpen={() => setShowReceive(true)} />

      {/* Activity Feed with REAL transaction data */}
      <ActivityFeed items={activityItems} loading={wallet.txLoading} />

      {/* Send Sheet */}
      <WalletSendSheet
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        balances={wallet.balances}
        utxos={wallet.utxos}
        onTxSent={handleTxSent}
        biometricEnabled={biometric.state.isEnabled}
        onBiometricAuth={biometric.state.isEnabled ? biometric.unlockWithBiometric : undefined}
      />

      {/* Receive Sheet */}
      <WalletReceiveSheet
        isOpen={showReceive}
        onClose={() => setShowReceive(false)}
        address={wallet.currentAddress}
        onNewAddress={wallet.generateNewAddress}
        defaultAsset={wallet.settings.defaultReceiveAsset}
      />
    </div>
  );
}
