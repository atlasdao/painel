'use client';

import { useState, useCallback, useRef } from 'react';
import { walletProxyService } from '@/app/lib/services';
import { CryptoWorkerManager } from '@/app/lib/wallet/crypto-worker-manager';
import type { WalletTransaction, UnblindedUtxo, TxOutputInfo } from '@/app/lib/wallet/wallet-types';
import { LIQUID_ASSETS } from '@/app/lib/wallet/wallet-types';

export function useWalletTransactions(addresses: string[], isUnlocked: boolean, unblindedUtxos: UnblindedUtxo[]) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const txHexCacheRef = useRef<Record<string, string>>({});
  const pendingTxRef = useRef<Map<string, WalletTransaction>>(new Map());

  const fetchTransactions = useCallback(async () => {
    if (addresses.length === 0 || !isUnlocked || fetchingRef.current) return;
    if (unblindedUtxos.length === 0 && !hasLoadedOnceRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      // 1. Fetch transactions from ALL addresses in parallel
      const txResults = await Promise.all(
        addresses.map(addr =>
          walletProxyService.getTransactions(addr).then(r => r.data || []).catch(() => [])
        ),
      );

      // 2. Deduplicate by txid
      const txMap = new Map<string, any>();
      for (const txList of txResults) {
        for (const tx of txList) {
          if (!txMap.has(tx.txid)) {
            txMap.set(tx.txid, tx);
          }
        }
      }

      const allTxs = Array.from(txMap.values()).slice(0, 50);
      if (allTxs.length === 0) {
        setTransactions([...pendingTxRef.current.values()]);
        hasLoadedOnceRef.current = true;
        return;
      }

      // 3. Collect ALL txids we need to unblind:
      //    - The transaction itself (to identify our outputs)
      //    - Input txids (vin[].txid) to find the value of spent inputs
      const neededTxids = new Set<string>();
      for (const tx of allTxs) {
        neededTxids.add(tx.txid);
        if (tx.vin) {
          for (const vin of tx.vin) {
            if (vin.txid) neededTxids.add(vin.txid);
          }
        }
      }

      // 4. Fetch tx hex for all needed txids (using cache)
      const hexCache = txHexCacheRef.current;
      const missingTxids = Array.from(neededTxids).filter(id => !hexCache[id]);

      if (missingTxids.length > 0) {
        const hexResults = await Promise.all(
          missingTxids.map(async (txid) => {
            try {
              const resp = await walletProxyService.getTxHex(txid);
              return { txid, hex: resp.data.hex };
            } catch {
              return null;
            }
          })
        );
        for (const r of hexResults) {
          if (r) hexCache[r.txid] = r.hex;
        }
      }

      // 5. Build txHexMap for worker (only txids we have hex for)
      const txHexMap: Record<string, string> = {};
      for (const txid of neededTxids) {
        if (hexCache[txid]) txHexMap[txid] = hexCache[txid];
      }

      // 6. Send batch to worker for unblinding ALL outputs
      const manager = CryptoWorkerManager.getInstance();
      let outputsByTxid: Record<string, TxOutputInfo[]> = {};

      try {
        const response = await manager.send({
          type: 'unblindTxOutputs',
          txHexMap,
        } as any);
        if ((response as any).type === 'txOutputs') {
          outputsByTxid = (response as any).outputs;
        }
      } catch (err) {
        console.error('[WalletTx] Worker unblind error:', err);
      }

      // Also build a set of our addresses' UTXOs for input detection
      const ownedUtxoKeys = new Set<string>();
      for (const utxo of unblindedUtxos) {
        ownedUtxoKeys.add(`${utxo.txid}:${utxo.vout}`);
      }

      // 7. Classify each transaction
      const mapped: WalletTransaction[] = allTxs.map((tx: any) => {
        const txOutputs = outputsByTxid[tx.txid] || [];
        const ourReceiveOutputs = txOutputs.filter(o => o.isOurs && !o.isChange);
        const ourChangeOutputs = txOutputs.filter(o => o.isOurs && o.isChange);

        // Check if any inputs spend our UTXOs (= we're sending)
        let spendsOurInputs = false;
        const spentInputValues: TxOutputInfo[] = [];

        if (tx.vin) {
          for (const vin of tx.vin) {
            if (!vin.txid) continue;
            // Check if this input is ours via current UTXO set
            if (ownedUtxoKeys.has(`${vin.txid}:${vin.vout}`)) {
              spendsOurInputs = true;
            }
            // Also check via unblinded output data from the INPUT's tx
            const inputTxOutputs = outputsByTxid[vin.txid] || [];
            const matchedInput = inputTxOutputs.find(o => o.vout === vin.vout && o.isOurs);
            if (matchedInput) {
              spendsOurInputs = true;
              spentInputValues.push(matchedInput);
            }
          }
        }

        if (spendsOurInputs) {
          // OUTGOING TX: amount = sum(our spent inputs for primary asset) - sum(change outputs of same asset)
          // Determine the primary asset (non-LBTC if possible, since LBTC is usually just fees)
          const LBTC = LIQUID_ASSETS.LBTC.id;

          // Group spent inputs by asset
          const inputByAsset = new Map<string, bigint>();
          for (const inp of spentInputValues) {
            const cur = inputByAsset.get(inp.asset) || BigInt(0);
            inputByAsset.set(inp.asset, cur + BigInt(inp.value));
          }

          // Group change outputs by asset
          const changeByAsset = new Map<string, bigint>();
          for (const ch of ourChangeOutputs) {
            const cur = changeByAsset.get(ch.asset) || BigInt(0);
            changeByAsset.set(ch.asset, cur + BigInt(ch.value));
          }

          // Pick primary asset: prefer non-LBTC asset with inputs
          let primaryAsset = '';
          let sentAmount = BigInt(0);

          for (const [asset, inputTotal] of inputByAsset.entries()) {
            if (asset !== LBTC || inputByAsset.size === 1) {
              const changeTotal = changeByAsset.get(asset) || BigInt(0);
              const net = inputTotal - changeTotal;
              if (net > sentAmount || !primaryAsset) {
                primaryAsset = asset;
                sentAmount = net;
              }
            }
          }

          // If we only have LBTC inputs, the sent amount = inputs - change - fees
          // (fees are implicit, not in our outputs)
          if (!primaryAsset) {
            primaryAsset = LBTC;
            const totalLbtcInputs = inputByAsset.get(LBTC) || BigInt(0);
            const totalLbtcChange = changeByAsset.get(LBTC) || BigInt(0);
            sentAmount = totalLbtcInputs - totalLbtcChange;
          }

          // If we couldn't determine amounts (no spent input data), fall back
          if (sentAmount <= BigInt(0) && spentInputValues.length === 0) {
            // Check pending tx data
            const pending = pendingTxRef.current.get(tx.txid);
            if (pending) {
              return {
                ...pending,
                confirmed: tx.status?.confirmed || false,
                blockTime: tx.status?.block_time,
                blockHeight: tx.status?.block_height,
              };
            }
            sentAmount = BigInt(0);
            primaryAsset = primaryAsset || 'unknown';
          }

          return {
            txid: tx.txid,
            type: 'outgoing' as const,
            amount: sentAmount < BigInt(0) ? BigInt(0) : sentAmount,
            asset: primaryAsset,
            confirmed: tx.status?.confirmed || false,
            blockTime: tx.status?.block_time,
            blockHeight: tx.status?.block_height,
          };
        }

        // INCOMING TX: sum of our receive (non-change) outputs
        if (ourReceiveOutputs.length > 0) {
          const totalByAsset = new Map<string, bigint>();
          for (const o of ourReceiveOutputs) {
            const cur = totalByAsset.get(o.asset) || BigInt(0);
            totalByAsset.set(o.asset, cur + BigInt(o.value));
          }

          // Pick largest non-LBTC asset, or largest overall
          let primaryAsset = '';
          let primaryAmount = BigInt(0);
          for (const [asset, amount] of totalByAsset.entries()) {
            if (amount > primaryAmount || !primaryAsset) {
              primaryAsset = asset;
              primaryAmount = amount;
            }
          }

          return {
            txid: tx.txid,
            type: 'incoming' as const,
            amount: primaryAmount,
            asset: primaryAsset,
            confirmed: tx.status?.confirmed || false,
            blockTime: tx.status?.block_time,
            blockHeight: tx.status?.block_height,
          };
        }

        // Fallback: check pending data
        const pending = pendingTxRef.current.get(tx.txid);
        if (pending) {
          return {
            ...pending,
            confirmed: tx.status?.confirmed || false,
            blockTime: tx.status?.block_time,
            blockHeight: tx.status?.block_height,
          };
        }

        return {
          txid: tx.txid,
          type: 'outgoing' as const,
          amount: BigInt(0),
          asset: 'unknown',
          confirmed: tx.status?.confirmed || false,
          blockTime: tx.status?.block_time,
          blockHeight: tx.status?.block_height,
        };
      });

      // Sort: pending first, then by block_time desc
      mapped.sort((a, b) => {
        if (a.confirmed !== b.confirmed) return a.confirmed ? 1 : -1;
        return (b.blockTime || 0) - (a.blockTime || 0);
      });

      // Merge: keep pending tx data if on-chain version has amount=0 or unknown asset
      const final = mapped.map(tx => {
        if (tx.amount === BigInt(0) || tx.asset === 'unknown') {
          const pending = pendingTxRef.current.get(tx.txid);
          if (pending) {
            return { ...tx, amount: pending.amount, asset: pending.asset, type: pending.type };
          }
        }
        // Clean up confirmed pending txs that now have real data
        if (tx.confirmed && pendingTxRef.current.has(tx.txid) && tx.amount > BigInt(0)) {
          pendingTxRef.current.delete(tx.txid);
        }
        return tx;
      });

      setTransactions(final);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('[WalletTx] Error:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [addresses, isUnlocked, unblindedUtxos]);

  // Inject a pending outgoing tx immediately after broadcast (optimistic)
  const addPendingTx = useCallback((txid: string, assetId: string, amount: bigint) => {
    const pending: WalletTransaction = {
      txid,
      type: 'outgoing',
      amount,
      asset: assetId,
      confirmed: false,
    };
    pendingTxRef.current.set(txid, pending);
    setTransactions(prev => {
      if (prev.some(t => t.txid === txid)) return prev;
      return [pending, ...prev];
    });
  }, []);

  return { transactions, loading, fetchTransactions, addPendingTx };
}
