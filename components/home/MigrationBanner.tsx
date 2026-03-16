'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield } from 'lucide-react';

interface MigrationBannerProps {
  hasLocalWallet: boolean;
  userHadWallet: boolean;
}

export function MigrationBanner({ hasLocalWallet, userHadWallet }: MigrationBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('migration-banner-dismissed');
    if (d) setDismissed(true);
  }, []);

  if (hasLocalWallet || !userHadWallet || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('migration-banner-dismissed', 'true');
  };

  return (
    <div className="atlas-card" style={{ borderColor: 'var(--color-info)', background: 'rgba(59, 130, 246, 0.05)' }}>
      <div className="flex items-start gap-3">
        <Shield size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-info)' }} />
        <div className="flex-1">
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Importe sua carteira existente
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Detectamos que você já tinha uma carteira. Importe-a para continuar usando seus fundos.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              className="atlas-btn text-xs py-2 px-3"
              style={{ minHeight: 36 }}
              onClick={() => router.push('/dash/import')}
            >
              Importar carteira <ArrowRight size={14} />
            </button>
            <button
              className="text-xs py-2 px-3"
              style={{ color: 'var(--text-muted)', minHeight: 36 }}
              onClick={dismiss}
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
