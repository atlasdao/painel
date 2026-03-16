'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import { useBiometric } from '@/app/hooks/useBiometric';
import { usePin } from '@/app/hooks/usePin';
import WalletSetup from '@/app/components/wallet/WalletSetup';
import WalletUnlock from '@/app/components/wallet/WalletUnlock';
import WalletDashboard from '@/app/components/wallet/WalletDashboard';
import BiometricEnrollPrompt from '@/app/components/wallet/BiometricEnrollPrompt';
import PinSetup from '@/app/components/wallet/PinSetup';
import Cookies from 'js-cookie';

const SETUP_KEY = 'atlas_wallet_setup';

export default function WalletPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);

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
  const pin = usePin(userId);

  // SYNCHRONOUS check: is there a pending setup in sessionStorage?
  const hasSetupPending = typeof window !== 'undefined' && !!sessionStorage.getItem(SETUP_KEY);

  const handleBiometricUnlock = useCallback(async () => {
    const password = await biometric.unlockWithBiometric();
    await wallet.unlock(password);
  }, [biometric.unlockWithBiometric, wallet.unlock]);

  // Handle unlock with password — check if PIN should be offered afterward
  const handlePasswordUnlock = useCallback(async (password: string) => {
    await wallet.unlock(password);

    // After successful password unlock, if PIN is not enabled, offer PIN setup
    if (!pin.pinEnabled) {
      try {
        const words = await wallet.getMnemonic(password);
        const mnemonic = words.join(' ');
        setPendingMnemonic(mnemonic);
        setShowPinSetup(true);
      } catch {
        // If mnemonic retrieval fails, just continue without PIN setup
      }
    }
  }, [wallet.unlock, wallet.getMnemonic, pin.pinEnabled]);

  const handlePinSetupComplete = useCallback(async (pinCode: string) => {
    if (!pendingMnemonic) return;
    try {
      await pin.setupPin(pendingMnemonic, pinCode);
    } catch (err: any) {
      console.error('[Wallet] PIN setup failed:', err.message);
    }
    setPendingMnemonic(null);
    setShowPinSetup(false);
    // If coming from wallet creation (setup state), finalize now
    if (wallet.state === 'setup') {
      wallet.completeSetup();
    }
  }, [pendingMnemonic, pin.setupPin, wallet.state, wallet.completeSetup]);

  const handlePinSetupSkip = useCallback(() => {
    setPendingMnemonic(null);
    setShowPinSetup(false);
    // If coming from wallet creation (setup state), finalize now
    if (wallet.state === 'setup') {
      wallet.completeSetup();
    }
  }, [wallet.state, wallet.completeSetup]);

  // After wallet creation, capture mnemonic and show biometric + PIN prompts
  const handleSetupComplete = useCallback(async () => {
    // Read mnemonic directly from sessionStorage (avoids stale closure issues)
    try {
      const raw = sessionStorage.getItem(SETUP_KEY);
      if (raw) {
        const { words } = JSON.parse(raw);
        if (Array.isArray(words) && words.length === 12) {
          setPendingMnemonic(words.join(' '));
        }
      }
    } catch {
      // fallback: try from hook state
      if (wallet.setupWords && wallet.setupWords.length === 12) {
        setPendingMnemonic(wallet.setupWords.join(' '));
      }
    }

    if (biometric.state.isAvailable && !biometric.state.isEnabled) {
      setShowBiometricPrompt(true);
    } else {
      // No biometric available, go straight to PIN setup
      setShowPinSetup(true);
    }
  }, [biometric.state.isAvailable, biometric.state.isEnabled, wallet.setupWords]);

  const handleBiometricEnrollComplete = useCallback(() => {
    setShowBiometricPrompt(false);
    // After biometric, offer PIN setup
    setShowPinSetup(true);
  }, []);

  const handleBiometricEnrollSkip = useCallback(() => {
    setShowBiometricPrompt(false);
    // After skipping biometric, still offer PIN setup
    setShowPinSetup(true);
  }, []);

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

  // PIN setup overlay after password unlock
  if (showPinSetup && pendingMnemonic) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-sm mx-auto text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Configure um PIN para desbloquear mais rápido
          </p>
          <PinSetup
            onComplete={handlePinSetupComplete}
            onSkip={handlePinSetupSkip}
          />
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
          onUnlock={handlePasswordUnlock}
          onUnlockWithPin={pin.pinEnabled ? pin.unlockWithPin : undefined}
          onUnlockWithMnemonic={pin.pinEnabled ? wallet.unlockWithMnemonic : undefined}
          error={wallet.error}
          biometricAvailable={biometricReady}
          onBiometricUnlock={biometricReady ? handleBiometricUnlock : undefined}
          pinEnabled={pin.pinEnabled}
          pinLocked={pin.pinLocked}
          cooldownSeconds={pin.cooldownRemaining}
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
        pinEnabled={pin.pinEnabled}
        onSetupPin={pin.setupPin}
        onRemovePin={pin.removePin}
        onChangePin={pin.changePin}
      />
    </div>
  );
}
