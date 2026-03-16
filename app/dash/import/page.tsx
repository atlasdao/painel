'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { walletProxyService } from '@/app/lib/services';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import { authService } from '@/app/lib/auth';
import { Download, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function ImportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [manualToken, setManualToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const importWallet = async (migrationToken: string) => {
    setStatus('importing');
    setErrorMsg('');

    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const result = await walletProxyService.importFromMigration(migrationToken);

      if (!result.encryptedBlob) {
        throw new Error('Dados não encontrados');
      }

      await walletCache.setWalletBlob(user.id, result.encryptedBlob);

      setStatus('success');
      toast.success('Carteira importada com sucesso!');

      setTimeout(() => router.push('/dash'), 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Token inválido ou expirado');
      toast.error('Erro ao importar carteira');
    }
  };

  useEffect(() => {
    if (token) {
      importWallet(token);
    }
  }, [token]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Importar Carteira
      </h1>

      {status === 'importing' && (
        <div className="atlas-card flex flex-col items-center gap-4 py-8">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Importando sua carteira...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="atlas-card flex flex-col items-center gap-4 py-8">
          <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
          <div className="text-center">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Carteira importada!
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Desbloqueie com sua senha na próxima tela.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="atlas-card flex flex-col items-center gap-4 py-8">
          <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
          <div className="text-center">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Erro na importação
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>
              {errorMsg}
            </p>
          </div>
          <button className="atlas-btn" onClick={() => setStatus('idle')}>
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'idle' && !token && (
        <>
          <div className="atlas-card space-y-4">
            <div className="flex items-center gap-3">
              <Download size={20} style={{ color: 'var(--accent)' }} />
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Token de migração
              </h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Cole o token de migração gerado no painel antigo.
            </p>
            <input
              className="atlas-input"
              placeholder="Cole o token aqui"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <button
              className="atlas-btn w-full"
              disabled={!manualToken}
              onClick={() => importWallet(manualToken)}
            >
              Importar
            </button>
          </div>

          <div className="atlas-card space-y-4">
            <div className="flex items-center gap-3">
              <Key size={20} style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Palavras de recuperação
              </h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Se você salvou suas 12 palavras de recuperação, pode importar diretamente.
            </p>
            <button
              className="atlas-btn-secondary w-full flex items-center justify-center gap-2 rounded-xl"
              style={{ minHeight: 48 }}
              onClick={() => router.push('/dash/wallet')}
            >
              Importar com palavras
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    }>
      <ImportContent />
    </Suspense>
  );
}
