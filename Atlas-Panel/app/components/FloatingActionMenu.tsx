'use client';

import { useState } from 'react';
import { Plus, Link, QrCode, X, Monitor } from 'lucide-react';

interface FloatingActionMenuProps {
  onCreateLink?: () => void;
  onCreateQR?: () => void;
  onPOS?: () => void;
}

export default function FloatingActionMenu({
  onCreateLink,
  onCreateQR,
  onPOS
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: Link,
      label: 'Criar Link',
      onClick: onCreateLink,
      color: 'from-blue-500 to-cyan-500',
      delay: 0
    },
    {
      icon: QrCode,
      label: 'Gerar QR Code',
      onClick: onCreateQR,
      color: 'from-purple-500 to-pink-500',
      delay: 50
    },
    {
      icon: Monitor,
      label: 'POS Terminal',
      onClick: onPOS,
      color: 'from-green-500 to-teal-500',
      delay: 100
    }
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleActionClick = (action: typeof actions[0]) => {
    action.onClick?.();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Items */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleActionClick(action)}
                className={`flex items-center gap-3 animate-slide-in-up bg-gray-900/90 backdrop-blur-sm text-white text-sm font-medium px-4 py-3 rounded-full border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group min-w-0`}
                style={{ animationDelay: `${action.delay}ms` }}
                title={action.label}
              >
                {/* Action Icon */}
                <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-full shadow-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" />
                </div>

                {/* Label */}
                <span className="font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggleMenu}
        className={`w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group ${
          isOpen ? 'scale-110 rotate-45' : 'hover:scale-110'
        }`}
        title={isOpen ? 'Fechar menu' : 'Menu de ações rápidas'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white transition-transform duration-300" />
        ) : (
          <Plus className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
        )}

        {/* Pulsing ring effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-ping opacity-20"></div>
        )}
      </button>

      {/* Background overlay when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}