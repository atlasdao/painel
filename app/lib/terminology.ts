// Terminologia amigável — crypto termos nunca aparecem para o usuário

const ASSET_LABELS: Record<string, string> = {
  'DEPIX': 'Reais',
  'L-BTC': 'Bitcoin',
  'L-USDT': 'Dólares',
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'USDT': 'Dólares',
  'USDC': 'Dólares',
};

const ASSET_SYMBOLS: Record<string, string> = {
  'DEPIX': 'R$',
  'L-BTC': 'BTC',
  'L-USDT': 'US$',
  'BTC': 'BTC',
  'ETH': 'ETH',
  'USDT': 'US$',
  'USDC': 'US$',
};

const CHAIN_LABELS: Record<string, string> = {
  'LIQUID': 'Liquid',
  'BITCOIN': 'Bitcoin',
  'ETHEREUM': 'Ethereum',
  'SOLANA': 'Solana',
  'TRON': 'Tron',
};

export function getAssetLabel(assetId: string): string {
  return ASSET_LABELS[assetId] || assetId;
}

export function getAssetSymbol(assetId: string): string {
  return ASSET_SYMBOLS[assetId] || '';
}

export function getChainLabel(chainId: string): string {
  return CHAIN_LABELS[chainId] || chainId;
}

export function formatCurrency(amount: number, asset: string = 'DEPIX'): string {
  const symbol = getAssetSymbol(asset);
  if (asset === 'DEPIX' || asset === 'L-USDT' || asset === 'USDT' || asset === 'USDC') {
    return `${symbol} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (asset === 'L-BTC' || asset === 'BTC') {
    return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC`;
  }
  if (asset === 'ETH') {
    return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} ETH`;
  }
  return `${amount}`;
}

// Crypto terms → user-friendly
export const TERMINOLOGY = {
  wallet: 'Conta Atlas',
  seedPhrase: 'Palavras de recuperação',
  mnemonic: 'Palavras de recuperação',
  networkFee: 'Taxa',
  gasFee: 'Taxa',
  liquidNetwork: '', // invisible
  broadcast: 'Enviar',
  utxo: 'Saldo',
} as const;
