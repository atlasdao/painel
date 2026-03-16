'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  X, ArrowRight, AlertTriangle, Check, Copy, Loader2, Eye, EyeOff,
  Fingerprint, Bitcoin, Users, Search, ChevronLeft,
} from 'lucide-react';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';
import type { AssetBalance, UnblindedUtxo } from '@/app/lib/wallet/wallet-types';
import { transferService, walletProxyService } from '@/app/lib/services';
import { CryptoWorkerManager } from '@/app/lib/wallet/crypto-worker-manager';

interface AtlasTransferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balances: AssetBalance[];
  currentAddress: string | null;
  utxos: UnblindedUtxo[];
  wasmReady: boolean;
  onTxSent: (details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => void;
  biometricEnabled?: boolean;
  onBiometricAuth?: () => Promise<string>;
}

type TransferStep = 'recipient' | 'amount' | 'confirm' | 'password' | 'sending' | 'success' | 'error';

interface ResolvedUser {
  id: string;
  username: string;
  atlasTag: string;
  profilePicture: string | null;
  defaultAddress: { chain: string; address: string } | null;
}

// Asset icon URLs from Liquid Network registry
const ASSET_ICON_URLS: Record<string, string> = {
  [LIQUID_ASSETS.LBTC.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.LBTC.id}/icon`,
  [LIQUID_ASSETS.DEPIX.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.DEPIX.id}/icon`,
  [LIQUID_ASSETS.USDT.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.USDT.id}/icon`,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
};

function AssetIcon({ assetId, iconColor, ticker, size = 'md' }: { assetId: string; iconColor?: string; ticker?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const textMap = { sm: 'text-[8px]', md: 'text-[10px]', lg: 'text-xs' };
  const s = sizeMap[size];
  const t = textMap[size];

  const iconUrl = ASSET_ICON_URLS[assetId];
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={ticker || 'Asset'}
        className={`${s} rounded-full object-cover`}
      />
    );
  }

  const colors = COLOR_MAP[iconColor || 'violet'] || COLOR_MAP.violet;
  const label = ticker?.slice(0, 3) || '?';

  return (
    <div className={`${s} ${colors.bg} rounded-full flex items-center justify-center`}>
      <span className={`${t} font-bold ${colors.text}`}>{label}</span>
    </div>
  );
}

export default function AtlasTransferSheet({
  isOpen,
  onClose,
  balances,
  currentAddress,
  utxos,
  wasmReady,
  onTxSent,
  biometricEnabled,
  onBiometricAuth,
}: AtlasTransferSheetProps) {
  const [step, setStep] = useState<TransferStep>('recipient');
  const [identifier, setIdentifier] = useState('');
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string>(LIQUID_ASSETS.DEPIX.id);
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive asset options dynamically from balances (only assets with balance)
  const assetOptions = useMemo(() => {
    return balances
      .filter(b => b.amount > BigInt(0) || b.metadata?.isKnown)
      .map(b => ({
        assetId: b.assetId,
        label: b.metadata?.name || b.ticker,
        ticker: b.ticker,
        prefix: b.metadata?.prefix || '',
        iconColor: b.metadata?.iconColor || 'violet',
      }));
  }, [balances]);

  const selectedBalance = useMemo(() => {
    return balances.find(b => b.assetId === selectedAsset);
  }, [selectedAsset, balances]);

  const selectedOption = useMemo(() => {
    return assetOptions.find(o => o.assetId === selectedAsset) || assetOptions[0];
  }, [selectedAsset, assetOptions]);

  const amountSats = useMemo(() => {
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) return BigInt(0);
    return BigInt(Math.round(num * 1e8));
  }, [amount]);

  const maxAmount = useMemo(() => {
    if (!selectedBalance) return '0';
    return (Number(selectedBalance.amount) / 1e8).toFixed(8);
  }, [selectedBalance]);

  const lbtcBalance = useMemo(() => {
    return balances.find(b => b.assetId === LIQUID_ASSETS.LBTC.id);
  }, [balances]);

  const MIN_FEE = BigInt(26);

  const estimatedFeeSats = useMemo(() => {
    const lbtcId = LIQUID_ASSETS.LBTC.id;
    const isLbtc = selectedAsset === lbtcId;
    const assetUtxoCount = utxos.filter(u => u.asset === selectedAsset).length || 1;
    const feeUtxoCount = isLbtc ? 0 : (utxos.filter(u => u.asset === lbtcId).length || 1);
    const numInputs = assetUtxoCount + feeUtxoCount;
    const numBlindedOutputs = isLbtc ? 2 : 3;
    const rawVsize = 50 + (numInputs * 100) + (numBlindedOutputs * 1191);
    return Math.max(26, Math.ceil(rawVsize * 0.011));
  }, [selectedAsset, utxos]);

  const hasLbtcForFee = useMemo(() => {
    if (!lbtcBalance || lbtcBalance.amount < MIN_FEE) return false;
    if (selectedAsset === LIQUID_ASSETS.LBTC.id) {
      return lbtcBalance.amount >= amountSats + BigInt(estimatedFeeSats);
    }
    return true;
  }, [lbtcBalance, selectedAsset, amountSats, estimatedFeeSats]);

  // Map asset ID to backend asset name
  const assetNameMap: Record<string, string> = {
    [LIQUID_ASSETS.LBTC.id]: 'L-BTC',
    [LIQUID_ASSETS.DEPIX.id]: 'DEPIX',
    [LIQUID_ASSETS.USDT.id]: 'L-USDT',
  };

  // Debounced resolve
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = identifier.trim();
    if (!trimmed || trimmed.length < 2) {
      setResolvedUser(null);
      setResolveError('');
      setResolving(false);
      return;
    }

    setResolving(true);
    setResolveError('');

    debounceRef.current = setTimeout(async () => {
      try {
        const user = await transferService.resolveRecipient(trimmed);
        setResolvedUser(user);
        setResolveError('');
      } catch (err: any) {
        setResolvedUser(null);
        if (err.response?.status === 404) {
          setResolveError('Usuario nao encontrado');
        } else {
          setResolveError('Erro ao buscar usuario');
        }
      } finally {
        setResolving(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [identifier]);

  const handleMax = () => {
    if (!selectedBalance) return setAmount('0');
    if (selectedAsset === LIQUID_ASSETS.LBTC.id) {
      const maxSats = selectedBalance.amount - BigInt(estimatedFeeSats);
      if (maxSats <= BigInt(0)) return setAmount('0');
      setAmount((Number(maxSats) / 1e8).toFixed(8));
    } else {
      setAmount(maxAmount);
    }
  };

  const handleAmountContinue = () => {
    if (amountSats <= BigInt(0)) {
      setError('Insira um valor valido');
      return;
    }
    if (selectedBalance && amountSats > selectedBalance.amount) {
      setError('Saldo insuficiente');
      return;
    }
    if (selectedAsset === LIQUID_ASSETS.LBTC.id && selectedBalance && amountSats + BigInt(estimatedFeeSats) > selectedBalance.amount) {
      setError(`Saldo insuficiente para cobrir o valor + taxa de rede (~${estimatedFeeSats} sats).`);
      return;
    }
    if (selectedAsset !== LIQUID_ASSETS.LBTC.id && !hasLbtcForFee) {
      setError('Voce precisa de L-BTC para pagar a taxa de rede. Deposite uma pequena quantia de L-BTC.');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const doSendTransaction = async (pw: string) => {
    setStep('sending');
    setLoading(true);

    try {
      if (!resolvedUser) throw new Error('Destinatario nao definido');
      if (!currentAddress) throw new Error('Endereco de origem nao disponivel');

      const assetName = assetNameMap[selectedAsset] || selectedAsset;
      const amountNum = parseFloat(amount.replace(',', '.'));

      // 1. Create transfer record on backend (get toAddress)
      const transfer = await transferService.sendTransfer({
        to: resolvedUser.atlasTag.startsWith('@') ? resolvedUser.atlasTag : `@${resolvedUser.atlasTag}`,
        amount: amountNum,
        asset: assetName,
        chain: 'LIQUID',
        fromAddress: currentAddress,
        note: note.trim() || undefined,
      });

      const toAddress = transfer.toAddress;
      if (!toAddress) throw new Error('Endereco de destino nao retornado pelo servidor');

      // 2. Build and sign the actual Liquid transaction
      const manager = CryptoWorkerManager.getInstance();
      const lbtcId = LIQUID_ASSETS.LBTC.id;
      const txUtxos = utxos.filter(u => u.asset === selectedAsset || u.asset === lbtcId);
      const response = await manager.send({
        type: 'buildAndSignTx',
        params: {
          recipients: [{
            address: toAddress,
            amount: amountSats,
            asset: selectedAsset,
          }],
          feeRate: 0.011,
          utxos: txUtxos,
        },
        password: pw,
      } as any, 30000);

      if (response.type !== 'signedTx') throw new Error('Falha ao assinar transacao');

      // 3. Broadcast to network
      const broadcastResp = await walletProxyService.broadcast((response as any).hex);
      const sentTxid = broadcastResp.data.txid;

      // 4. Confirm transfer with txid
      try {
        await transferService.confirmTransfer(transfer.id, sentTxid);
      } catch {
        // Non-critical: transfer was already sent on-chain
        console.warn('Falha ao confirmar transferencia no backend, mas a transacao foi enviada com sucesso');
      }

      setTxid(sentTxid);
      setStep('success');
      onTxSent({ txid: sentTxid, assetId: selectedAsset, amount: amountSats, feeSats: estimatedFeeSats });
    } catch (err: any) {
      const apiMsg = err.response?.data?.message || '';
      const msg = apiMsg || err.message || '';

      if (msg.includes('Saldo insuficiente') || msg.includes('insufficient') || msg.includes('Insufficient')) {
        setError(msg);
      } else if (msg.includes('Senha') || msg.includes('decrypt') || msg.includes('password') || msg.includes('incorreta')) {
        setError('Senha incorreta. Verifique e tente novamente.');
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('A operacao demorou demais. Verifique sua conexao e tente novamente.');
      } else if (msg.includes('Broadcast failed')) {
        setError(`Erro ao transmitir: ${msg.replace('Broadcast failed: ', '')}`);
      } else if (msg.includes('status code 400')) {
        setError('Transacao rejeitada pela rede. Verifique o valor.');
      } else if (msg.includes('UTXO') || msg.includes('recarregar')) {
        setError(msg);
      } else if (msg.includes('L-BTC') || msg.includes('taxa de rede')) {
        setError(msg);
      } else {
        setError(msg || 'Erro ao enviar transacao. Tente novamente.');
      }
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password) return;
    await doSendTransaction(password);
  };

  const handleBiometricSubmit = async () => {
    if (!onBiometricAuth) return;
    try {
      const pw = await onBiometricAuth();
      setPassword(pw);
      await doSendTransaction(pw);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') return;
      const apiMsg = err.response?.data?.message || '';
      const msg = apiMsg || err.message || '';
      setError(msg || 'Erro ao enviar transacao. Tente novamente.');
      setStep('error');
    }
  };

  const handleCopyTxid = async () => {
    await navigator.clipboard.writeText(txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('recipient');
    setIdentifier('');
    setResolvedUser(null);
    setResolveError('');
    setResolving(false);
    setAmount('');
    setSelectedAsset(LIQUID_ASSETS.DEPIX.id);
    setNote('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setTxid('');
    setCopied(false);
    onClose();
  };

  const handleBack = () => {
    setError('');
    if (step === 'amount') setStep('recipient');
    else if (step === 'confirm') setStep('amount');
    else if (step === 'password') setStep('confirm');
  };

  const stepTitle = useMemo(() => {
    switch (step) {
      case 'recipient': return 'Enviar para Atlas';
      case 'amount': return 'Quanto enviar?';
      case 'confirm': return 'Confirmar Envio';
      case 'password': return 'Autorizar';
      case 'sending': return 'Enviando...';
      case 'success': return 'Enviado!';
      case 'error': return 'Erro';
    }
  }, [step]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div className="bg-[var(--bg-card)] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[90vh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              {(step === 'amount' || step === 'confirm' || step === 'password') && (
                <button onClick={handleBack} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg">
                  <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              )}
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{stepTitle}</h3>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* ===== STEP 1: RECIPIENT ===== */}
            {step === 'recipient' && (
              <>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                    @tag ou email do destinatario
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="@username ou email@exemplo.com"
                      className="w-full pl-9 pr-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      autoFocus
                      autoComplete="off"
                    />
                    {resolving && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolved user card */}
                {resolvedUser && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] border border-emerald-500/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {resolvedUser.profilePicture ? (
                        <img
                          src={resolvedUser.profilePicture}
                          alt={resolvedUser.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        @{resolvedUser.atlasTag}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {resolvedUser.username}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  </div>
                )}

                {/* Error */}
                {resolveError && !resolving && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {resolveError}
                  </p>
                )}

                <button
                  onClick={() => { setError(''); setStep('amount'); }}
                  disabled={!resolvedUser}
                  className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ===== STEP 2: AMOUNT ===== */}
            {step === 'amount' && (
              <>
                {/* Recipient mini-card */}
                {resolvedUser && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {resolvedUser.profilePicture ? (
                        <img src={resolvedUser.profilePicture} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <Users className="w-3 h-3 text-[var(--accent)]" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                      Para @{resolvedUser.atlasTag}
                    </span>
                  </div>
                )}

                {/* Asset selector */}
                <div className="flex bg-[var(--bg-tertiary)] rounded-xl p-1 gap-1 overflow-x-auto">
                  {assetOptions.map(opt => (
                    <button
                      key={opt.assetId}
                      onClick={() => setSelectedAsset(opt.assetId)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all min-w-0 ${
                        selectedAsset === opt.assetId
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <AssetIcon assetId={opt.assetId} iconColor={opt.iconColor} ticker={opt.ticker} size="sm" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Balance indicator */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[var(--text-muted)]">Saldo disponivel</span>
                  <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                    {selectedOption?.prefix || ''}{maxAmount}
                  </span>
                </div>

                {/* Amount input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-[var(--text-muted)]">Valor</label>
                    <button onClick={handleMax} className="text-xs text-[var(--accent)] hover:underline font-medium">
                      Usar maximo
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <AssetIcon assetId={selectedAsset} iconColor={selectedOption?.iconColor} ticker={selectedOption?.ticker} size="sm" />
                    </div>
                    <input
                      type="text"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full pl-10 pr-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tabular-nums"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Nota (opcional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Nota para o destinatario"
                    maxLength={140}
                    className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* L-BTC fee warning */}
                {selectedAsset !== LIQUID_ASSETS.LBTC.id && !hasLbtcForFee && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Bitcoin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      Voce precisa de <strong>L-BTC</strong> para pagar a taxa de rede da Liquid.
                      Deposite uma pequena quantia antes de enviar.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                  </p>
                )}

                <button
                  onClick={handleAmountContinue}
                  disabled={!amount}
                  className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ===== STEP 3: CONFIRM ===== */}
            {step === 'confirm' && (
              <>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-3">
                  {/* Recipient */}
                  {resolvedUser && (
                    <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-default)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {resolvedUser.profilePicture ? (
                          <img src={resolvedUser.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-[var(--accent)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          @{resolvedUser.atlasTag}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {resolvedUser.username}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-default)]">
                    <AssetIcon assetId={selectedAsset} iconColor={selectedOption?.iconColor} ticker={selectedOption?.ticker} size="lg" />
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                        {selectedOption?.prefix || ''}{amount}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{selectedOption?.label || selectedOption?.ticker}</p>
                    </div>
                  </div>

                  {/* Note */}
                  {note.trim() && (
                    <div className="pb-3 border-b border-[var(--border-default)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Nota</p>
                      <p className="text-sm text-[var(--text-primary)] italic">&ldquo;{note.trim()}&rdquo;</p>
                    </div>
                  )}

                  {/* Fee */}
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Taxa estimada</span>
                    <span className="text-xs text-[var(--text-secondary)]">~{estimatedFeeSats} sats</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl font-medium border border-[var(--border-default)]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setStep('password')}
                    className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl font-medium"
                  >
                    Confirmar e Enviar
                  </button>
                </div>
              </>
            )}

            {/* ===== STEP 4: PASSWORD ===== */}
            {step === 'password' && (
              <>
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-3">
                    <AssetIcon assetId={selectedAsset} iconColor={selectedOption?.iconColor} ticker={selectedOption?.ticker} size="lg" />
                    <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                      {selectedOption?.prefix || ''}{amount}
                    </p>
                  </div>
                  {resolvedUser && (
                    <p className="text-sm text-[var(--text-secondary)] mt-3">
                      Para @{resolvedUser.atlasTag}
                    </p>
                  )}
                </div>

                {biometricEnabled && onBiometricAuth && (
                  <>
                    <button
                      onClick={handleBiometricSubmit}
                      disabled={loading}
                      className="w-full py-4 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl flex items-center justify-center gap-3 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                    >
                      <Fingerprint className="w-6 h-6 text-[var(--accent)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">Toque para autorizar</span>
                    </button>

                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                      <div className="flex-1 h-px bg-[var(--border-default)]" />
                      <span className="text-xs">ou use a senha</span>
                      <div className="flex-1 h-px bg-[var(--border-default)]" />
                    </div>
                  </>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Senha da carteira"
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10 text-center"
                    autoFocus={!biometricEnabled}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password}
                  className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Assinar e enviar
                </button>
              </>
            )}

            {/* ===== SENDING ===== */}
            {step === 'sending' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-[var(--accent)] mx-auto animate-spin mb-3" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Preparando envio...</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Assinando e transmitindo para a rede Liquid</p>
              </div>
            )}

            {/* ===== SUCCESS ===== */}
            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    Enviado com sucesso!
                  </p>
                  {resolvedUser && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {selectedOption?.prefix || ''}{amount} {selectedOption?.ticker} para @{resolvedUser.atlasTag}
                    </p>
                  )}
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">TXID</p>
                  <p className="text-xs font-mono text-[var(--text-primary)] break-all">{txid}</p>
                </div>
                <button
                  onClick={handleCopyTxid}
                  className="w-full py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-sm font-medium border border-[var(--border-default)] flex items-center justify-center gap-2"
                >
                  {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar TXID</>}
                </button>
                <button onClick={handleClose} className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium">
                  Fechar
                </button>
              </div>
            )}

            {/* ===== ERROR ===== */}
            {step === 'error' && (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">Erro no Envio</p>
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('recipient'); setError(''); }}
                    className="flex-1 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl font-medium border border-[var(--border-default)]"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => { setStep('password'); setError(''); }}
                    className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl font-medium"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
