'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletWorker } from './useWalletWorker';
import { useWalletBalance } from './useWalletBalance';
import { useWalletTransactions } from './useWalletTransactions';
import { useWalletPolling } from './useWalletPolling';
import { walletCache, DEFAULT_WALLET_SETTINGS } from '@/app/lib/wallet/wallet-cache';
import type { WalletSettings } from '@/app/lib/wallet/wallet-types';

export function useWallet(userId: string | undefined) {
  const wallet = useWalletWorker(userId);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [allAddresses, setAllAddresses] = useState<string[]>([]);
  const [settings, setSettings] = useState<WalletSettings>(DEFAULT_WALLET_SETTINGS);
  const autoLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const tabHiddenAtRef = useRef<number | null>(null);

  const isUnlocked = wallet.state === 'unlocked';

  const balance = useWalletBalance(userId, allAddresses, isUnlocked);
  const txHistory = useWalletTransactions(allAddresses, isUnlocked, balance.utxos);

  // Load settings
  useEffect(() => {
    if (!userId) return;
    setSettings(walletCache.getSettings(userId));
  }, [userId]);

  // Save settings
  const updateSettings = useCallback((newSettings: WalletSettings) => {
    if (!userId) return;
    setSettings(newSettings);
    walletCache.setSettings(userId, newSettings);
  }, [userId]);

  // Combined fetch for polling
  const fetchAll = useCallback(async () => {
    await Promise.all([
      balance.fetchBalances(),
      txHistory.fetchTransactions(),
    ]);
  }, [balance.fetchBalances, txHistory.fetchTransactions]);

  const polling = useWalletPolling(fetchAll, {
    defaultInterval: 15000,
    fastInterval: 2000,
    fastDuration: 120000,
    enabled: isUnlocked && allAddresses.length > 0,
  });

  // Derive all addresses when unlocked
  useEffect(() => {
    if (!isUnlocked || !userId) return;

    const deriveInitialAddress = async () => {
      try {
        const index = walletCache.getAddressIndex(userId);
        const addresses: string[] = [];

        // Derive all receive addresses from 0 to current index
        for (let i = 0; i <= index; i++) {
          const addr = await wallet.deriveAddress(i);
          addresses.push(addr);
        }

        // Derive change address 0 (where troco goes after sends)
        const changeAddr = await wallet.deriveAddress(0, true);
        addresses.push(changeAddr);

        setCurrentAddress(addresses[index]); // Current receive address for display
        setAllAddresses(addresses);
      } catch (err) {
        console.error('[Wallet] Falha ao derivar endereços:', err);
      }
    };

    deriveInitialAddress();
  }, [isUnlocked, userId, wallet.deriveAddress]);

  // Fetch data when addresses are available
  useEffect(() => {
    if (allAddresses.length > 0 && isUnlocked) {
      fetchAll();
    }
  }, [allAddresses, isUnlocked]);

  // Re-fetch transactions once UTXOs become available (for proper cross-referencing)
  const utxoReadyRef = useRef(false);
  useEffect(() => {
    if (balance.utxos.length > 0 && !utxoReadyRef.current) {
      utxoReadyRef.current = true;
      txHistory.fetchTransactions();
    }
    if (balance.utxos.length === 0) {
      utxoReadyRef.current = false;
    }
  }, [balance.utxos, txHistory.fetchTransactions]);

  // Auto-lock on inactivity (timestamp-based + setTimeout fallback)
  useEffect(() => {
    if (!isUnlocked || settings.autoLockMinutes === 0) return;

    const lockMs = settings.autoLockMinutes * 60 * 1000;
    lastActivityRef.current = Date.now();

    const checkAndLock = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= lockMs) {
        wallet.lock();
      } else {
        // Schedule next check for remaining time
        if (autoLockRef.current) clearTimeout(autoLockRef.current);
        autoLockRef.current = setTimeout(checkAndLock, lockMs - elapsed);
      }
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
      autoLockRef.current = setTimeout(checkAndLock, lockMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    // Periodic check every 30s to catch throttled/frozen timers
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= lockMs) {
        wallet.lock();
      }
    }, 30000);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
      clearInterval(intervalId);
    };
  }, [isUnlocked, wallet.lock, settings.autoLockMinutes]);

  // Lock on tab hidden for extended period (timestamp-based)
  useEffect(() => {
    if (!isUnlocked || settings.tabHiddenLockSeconds === 0) return;

    const lockMs = settings.tabHiddenLockSeconds * 1000;

    const handleVisibility = () => {
      if (document.hidden) {
        // Record when the tab was hidden
        tabHiddenAtRef.current = Date.now();
      } else {
        // Tab became visible — check elapsed time since hidden
        if (tabHiddenAtRef.current !== null) {
          const elapsed = Date.now() - tabHiddenAtRef.current;
          tabHiddenAtRef.current = null;
          if (elapsed >= lockMs) {
            wallet.lock();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      tabHiddenAtRef.current = null;
    };
  }, [isUnlocked, wallet.lock, settings.tabHiddenLockSeconds]);

  // Handle successful tx broadcast: optimistic update + fast polling
  const handleTxBroadcast = useCallback((details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => {
    balance.applyOptimisticSend(details.assetId, details.amount, details.feeSats);
    txHistory.addPendingTx(details.txid, details.assetId, details.amount);
    polling.triggerFastPolling();
  }, [balance.applyOptimisticSend, txHistory.addPendingTx, polling.triggerFastPolling]);

  // Generate new address
  const generateNewAddress = useCallback(async () => {
    if (!userId) return;
    const currentIndex = walletCache.getAddressIndex(userId);
    const newIndex = currentIndex + 1;
    const addr = await wallet.deriveAddress(newIndex);
    walletCache.setAddressIndex(userId, newIndex);
    setCurrentAddress(addr);
    setAllAddresses(prev => {
      if (prev.includes(addr)) return prev;
      return [...prev, addr];
    });
    return addr;
  }, [userId, wallet.deriveAddress]);

  return {
    ...wallet,
    currentAddress,
    balances: balance.balances,
    prices: balance.prices,
    balanceLoading: balance.loading,
    utxos: balance.utxos,
    transactions: txHistory.transactions,
    txLoading: txHistory.loading,
    settings,
    updateSettings,
    generateNewAddress,
    handleTxBroadcast,
    triggerFastPolling: polling.triggerFastPolling,
    fetchAll,
  };
}
