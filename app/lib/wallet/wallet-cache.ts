import { AssetBalance, PriceData, EncryptedWalletBlob, WalletSettings, PinEncryptedBlob, PinSettings } from './wallet-types';
import type { BiometricCredentialData } from './webauthn';

const DEFAULT_PIN_SETTINGS: PinSettings = {
  enabled: false,
  failedAttempts: 0,
  lastFailedAt: null,
  cooldownUntil: null,
};

/**
 * Get the obfuscated storage key for a user's wallet
 */
async function getStorageKey(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + ':atlas_wallet_v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `w_${hex.slice(0, 16)}`;
}

async function getPinBlobKey(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + ':atlas_pin_blob');
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `wp_${hex.substring(0, 8)}`;
}

async function getPinSettingsKey(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + ':atlas_pin_settings');
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `wps_${hex.substring(0, 8)}`;
}

export const walletCache = {
  // Encrypted wallet blob
  async getWalletBlob(userId: string): Promise<EncryptedWalletBlob | null> {
    const key = await getStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async setWalletBlob(userId: string, blob: EncryptedWalletBlob): Promise<void> {
    const key = await getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(blob));
  },

  async removeWalletBlob(userId: string): Promise<void> {
    const key = await getStorageKey(userId);
    localStorage.removeItem(key);
    // Also remove biometric credential when wallet is deleted
    this.removeBiometricCredential(userId);
  },

  async hasWallet(userId: string): Promise<boolean> {
    const key = await getStorageKey(userId);
    return localStorage.getItem(key) !== null;
  },

  // Cached balances (for instant paint)
  getBalancesCache(userId: string): AssetBalance[] | null {
    const data = localStorage.getItem(`wb_${userId.slice(0, 8)}`);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      // Convert amount strings back to bigint
      return parsed.map((b: any) => ({ ...b, amount: BigInt(b.amount) }));
    } catch {
      return null;
    }
  },

  setBalancesCache(userId: string, balances: AssetBalance[]): void {
    const serializable = balances.map(b => ({ ...b, amount: b.amount.toString() }));
    localStorage.setItem(`wb_${userId.slice(0, 8)}`, JSON.stringify(serializable));
  },

  // Cached prices
  getPricesCache(): PriceData | null {
    const data = localStorage.getItem('wp_cache');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setPricesCache(prices: PriceData): void {
    localStorage.setItem('wp_cache', JSON.stringify(prices));
  },

  // Last used address index
  getAddressIndex(userId: string): number {
    return parseInt(localStorage.getItem(`wi_${userId.slice(0, 8)}`) || '0', 10);
  },

  setAddressIndex(userId: string, index: number): void {
    localStorage.setItem(`wi_${userId.slice(0, 8)}`, index.toString());
  },

  // Wallet settings
  getSettings(userId: string): WalletSettings {
    const data = localStorage.getItem(`ws_${userId.slice(0, 8)}`);
    if (!data) return DEFAULT_WALLET_SETTINGS;
    try {
      return { ...DEFAULT_WALLET_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_WALLET_SETTINGS;
    }
  },

  setSettings(userId: string, settings: WalletSettings): void {
    localStorage.setItem(`ws_${userId.slice(0, 8)}`, JSON.stringify(settings));
  },

  // Biometric credential
  getBiometricCredential(userId: string): BiometricCredentialData | null {
    const data = localStorage.getItem(`wba_${userId.slice(0, 8)}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setBiometricCredential(userId: string, data: BiometricCredentialData): void {
    localStorage.setItem(`wba_${userId.slice(0, 8)}`, JSON.stringify(data));
  },

  removeBiometricCredential(userId: string): void {
    localStorage.removeItem(`wba_${userId.slice(0, 8)}`);
  },

  // PIN encrypted blob
  async getPinBlob(userId: string): Promise<PinEncryptedBlob | null> {
    const key = await getPinBlobKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async setPinBlob(userId: string, blob: PinEncryptedBlob): Promise<void> {
    const key = await getPinBlobKey(userId);
    localStorage.setItem(key, JSON.stringify(blob));
  },

  async removePinBlob(userId: string): Promise<void> {
    const key = await getPinBlobKey(userId);
    localStorage.removeItem(key);
  },

  // PIN settings
  async getPinSettings(userId: string): Promise<PinSettings> {
    const key = await getPinSettingsKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return { ...DEFAULT_PIN_SETTINGS };
    try {
      return { ...DEFAULT_PIN_SETTINGS, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_PIN_SETTINGS };
    }
  },

  async savePinSettings(userId: string, settings: PinSettings): Promise<void> {
    const key = await getPinSettingsKey(userId);
    localStorage.setItem(key, JSON.stringify(settings));
  },

  async clearPinSettings(userId: string): Promise<void> {
    const key = await getPinSettingsKey(userId);
    localStorage.removeItem(key);
  },
};

export const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  autoLockMinutes: 5,
  tabHiddenLockSeconds: 30,
  requirePasswordPerTx: true,
  defaultReceiveAsset: 'DEPIX',
  displayCurrency: 'BRL',
  showBackupReminder: true,
  biometricEnabled: false,
};
