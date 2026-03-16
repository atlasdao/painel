import { ChainInfo } from '@/app/types';

export const CHAINS: ChainInfo[] = [
  { id: 'LIQUID', name: 'Liquid', enabled: true, comingSoon: false },
  { id: 'BITCOIN', name: 'Bitcoin', enabled: true, comingSoon: false },
  { id: 'ETHEREUM', name: 'Ethereum', enabled: true, comingSoon: false },
];

export const COMING_SOON_CHAINS: ChainInfo[] = [
  { id: 'SOLANA' as any, name: 'Solana', enabled: false, comingSoon: true },
  { id: 'TRON' as any, name: 'Tron', enabled: false, comingSoon: true },
];

export function getChain(id: string): ChainInfo | undefined {
  return CHAINS.find(c => c.id === id);
}

export function getEnabledChains(): ChainInfo[] {
  return CHAINS.filter(c => c.enabled);
}
