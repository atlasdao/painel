import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CacheService } from '../common/services/cache.service';

export interface PriceData {
  LBTC_BRL: number;
  USDT_BRL: number;
  DEPIX_BRL: number;
  LBTC_USD: number;
  USDT_USD: number;
  DEPIX_USD: number;
  updatedAt: string;
}

@Injectable()
export class WalletPriceService {
  private readonly logger = new Logger(WalletPriceService.name);
  private readonly CACHE_KEY = 'wallet:prices';
  private readonly CACHE_TTL = 30; // 30 seconds

  constructor(private readonly cacheService: CacheService) {}

  async getPrices(): Promise<PriceData> {
    const cached = await this.cacheService.get<PriceData>(this.CACHE_KEY);
    if (cached) return cached;
    return this.fetchPrices();
  }

  @Cron('*/60 * * * * *')
  async warmPriceCache(): Promise<void> {
    try {
      await this.fetchPrices();
    } catch (error) {
      this.logger.warn(`[WalletPrice] Cache warm failed: ${error.message}`);
    }
  }

  private async fetchPrices(): Promise<PriceData> {
    try {
      // Fetch BTC/BRL, BTC/USDT, and USDT/BRL from Binance Vision API
      const BINANCE = 'https://data-api.binance.vision/api/v3/ticker/price';
      const [btcBrlRes, btcUsdtRes, usdBrlRes] = await Promise.all([
        fetch(`${BINANCE}?symbol=BTCBRL`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${BINANCE}?symbol=BTCUSDT`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${BINANCE}?symbol=USDTBRL`, { signal: AbortSignal.timeout(8000) }),
      ]);

      if (!btcBrlRes.ok || !btcUsdtRes.ok || !usdBrlRes.ok) {
        this.logger.warn(`[WalletPrice] Binance error: BTC/BRL=${btcBrlRes.status} BTC/USDT=${btcUsdtRes.status} USDT/BRL=${usdBrlRes.status}`);
        return this.fetchFromCoinGecko();
      }

      const [btcBrl, btcUsdt, usdtBrl] = await Promise.all([
        btcBrlRes.json(),
        btcUsdtRes.json(),
        usdBrlRes.json(),
      ]);

      const btcPriceBrl = parseFloat(btcBrl.price) || 0;
      const btcPriceUsd = parseFloat(btcUsdt.price) || 0;
      const usdtPriceBrl = parseFloat(usdtBrl.price) || 0;

      const prices: PriceData = {
        LBTC_BRL: btcPriceBrl,
        USDT_BRL: usdtPriceBrl,
        DEPIX_BRL: 1.0,
        LBTC_USD: btcPriceUsd,
        USDT_USD: 1.0,
        DEPIX_USD: usdtPriceBrl > 0 ? 1.0 / usdtPriceBrl : 0,
        updatedAt: new Date().toISOString(),
      };

      this.logger.log(`[WalletPrice] Binance prices: BTC/BRL=${btcPriceBrl} BTC/USD=${btcPriceUsd} USDT/BRL=${usdtPriceBrl}`);
      await this.cacheService.set(this.CACHE_KEY, prices, { ttl: this.CACHE_TTL });
      return prices;
    } catch (error) {
      this.logger.warn(`[WalletPrice] Binance fetch failed: ${error.message}, trying CoinGecko...`);
      return this.fetchFromCoinGecko();
    }
  }

  private async fetchFromCoinGecko(): Promise<PriceData> {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=brl,usd',
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) {
        this.logger.warn(`[WalletPrice] CoinGecko error: ${res.status}`);
        return this.getCachedOrEmpty();
      }
      const data = await res.json();
      const prices: PriceData = {
        LBTC_BRL: data.bitcoin?.brl || 0,
        USDT_BRL: data.tether?.brl || 0,
        DEPIX_BRL: 1.0,
        LBTC_USD: data.bitcoin?.usd || 0,
        USDT_USD: data.tether?.usd || 1.0,
        DEPIX_USD: data.tether?.brl > 0 ? 1.0 / data.tether.brl : 0,
        updatedAt: new Date().toISOString(),
      };
      this.logger.log(`[WalletPrice] CoinGecko fallback: BTC/BRL=${prices.LBTC_BRL} BTC/USD=${prices.LBTC_USD}`);
      await this.cacheService.set(this.CACHE_KEY, prices, { ttl: this.CACHE_TTL });
      return prices;
    } catch (error) {
      this.logger.warn(`[WalletPrice] CoinGecko also failed: ${error.message}`);
      return this.getCachedOrEmpty();
    }
  }

  private async getCachedOrEmpty(): Promise<PriceData> {
    const cached = await this.cacheService.get<PriceData>(this.CACHE_KEY);
    if (cached) return cached;

    return {
      LBTC_BRL: 0,
      USDT_BRL: 0,
      DEPIX_BRL: 1.0,
      LBTC_USD: 0,
      USDT_USD: 1.0,
      DEPIX_USD: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}
