'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Fingerprint, Download, Upload, Eye, Lock, AlertTriangle, Copy, EyeOff, ShieldOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { profileService } from '@/app/lib/services';
import api from '@/app/lib/api';
import { authService } from '@/app/lib/auth';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import { decryptMnemonic } from '@/app/lib/wallet/wallet-crypto';
import type { EncryptedWalletBlob } from '@/app/lib/wallet/wallet-types';

function Section({ title, icon: Icon, children, defaultOpen = false, id }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="atlas-card" id={id}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between" style={{ minHeight: 48 }}>
        <div className="flex items-center gap-3">
          <Icon size={20} style={{ color: 'var(--text-secondary)' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>{children}</div>}
    </div>
  );
}

function SegurancaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openSection = searchParams.get('section'); // 'backup', '2fa', etc.
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaQrCode, setTwoFaQrCode] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaSetupLoading, setTwoFaSetupLoading] = useState(false);
  const [twoFaDisableToken, setTwoFaDisableToken] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [pendingImportBlob, setPendingImportBlob] = useState<any>(null);
  const [pendingImportUserId, setPendingImportUserId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mnemonic viewer state
  const [mnemonicPassword, setMnemonicPassword] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[] | null>(null);
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [mnemonicCountdown, setMnemonicCountdown] = useState(0);
  const mnemonicTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Export/import loading state
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Scroll to section when coming from BackupNudge
  useEffect(() => {
    if (openSection) {
      setTimeout(() => {
        const el = document.getElementById(`section-${openSection}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [openSection]);

  useEffect(() => {
    api.get('/auth/profile').then(r => {
      setTwoFaEnabled(r.data.twoFactorEnabled || false);
    }).catch(() => {});
  }, []);

  // Cleanup mnemonic timer on unmount
  useEffect(() => {
    return () => {
      if (mnemonicTimerRef.current) clearInterval(mnemonicTimerRef.current);
    };
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao alterar senha.';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handle2FASetup = async () => {
    try {
      const res = await api.post('/profile/2fa/setup');
      toast.success('QR Code gerado. Configure no seu app autenticador.');
    } catch {
      toast.error('Erro ao configurar 2FA');
    }
  };

  // ── Backup Export ──
  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        toast.error('Você precisa estar logado para exportar.');
        return;
      }

      const blob = await walletCache.getWalletBlob(user.id);
      if (!blob) {
        toast.error('Nenhuma carteira encontrada para exportar.');
        return;
      }

      const backupData = {
        format: 'atlas-backup-v1',
        description: 'Atlas self-custody wallet backup. Contains your encrypted seed phrase.',
        encryption: {
          algorithm: 'AES-256-GCM',
          kdf: 'PBKDF2',
          kdfParams: { iterations: 600000, hash: 'SHA-256', saltLength: 32 },
          ivLength: 12,
          authTagLength: 16,
        },
        salt: blob.salt,
        iv: blob.iv,
        ciphertext: blob.ciphertext,
        authTag: blob.authTag,
        createdAt: blob.createdAt,
        chains: {
          liquid: { path: "m/84'/1776'/0'/chain/index" },
        },
        recoveryInstructions: {
          pt: 'Para recuperar, use a Conta Atlas ou qualquer carteira compatível com BIP39/BIP84.',
          en: 'To recover, use Conta Atlas or any BIP39/BIP84 compatible wallet.',
        },
        decryptionPseudocode: 'key = PBKDF2(password, salt, 600000, SHA-256); plaintext = AES-256-GCM-Decrypt(key, iv, ciphertext, authTag)',
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileBlob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(fileBlob);

      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `atlas-backup-${date}.atlas-backup`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup exportado com sucesso! Guarde o arquivo em local seguro.');
    } catch (err) {
      console.error('[Backup] Export error:', err);
      toast.error('Erro ao exportar backup.');
    } finally {
      setExportLoading(false);
    }
  }, []);

  // ── Backup Import ──
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    e.target.value = '';

    setImportLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        toast.error('Você precisa estar logado para importar.');
        return;
      }

      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error('Arquivo inválido. Selecione um arquivo .atlas-backup válido.');
        return;
      }

      // Validate format
      if (parsed.format !== 'atlas-backup-v1') {
        toast.error('Formato de backup não reconhecido. Verifique se é um arquivo .atlas-backup válido.');
        return;
      }

      // Validate required fields
      if (!parsed.salt || !parsed.iv || !parsed.ciphertext || !parsed.authTag) {
        toast.error('Arquivo de backup corrompido. Campos obrigatórios ausentes.');
        return;
      }

      // Extract EncryptedWalletBlob fields
      const walletBlob: EncryptedWalletBlob = {
        version: 1,
        kdf: 'pbkdf2',
        kdfParams: parsed.encryption?.kdfParams || { iterations: 600000, hash: 'SHA-256' },
        salt: parsed.salt,
        iv: parsed.iv,
        ciphertext: parsed.ciphertext,
        authTag: parsed.authTag,
        createdAt: parsed.createdAt || new Date().toISOString(),
      };

      // Check if user already has a wallet
      const existingBlob = await walletCache.getWalletBlob(user.id);
      if (existingBlob) {
        // Store pending import and show confirmation modal
        setPendingImportBlob(walletBlob);
        setPendingImportUserId(user.id);
        setShowImportConfirmModal(true);
        return;
      }

      await walletCache.setWalletBlob(user.id, walletBlob);

      toast.success('Backup importado com sucesso! Desbloqueie com sua senha.');
      router.push('/dash');
    } catch (err) {
      console.error('[Backup] Import error:', err);
      toast.error('Erro ao importar backup.');
    } finally {
      setImportLoading(false);
    }
  }, [router]);

  // ── Mnemonic Viewer ──
  const handleViewMnemonic = useCallback(async () => {
    if (!mnemonicPassword.trim()) {
      toast.error('Digite sua senha para ver as palavras.');
      return;
    }

    setMnemonicLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        toast.error('Você precisa estar logado.');
        return;
      }

      const blob = await walletCache.getWalletBlob(user.id);
      if (!blob) {
        toast.error('Nenhuma carteira encontrada.');
        return;
      }

      const words = await decryptMnemonic(blob, mnemonicPassword);
      setMnemonicWords(words);
      setMnemonicPassword('');
      setMnemonicCountdown(60);

      // Auto-hide after 60 seconds
      if (mnemonicTimerRef.current) clearInterval(mnemonicTimerRef.current);
      mnemonicTimerRef.current = setInterval(() => {
        setMnemonicCountdown(prev => {
          if (prev <= 1) {
            if (mnemonicTimerRef.current) clearInterval(mnemonicTimerRef.current);
            setMnemonicWords(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[Mnemonic] Decrypt error:', err);
      toast.error('Senha incorreta ou carteira corrompida.');
    } finally {
      setMnemonicLoading(false);
    }
  }, [mnemonicPassword]);

  const handleHideMnemonic = useCallback(() => {
    if (mnemonicTimerRef.current) clearInterval(mnemonicTimerRef.current);
    setMnemonicWords(null);
    setMnemonicCountdown(0);
  }, []);

  const handleCopyMnemonic = useCallback(() => {
    if (!mnemonicWords) return;
    navigator.clipboard.writeText(mnemonicWords.join(' ')).then(() => {
      toast.success('Palavras copiadas. Apague da área de transferência após uso.');
    }).catch(() => {
      toast.error('Falha ao copiar.');
    });
  }, [mnemonicWords]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Segurança</h1>

      <Section title="Autenticação 2FA" icon={Shield} defaultOpen={openSection === '2fa' || (!openSection)} id="section-2fa">
        {twoFaEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Shield size={16} style={{ color: 'var(--color-success)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Autenticação 2FA ativa</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Para desativar, insira o código do seu aplicativo autenticador.
            </p>
            <input
              type="text"
              className="atlas-input"
              placeholder="Código de 6 dígitos"
              value={twoFaDisableToken}
              onChange={(e) => setTwoFaDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <button
              className="w-full py-3 rounded-xl font-medium text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', minHeight: 48 }}
              disabled={twoFaDisableToken.length !== 6}
              onClick={async () => {
                try {
                  await api.post('/profile/2fa/disable', { token: twoFaDisableToken });
                  setTwoFaEnabled(false);
                  setTwoFaDisableToken('');
                  toast.success('2FA desativado');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Código inválido');
                }
              }}
            >
              <ShieldOff size={16} className="inline mr-2" />
              Desativar 2FA
            </button>
          </div>
        ) : twoFaQrCode ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Escaneie o QR code no seu aplicativo autenticador (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center">
              <img src={twoFaQrCode} alt="QR Code 2FA" className="rounded-lg" style={{ width: 200, height: 200 }} />
            </div>
            {twoFaSecret && (
              <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ou insira manualmente:</p>
                <code className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>{twoFaSecret}</code>
              </div>
            )}
            <input
              type="text"
              className="atlas-input"
              placeholder="Código de 6 dígitos para confirmar"
              value={twoFaToken}
              onChange={(e) => setTwoFaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <button
              className="atlas-btn w-full"
              disabled={twoFaToken.length !== 6}
              onClick={async () => {
                try {
                  await api.post('/profile/2fa/enable', { token: twoFaToken });
                  setTwoFaEnabled(true);
                  setTwoFaQrCode('');
                  setTwoFaSecret('');
                  setTwoFaToken('');
                  toast.success('2FA ativado com sucesso!');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Código inválido');
                }
              }}
            >
              Confirmar e ativar
            </button>
            <button
              className="atlas-btn-secondary w-full flex items-center justify-center rounded-xl"
              style={{ minHeight: 48 }}
              onClick={() => { setTwoFaQrCode(''); setTwoFaSecret(''); setTwoFaToken(''); }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Proteja sua conta com autenticação de dois fatores.
            </p>
            <button
              className="atlas-btn w-full"
              disabled={twoFaSetupLoading}
              onClick={async () => {
                setTwoFaSetupLoading(true);
                try {
                  const res = await api.post('/profile/2fa/setup');
                  setTwoFaQrCode(res.data.qrCode || res.data.qrCodeUrl || '');
                  setTwoFaSecret(res.data.secret || '');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Erro ao configurar 2FA');
                } finally {
                  setTwoFaSetupLoading(false);
                }
              }}
            >
              {twoFaSetupLoading ? 'Gerando...' : 'Ativar 2FA'}
            </button>
          </div>
        )}
      </Section>

      <Section title="Biometria" icon={Fingerprint}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Use sua digital ou rosto para desbloquear a carteira rapidamente.
        </p>
        <button className="atlas-btn w-full" onClick={() => toast.info('Configure na tela de desbloqueio da carteira')}>
          Configurar biometria
        </button>
      </Section>

      <Section title="Backup da carteira" icon={Download} defaultOpen={openSection === 'backup'} id="section-backup">
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Exporte um arquivo .atlas-backup encriptado de ponta a ponta com suas palavras de recuperação.
        </p>
        <div className="flex gap-2">
          <button
            className="atlas-btn flex-1"
            onClick={handleExport}
            disabled={exportLoading}
          >
            <Download size={16} /> {exportLoading ? 'Exportando...' : 'Exportar'}
          </button>
          <button
            className="atlas-btn-secondary flex-1 flex items-center justify-center gap-2 rounded-xl"
            style={{ minHeight: 48 }}
            onClick={handleImportClick}
            disabled={importLoading}
          >
            <Upload size={16} /> {importLoading ? 'Importando...' : 'Importar'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".atlas-backup,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </Section>

      <Section title="Palavras de recuperação" icon={Eye}>
        <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-xs" style={{ color: '#f59e0b' }}>
            Nunca compartilhe suas palavras de recuperação. Quem tiver acesso pode controlar seus fundos.
          </p>
        </div>

        {mnemonicWords ? (
          <div className="space-y-3">
            {/* Screenshot warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <p className="text-xs" style={{ color: '#ef4444' }}>
                Não tire screenshots! Anote as palavras em papel e guarde em local seguro.
              </p>
            </div>

            {/* Word grid */}
            <div className="grid grid-cols-3 gap-2">
              {mnemonicWords.map((word, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
                >
                  <span style={{ color: 'var(--text-muted)', minWidth: 18 }}>{i + 1}.</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{word}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center">
              <button
                className="atlas-btn-secondary flex-1 flex items-center justify-center gap-2 rounded-xl text-xs"
                style={{ minHeight: 40 }}
                onClick={handleCopyMnemonic}
              >
                <Copy size={14} /> Copiar
              </button>
              <button
                className="atlas-btn flex-1 text-xs"
                style={{ minHeight: 40 }}
                onClick={handleHideMnemonic}
              >
                <EyeOff size={14} /> Esconder
              </button>
            </div>

            {/* Countdown */}
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              As palavras serão ocultadas em {mnemonicCountdown}s
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              className="atlas-input"
              type="password"
              placeholder="Digite sua senha da carteira"
              value={mnemonicPassword}
              onChange={e => setMnemonicPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleViewMnemonic(); }}
              disabled={mnemonicLoading}
            />
            <button
              className="atlas-btn w-full"
              onClick={handleViewMnemonic}
              disabled={mnemonicLoading}
            >
              {mnemonicLoading ? 'Decifrando...' : 'Ver palavras'}
            </button>
          </div>
        )}
      </Section>

      <Section title="Trocar senha" icon={Lock}>
        <div className="space-y-3">
          <input className="atlas-input" type="password" placeholder="Senha atual"
            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          <input className="atlas-input" type="password" placeholder="Nova senha"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input className="atlas-input" type="password" placeholder="Confirmar nova senha"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button className="atlas-btn w-full" onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </Section>

      <Section title="Apagar carteira" icon={AlertTriangle}>
        <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs" style={{ color: '#ef4444' }}>
            Esta ação remove a carteira deste dispositivo. Seus fundos só podem ser recuperados com as 12 palavras de recuperação ou um arquivo .atlas-backup.
          </p>
        </div>
        <button
          className="w-full py-3 rounded-xl font-medium text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', minHeight: 48 }}
          onClick={() => setShowDeleteModal(true)}
        >
          Apagar carteira deste dispositivo
        </button>
      </Section>

      {/* Import confirmation modal */}
      {showImportConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Carteira existente</h3>
            </div>

            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Você já possui uma carteira neste dispositivo. Importar este backup irá <strong>substituir</strong> a carteira atual.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-warning)' }}>
              Certifique-se de ter um backup da carteira atual (palavras de recuperação ou arquivo .atlas-backup) antes de continuar.
            </p>

            <div className="flex gap-2">
              <button
                className="atlas-btn-secondary flex-1 flex items-center justify-center rounded-xl"
                style={{ minHeight: 48 }}
                onClick={() => { setShowImportConfirmModal(false); setPendingImportBlob(null); }}
              >
                Cancelar
              </button>
              <button
                className="atlas-btn flex-1"
                onClick={async () => {
                  if (pendingImportBlob && pendingImportUserId) {
                    await walletCache.setWalletBlob(pendingImportUserId, pendingImportBlob);
                    toast.success('Backup importado! Desbloqueie com sua senha.');
                    setShowImportConfirmModal(false);
                    setPendingImportBlob(null);
                    router.push('/dash');
                  }
                }}
              >
                Substituir e importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete wallet modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Apagar carteira</h3>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Esta ação é irreversível. A Atlas não tem acesso às suas chaves e não consegue recuperar sua carteira.
            </p>

            <div className="space-y-3 mb-4">
              <input
                type="password"
                className="atlas-input"
                placeholder="Digite sua senha"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />

              <label className="flex items-start gap-2 cursor-pointer" style={{ minHeight: 48 }}>
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded"
                  style={{ accentColor: '#ef4444' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Entendo que a Atlas não pode recuperar minha carteira e que preciso ter um backup das minhas palavras de recuperação ou arquivo .atlas-backup para acessar meus fundos novamente.
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                className="atlas-btn-secondary flex-1 flex items-center justify-center rounded-xl"
                style={{ minHeight: 48 }}
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmed(false); }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-medium text-sm"
                style={{
                  background: deleteConfirmed && deletePassword ? '#ef4444' : 'rgba(239,68,68,0.3)',
                  color: '#fff',
                  minHeight: 48,
                  cursor: deleteConfirmed && deletePassword ? 'pointer' : 'not-allowed',
                }}
                disabled={!deleteConfirmed || !deletePassword || deletingWallet}
                onClick={async () => {
                  setDeletingWallet(true);
                  try {
                    const user = await authService.getCurrentUser();
                    if (!user) throw new Error('Usuário não encontrado');

                    // Verify password by trying to decrypt
                    const blob = await walletCache.getWalletBlob(user.id);
                    if (blob) {
                      await decryptMnemonic(blob, deletePassword);
                    }

                    await walletCache.removeWalletBlob(user.id);
                    toast.success('Carteira removida deste dispositivo');
                    setShowDeleteModal(false);
                    window.location.href = '/dash';
                  } catch (err: any) {
                    if (err.message?.includes('decrypt') || err.message?.includes('operation')) {
                      toast.error('Senha incorreta');
                    } else {
                      toast.error('Erro ao apagar carteira');
                    }
                  } finally {
                    setDeletingWallet(false);
                  }
                }}
              >
                {deletingWallet ? 'Apagando...' : 'Apagar carteira'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SegurancaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)' }} />
      </div>
    }>
      <SegurancaContent />
    </Suspense>
  );
}
