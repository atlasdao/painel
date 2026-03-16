'use client';

import { useQuery } from '@tanstack/react-query';
import { UnifiedActivityItem } from '@/app/types';

interface UseActivityFeedReturn {
  items: UnifiedActivityItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function fetchActivity(): Promise<UnifiedActivityItem[]> {
  // Will merge PIX + Liquid + transfer sources once integrated
  return [];
}

export function useActivityFeed(): UseActivityFeedReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: fetchActivity,
    staleTime: 10_000,
  });

  return {
    items: data ?? [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
