'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  defaultInterval: number; // ms
  fastInterval: number; // ms
  fastDuration: number; // ms
  enabled: boolean;
}

export function useWalletPolling(
  fetchFn: () => Promise<void>,
  options: PollingOptions = {
    defaultInterval: 30000,
    fastInterval: 5000,
    fastDuration: 120000,
    enabled: true,
  },
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fastUntilRef = useRef<number>(0);
  const visibleRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();

    const now = Date.now();
    const isFast = now < fastUntilRef.current;
    const interval = isFast ? options.fastInterval : options.defaultInterval;

    intervalRef.current = setInterval(() => {
      if (!visibleRef.current) return;

      const currentNow = Date.now();
      if (currentNow >= fastUntilRef.current && isFast) {
        // Switch back to normal polling
        startPolling();
        return;
      }

      fetchFn();
    }, interval);
  }, [fetchFn, options.defaultInterval, options.fastInterval, stopPolling]);

  // Trigger fast polling (e.g., after sending a TX)
  const triggerFastPolling = useCallback(() => {
    fastUntilRef.current = Date.now() + options.fastDuration;
    startPolling();
    fetchFn(); // Immediate fetch
  }, [options.fastDuration, startPolling, fetchFn]);

  useEffect(() => {
    if (!options.enabled) {
      stopPolling();
      return;
    }

    startPolling();

    // Tab visibility handling
    const handleVisibility = () => {
      if (document.hidden) {
        visibleRef.current = false;
      } else {
        visibleRef.current = true;
        fetchFn(); // Immediate fetch on tab visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [options.enabled, startPolling, stopPolling, fetchFn]);

  return { triggerFastPolling };
}
