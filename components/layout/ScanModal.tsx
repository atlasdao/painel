'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
}

export function ScanModal({ open, onClose }: ScanModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center rounded-full"
        style={{
          width: 48,
          height: 48,
          color: 'var(--text-primary)',
          background: 'var(--bg-elevated)',
        }}
        aria-label="Fechar scanner"
      >
        <X size={24} />
      </button>

      {/* Viewfinder placeholder */}
      <div className="flex flex-col items-center gap-6 px-6">
        <div
          className="relative rounded-2xl"
          style={{
            width: 280,
            height: 280,
            border: '2px solid var(--border-default)',
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl"
            style={{ borderColor: 'var(--accent)' }} />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-2xl"
            style={{ borderColor: 'var(--accent)' }} />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-2xl"
            style={{ borderColor: 'var(--accent)' }} />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl"
            style={{ borderColor: 'var(--accent)' }} />
        </div>

        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Aponte para um QR code
        </p>
      </div>
    </div>
  );
}
