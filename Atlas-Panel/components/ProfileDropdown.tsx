'use client';

import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { UserCircle, LogOut, Users, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/hooks/useTheme';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  user: {
    username: string;
    email: string;
  };
  onLogout: () => void;
}

export default function ProfileDropdown({ isOpen, onClose, buttonRef, user, onLogout }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, buttonRef]);

  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;

      dropdown.style.position = 'fixed';
      dropdown.style.top = `${buttonRect.bottom + 8}px`;
      dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
      dropdown.style.zIndex = '2147483647';
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="w-56 bg-[var(--bg-card)] rounded-xl shadow-lg border border-[var(--border-default)] py-1"
      style={{
        position: 'fixed',
        zIndex: 2147483647,
      }}
    >
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">{user.username}</p>
        <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
      </div>

      <Link
        href="/settings?tab=profile"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
      >
        <UserCircle className="w-4 h-4" />
        <span>Meu Perfil</span>
      </Link>

      <Link
        href="/collaborators"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Users className="w-4 h-4" />
        <span>Colaboradores</span>
      </Link>

      <div className="border-t border-[var(--border-default)] mt-1 pt-1">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center justify-between px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors w-full"
        >
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{isDark ? 'Tema Escuro' : 'Tema Claro'}</span>
          </div>
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${
              isDark ? 'bg-[var(--accent)]' : 'bg-[var(--border-hover)]'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                isDark ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>
      </div>

      <div className="border-t border-[var(--border-default)]">
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
