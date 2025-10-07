'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface CelebrationButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
}

export default function CelebrationButton({
  children,
  onClick,
  className = '',
  disabled = false,
  variant = 'primary'
}: CelebrationButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleClick = () => {
    if (disabled) return;

    // Trigger micro-animation
    setIsAnimating(true);

    // Show celebration for important actions
    if (variant === 'success') {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
    }

    // Reset animation
    setTimeout(() => setIsAnimating(false), 300);

    // Call original onClick
    onClick?.();
  };

  const baseClasses = 'btn-commerce-premium focus-commerce relative overflow-hidden';
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600'
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${
        isAnimating ? 'animate-bounce' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Celebration particles */}
      {showCelebration && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 2) * 80}%`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '1s'
                }}
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>

      {/* Ripple effect */}
      {isAnimating && (
        <div className="absolute inset-0 bg-white/20 rounded-lg animate-ping"></div>
      )}
    </button>
  );
}