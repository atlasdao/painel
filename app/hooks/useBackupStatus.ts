'use client';

import { useQuery } from '@tanstack/react-query';
import { userService } from '@/app/lib/services';

interface UseBackupStatusReturn {
  seedBackedUp: boolean;
  loading: boolean;
}

export function useBackupStatus(): UseBackupStatusReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['backup-status'],
    queryFn: async () => {
      try {
        const profile = await userService.getUserProfile();
        return profile?.seedBackedUp ?? false;
      } catch {
        return false;
      }
    },
    staleTime: 60_000,
  });

  return {
    seedBackedUp: data ?? false,
    loading: isLoading,
  };
}
