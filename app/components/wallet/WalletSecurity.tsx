'use client';

import { useState } from 'react';
import { Eye, EyeOff, Trash2, AlertTriangle, Fingerprint, KeyRound } from 'lucide-react';
import PinSetup from './PinSetup';

interface WalletSecurityProps {
  onViewSeed: (password: string) => Promise<string[]>;
  onDeleteWallet: () => Promise<void>;
  biometricEnabled?: boolean;
  onBiometricAuth?: () => Promise<string>;
  pinEnabled?: boolean;
  onSetupPin?: (mnemonic: string, pin: string) => Promise<void>;
  onRemovePin?: () => void;
  onChangePin?: (mnemonic: string, oldPin: string, newPin: string) => Promise<void>;
}

export default function WalletSecurity({
  onViewSeed,
  onDeleteWallet,
  biometricEnabled,
  onBiometricAuth,
  pinEnabled,
  onSetupPin,
  onRemovePin,
  onChangePin,
}: WalletSecurityProps) {
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState<'setup' | 'change' | 'remove' | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // PIN management state
  const [pinPassword, setPinPassword] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinPasswordVerified, setPinPasswordVerified] = useState(false);
  const [verifiedMnemonic, setVerifiedMnemonic] = useState('');

  const handleViewSeed = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const seedWords = await onViewSeed(password);
      setWords(seedWords);
    } catch (err: any) {
      setError(err.message || 'Senha incorreta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword || !deleteConfirmed) return;
    setLoading(true);
    setError('');
    try {
      // Verify password by trying to decrypt
      await onViewSeed(deletePassword);
      // Password correct — proceed with deletion
      await onDeleteWallet();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('decrypt') || msg.includes('operation') || msg.includes('incorreta')) {
        setError('Senha incorreta');
      } else {
        setError(msg || 'Erro ao apagar carteira');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricViewSeed = async () => {
    if (!onBiometricAuth) return;
    setLoading(true);
    setError('');
    try {
      const pw = await onBiometricAuth();
      const seedWords = await onViewSeed(pw);
      setWords(seedWords);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricDelete = async () => {
    if (!onBiometricAuth || !deleteConfirmed) return;
    setLoading(true);
    setError('');
    try {
      const pw = await onBiometricAuth();
      await onViewSeed(pw); // verify password
      await onDeleteWallet();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('decrypt') || msg.includes('operation') || msg.includes('incorreta')) {
        setError('Falha na autenticação');
      } else {
        setError(msg || 'Erro ao apagar carteira');
      }
    } finally {
      setLoading(false);
    }
  };

  // PIN management handlers
  const handlePinPasswordVerify = async () => {
    if (!pinPassword) return;
    setPinLoading(true);
    setPinError('');
    try {
      const seedWords = await onViewSeed(pinPassword);
      const mnemonic = seedWords.join(' ');
      setVerifiedMnemonic(mnemonic);
      setPinPasswordVerified(true);
    } catch (err: any) {
      setPinError(err.message || 'Senha incorreta');
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinSetupComplete = async (pin: string) => {
    if (!onSetupPin || !verifiedMnemonic) return;
    setPinLoading(true);
    setPinError('');
    try {
      await onSetupPin(verifiedMnemonic, pin);
      closePinModal();
    } catch (err: any) {
      setPinError(err.message || 'Erro ao configurar PIN');
      setPinLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!onRemovePin) return;
    setPinLoading(true);
    try {
      onRemovePin();
      closePinModal();
    } catch (err: any) {
      setPinError(err.message || 'Erro ao remover PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const closePinModal = () => {
    setShowPinModal(null);
    setPinPassword('');
    setShowPinPassword(false);
    setPinPasswordVerified(false);
    setVerifiedMnemonic('');
    setPinError('');
    setPinLoading(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
        Segurança
      </h3>

      <div className="bg-[var(--bg-tertiary)] rounded-xl divide-y divide-[var(--border-default)]">
        {/* PIN de Acesso */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">PIN de Acesso</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {pinEnabled ? 'Ativado' : 'Desativado'} — Desbloqueio rápido com 4 dígitos
              </p>
            </div>
            {pinEnabled ? (
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowPinModal('change'); setPinPassword(''); setPinPasswordVerified(false); setPinError(''); }}
                  className="px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg hover:bg-[var(--accent)]/20 transition-colors"
                >
                  Alterar
                </button>
                <button
                  onClick={() => { setShowPinModal('remove'); setPinPassword(''); setPinPasswordVerified(false); setPinError(''); }}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Remover
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowPinModal('setup'); setPinPassword(''); setPinPasswordVerified(false); setPinError(''); }}
                className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg hover:bg-[var(--accent)]/20 transition-colors"
              >
                Configurar
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => { setShowSeedModal(true); setWords([]); setPassword(''); setError(''); }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
        >
          <Eye className="w-4 h-4 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Ver Palavras-Semente</p>
            <p className="text-xs text-[var(--text-muted)]">{biometricEnabled ? 'Requer autenticação' : 'Requer senha'}</p>
          </div>
        </button>

        <button
          onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setDeleteConfirmed(false); setError(''); }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/5 transition-colors text-left"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-500">Apagar Carteira</p>
            <p className="text-xs text-[var(--text-muted)]">Ação irreversível</p>
          </div>
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closePinModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-[var(--text-primary)] text-center">
                {showPinModal === 'setup' && 'Configurar PIN'}
                {showPinModal === 'change' && 'Alterar PIN'}
                {showPinModal === 'remove' && 'Remover PIN'}
              </h3>

              {/* Step 1: Password verification */}
              {!pinPasswordVerified ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)] text-center">
                    Digite sua senha da carteira para continuar
                  </p>
                  <div className="relative">
                    <input
                      type={showPinPassword ? 'text' : 'password'}
                      value={pinPassword}
                      onChange={e => setPinPassword(e.target.value)}
                      placeholder="Senha da carteira"
                      className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (showPinModal === 'remove') handleRemovePin();
                          else handlePinPasswordVerify();
                        }
                      }}
                    />
                    <button type="button" onClick={() => setShowPinPassword(!showPinPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pinError && <p className="text-sm text-red-500 text-center">{pinError}</p>}
                  <div className="flex gap-2">
                    <button onClick={closePinModal} className="flex-1 py-2.5 bg-[var(--bg-tertiary)] rounded-xl text-sm font-medium border border-[var(--border-default)]">
                      Cancelar
                    </button>
                    {showPinModal === 'remove' ? (
                      <button
                        onClick={async () => {
                          // Verify password first, then remove
                          setPinLoading(true);
                          setPinError('');
                          try {
                            await onViewSeed(pinPassword);
                            handleRemovePin();
                          } catch (err: any) {
                            setPinError(err.message || 'Senha incorreta');
                            setPinLoading(false);
                          }
                        }}
                        disabled={pinLoading || !pinPassword}
                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {pinLoading ? 'Removendo...' : 'Remover PIN'}
                      </button>
                    ) : (
                      <button
                        onClick={handlePinPasswordVerify}
                        disabled={pinLoading || !pinPassword}
                        className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {pinLoading ? 'Verificando...' : 'Continuar'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Step 2: PIN setup/change */
                <PinSetup
                  onComplete={handlePinSetupComplete}
                  onSkip={closePinModal}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Seed Modal */}
      {showSeedModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSeedModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md p-5 space-y-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Palavras-Semente</h3>

              {words.length === 0 ? (
                <>
                  {biometricEnabled && onBiometricAuth && (
                    <>
                      <button
                        onClick={handleBiometricViewSeed}
                        disabled={loading}
                        className="w-full py-4 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl flex items-center justify-center gap-3 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                      >
                        <Fingerprint className="w-6 h-6 text-[var(--accent)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Toque para autenticar</span>
                      </button>

                      <div className="flex items-center gap-3 text-[var(--text-muted)]">
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                        <span className="text-xs">ou use a senha</span>
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                      </div>
                    </>
                  )}
                  <p className="text-sm text-[var(--text-secondary)]">
                    Digite sua senha para ver as palavras.
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Senha da carteira"
                      className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleViewSeed()}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowSeedModal(false)} className="flex-1 py-2.5 bg-[var(--bg-tertiary)] rounded-xl text-sm font-medium border border-[var(--border-default)]">
                      Cancelar
                    </button>
                    <button onClick={handleViewSeed} disabled={loading || !password} className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {loading ? 'Verificando...' : 'Ver palavras'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      Não compartilhe estas palavras com ninguém!
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {words.map((word, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
                        <span className="text-xs text-[var(--text-muted)] w-4 text-right">{i + 1}.</span>
                        <span className="text-sm font-mono text-[var(--text-primary)]">{word}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowSeedModal(false)} className="w-full py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium">
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-sm p-5 space-y-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Apagar Carteira</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Esta ação é irreversível. Recomendamos que você tenha o backup da sua frase de recuperação antes de continuar.
                </p>
              </div>

              {biometricEnabled && onBiometricAuth && (
                <>
                  <button
                    onClick={handleBiometricDelete}
                    disabled={loading || !deleteConfirmed}
                    className="w-full py-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-3 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                  >
                    <Fingerprint className="w-6 h-6 text-red-500" />
                    <span className="text-sm font-medium text-red-500">Toque para autenticar</span>
                  </button>

                  <div className="flex items-center gap-3 text-[var(--text-muted)]">
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                    <span className="text-xs">ou use a senha</span>
                    <div className="flex-1 h-px bg-[var(--border-default)]" />
                  </div>
                </>
              )}

              {/* Password */}
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Senha da carteira"
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-red-500/30 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-red-500 pr-10"
                  autoFocus
                />
                <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={e => setDeleteConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-default)] text-red-500 focus:ring-red-500 flex-shrink-0"
                />
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Compreendo que a Atlas <strong className="text-[var(--text-primary)]">não pode recuperar esta carteira</strong> após
                  a exclusão, e que devo possuir o backup das palavras-semente para restaurá-la.
                </span>
              </label>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 bg-[var(--bg-tertiary)] rounded-xl text-sm font-medium border border-[var(--border-default)]">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!deletePassword || !deleteConfirmed || loading}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Apagando...' : 'Apagar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
