'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Copy, Check, RefreshCw, Share2 } from 'lucide-react';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

interface WalletReceiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
  onNewAddress: () => Promise<string | undefined>;
  defaultAsset?: 'DEPIX' | 'USDT' | 'LBTC';
}

type AssetTab = 'DEPIX' | 'USDT' | 'LBTC';

export default function WalletReceiveSheet({ isOpen, onClose, address, onNewAddress, defaultAsset = 'DEPIX' }: WalletReceiveSheetProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetTab>(defaultAsset);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const assetInfo = useMemo(() => ({
    DEPIX: { label: 'Depix (R$)', color: 'emerald' },
    USDT: { label: 'L-USDT', color: 'green' },
    LBTC: { label: 'L-BTC', color: 'orange' },
  }), []);

  // Render QR code on canvas
  useEffect(() => {
    if (!address || !canvasRef.current || !isOpen) return;

    const renderQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        await QRCode.toCanvas(canvasRef.current, address, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      } catch {
        // QR library might not be available
      }
    };

    renderQR();
  }, [address, isOpen]);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleShare = useCallback(async () => {
    if (!address || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Endereço Liquid',
        text: address,
      });
    } catch {
      // User cancelled or not supported
    }
  }, [address]);

  const handleNewAddress = useCallback(async () => {
    setGenerating(true);
    try {
      await onNewAddress();
    } finally {
      setGenerating(false);
    }
  }, [onNewAddress]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50">
        <div className="bg-[var(--bg-card)] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Receber</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Asset selector */}
            <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-0.5">
              {(['DEPIX', 'USDT', 'LBTC'] as AssetTab[]).map(asset => (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                    selectedAsset === asset
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {assetInfo[asset].label}
                </button>
              ))}
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl">
                <canvas ref={canvasRef} width={200} height={200} />
              </div>
            </div>

            {/* Address */}
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] mb-1">Endereço {assetInfo[selectedAsset].label}</p>
              <p className="text-xs font-mono text-[var(--text-primary)] break-all leading-relaxed select-all">
                {address || 'Carregando...'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!address}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar</>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShare}
                  disabled={!address}
                  className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-sm font-medium border border-[var(--border-default)] disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleNewAddress}
                disabled={generating}
                className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl text-sm font-medium border border-[var(--border-default)] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
