'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { authService } from '@/app/lib/auth';
import { User } from '@/app/types';

interface TopBarProps {
  user: User | null;
}

function UserAvatar({ user }: { user: User | null }) {
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '?';

  if (user?.profilePicture) {
    return (
      <img
        src={user.profilePicture}
        alt={user.username || 'Avatar'}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
      style={{ background: 'var(--accent-soft)', color: 'var(--text-primary)' }}
    >
      {initials}
    </div>
  );
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme !== 'light');
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIsDark(!isDark);
  }, [isDark]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await authService.logout();
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6"
      style={{
        height: '56px',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Logo */}
      <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Atlas
      </span>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 40, height: 40 }}
            aria-label="Menu do usuário"
          >
            <UserAvatar user={user} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
              }}
            >
              <button
                onClick={() => { setDropdownOpen(false); router.push('/dash/menu/perfil'); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <UserIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                Perfil
              </button>
              <button
                onClick={() => { toggleTheme(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isDark ? <Sun size={16} style={{ color: 'var(--text-secondary)' }} /> : <Moon size={16} style={{ color: 'var(--text-secondary)' }} />}
                {isDark ? 'Tema claro' : 'Tema escuro'}
              </button>
              <div style={{ borderTop: '1px solid var(--border-default)', margin: '4px 0' }} />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left"
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
