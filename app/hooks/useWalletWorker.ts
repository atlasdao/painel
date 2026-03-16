'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoWorkerManager } from '@/app/lib/wallet/crypto-worker-manager';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import {
  generateMnemonicWords,
  encryptMnemonic,
  validateMnemonic,
  decryptMnemonic,
} from '@/app/lib/wallet/wallet-crypto';
import type { WalletState, EncryptedWalletBlob } from '@/app/lib/wallet/wallet-types';

const SETUP_KEY = 'atlas_wallet_setup';

function getSetupData(): { words: string[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSetupData(words: string[]): void {
  sessionStorage.setItem(SETUP_KEY, JSON.stringify({ words }));
}

function clearSetupData(): void {
  sessionStorage.removeItem(SETUP_KEY);
}

/** Check setup pending synchronously — used for initial state */
function isSetupPending(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SETUP_KEY) !== null;
}

export function useWalletWorker(userId: string | undefined) {
  // SYNCHRONOUS initial state: if sessionStorage has setup data, start in 'setup'
  const [state, setState] = useState<WalletState>(() => {
    if (isSetupPending()) return 'setup';
    return 'loading';
  });
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupWords, setSetupWords] = useState<string[]>(() => {
    const data = getSetupData();
    return data?.words || [];
  });
  const managerRef = useRef<CryptoWorkerManager | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!userId || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const hasWallet = await walletCache.hasWallet(userId);
      const pendingSetup = getSetupData();

      if (pendingSetup && hasWallet) {
        // Restore setup — user was in the middle of writing down words
        setSetupWords(pendingSetup.words);
        setState('setup');
      } else if (!isSetupPending()) {
        // Only change state if we're NOT already in setup from initial state
        if (pendingSetup) clearSetupData();
        setState(hasWallet ? 'locked' : 'no-wallet');
      }

      // Init worker in background
      try {
        const manager = CryptoWorkerManager.getInstance();
        managerRef.current = manager;

        manager.onBlob(async (blob: EncryptedWalletBlob) => {
          if (userId) await walletCache.setWalletBlob(userId, blob);
        });

        manager.onRequestBlob(async () => {
          if (!userId) return;
          const blob = await walletCache.getWalletBlob(userId);
          if (blob) manager.sendBlob(blob);
        });

        await manager.init();
        setWasmReady(true);
      } catch (err: any) {
        console.error('[Wallet] Worker init failed:', err.message);
      }
    };

    init();

    const handleLockSignal = () => {
      if (managerRef.current) {
        managerRef.current.send({ type: 'lock' }).catch(() => {});
      }
      // NEVER lock during setup
      setState(prev => (prev === 'setup' ? 'setup' : 'locked'));
    };
    window.addEventListener('atlas-wallet-lock', handleLockSignal);

    return () => {
      window.removeEventListener('atlas-wallet-lock', handleLockSignal);
    };
  }, [userId]);

  const generateMnemonic = useCallback(async (password: string): Promise<string[]> => {
    setError(null);
    try {
      const words = await generateMnemonicWords();
      const blob = await encryptMnemonic(words, password);
      if (userId) await walletCache.setWalletBlob(userId, blob);

      if (managerRef.current) {
        managerRef.current.send({
          type: 'importMnemonic',
          words,
          password,
        }, 120000).catch(() => {});
      }

      // Persist FIRST, then update React state
      saveSetupData(words);
      setSetupWords(words);
      setState('setup');
      return words;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const importMnemonic = useCallback(async (words: string[], password: string): Promise<void> => {
    setError(null);
    try {
      const valid = await validateMnemonic(words);
      if (!valid) throw new Error('Frase de recuperação inválida');

      const blob = await encryptMnemonic(words, password);
      if (userId) await walletCache.setWalletBlob(userId, blob);

      if (managerRef.current) {
        await managerRef.current.send({
          type: 'importMnemonic',
          words,
          password,
        }, 120000).catch(() => {});
      }

      clearSetupData();
      setState('unlocked');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const unlock = useCallback(async (password: string): Promise<void> => {
    if (!userId) throw new Error('Usuário não identificado');
    setError(null);
    setState('unlocking');

    try {
      const blob = await walletCache.getWalletBlob(userId);
      if (!blob) throw new Error('Carteira não encontrada');

      const words = await decryptMnemonic(blob, password);

      if (managerRef.current) {
        try {
          await managerRef.current.send({
            type: 'importMnemonic',
            words,
            password,
          }, 120000);
        } catch {
          console.warn('[Wallet] Worker importMnemonic failed');
        }
      }

      // If setup was pending, restore setup (not unlocked)
      if (isSetupPending()) {
        const data = getSetupData();
        if (data) setSetupWords(data.words);
        setState('setup');
      } else {
        setState('unlocked');
      }
    } catch (err: any) {
      setState('locked');
      const msg = err.message || '';
      if (msg.includes('decrypt') || msg.includes('operation')) {
        setError('Senha incorreta');
      } else {
        setError(msg || 'Erro ao desbloquear');
      }
      throw err;
    }
  }, [userId]);

  const lock = useCallback(async (): Promise<void> => {
    if (managerRef.current) {
      managerRef.current.send({ type: 'lock' }).catch(() => {});
    }
    // NEVER lock during setup
    setState(prev => (prev === 'setup' ? 'setup' : 'locked'));
  }, []);

  const deriveAddress = useCallback(async (index: number, isChange = false): Promise<string> => {
    if (!managerRef.current) throw new Error('Worker não inicializado');
    const response = await managerRef.current.send({
      type: 'deriveAddress',
      index,
      isChange,
    });
    if (response.type === 'address') return response.address;
    throw new Error('Falha ao derivar endereço');
  }, []);

  const getMnemonic = useCallback(async (password: string): Promise<string[]> => {
    if (!userId) throw new Error('Usuário não identificado');
    const blob = await walletCache.getWalletBlob(userId);
    if (!blob) throw new Error('Carteira não encontrada');
    return decryptMnemonic(blob, password);
  }, [userId]);

  const deleteWallet = useCallback(async (): Promise<void> => {
    if (!userId) return;
    if (managerRef.current) {
      managerRef.current.send({ type: 'deleteWallet' }).catch(() => {});
    }
    await walletCache.removeWalletBlob(userId);
    clearSetupData();
    setSetupWords([]);
    setState('no-wallet');
  }, [userId]);

  const completeSetup = useCallback(() => {
    clearSetupData();
    setSetupWords([]);
    setState('unlocked');
  }, []);

  const unlockWithMnemonic = useCallback(async (mnemonic: string): Promise<boolean> => {
    if (!userId) throw new Error('Usuário não identificado');
    setError(null);
    setState('unlocking');

    try {
      if (managerRef.current) {
        try {
          const response = await managerRef.current.send({
            type: 'initWithMnemonic',
            mnemonic,
          }, 120000);

          if (response.type === 'initWithMnemonicResult' && !response.success) {
            throw new Error('Falha ao inicializar com mnemonic');
          }
        } catch (err: any) {
          // Fallback: try importMnemonic with a dummy password
          // The worker may not support initWithMnemonic yet
          console.warn('[Wallet] initWithMnemonic failed, worker may not support it:', err.message);
          throw err;
        }
      }

      // If setup was pending, restore setup
      if (isSetupPending()) {
        const data = getSetupData();
        if (data) setSetupWords(data.words);
        setState('setup');
      } else {
        setState('unlocked');
      }

      return true;
    } catch (err: any) {
      setState('locked');
      setError(err.message || 'Erro ao desbloquear');
      return false;
    }
  }, [userId]);

  return {
    state,
    wasmReady,
    error,
    setupWords,
    generateMnemonic,
    importMnemonic,
    unlock,
    unlockWithMnemonic,
    lock,
    deriveAddress,
    getMnemonic,
    deleteWallet,
    completeSetup,
    manager: managerRef.current,
  };
}
