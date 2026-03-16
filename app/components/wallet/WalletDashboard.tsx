'use client';

import { useState, useCallback } from 'react';
import { Settings, X, AlertTriangle } from 'lucide-react';
import WalletBalanceCard from './WalletBalanceCard';
import WalletActions from './WalletActions';
import WalletTransactions from './WalletTransactions';
import WalletHistorySheet from './WalletHistorySheet';
import WalletReceiveSheet from './WalletReceiveSheet';
import WalletSendSheet from './WalletSendSheet';
import AtlasTransferSheet from './AtlasTransferSheet';
import WalletSecurity from './WalletSecurity';
import WalletSettingsPanel from './WalletSettingsPanel';
import type { AssetBalance, WalletTransaction, UnblindedUtxo, WalletSettings } from '@/app/lib/wallet/wallet-types';

interface WalletDashboardProps {
  balances: AssetBalance[];
  balanceLoading: boolean;
  transactions: WalletTransaction[];
  txLoading: boolean;
  utxos: UnblindedUtxo[];
  currentAddress: string | null;
  wasmReady: boolean;
  settings: WalletSettings;
  usdBrlRate: number;
  onNewAddress: () => Promise<string | undefined>;
  onTxSent: (details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => void;
  onViewSeed: (password: string) => Promise<string[]>;
  onDeleteWallet: () => Promise<void>;
  onUpdateSettings: (settings: WalletSettings) => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onEnableBiometric?: (password: string) => Promise<void>;
  onDisableBiometric?: () => void;
  onBiometricAuth?: () => Promise<string>;
  pinEnabled?: boolean;
  onSetupPin?: (mnemonic: string, pin: string) => Promise<void>;
  onRemovePin?: () => void;
  onChangePin?: (mnemonic: string, oldPin: string, newPin: string) => Promise<void>;
}

export default function WalletDashboard({
  balances,
  balanceLoading,
  transactions,
  txLoading,
  utxos,
  currentAddress,
  wasmReady,
  settings,
  usdBrlRate,
  onNewAddress,
  onTxSent,
  onViewSeed,
  onDeleteWallet,
  onUpdateSettings,
  biometricAvailable,
  biometricEnabled,
  onEnableBiometric,
  onDisableBiometric,
  onBiometricAuth,
  pinEnabled,
  onSetupPin,
  onRemovePin,
  onChangePin,
}: WalletDashboardProps) {
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showAtlasTransfer, setShowAtlasTransfer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleTxSent = useCallback((details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => {
    setShowSend(false);
    onTxSent(details);
  }, [onTxSent]);

  const handleAtlasTransferSent = useCallback((details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => {
    setShowAtlasTransfer(false);
    onTxSent(details);
  }, [onTxSent]);

  const handleDismissBackupReminder = useCallback(() => {
    onUpdateSettings({ ...settings, showBackupReminder: false });
  }, [settings, onUpdateSettings]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {!wasmReady && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-xs text-amber-600 dark:text-amber-400">Sincronizando carteira...</span>
        </div>
      )}

      {/* Backup reminder banner */}
      {settings.showBackupReminder && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Faça backup da sua carteira</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Anote suas 12 palavras-semente em um local seguro. Sem elas, você pode perder acesso aos seus fundos.
            </p>
          </div>
          <button
            onClick={handleDismissBackupReminder}
            className="p-1 hover:bg-amber-500/10 rounded text-amber-500 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <WalletBalanceCard
        balances={balances}
        loading={balanceLoading}
        displayCurrency={settings.displayCurrency}
        usdBrlRate={usdBrlRate}
      />

      <WalletActions
        onReceive={() => setShowReceive(true)}
        onSend={() => setShowSend(true)}
        onAtlasTransfer={() => setShowAtlasTransfer(true)}
        onHistory={() => setShowHistory(true)}
        disabled={!wasmReady}
      />

      <div id="wallet-transactions">
        <WalletTransactions
          transactions={transactions}
          loading={txLoading}
          onViewAll={() => setShowHistory(true)}
        />
      </div>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <Settings className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">Configurações</span>
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSettings(false)} />
          <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
            <div className="bg-[var(--bg-card)] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Configurações da Carteira</h3>
                <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-4 space-y-5">
                <WalletSettingsPanel
                  settings={settings}
                  onSave={onUpdateSettings}
                  biometricAvailable={biometricAvailable}
                  biometricEnabled={biometricEnabled}
                  onEnableBiometric={onEnableBiometric}
                  onDisableBiometric={onDisableBiometric}
                />
                <WalletSecurity
                  onViewSeed={onViewSeed}
                  onDeleteWallet={onDeleteWallet}
                  biometricEnabled={biometricEnabled}
                  onBiometricAuth={onBiometricAuth}
                  pinEnabled={pinEnabled}
                  onSetupPin={onSetupPin}
                  onRemovePin={onRemovePin}
                  onChangePin={onChangePin}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <WalletReceiveSheet
        isOpen={showReceive}
        onClose={() => setShowReceive(false)}
        address={currentAddress}
        onNewAddress={onNewAddress}
        defaultAsset={settings.defaultReceiveAsset}
      />

      <WalletSendSheet
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        balances={balances}
        utxos={utxos}
        onTxSent={handleTxSent}
        biometricEnabled={biometricEnabled}
        onBiometricAuth={onBiometricAuth}
      />

      <AtlasTransferSheet
        isOpen={showAtlasTransfer}
        onClose={() => setShowAtlasTransfer(false)}
        balances={balances}
        currentAddress={currentAddress}
        utxos={utxos}
        wasmReady={wasmReady}
        onTxSent={handleAtlasTransferSent}
        biometricEnabled={biometricEnabled}
        onBiometricAuth={onBiometricAuth}
      />

      <WalletHistorySheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        transactions={transactions}
        loading={txLoading}
      />
    </div>
  );
}
