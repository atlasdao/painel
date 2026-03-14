'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import { useBiometric } from '@/app/hooks/useBiometric';
import WalletSetup from '@/app/components/wallet/WalletSetup';
import WalletUnlock from '@/app/components/wallet/WalletUnlock';
import WalletDashboard from '@/app/components/wallet/WalletDashboard';
import BiometricEnrollPrompt from '@/app/components/wallet/BiometricEnrollPrompt';
import Cookies from 'js-cookie';

const SETUP_KEY = 'atlas_wallet_setup';

export default function WalletPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

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

  // SYNCHRONOUS check: is there a pending setup in sessionStorage?
  const hasSetupPending = typeof window !== 'undefined' && !!sessionStorage.getItem(SETUP_KEY);

  const handleBiometricUnlock = useCallback(async () => {
    const password = await biometric.unlockWithBiometric();
    await wallet.unlock(password);
  }, [biometric.unlockWithBiometric, wallet.unlock]);

  const handleSetupComplete = useCallback(async () => {
    // Check if biometric is available and not yet configured
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

  const handleEnableBiometric = useCallback(async (password: string) => {
    await biometric.enableBiometric(password);
    wallet.updateSettings({ ...wallet.settings, biometricEnabled: true });
  }, [biometric.enableBiometric, wallet.updateSettings, wallet.settings]);

  const handleDisableBiometric = useCallback(() => {
    biometric.disableBiometric();
    wallet.updateSettings({ ...wallet.settings, biometricEnabled: false });
  }, [biometric.disableBiometric, wallet.updateSettings, wallet.settings]);

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

  // Biometric enroll prompt after setup
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

  // Setup flow
  if (wallet.state === 'no-wallet' || wallet.state === 'setup' || hasSetupPending) {
    return (
      <div className="py-8 px-4">
        <WalletSetup
          onCreateWallet={wallet.generateMnemonic}
          onImportWallet={wallet.importMnemonic}
          onSetupComplete={handleSetupComplete}
          restoredWords={wallet.setupWords}
        />
      </div>
    );
  }

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
        biometricAvailable={biometric.state.isAvailable}
        biometricEnabled={biometric.state.isEnabled}
        onEnableBiometric={handleEnableBiometric}
        onDisableBiometric={handleDisableBiometric}
        onBiometricAuth={biometric.state.isEnabled ? biometric.unlockWithBiometric : undefined}
      />
    </div>
  );
}
