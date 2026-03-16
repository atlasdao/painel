'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, X } from 'lucide-react';

interface BackupNudgeProps {
  seedBackedUp: boolean;
}

const DISMISS_KEY = 'atlas_backup_nudge_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24h

export function BackupNudge({ seedBackedUp }: BackupNudgeProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        if (Date.now() - ts < DISMISS_DURATION) {
          setDismissed(true);
          return;
        }
      }
      setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (seedBackedUp || dismissed) return null;

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      className="mx-4 rounded-xl p-4 flex items-start gap-3 animate-fade-in"
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
      }}
    >
      <ShieldAlert size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Proteja sua conta
          </span>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Dispensar"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Faça backup das suas palavras de recuperação
        </p>
        <button
          onClick={() => router.push('/dash/menu/seguranca?section=backup')}
          className="atlas-btn text-xs mt-1"
          style={{
            padding: '0.5rem 1rem',
            minHeight: 36,
            alignSelf: 'flex-start',
          }}
        >
          Fazer backup agora
        </button>
      </div>
    </div>
  );
}
