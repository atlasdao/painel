'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BiometricCredentialData } from '@/app/lib/wallet/webauthn';

interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useBiometric(userId: string | undefined) {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnabled: false,
    isLoading: true,
    error: null,
  });

  // Check availability and existing credential on mount
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!userId) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      try {
        const { isBiometricAvailable } = await import('@/app/lib/wallet/webauthn');
        const available = await isBiometricAvailable();

        if (cancelled) return;

        const { walletCache } = await import('@/app/lib/wallet/wallet-cache');
        const credential = walletCache.getBiometricCredential(userId);

        setState({
          isAvailable: available,
          isEnabled: !!credential,
          isLoading: false,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setState({ isAvailable: false, isEnabled: false, isLoading: false, error: null });
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [userId]);

  const enableBiometric = useCallback(async (password: string) => {
    if (!userId) throw new Error('Usuário não identificado');

    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { registerBiometric } = await import('@/app/lib/wallet/webauthn');
      const { walletCache } = await import('@/app/lib/wallet/wallet-cache');

      const credential = await registerBiometric(userId, password);
      walletCache.setBiometricCredential(userId, credential);

      setState(s => ({ ...s, isEnabled: true, isLoading: false }));
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Autenticação biométrica cancelada'
        : err.message || 'Falha ao ativar biometria';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  }, [userId]);

  const disableBiometric = useCallback(() => {
    if (!userId) return;

    const { walletCache } = require('@/app/lib/wallet/wallet-cache');
    walletCache.removeBiometricCredential(userId);
    setState(s => ({ ...s, isEnabled: false, error: null }));
  }, [userId]);

  const unlockWithBiometric = useCallback(async (): Promise<string> => {
    if (!userId) throw new Error('Usuário não identificado');

    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { authenticateWithBiometric } = await import('@/app/lib/wallet/webauthn');
      const { walletCache } = await import('@/app/lib/wallet/wallet-cache');

      const credential = walletCache.getBiometricCredential(userId);
      if (!credential) {
        setState(s => ({ ...s, isEnabled: false, isLoading: false }));
        throw new Error('Nenhuma credencial biométrica encontrada');
      }

      const password = await authenticateWithBiometric(credential);
      setState(s => ({ ...s, isLoading: false }));
      return password;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Autenticação biométrica cancelada'
        : err.message || 'Falha na autenticação biométrica';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  }, [userId]);

  return {
    state,
    enableBiometric,
    disableBiometric,
    unlockWithBiometric,
  };
}
