'use client';

import { useState, useCallback } from 'react';

interface UseScanModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export function useScanModal(): UseScanModalReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
