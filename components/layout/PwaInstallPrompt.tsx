'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'atlas-pwa-install-dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < sevenDays) return;
      localStorage.removeItem(DISMISS_KEY);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-30 rounded-xl p-4 flex items-center gap-3 animate-slide-up"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Instale a Conta Atlas
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Acesso rápido direto da tela inicial
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="atlas-btn text-xs whitespace-nowrap"
        style={{ padding: '8px 16px', minHeight: 36 }}
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 32, height: 32, color: 'var(--text-muted)' }}
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
