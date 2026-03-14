'use client';

import { useState, useEffect } from 'react';
import { Clock, Lock, ShieldCheck, Coins, DollarSign, Bell, Fingerprint, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import type { WalletSettings } from '@/app/lib/wallet/wallet-types';

interface WalletSettingsPanelProps {
  settings: WalletSettings;
  onSave: (settings: WalletSettings) => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onEnableBiometric?: (password: string) => Promise<void>;
  onDisableBiometric?: () => void;
}

const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: '1 minuto' },
  { value: 2, label: '2 minutos' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
];

const TAB_HIDDEN_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 10, label: '10 segundos' },
  { value: 30, label: '30 segundos' },
  { value: 60, label: '1 minuto' },
  { value: 120, label: '2 minutos' },
  { value: 300, label: '5 minutos' },
];

const RECEIVE_ASSET_OPTIONS = [
  { value: 'DEPIX' as const, label: 'Depix (R$)' },
  { value: 'USDT' as const, label: 'L-USDT' },
  { value: 'LBTC' as const, label: 'L-BTC' },
];

const CURRENCY_OPTIONS = [
  { value: 'BRL' as const, label: 'Real (R$)' },
  { value: 'USD' as const, label: 'Dólar ($)' },
];

export default function WalletSettingsPanel({
  settings,
  onSave,
  biometricAvailable,
  biometricEnabled,
  onEnableBiometric,
  onDisableBiometric,
}: WalletSettingsPanelProps) {
  const [local, setLocal] = useState<WalletSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [showBiometricPassword, setShowBiometricPassword] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBioPw, setShowBioPw] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleChange = <K extends keyof WalletSettings>(key: K, value: WalletSettings[K]) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled && onDisableBiometric) {
      onDisableBiometric();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } else {
      setShowBiometricPassword(true);
      setBiometricPassword('');
      setBiometricError('');
    }
  };

  const handleBiometricEnable = async () => {
    if (!biometricPassword || !onEnableBiometric) return;
    setBiometricLoading(true);
    setBiometricError('');
    try {
      await onEnableBiometric(biometricPassword);
      setShowBiometricPassword(false);
      setBiometricPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setBiometricError('Autenticação cancelada');
      } else {
        setBiometricError(err.message || 'Falha ao ativar biometria');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-[var(--bg-tertiary)] rounded-xl divide-y divide-[var(--border-default)]">
        {/* Auto-lock por inatividade */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Bloqueio por inatividade</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Bloqueia a carteira automaticamente após um período sem uso
              </p>
              <select
                value={local.autoLockMinutes}
                onChange={e => handleChange('autoLockMinutes', Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {AUTO_LOCK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bloqueio ao sair da aba */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Bloqueio ao sair da aba</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Bloqueia quando a aba fica oculta por um período
              </p>
              <select
                value={local.tabHiddenLockSeconds}
                onChange={e => handleChange('tabHiddenLockSeconds', Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {TAB_HIDDEN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Senha por transação */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Senha a cada envio</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Exige a senha da carteira para cada transação
              </p>
            </div>
            <button
              onClick={() => handleChange('requirePasswordPerTx', !local.requirePasswordPerTx)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                local.requirePasswordPerTx ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                local.requirePasswordPerTx ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Desbloqueio biométrico */}
        {biometricAvailable && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Desbloqueio biométrico</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Use impressão digital ou reconhecimento facial
                </p>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  biometricEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Password input for enabling biometric */}
            {showBiometricPassword && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <input
                    type={showBioPw ? 'text' : 'password'}
                    placeholder="Digite sua senha da carteira"
                    value={biometricPassword}
                    onChange={e => setBiometricPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-9"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleBiometricEnable()}
                  />
                  <button onClick={() => setShowBioPw(!showBioPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    {showBioPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {biometricError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {biometricError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowBiometricPassword(false); setBiometricPassword(''); }}
                    className="flex-1 py-2 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBiometricEnable}
                    disabled={!biometricPassword || biometricLoading}
                    className="flex-1 py-2 text-xs bg-[var(--accent)] text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {biometricLoading ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Ativar'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ativo padrão para recebimento */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <Coins className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Ativo padrão para receber</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Ativo pré-selecionado ao abrir a tela de recebimento
              </p>
              <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-0.5 mt-2">
                {RECEIVE_ASSET_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange('defaultReceiveAsset', opt.value)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      local.defaultReceiveAsset === opt.value
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Moeda de exibição */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <DollarSign className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Moeda de exibição</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Moeda usada para mostrar o saldo total
              </p>
              <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-0.5 mt-2">
                {CURRENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange('displayCurrency', opt.value)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      local.displayCurrency === opt.value
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lembrete de backup */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Lembrete de backup</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Exibe aviso para fazer backup das palavras-semente
              </p>
            </div>
            <button
              onClick={() => handleChange('showBackupReminder', !local.showBackupReminder)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                local.showBackupReminder ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                local.showBackupReminder ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-xs text-emerald-500 text-center">Configurações salvas</p>
      )}
    </div>
  );
}
