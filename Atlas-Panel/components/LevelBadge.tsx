'use client';

import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import api from '@/app/lib/api';

interface LevelBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface UserLevel {
  level: number;
}

export default function LevelBadge({ size = 'sm', className = '' }: LevelBadgeProps) {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserLevel();
  }, []);

  const loadUserLevel = async () => {
    try {
      const response = await api.get('/levels/user');
      setUserLevel(response.data);
    } catch (error) {
      // Silently fail - just don't show badge if can't load
      console.log('Could not load user level for badge');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    const colors = [
      'text-gray-400 border-gray-500/30 bg-gray-500/10',     // Level 0
      'text-green-400 border-green-500/30 bg-green-500/10',   // Level 1
      'text-blue-400 border-blue-500/30 bg-blue-500/10',     // Level 2
      'text-purple-400 border-purple-500/30 bg-purple-500/10', // Level 3
      'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', // Level 4
      'text-orange-400 border-orange-500/30 bg-orange-500/10', // Level 5
      'text-red-400 border-red-500/30 bg-red-500/10',       // Level 6
      'text-pink-400 border-pink-500/30 bg-pink-500/10',     // Level 7
      'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', // Level 8
      'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',     // Level 9
      'text-amber-400 border-amber-500/30 bg-amber-500/10',   // Level 10
    ];
    return colors[level] || 'text-gray-400 border-gray-500/30 bg-gray-500/10';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-xs';
      case 'md':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-3 py-1.5 text-base';
      default:
        return 'px-1.5 py-0.5 text-xs';
    }
  };

  if (loading || !userLevel) {
    return null;
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-sm
        ${getLevelColor(userLevel.level)}
        ${getSizeClasses()}
        ${className}
      `}
    >
      <Award className="w-3 h-3" />
      <span>{userLevel.level}</span>
    </div>
  );
}