'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Info, Loader } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  details?: {
    label: string;
    value: string;
  }[];
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  // Icon based on variant
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  // Colors based on variant
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return {
          accent: 'from-red-600/20 to-orange-600/20',
          iconBg: 'from-red-600/20 to-orange-600/20',
          confirmBtn: 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          accent: 'from-yellow-600/20 to-amber-600/20',
          iconBg: 'from-yellow-600/20 to-amber-600/20',
          confirmBtn: 'from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700',
          iconColor: 'text-yellow-400'
        };
      case 'info':
        return {
          accent: 'from-blue-600/20 to-cyan-600/20',
          iconBg: 'from-blue-600/20 to-cyan-600/20',
          confirmBtn: 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
          iconColor: 'text-blue-400'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden animate-slideUp">
        {/* Gradient accent border */}
        <div className={`absolute inset-0 bg-gradient-to-r ${colors.accent} pointer-events-none`} />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-gradient-to-br ${colors.iconBg} rounded-lg`}>
                {getIcon()}
              </div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-gray-300 leading-relaxed">{message}</p>
          </div>

          {/* Details */}
          {details && details.length > 0 && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{detail.label}:</span>
                    <span className="text-sm text-white font-medium">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-700/50 text-white rounded-lg font-medium hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.confirmBtn} text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}