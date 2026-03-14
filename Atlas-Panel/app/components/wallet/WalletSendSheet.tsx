'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, ArrowRight, AlertTriangle, Check, Copy, Camera, Loader2, Eye, EyeOff, Bitcoin, Fingerprint } from 'lucide-react';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';
import type { AssetBalance, UnblindedUtxo } from '@/app/lib/wallet/wallet-types';
import { walletProxyService } from '@/app/lib/services';
import { CryptoWorkerManager } from '@/app/lib/wallet/crypto-worker-manager';

interface WalletSendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balances: AssetBalance[];
  utxos: UnblindedUtxo[];
  onTxSent: (details: { txid: string; assetId: string; amount: bigint; feeSats: number }) => void;
  biometricEnabled?: boolean;
  onBiometricAuth?: () => Promise<string>;
}

type SendStep = 'input' | 'review' | 'password' | 'sending' | 'success' | 'error';

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
};

// Asset icon URLs from Liquid Network registry
const ASSET_ICON_URLS: Record<string, string> = {
  [LIQUID_ASSETS.LBTC.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.LBTC.id}/icon`,
  [LIQUID_ASSETS.DEPIX.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.DEPIX.id}/icon`,
  [LIQUID_ASSETS.USDT.id]: `https://liquid.network/api/v1/asset/${LIQUID_ASSETS.USDT.id}/icon`,
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

export default function WalletSendSheet({ isOpen, onClose, balances, utxos, onTxSent, biometricEnabled, onBiometricAuth }: WalletSendSheetProps) {
  const [step, setStep] = useState<SendStep>('input');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string>(LIQUID_ASSETS.DEPIX.id);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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

  // Estimate fee based on actual UTXOs
  const estimatedFeeSats = useMemo(() => {
    const lbtcId = LIQUID_ASSETS.LBTC.id;
    const isLbtc = selectedAsset === lbtcId;
    const assetUtxoCount = utxos.filter(u => u.asset === selectedAsset).length || 1;
    const feeUtxoCount = isLbtc ? 0 : (utxos.filter(u => u.asset === lbtcId).length || 1);
    const numInputs = assetUtxoCount + feeUtxoCount;
    const numBlindedOutputs = isLbtc ? 2 : 3;
    // ELIP 200 discount-aware: raw vsize * effective rate (~0.011 sat/vB)
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

  const handleMax = () => {
    if (!selectedBalance) return setAmount('0');
    if (selectedAsset === LIQUID_ASSETS.LBTC.id) {
      // Reservar taxa ao usar máximo de L-BTC
      const maxSats = selectedBalance.amount - BigInt(estimatedFeeSats);
      if (maxSats <= BigInt(0)) return setAmount('0');
      setAmount((Number(maxSats) / 1e8).toFixed(8));
    } else {
      setAmount(maxAmount);
    }
  };

  const handleReview = () => {
    if (!address.trim()) {
      setError('Insira o endereço de destino');
      return;
    }
    if (amountSats <= BigInt(0)) {
      setError('Insira um valor válido');
      return;
    }
    if (selectedBalance && amountSats > selectedBalance.amount) {
      setError('Saldo insuficiente');
      return;
    }
    // Para L-BTC: verificar se sobra para a taxa
    if (selectedAsset === LIQUID_ASSETS.LBTC.id && selectedBalance && amountSats + BigInt(estimatedFeeSats) > selectedBalance.amount) {
      setError(`Saldo insuficiente para cobrir o valor + taxa de rede (~${estimatedFeeSats} sats).`);
      return;
    }
    // Para outros ativos: verificar se tem L-BTC para a taxa
    if (selectedAsset !== LIQUID_ASSETS.LBTC.id && !hasLbtcForFee) {
      setError('Você precisa de L-BTC para pagar a taxa de rede. Deposite uma pequena quantia de L-BTC.');
      return;
    }
    setError('');
    setStep('review');
  };

  const handlePasswordSubmit = async () => {
    if (!password) return;
    setStep('sending');
    setLoading(true);

    try {
      const manager = CryptoWorkerManager.getInstance();
      const lbtcId = LIQUID_ASSETS.LBTC.id;
      // Include asset UTXOs + L-BTC UTXOs for fee (deduplicated)
      const txUtxos = utxos.filter(u => u.asset === selectedAsset || u.asset === lbtcId);
      const response = await manager.send({
        type: 'buildAndSignTx',
        params: {
          recipients: [{
            address: address.trim(),
            amount: amountSats,
            asset: selectedAsset,
          }],
          feeRate: 0.011,
          utxos: txUtxos,
        },
        password,
      } as any, 30000);

      if (response.type !== 'signedTx') throw new Error('Falha ao assinar transação');

      const broadcastResp = await walletProxyService.broadcast((response as any).hex);
      const sentTxid = broadcastResp.data.txid;
      setTxid(sentTxid);
      setStep('success');
      onTxSent({ txid: sentTxid, assetId: selectedAsset, amount: amountSats, feeSats: estimatedFeeSats });
    } catch (err: any) {
      // Extract the best available error message
      const apiMsg = err.response?.data?.message || '';
      const msg = apiMsg || err.message || '';

      if (msg.includes('Saldo insuficiente') || msg.includes('insufficient') || msg.includes('Insufficient')) {
        setError(msg);
      } else if (msg.includes('Senha') || msg.includes('decrypt') || msg.includes('password') || msg.includes('incorreta')) {
        setError('Senha incorreta. Verifique e tente novamente.');
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('A operação demorou demais. Verifique sua conexão e tente novamente.');
      } else if (msg.includes('Broadcast failed')) {
        setError(`Erro ao transmitir: ${msg.replace('Broadcast failed: ', '')}`);
      } else if (msg.includes('status code 400')) {
        setError('Transação rejeitada pela rede. Verifique o endereço e o valor.');
      } else if (msg.includes('UTXO') || msg.includes('recarregar')) {
        setError(msg);
      } else if (msg.includes('L-BTC') || msg.includes('taxa de rede')) {
        setError(msg);
      } else {
        setError(msg || 'Erro ao enviar transação. Tente novamente.');
      }
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSubmit = async () => {
    if (!onBiometricAuth) return;
    try {
      const pw = await onBiometricAuth();
      setPassword(pw);
      // Submit automatically with the decrypted password
      setStep('sending');
      setLoading(true);

      const manager = CryptoWorkerManager.getInstance();
      const lbtcId = LIQUID_ASSETS.LBTC.id;
      const txUtxos = utxos.filter(u => u.asset === selectedAsset || u.asset === lbtcId);
      const response = await manager.send({
        type: 'buildAndSignTx',
        params: {
          recipients: [{
            address: address.trim(),
            amount: amountSats,
            asset: selectedAsset,
          }],
          feeRate: 0.011,
          utxos: txUtxos,
        },
        password: pw,
      } as any, 30000);

      if (response.type !== 'signedTx') throw new Error('Falha ao assinar transação');

      const broadcastResp = await walletProxyService.broadcast((response as any).hex);
      const sentTxid = broadcastResp.data.txid;
      setTxid(sentTxid);
      setStep('success');
      onTxSent({ txid: sentTxid, assetId: selectedAsset, amount: amountSats, feeSats: estimatedFeeSats });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled biometric - stay on password step
        return;
      }
      const apiMsg = err.response?.data?.message || '';
      const msg = apiMsg || err.message || '';
      setError(msg || 'Erro ao enviar transação. Tente novamente.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = useCallback(async () => {
    setShowScanner(true);
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text: string) => {
          const addr = text.replace(/^liquid(mainnet)?:/, '').split('?')[0];
          setAddress(addr);
          scanner.clear();
          setShowScanner(false);
        },
        () => {},
      );
    } catch {
      setShowScanner(false);
    }
  }, []);

  const handleCopyTxid = async () => {
    await navigator.clipboard.writeText(txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('input');
    setAddress('');
    setAmount('');
    setPassword('');
    setError('');
    setTxid('');
    setShowScanner(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div className="bg-[var(--bg-card)] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[90vh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {step === 'success' ? 'Enviado!' : step === 'error' ? 'Erro' : 'Enviar'}
            </h3>
            <button onClick={handleClose} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* ===== INPUT ===== */}
            {step === 'input' && (
              <>
                {/* Asset selector with icons */}
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
                  <span className="text-xs text-[var(--text-muted)]">Saldo disponível</span>
                  <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                    {selectedOption?.prefix || ''}{maxAmount}
                  </span>
                </div>

                {/* Address input */}
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Endereço de destino</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="lq1... ou VJL..."
                      className="flex-1 px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      autoComplete="off"
                    />
                    <button
                      onClick={handleScanQR}
                      className="px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
                      title="Escanear QR Code"
                    >
                      <Camera className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>

                {showScanner && (
                  <div className="rounded-xl overflow-hidden border border-[var(--border-default)]">
                    <div id="qr-reader" />
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-[var(--text-muted)]">Valor</label>
                    <button onClick={handleMax} className="text-xs text-[var(--accent)] hover:underline font-medium">
                      Usar máximo
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
                      className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tabular-nums"
                    />
                  </div>
                </div>

                {/* Aviso de L-BTC para taxa - só para ativos não-L-BTC */}
                {selectedAsset !== LIQUID_ASSETS.LBTC.id && !hasLbtcForFee && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Bitcoin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      Você precisa de <strong>L-BTC</strong> para pagar a taxa de rede da Liquid.
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
                  onClick={handleReview}
                  disabled={!address || !amount}
                  className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Revisar envio <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ===== REVIEW ===== */}
            {step === 'review' && (
              <>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-3">
                  {/* Asset + amount */}
                  <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-default)]">
                    <AssetIcon assetId={selectedAsset} iconColor={selectedOption?.iconColor} ticker={selectedOption?.ticker} size="lg" />
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                        {selectedOption?.prefix || ''}{amount}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{selectedOption?.label || selectedOption?.ticker}</p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Destinatário</p>
                    <p className="text-xs font-mono text-[var(--text-primary)] break-all leading-relaxed">{address}</p>
                  </div>

                  {/* Fee */}
                  <div className="flex justify-between pt-2 border-t border-[var(--border-default)]">
                    <span className="text-xs text-[var(--text-muted)]">Taxa estimada</span>
                    <span className="text-xs text-[var(--text-secondary)]">~{estimatedFeeSats} sats</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('input')}
                    className="flex-1 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl font-medium border border-[var(--border-default)]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setStep('password')}
                    className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl font-medium"
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}

            {/* ===== PASSWORD ===== */}
            {step === 'password' && (
              <>
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-3">
                    <AssetIcon assetId={selectedAsset} iconColor={selectedOption?.iconColor} ticker={selectedOption?.ticker} size="lg" />
                    <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                      {selectedOption?.prefix || ''}{amount}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-3">
                    Autorize esta transação
                  </p>
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
                <p className="text-sm font-medium text-[var(--text-primary)]">Assinando transação...</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Transmitindo para a rede Liquid</p>
              </div>
            )}

            {/* ===== SUCCESS ===== */}
            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">Transação Enviada!</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">A confirmação pode levar até 2 minutos.</p>
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
                    onClick={() => { setStep('input'); setError(''); }}
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
