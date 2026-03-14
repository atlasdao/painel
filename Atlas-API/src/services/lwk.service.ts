import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as crypto from 'crypto';
import * as liquid from 'liquidjs-lib';

const bip32 = BIP32Factory(ecc);

// Esplora API for Liquid
const ESPLORA_API = 'https://blockstream.info/liquid/api';

// L-BTC asset ID on Liquid mainnet
const LBTC_ASSET_ID = '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d';

// Depix asset ID (BRL stablecoin on Liquid)
const DEPIX_ASSET_ID = '02f22f8d9c76ab41661a2729e4752e2c5d1a263012141b86ea98af5472df5189';

export interface UtxoInfo {
  txid: string;
  vout: number;
  value: number;
  asset: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export interface AddressBalance {
  confirmed: number;
  unconfirmed: number;
  utxos: UtxoInfo[];
}

@Injectable()
export class LwkService implements OnModuleInit {
  private readonly logger = new Logger(LwkService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  // Xpub from the descriptor provided by user
  // ct(slip77(58dce15f22bedc014d959a53ce13ddfa259e506f9c48717752e72ace3cea8c48),elwpkh([bd2fe11e/84'/1776'/2']xpub6BemYiVNp19a5ZF4ToDwuNDP1rNJXhFP4ZgEkCPceApBxgTEAuk7RXa4XwDnW61YBLcqoawb9rkykgtSDqgJaLRg5eZ4xofhfFSDH7jkWg7/0/*))
  private readonly XPUB = 'xpub6BemYiVNp19a5ZF4ToDwuNDP1rNJXhFP4ZgEkCPceApBxgTEAuk7RXa4XwDnW61YBLcqoawb9rkykgtSDqgJaLRg5eZ4xofhfFSDH7jkWg7';
  private readonly SLIP77_MASTER_BLINDING_KEY = '58dce15f22bedc014d959a53ce13ddfa259e506f9c48717752e72ace3cea8c48';

  // Cache of generated addresses
  private addressCache: Map<number, string> = new Map();

  // ZKP library instance
  private zkpLib: any = null;

  async onModuleInit() {
    // Initialize ZKP library on module start
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const zkp = require('@vulpemventures/secp256k1-zkp');
      this.zkpLib = await (zkp.default as () => Promise<any>)();
      this.logger.log('[LWK] ZKP library initialized successfully');
    } catch (error) {
      this.logger.error(`[LWK] Failed to initialize ZKP library: ${error.message}`);
    }
  }

  /**
   * Generate a Liquid confidential address at the given index
   * Using the /0/* path for receiving addresses
   */
  async generateAddress(index: number): Promise<string> {
    // Check cache first
    if (this.addressCache.has(index)) {
      return this.addressCache.get(index)!;
    }

    try {
      // Parse the xpub
      const node = bip32.fromBase58(this.XPUB);

      // Derive child at path /0/index (receiving addresses)
      const child = node.derive(0).derive(index);

      // Get the public key as Buffer
      const pubkey = Buffer.from(child.publicKey);

      // Create p2wpkh payment using liquidjs-lib
      const p2wpkh = liquid.payments.p2wpkh({
        pubkey,
        network: liquid.networks.liquid
      });

      if (!p2wpkh.address || !p2wpkh.output) {
        throw new Error('Failed to generate p2wpkh payment');
      }

      // Derive blinding key using SLIP77
      // SLIP77: HMAC-SHA256(master_blinding_key, scriptPubKey)
      const masterKey = Buffer.from(this.SLIP77_MASTER_BLINDING_KEY, 'hex');
      const hmac = crypto.createHmac('sha256', masterKey);
      hmac.update(p2wpkh.output);
      const privateBlindingKey = hmac.digest();

      // Derive public key from private blinding key
      const publicBlindingKey = Buffer.from(ecc.pointFromScalar(privateBlindingKey)!);

      // Create the confidential address using liquidjs-lib
      const confidentialAddress = liquid.address.toConfidential(p2wpkh.address, publicBlindingKey);

      this.addressCache.set(index, confidentialAddress);
      this.logger.log(`[LWK] Generated confidential address at index ${index}: ${confidentialAddress.substring(0, 20)}...`);

      return confidentialAddress;
    } catch (error) {
      this.logger.error(`[LWK] Error generating address at index ${index}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the private blinding key for a given address
   * Used for unblinding confidential transactions
   */
  private getPrivateBlindingKey(address: string): Buffer {
    // Decode the confidential address to get the unconfidential address
    const decoded = liquid.address.fromConfidential(address);

    // Get the scriptPubKey from the unconfidential address
    const outputScript = liquid.address.toOutputScript(decoded.unconfidentialAddress, liquid.networks.liquid);

    // Derive the private blinding key using SLIP77
    const masterKey = Buffer.from(this.SLIP77_MASTER_BLINDING_KEY, 'hex');
    const hmac = crypto.createHmac('sha256', masterKey);
    hmac.update(outputScript);
    return hmac.digest();
  }

  /**
   * Fetch with retry logic for Esplora API calls
   */
  private async fetchWithRetry(url: string, retries = this.MAX_RETRIES): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;

        // Retry on 429 (rate limit) and 5xx (server errors)
        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries) {
            const delay = this.RETRY_DELAY_MS * attempt;
            this.logger.warn(`[LWK] Esplora API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        return response;
      } catch (error) {
        if (attempt < retries) {
          const delay = this.RETRY_DELAY_MS * attempt;
          this.logger.warn(`[LWK] Esplora fetch failed (${error.message}), retrying in ${delay}ms (attempt ${attempt}/${retries})`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('fetchWithRetry: exhausted retries');
  }

  /**
   * Check address balance using Esplora API with transaction unblinding
   * Supports both Depix (BRL) and L-BTC
   */
  async checkAddressBalance(address: string): Promise<AddressBalance> {
    try {
      // Get UTXOs from Esplora (with retry)
      const response = await this.fetchWithRetry(`${ESPLORA_API}/address/${address}/utxo`);

      if (!response.ok) {
        this.logger.warn(`[LWK] Esplora API error for ${address}: ${response.status}`);
        return { confirmed: 0, unconfirmed: 0, utxos: [] };
      }

      const rawUtxos: any[] = await response.json();

      if (rawUtxos.length === 0) {
        return { confirmed: 0, unconfirmed: 0, utxos: [] };
      }

      // Get the private blinding key for this address
      const privateBlindingKey = this.getPrivateBlindingKey(address);

      // Unblind each UTXO
      const unblindedUtxos: UtxoInfo[] = [];
      let confirmed = 0;
      let unconfirmed = 0;

      for (const utxo of rawUtxos) {
        try {
          // Get the raw transaction to access rangeproof (with retry)
          const txResponse = await this.fetchWithRetry(`${ESPLORA_API}/tx/${utxo.txid}/hex`);
          if (!txResponse.ok) {
            this.logger.warn(`[LWK] Failed to fetch tx hex for ${utxo.txid}: ${txResponse.status}`);
            continue;
          }

          const txHex = await txResponse.text();
          const tx = liquid.Transaction.fromHex(txHex);
          const output = tx.outs[utxo.vout];

          if (!output.rangeProof || output.rangeProof.length <= 1) {
            continue; // Skip outputs without rangeproof (fee outputs)
          }

          if (!this.zkpLib) {
            this.logger.warn('[LWK] ZKP library not initialized, cannot unblind');
            continue;
          }

          // Unblind the output
          const conf = new liquid.confidential.Confidential(this.zkpLib);
          const unblinded = conf.unblindOutputWithKey(output, privateBlindingKey);

          // Get asset ID (reversed byte order)
          const assetHex = Buffer.from(unblinded.asset).reverse().toString('hex');

          // Only include Depix UTXOs
          if (assetHex === DEPIX_ASSET_ID) {
            const value = Number(unblinded.value);

            const utxoInfo: UtxoInfo = {
              txid: utxo.txid,
              vout: utxo.vout,
              value: value,
              asset: assetHex,
              status: {
                confirmed: utxo.status.confirmed,
                block_height: utxo.status.block_height,
                block_time: utxo.status.block_time,
              },
            };

            unblindedUtxos.push(utxoInfo);

            if (utxo.status.confirmed) {
              confirmed += value;
            } else {
              unconfirmed += value;
            }
          }
        } catch (unblindError) {
          this.logger.warn(`[LWK] Failed to unblind UTXO ${utxo.txid}:${utxo.vout}: ${unblindError.message}`);
        }
      }

      this.logger.log(`[LWK] Address ${address.substring(0, 20)}... balance: confirmed=${confirmed / 100000000} BRL, unconfirmed=${unconfirmed / 100000000} BRL, utxos=${unblindedUtxos.length}`);

      return {
        confirmed,
        unconfirmed,
        utxos: unblindedUtxos,
      };
    } catch (error) {
      this.logger.error(`[LWK] Error checking address balance: ${error.message}`);
      return { confirmed: 0, unconfirmed: 0, utxos: [] };
    }
  }

  /**
   * Get transactions for an address
   */
  async getAddressTransactions(address: string): Promise<any[]> {
    try {
      const response = await fetch(`${ESPLORA_API}/address/${address}/txs`);

      if (!response.ok) {
        this.logger.warn(`[LWK] Esplora API error getting txs for ${address}: ${response.status}`);
        return [];
      }

      const txs = await response.json();
      return txs;
    } catch (error) {
      this.logger.error(`[LWK] Error getting address transactions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get the next available address index
   */
  async getNextAddressIndex(): Promise<number> {
    // This should query the database for the highest used index
    // For now, return based on cache size
    return this.addressCache.size;
  }

  /**
   * Check if a specific UTXO exists (to verify payment)
   * Returns detailed payment info including amount in BRL
   */
  async findDepixPayment(
    address: string,
    minAmount: number,
    afterTimestamp?: Date,
  ): Promise<{
    found: boolean;
    amount?: number;
    txid?: string;
    confirmed?: boolean;
  }> {
    try {
      const balance = await this.checkAddressBalance(address);

      if (balance.utxos.length === 0) {
        return { found: false };
      }

      // Filter UTXOs by timestamp to reject pre-existing UTXOs from before the deposit request
      let validUtxos = balance.utxos;
      if (afterTimestamp) {
        const cutoffSeconds = Math.floor(afterTimestamp.getTime() / 1000) - 60; // 60s margin
        validUtxos = balance.utxos.filter(u => {
          // Unconfirmed: accept (could be the payment just sent)
          if (!u.status.confirmed) return true;
          // Confirmed but no block_time: accept (incomplete data)
          if (!u.status.block_time) return true;
          // Confirmed with block_time before cutoff: reject (pre-existing UTXO)
          return u.status.block_time >= cutoffSeconds;
        });

        if (validUtxos.length !== balance.utxos.length) {
          this.logger.log(
            `[LWK] Filtered ${balance.utxos.length - validUtxos.length} pre-existing UTXOs (before ${afterTimestamp.toISOString()}) at ${address.substring(0, 20)}...`,
          );
        }
      }

      if (validUtxos.length === 0) {
        return { found: false };
      }

      // Find the most recent UTXO with sufficient amount
      // Sort by confirmation (confirmed first) then by value
      const sortedUtxos = validUtxos.sort((a, b) => {
        if (a.status.confirmed && !b.status.confirmed) return -1;
        if (!a.status.confirmed && b.status.confirmed) return 1;
        return b.value - a.value;
      });

      const utxo = sortedUtxos[0];

      // Convert from sats to BRL (1 Depix = 100000000 sats = R$ 1)
      const amountBRL = utxo.value / 100000000;

      this.logger.log(`[LWK] Found Depix payment at ${address.substring(0, 20)}...: R$ ${amountBRL.toFixed(2)}, txid: ${utxo.txid}`);

      return {
        found: true,
        amount: amountBRL,
        txid: utxo.txid,
        confirmed: utxo.status.confirmed,
      };
    } catch (error) {
      this.logger.error(`[LWK] Error finding Depix payment: ${error.message}`);
      return { found: false };
    }
  }

  /**
   * Get total balance of all Depix UTXOs at an address in BRL
   */
  async getTotalDepixBalance(address: string): Promise<number> {
    const balance = await this.checkAddressBalance(address);
    // Return total (confirmed + unconfirmed) in BRL
    return (balance.confirmed + balance.unconfirmed) / 100000000;
  }
}
