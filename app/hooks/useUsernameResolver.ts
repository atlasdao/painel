'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { transferService } from '@/app/lib/services';
import { ResolvedRecipient } from '@/app/types';

interface UseUsernameResolverReturn {
  resolve: (identifier: string) => void;
  result: ResolvedRecipient | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

const DEBOUNCE_MS = 300;

export function useUsernameResolver(): UseUsernameResolverReturn {
  const [result, setResult] = useState<ResolvedRecipient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const resolve = useCallback((identifier: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = identifier.trim();
    if (!trimmed) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resolved = await transferService.resolve(trimmed);
        if (!controller.signal.aborted) {
          setResult(resolved);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(err instanceof Error ? err.message : 'Erro ao resolver destinatario');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { resolve, result, loading, error, reset };
}
