'use client';

import { useQuery } from '@tanstack/react-query';

interface UnifiedBalance {
  brl: number;
  usd: number;
  btc: number;
  eth: number;
  totalBrl: number;
  loading: boolean;
}

async function fetchPrices(): Promise<{ btcBrl: number; ethBrl: number; usdBrl: number }> {
  // Placeholder — will be replaced with real price feed
  return { btcBrl: 0, ethBrl: 0, usdBrl: 5.2 };
}

export function useUnifiedBalance(): UnifiedBalance {
  const { data: prices, isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Zero balances until wallet integration
  const brl = 0;
  const usd = 0;
  const btc = 0;
  const eth = 0;

  const p = prices ?? { btcBrl: 0, ethBrl: 0, usdBrl: 5.2 };
  const totalBrl = brl + usd * p.usdBrl + btc * p.btcBrl + eth * p.ethBrl;

  return { brl, usd, btc, eth, totalBrl, loading: isLoading };
}
