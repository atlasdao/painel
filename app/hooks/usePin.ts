'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import type { PinSettings } from '@/app/lib/wallet/wallet-types';

const COOLDOWN_5_FAILURES = 30;       // 30 seconds
const COOLDOWN_10_FAILURES = 300;     // 5 minutes
const WIPE_THRESHOLD = 15;            // wipe PIN blob entirely

export function usePin(userId: string | undefined) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [pinSettings, setPinSettings] = useState<PinSettings>({
    enabled: false,
    failedAttempts: 0,
    lastFailedAt: null,
    cooldownUntil: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);

  // Load initial PIN state
  useEffect(() => {
    if (!userId || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const blob = await walletCache.getPinBlob(userId);
      const settings = await walletCache.getPinSettings(userId);

      setPinEnabled(!!blob);
      setPinSettings(settings);

      if (settings.cooldownUntil && settings.cooldownUntil > Date.now()) {
        setPinLocked(true);
        setCooldownRemaining(Math.ceil((settings.cooldownUntil - Date.now()) / 1000));
      }
    };

    init();
  }, [userId]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      setPinLocked(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          setPinLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cooldownRemaining > 0]);

  const updateSettings = useCallback(async (settings: PinSettings) => {
    if (!userId) return;
    setPinSettings(settings);
    await walletCache.savePinSettings(userId, settings);
  }, [userId]);

  const setupPin = useCallback(async (mnemonic: string, pin: string): Promise<void> => {
    if (!userId) throw new Error('Usuário não identificado');

    const { validatePin, encryptWithPin } = await import('@/app/lib/wallet/pin-crypto');

    const validation = validatePin(pin);
    if (!validation.valid) {
      throw new Error(validation.reason || 'PIN inválido');
    }

    const blob = await encryptWithPin(mnemonic, pin);
    await walletCache.setPinBlob(userId, blob);

    const settings: PinSettings = {
      enabled: true,
      failedAttempts: 0,
      lastFailedAt: null,
      cooldownUntil: null,
    };
    await updateSettings(settings);
    setPinEnabled(true);
  }, [userId, updateSettings]);

  const unlockWithPin = useCallback(async (pin: string): Promise<string> => {
    if (!userId) throw new Error('Usuário não identificado');

    // Check cooldown
    if (pinSettings.cooldownUntil && pinSettings.cooldownUntil > Date.now()) {
      const remaining = Math.ceil((pinSettings.cooldownUntil - Date.now()) / 1000);
      throw new Error(`Aguarde ${remaining} segundos para tentar novamente`);
    }

    const blob = await walletCache.getPinBlob(userId);
    if (!blob) throw new Error('PIN não configurado');

    try {
      const { decryptWithPin } = await import('@/app/lib/wallet/pin-crypto');
      const mnemonic = await decryptWithPin(blob, pin);

      // Success — reset failed attempts
      const settings: PinSettings = {
        enabled: true,
        failedAttempts: 0,
        lastFailedAt: null,
        cooldownUntil: null,
      };
      await updateSettings(settings);
      setPinLocked(false);
      setCooldownRemaining(0);

      return mnemonic;
    } catch {
      // Failed attempt
      const newAttempts = pinSettings.failedAttempts + 1;
      const now = Date.now();

      // Determine cooldown
      let cooldownUntil: number | null = null;
      if (newAttempts >= WIPE_THRESHOLD) {
        // Wipe PIN blob entirely
        await walletCache.removePinBlob(userId);
        await walletCache.clearPinSettings(userId);
        setPinEnabled(false);
        setPinSettings({
          enabled: false,
          failedAttempts: 0,
          lastFailedAt: null,
          cooldownUntil: null,
        });
        setPinLocked(false);
        setCooldownRemaining(0);
        throw new Error('PIN removido por segurança. Use a senha para desbloquear.');
      } else if (newAttempts >= 10) {
        cooldownUntil = now + COOLDOWN_10_FAILURES * 1000;
      } else if (newAttempts >= 5) {
        cooldownUntil = now + COOLDOWN_5_FAILURES * 1000;
      }

      const settings: PinSettings = {
        enabled: true,
        failedAttempts: newAttempts,
        lastFailedAt: now,
        cooldownUntil,
      };
      await updateSettings(settings);

      if (cooldownUntil) {
        setPinLocked(true);
        setCooldownRemaining(Math.ceil((cooldownUntil - now) / 1000));
      }

      const remaining = WIPE_THRESHOLD - newAttempts;
      throw new Error(
        remaining <= 3
          ? `PIN incorreto. ${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} antes do bloqueio.`
          : 'PIN incorreto'
      );
    }
  }, [userId, pinSettings, updateSettings]);

  const changePin = useCallback(async (mnemonic: string, oldPin: string, newPin: string): Promise<void> => {
    if (!userId) throw new Error('Usuário não identificado');

    const { validatePin, decryptWithPin, encryptWithPin } = await import('@/app/lib/wallet/pin-crypto');

    // Validate new PIN
    const validation = validatePin(newPin);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Novo PIN inválido');
    }

    // Verify old PIN by decrypting
    const blob = await walletCache.getPinBlob(userId);
    if (!blob) throw new Error('PIN não configurado');

    try {
      await decryptWithPin(blob, oldPin);
    } catch {
      throw new Error('PIN atual incorreto');
    }

    // Re-encrypt with new PIN
    const newBlob = await encryptWithPin(mnemonic, newPin);
    await walletCache.setPinBlob(userId, newBlob);
  }, [userId]);

  const removePin = useCallback(async () => {
    if (!userId) return;
    await walletCache.removePinBlob(userId);
    await walletCache.clearPinSettings(userId);
    setPinEnabled(false);
    setPinSettings({
      enabled: false,
      failedAttempts: 0,
      lastFailedAt: null,
      cooldownUntil: null,
    });
    setPinLocked(false);
    setCooldownRemaining(0);
  }, [userId]);

  const resetFailedAttempts = useCallback(async () => {
    if (!userId) return;
    const settings: PinSettings = {
      ...pinSettings,
      failedAttempts: 0,
      lastFailedAt: null,
      cooldownUntil: null,
    };
    await updateSettings(settings);
    setPinLocked(false);
    setCooldownRemaining(0);
  }, [userId, pinSettings, updateSettings]);

  return {
    pinEnabled,
    pinLocked,
    cooldownRemaining,
    setupPin,
    unlockWithPin,
    changePin,
    removePin,
    resetFailedAttempts,
  };
}
