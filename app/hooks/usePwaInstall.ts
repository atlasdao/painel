'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsePwaInstallReturn {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  isDismissed: boolean;
  dismiss: () => void;
}

const DISMISS_KEY = 'atlas_pwa_dismiss';
const DISMISS_DAYS = 7;

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false;
  const elapsed = Date.now() - ts;
  return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(isDismissedRecently());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  }, []);

  return {
    canInstall: !!deferredPrompt && !isDismissed,
    promptInstall,
    isDismissed,
    dismiss,
  };
}

// Type augmentation for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
