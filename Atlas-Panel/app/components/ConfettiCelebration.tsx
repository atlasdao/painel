'use client';

import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: {
    x: number;
    y: number;
  };
  rotation: number;
  rotationSpeed: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
}

export default function ConfettiCelebration({
  isActive,
  duration = 3000,
  particleCount = 50
}: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const colors = [
    '#6366f1', // Purple
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
  ];

  useEffect(() => {
    if (!isActive) {
      setConfetti([]);
      return;
    }

    // Create initial confetti pieces
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < particleCount; i++) {
      pieces.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        velocity: {
          x: (Math.random() - 0.5) * 6,
          y: Math.random() * 3 + 2
        },
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }
    setConfetti(pieces);

    // Animation loop
    const animate = () => {
      setConfetti(prev =>
        prev
          .map(piece => ({
            ...piece,
            x: piece.x + piece.velocity.x,
            y: piece.y + piece.velocity.y,
            rotation: piece.rotation + piece.rotationSpeed,
            velocity: {
              ...piece.velocity,
              y: piece.velocity.y + 0.2 // Gravity
            }
          }))
          .filter(piece => piece.y < window.innerHeight + 50)
      );
    };

    const animationId = setInterval(animate, 16);

    // Clean up after duration
    const timeout = setTimeout(() => {
      clearInterval(animationId);
      setConfetti([]);
    }, duration);

    return () => {
      clearInterval(animationId);
      clearTimeout(timeout);
    };
  }, [isActive, duration, particleCount]);

  if (!isActive || confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute rounded-sm"
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            transition: 'none'
          }}
        />
      ))}
    </div>
  );
}