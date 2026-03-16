'use client';

import { useState, useRef } from 'react';
import { Eye, EyeOff, Loader2, Key, Upload, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import type { useWalletWorker } from '@/app/hooks/useWalletWorker';

type View = 'create' | 'import' | 'import-words' | 'import-file';

interface SimpleWalletSetupProps {
  wallet: ReturnType<typeof useWalletWorker>;
  userId: string;
}

export function SimpleWalletSetup({ wallet, userId }: SimpleWalletSetupProps) {
  const [view, setView] = useState<View>('create');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Import with words
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);

  // File import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await wallet.generateMnemonic(password);
      wallet.completeSetup();
      toast.success('Conta Atlas criada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleImportWords = async () => {
    const trimmed = words.map(w => w.trim().toLowerCase()).filter(Boolean);
    if (trimmed.length !== 12) {
      setError('Insira todas as 12 palavras');
      return;
    }
    if (importPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await wallet.importMnemonic(trimmed, importPassword);
      toast.success('Carteira importada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao importar carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.format !== 'atlas-backup-v1' || !parsed.salt || !parsed.iv || !parsed.ciphertext || !parsed.authTag) {
        throw new Error('Arquivo inválido');
      }

      const blob = {
        version: 1 as const,
        kdf: 'pbkdf2' as const,
        kdfParams: parsed.encryption?.kdfParams || { iterations: 600000, hash: 'SHA-256' },
        salt: parsed.salt,
        iv: parsed.iv,
        ciphertext: parsed.ciphertext,
        authTag: parsed.authTag,
        createdAt: parsed.createdAt || new Date().toISOString(),
      };

      await walletCache.setWalletBlob(userId, blob);
      toast.success('Backup importado! Desbloqueie com sua senha.');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleWordChange = (index: number, value: string) => {
    const next = [...words];
    // Handle paste of full mnemonic
    if (value.includes(' ')) {
      const pasted = value.trim().split(/\s+/);
      if (pasted.length === 12) {
        setWords(pasted);
        return;
      }
    }
    next[index] = value.toLowerCase().replace(/[^a-z]/g, '');
    setWords(next);
  };

  // CREATE VIEW
  if (view === 'create') {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)' }}>
            <Shield size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Crie sua Conta Atlas</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Escolha uma senha para proteger seus fundos. Suas chaves são encriptadas localmente no seu dispositivo.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="atlas-input pr-12"
              placeholder="Senha"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            className="atlas-input"
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            disabled={loading}
          />

          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <button
            className="atlas-btn w-full"
            onClick={handleCreate}
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Criando...</> : 'Criar carteira'}
          </button>

          <button
            className="w-full text-center text-sm py-2"
            style={{ color: 'var(--text-muted)', minHeight: 44 }}
            onClick={() => setView('import')}
          >
            Já tem uma carteira? <span style={{ color: 'var(--accent)' }}>Importar</span>
          </button>
        </div>
      </div>
    );
  }

  // IMPORT CHOICE VIEW
  if (view === 'import') {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-1 mb-6 text-sm"
          style={{ color: 'var(--text-muted)', minHeight: 44 }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Importar carteira</h1>

        <div className="space-y-3">
          <button
            className="atlas-card w-full flex items-center gap-4 cursor-pointer"
            onClick={() => setView('import-words')}
            style={{ minHeight: 64 }}
          >
            <Key size={22} style={{ color: 'var(--accent)' }} />
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>12 palavras de recuperação</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Insira suas palavras manualmente</p>
            </div>
          </button>

          <button
            className="atlas-card w-full flex items-center gap-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            style={{ minHeight: 64 }}
          >
            <Upload size={22} style={{ color: 'var(--accent)' }} />
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Arquivo .atlas-backup</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Importe um backup encriptado</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".atlas-backup,.json"
            onChange={handleImportFile}
            className="hidden"
          />

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          )}

          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
      </div>
    );
  }

  // IMPORT WORDS VIEW
  if (view === 'import-words') {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <button
          onClick={() => { setView('import'); setError(''); }}
          className="flex items-center gap-1 mb-6 text-sm"
          style={{ color: 'var(--text-muted)', minHeight: 44 }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Palavras de recuperação</h1>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {words.map((word, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs w-4 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
              <input
                type="text"
                value={word}
                onChange={(e) => handleWordChange(i, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  minHeight: 36,
                }}
                placeholder={`${i + 1}`}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showImportPassword ? 'text' : 'password'}
              className="atlas-input pr-12"
              placeholder="Senha para encriptar"
              value={importPassword}
              onChange={(e) => { setImportPassword(e.target.value); setError(''); }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowImportPassword(!showImportPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              {showImportPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <button
            className="atlas-btn w-full"
            onClick={handleImportWords}
            disabled={loading || words.filter(Boolean).length < 12 || !importPassword}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Importando...</> : 'Importar carteira'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
