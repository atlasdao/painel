// Asset definitions
export const LIQUID_ASSETS = {
  LBTC: { id: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d', ticker: 'L-BTC', precision: 8 },
  DEPIX: { id: '02f22f8d9c76ab41661a2729e4752e2c5d1a263012141b86ea98af5472df5189', ticker: 'BRL', precision: 8, prefix: 'R$ ' },
  USDT: { id: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2', ticker: 'L-USDT', precision: 8, prefix: '$ ' },
} as const;

export type AssetId = typeof LIQUID_ASSETS[keyof typeof LIQUID_ASSETS]['id'];

export interface AssetMetadata {
  assetId: string;
  ticker: string;
  name: string;
  precision: number;
  prefix?: string;
  iconColor?: string;
  isKnown: boolean;
}

export function getKnownAssetMetadata(assetId: string): AssetMetadata | null {
  for (const [key, asset] of Object.entries(LIQUID_ASSETS)) {
    if (asset.id === assetId) {
      return {
        assetId: asset.id,
        ticker: asset.ticker,
        name: key === 'DEPIX' ? 'Depix' : key === 'USDT' ? 'Tether USD' : 'Liquid Bitcoin',
        precision: asset.precision,
        prefix: 'prefix' in asset ? (asset as any).prefix : undefined,
        iconColor: key === 'DEPIX' ? 'emerald' : key === 'USDT' ? 'green' : 'orange',
        isKnown: true,
      };
    }
  }
  return null;
}

export interface AssetBalance {
  assetId: string;
  ticker: string;
  amount: bigint; // in satoshis
  fiatValue: number; // in BRL
  metadata?: AssetMetadata;
}

export interface RawUtxo {
  txid: string;
  vout: number;
  value?: number;
  asset?: string;
  valuecommitment?: string;
  assetcommitment?: string;
  noncecommitment?: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export interface UnblindedUtxo {
  txid: string;
  vout: number;
  value: bigint;
  asset: string;
  assetBlinder: string;
  valueBlinder: string;
  isChange?: boolean;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export interface TxOutputInfo {
  vout: number;
  value: string; // bigint serialized as string
  asset: string;
  isChange: boolean;
  isOurs: boolean;
}

export interface BuildTxParams {
  recipients: Array<{
    address: string;
    amount: bigint;
    asset: string;
  }>;
  feeRate: number;
  utxos: UnblindedUtxo[];
}

export interface WalletTransaction {
  txid: string;
  type: 'incoming' | 'outgoing';
  amount: bigint;
  asset: string;
  confirmed: boolean;
  blockTime?: number;
  blockHeight?: number;
}

export interface PriceData {
  LBTC_BRL: number;
  USDT_BRL: number;
  DEPIX_BRL: number;
  LBTC_USD: number;
  USDT_USD: number;
  DEPIX_USD: number;
  updatedAt: string;
}

// Worker message types
export type WorkerRequest =
  | { id: string; type: 'init' }
  | { id: string; type: 'generateMnemonic'; password: string }
  | { id: string; type: 'importMnemonic'; words: string[]; password: string }
  | { id: string; type: 'unlock'; password: string }
  | { id: string; type: 'lock' }
  | { id: string; type: 'deriveAddress'; index: number; isChange: boolean }
  | { id: string; type: 'unblindUtxos'; rawUtxos: RawUtxo[]; txHexMap: Record<string, string> }
  | { id: string; type: 'buildAndSignTx'; params: BuildTxParams; password: string }
  | { id: string; type: 'getMnemonic'; password: string }
  | { id: string; type: 'hasWallet' }
  | { id: string; type: 'deleteWallet' }
  | { id: string; type: 'unblindTxOutputs'; txHexMap: Record<string, string> }

export type WorkerResponse =
  | { id: string; type: 'ready' }
  | { id: string; type: 'mnemonicWords'; words: string[] }
  | { id: string; type: 'unlocked' }
  | { id: string; type: 'locked' }
  | { id: string; type: 'address'; address: string }
  | { id: string; type: 'balances'; utxos: UnblindedUtxo[] }
  | { id: string; type: 'signedTx'; hex: string; txid: string }
  | { id: string; type: 'hasWalletResult'; exists: boolean }
  | { id: string; type: 'walletDeleted' }
  | { id: string; type: 'txOutputs'; outputs: Record<string, TxOutputInfo[]> }
  | { id: string; type: 'error'; message: string }

// Wallet state
export type WalletState = 'loading' | 'no-wallet' | 'locked' | 'unlocking' | 'unlocked' | 'setup';

// User-configurable wallet settings
export interface WalletSettings {
  autoLockMinutes: number; // 0 = never, 1-60
  tabHiddenLockSeconds: number; // 0 = never, 10-300
  requirePasswordPerTx: boolean;
  defaultReceiveAsset: 'DEPIX' | 'USDT' | 'LBTC';
  displayCurrency: 'BRL' | 'USD';
  showBackupReminder: boolean;
  biometricEnabled: boolean;
}

// Encrypted wallet blob stored in localStorage
export interface EncryptedWalletBlob {
  version: 1;
  kdf: 'pbkdf2';
  kdfParams: { iterations: number; hash: string };
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  authTag: string; // base64
  createdAt: string;
}
