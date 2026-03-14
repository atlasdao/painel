'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { walletCache } from '@/app/lib/wallet/wallet-cache';
import { walletProxyService } from '@/app/lib/services';
import type { AssetBalance, PriceData, UnblindedUtxo, AssetMetadata } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS, getKnownAssetMetadata } from '@/app/lib/wallet/wallet-types';
import { CryptoWorkerManager } from '@/app/lib/wallet/crypto-worker-manager';

// Cache for fetched unknown asset metadata (session-level)
const assetMetadataCache = new Map<string, AssetMetadata>();

export function useWalletBalance(userId: string | undefined, addresses: string[], isUnlocked: boolean) {
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [utxos, setUtxos] = useState<UnblindedUtxo[]>([]);
  const fetchingRef = useRef(false);
  const utxoFingerprintRef = useRef<string>('');

  // Load cached balances on mount for instant paint
  useEffect(() => {
    if (!userId) return;
    const cached = walletCache.getBalancesCache(userId);
    if (cached) {
      setBalances(cached);
      setLoading(false);
    }
    const cachedPrices = walletCache.getPricesCache();
    if (cachedPrices) setPrices(cachedPrices);
  }, [userId]);

  const fetchBalances = useCallback(async () => {
    if (addresses.length === 0 || !isUnlocked || !userId || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Fetch UTXOs from ALL addresses + prices in parallel
      const [utxoResults, priceData] = await Promise.all([
        Promise.all(addresses.map(addr =>
          walletProxyService.getUtxos(addr).then(r => r.data).catch(() => [])
        )),
        walletProxyService.getPrices().then(r => r.data).catch(() => prices),
      ]);

      if (priceData) {
        setPrices(priceData);
        walletCache.setPricesCache(priceData);
      }

      // Merge and deduplicate UTXOs by txid:vout
      const seen = new Set<string>();
      const allRawUtxos: any[] = [];
      for (const utxoList of utxoResults) {
        if (!utxoList) continue;
        for (const utxo of utxoList) {
          const key = `${utxo.txid}:${utxo.vout}`;
          if (!seen.has(key)) {
            seen.add(key);
            allRawUtxos.push(utxo);
          }
        }
      }

      // UTXO fingerprint: skip expensive unblinding if nothing changed
      const sortedKeys = allRawUtxos.map((u: any) => `${u.txid}:${u.vout}`).sort().join('|');
      const fingerprint = sortedKeys || 'empty';

      if (fingerprint === utxoFingerprintRef.current && utxos.length > 0) {
        // UTXO set unchanged — skip unblinding, just update prices
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      if (allRawUtxos.length === 0) {
        utxoFingerprintRef.current = 'empty';
        const emptyBalances: AssetBalance[] = [
          { assetId: LIQUID_ASSETS.DEPIX.id, ticker: 'BRL', amount: BigInt(0), fiatValue: 0, metadata: getKnownAssetMetadata(LIQUID_ASSETS.DEPIX.id)! },
          { assetId: LIQUID_ASSETS.USDT.id, ticker: 'L-USDT', amount: BigInt(0), fiatValue: 0, metadata: getKnownAssetMetadata(LIQUID_ASSETS.USDT.id)! },
          { assetId: LIQUID_ASSETS.LBTC.id, ticker: 'L-BTC', amount: BigInt(0), fiatValue: 0, metadata: getKnownAssetMetadata(LIQUID_ASSETS.LBTC.id)! },
        ];
        setBalances(emptyBalances);
        walletCache.setBalancesCache(userId, emptyBalances);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // Fetch tx hexes for unblinding
      const uniqueTxids = Array.from(new Set<string>(allRawUtxos.map((u: any) => u.txid)));
      const txHexMap: Record<string, string> = {};

      await Promise.all(
        uniqueTxids.map(async (txid) => {
          try {
            const resp = await walletProxyService.getTxHex(txid);
            txHexMap[txid] = resp.data.hex;
          } catch {
            // skip failed tx fetches
          }
        }),
      );

      // Send to worker for unblinding
      const manager = CryptoWorkerManager.getInstance();
      const response = await manager.send({
        type: 'unblindUtxos',
        rawUtxos: allRawUtxos,
        txHexMap,
      } as any);

      if (response.type === 'balances') {
        const unblindedUtxos: UnblindedUtxo[] = (response as any).utxos.map((u: any) => ({
          ...u,
          value: BigInt(u.value),
          isChange: u.isChange || false,
        }));
        setUtxos(unblindedUtxos);
        utxoFingerprintRef.current = fingerprint;

        // Aggregate balances by asset
        const balanceMap = new Map<string, bigint>();
        for (const utxo of unblindedUtxos) {
          const current = balanceMap.get(utxo.asset) || BigInt(0);
          balanceMap.set(utxo.asset, current + utxo.value);
        }

        const p = priceData || prices;

        // Always include the 3 known assets (even with zero balance)
        const newBalances: AssetBalance[] = [
          {
            assetId: LIQUID_ASSETS.DEPIX.id,
            ticker: 'BRL',
            amount: balanceMap.get(LIQUID_ASSETS.DEPIX.id) || BigInt(0),
            fiatValue: Number(balanceMap.get(LIQUID_ASSETS.DEPIX.id) || BigInt(0)) / 1e8 * (p?.DEPIX_BRL || 1),
            metadata: getKnownAssetMetadata(LIQUID_ASSETS.DEPIX.id)!,
          },
          {
            assetId: LIQUID_ASSETS.USDT.id,
            ticker: 'L-USDT',
            amount: balanceMap.get(LIQUID_ASSETS.USDT.id) || BigInt(0),
            fiatValue: Number(balanceMap.get(LIQUID_ASSETS.USDT.id) || BigInt(0)) / 1e8 * (p?.USDT_BRL || 0),
            metadata: getKnownAssetMetadata(LIQUID_ASSETS.USDT.id)!,
          },
          {
            assetId: LIQUID_ASSETS.LBTC.id,
            ticker: 'L-BTC',
            amount: balanceMap.get(LIQUID_ASSETS.LBTC.id) || BigInt(0),
            fiatValue: Number(balanceMap.get(LIQUID_ASSETS.LBTC.id) || BigInt(0)) / 1e8 * (p?.LBTC_BRL || 0),
            metadata: getKnownAssetMetadata(LIQUID_ASSETS.LBTC.id)!,
          },
        ];

        // Add entries for unknown assets found in UTXOs
        const knownIds = new Set<string>(Object.values(LIQUID_ASSETS).map(a => a.id));
        const unknownAssetIds: string[] = [];
        for (const [assetId, amount] of balanceMap.entries()) {
          if (knownIds.has(assetId)) continue;
          // Check session cache first
          const cached = assetMetadataCache.get(assetId);
          const metadata: AssetMetadata = cached || {
            assetId,
            ticker: assetId.slice(0, 8),
            name: 'Unknown Asset',
            precision: 8,
            iconColor: 'violet',
            isKnown: false,
          };
          newBalances.push({
            assetId,
            ticker: metadata.ticker,
            amount,
            fiatValue: 0,
            metadata,
          });
          if (!cached) unknownAssetIds.push(assetId);
        }

        setBalances(newBalances);
        walletCache.setBalancesCache(userId, newBalances);

        // Fetch metadata for unknown assets in background (non-blocking)
        if (unknownAssetIds.length > 0) {
          Promise.all(
            unknownAssetIds.map(async (id) => {
              try {
                const resp = await walletProxyService.getAssetInfo(id);
                const info = resp.data;
                const meta: AssetMetadata = {
                  assetId: id,
                  ticker: info.ticker || id.slice(0, 8),
                  name: info.name || 'Unknown Asset',
                  precision: info.precision ?? 8,
                  iconColor: 'violet',
                  isKnown: false,
                };
                assetMetadataCache.set(id, meta);
                return { id, meta };
              } catch {
                return null;
              }
            })
          ).then(results => {
            const updates = results.filter(Boolean) as { id: string; meta: AssetMetadata }[];
            if (updates.length === 0) return;
            // Update balances with real metadata
            setBalances(prev => prev.map(b => {
              const update = updates.find(u => u.id === b.assetId);
              if (update) return { ...b, ticker: update.meta.ticker, metadata: update.meta };
              return b;
            }));
          });
        }
      }
    } catch (err) {
      console.error('[WalletBalance] Error:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [addresses, isUnlocked, userId, prices]);

  // Optimistic balance update after a successful send (instant UI feedback)
  const applyOptimisticSend = useCallback((assetId: string, amountSats: bigint, feeSats: number) => {
    const lbtcId = LIQUID_ASSETS.LBTC.id;
    const sendingLbtc = assetId === lbtcId;

    setBalances(prev => prev.map(b => {
      if (b.assetId === assetId) {
        const newAmount = b.amount - amountSats - (sendingLbtc ? BigInt(feeSats) : BigInt(0));
        return { ...b, amount: newAmount < BigInt(0) ? BigInt(0) : newAmount };
      }
      if (!sendingLbtc && b.assetId === lbtcId) {
        const newAmount = b.amount - BigInt(feeSats);
        return { ...b, amount: newAmount < BigInt(0) ? BigInt(0) : newAmount };
      }
      return b;
    }));

    // Invalidate fingerprint so next poll does a full refresh
    utxoFingerprintRef.current = '';
  }, []);

  return { balances, prices, loading, utxos, fetchBalances, applyOptimisticSend };
}
