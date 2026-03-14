import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CacheService } from '../common/services/cache.service';

const ESPLORA_API = 'https://liquid.network/api';
const ESPLORA_FALLBACK = 'https://blockstream.info/liquid/api';

// Liquid address regex: blech32 (confidential) or bech32
const LIQUID_ADDRESS_REGEX = /^(lq1|ex1|VJL|VTp|CTEx|CTEw)[a-zA-HJ-NP-Z0-9]{20,200}$/;
const TXID_REGEX = /^[0-9a-fA-F]{64}$/;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Validate a Liquid address format (SSRF prevention)
   */
  private validateAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Invalid address');
    }
    if (address.length < 20 || address.length > 200) {
      throw new BadRequestException('Invalid address length');
    }
    if (!LIQUID_ADDRESS_REGEX.test(address)) {
      throw new BadRequestException('Invalid Liquid address format');
    }
  }

  /**
   * Validate a transaction ID format
   */
  private validateTxid(txid: string): void {
    if (!txid || !TXID_REGEX.test(txid)) {
      throw new BadRequestException('Invalid transaction ID');
    }
  }

  /**
   * Fetch with retry logic for Esplora API calls
   */
  private async fetchWithRetry(url: string, options?: RequestInit, retries = this.MAX_RETRIES): Promise<Response> {
    // Try primary Esplora first
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) return response;

        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries) {
            const delay = this.RETRY_DELAY_MS * attempt;
            this.logger.warn(`[Wallet] Esplora ${response.status}, retry ${attempt}/${retries} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          // Last attempt failed with rate-limit/server error - try fallback
          const fallbackUrl = url.replace(ESPLORA_API, ESPLORA_FALLBACK);
          if (fallbackUrl !== url) {
            this.logger.warn(`[Wallet] Primary Esplora exhausted, trying fallback`);
            try {
              const fallbackRes = await fetch(fallbackUrl, { ...options, signal: AbortSignal.timeout(15000) });
              if (fallbackRes.ok) return fallbackRes;
            } catch { /* fallback also failed */ }
          }
        }
        return response;
      } catch (error) {
        if (attempt < retries) {
          const delay = this.RETRY_DELAY_MS * attempt;
          this.logger.warn(`[Wallet] Esplora fetch failed, retry ${attempt}/${retries} in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          // Try fallback on final failure
          const fallbackUrl = url.replace(ESPLORA_API, ESPLORA_FALLBACK);
          if (fallbackUrl !== url) {
            this.logger.warn(`[Wallet] Primary Esplora failed, trying fallback`);
            return fetch(fallbackUrl, { ...options, signal: AbortSignal.timeout(15000) });
          }
          throw error;
        }
      }
    }
    throw new Error('fetchWithRetry: exhausted retries');
  }

  /**
   * Get UTXOs for a Liquid address (raw, not unblinded)
   */
  async getUtxos(address: string, userId: string): Promise<any[]> {
    this.validateAddress(address);
    this.logger.log(`[Wallet] UTXO request userId=${userId}`);

    const cacheKey = `wallet:utxos:${address}`;
    return this.cacheService.getOrSet(cacheKey, async () => {
      const response = await this.fetchWithRetry(`${ESPLORA_API}/address/${address}/utxo`);
      if (!response.ok) {
        this.logger.warn(`[Wallet] Esplora UTXO error: ${response.status}`);
        return [];
      }
      return response.json();
    }, { ttl: 15 });
  }

  /**
   * Get transaction history for a Liquid address
   */
  async getTransactions(address: string, userId: string): Promise<any[]> {
    this.validateAddress(address);
    this.logger.log(`[Wallet] TX history request userId=${userId}`);

    const response = await this.fetchWithRetry(`${ESPLORA_API}/address/${address}/txs`);
    if (!response.ok) {
      this.logger.warn(`[Wallet] Esplora TX history error: ${response.status}`);
      return [];
    }
    return response.json();
  }

  /**
   * Get transaction detail/hex by txid
   */
  async getTransaction(txid: string, userId: string): Promise<string> {
    this.validateTxid(txid);
    this.logger.log(`[Wallet] TX detail request userId=${userId}`);

    // Cache confirmed TXs for 24h, unconfirmed for 10s
    const confirmedKey = `wallet:tx:confirmed:${txid}`;
    const cached = await this.cacheService.get<string>(confirmedKey);
    if (cached) return cached;

    const response = await this.fetchWithRetry(`${ESPLORA_API}/tx/${txid}/hex`);
    if (!response.ok) {
      this.logger.warn(`[Wallet] Esplora TX detail error: ${response.status}`);
      throw new BadRequestException('Transaction not found');
    }

    const hex = await response.text();

    // Check if confirmed to decide cache TTL
    try {
      const statusResp = await this.fetchWithRetry(`${ESPLORA_API}/tx/${txid}/status`);
      if (statusResp.ok) {
        const status = await statusResp.json();
        if (status.confirmed) {
          this.cacheService.set(confirmedKey, hex, { ttl: 86400 }); // 24h
        } else {
          this.cacheService.set(`wallet:tx:pending:${txid}`, hex, { ttl: 10 }); // 10s
        }
      }
    } catch {
      // Cache briefly anyway
      this.cacheService.set(`wallet:tx:pending:${txid}`, hex, { ttl: 10 });
    }

    return hex;
  }

  /**
   * Broadcast a signed transaction hex
   */
  async broadcast(txHex: string, userId: string): Promise<string> {
    this.logger.log(`[Wallet] Broadcast request userId=${userId} txSize=${txHex.length}`);

    if (txHex.length > 1_048_576) {
      throw new BadRequestException('Transaction too large');
    }

    const response = await this.fetchWithRetry(`${ESPLORA_API}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`[Wallet] Broadcast error userId=${userId}: ${errorText}`);
      throw new BadRequestException(`Broadcast failed: ${errorText}`);
    }

    const txid = await response.text();
    this.logger.log(`[Wallet] Broadcast success userId=${userId} txid=${txid}`);
    return txid;
  }

  /**
   * Get asset metadata from Esplora (cached 24h — asset metadata is immutable)
   */
  async getAssetInfo(assetId: string): Promise<{ assetId: string; name: string; ticker: string; precision: number }> {
    if (!assetId || !/^[0-9a-fA-F]{64}$/.test(assetId)) {
      throw new BadRequestException('Invalid asset ID format');
    }

    const cacheKey = `wallet:asset:${assetId}`;
    return this.cacheService.getOrSet(cacheKey, async () => {
      const response = await this.fetchWithRetry(`${ESPLORA_API}/asset/${assetId}`);
      if (!response.ok) {
        this.logger.warn(`[Wallet] Esplora asset info error: ${response.status} for ${assetId}`);
        // Return fallback with truncated ID as ticker
        return { assetId, name: 'Unknown Asset', ticker: assetId.slice(0, 8), precision: 8 };
      }
      const data = await response.json();
      return {
        assetId,
        name: data.name || 'Unknown Asset',
        ticker: data.ticker || assetId.slice(0, 8),
        precision: data.precision ?? 8,
      };
    }, { ttl: 86400 }); // 24h
  }

  /**
   * Get fee rate estimates
   */
  async getFeeEstimate(): Promise<Record<string, number>> {
    const cacheKey = 'wallet:fee-estimate';
    return this.cacheService.getOrSet(cacheKey, async () => {
      const response = await this.fetchWithRetry(`${ESPLORA_API}/fee-estimates`);
      if (!response.ok) {
        return { '1': 0.1, '3': 0.1, '6': 0.1 };
      }
      return response.json();
    }, { ttl: 60 });
  }
}
