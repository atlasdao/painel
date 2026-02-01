'use client';

import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { UserCircle, LogOut, Users } from 'lucide-react';

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

      // Position the dropdown below the button
      dropdown.style.position = 'fixed';
      dropdown.style.top = `${buttonRect.bottom + 8}px`;
      dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
      dropdown.style.zIndex = '2147483647'; // Maximum z-index value
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="w-56 backdrop-blur-xl bg-gray-800/95 rounded-lg shadow-2xl border border-gray-700/50 py-2"
      style={{
        position: 'fixed',
        zIndex: 2147483647, // Maximum safe integer for z-index
      }}
    >
      <div className="px-4 py-3 border-b border-gray-700/50">
        <p className="text-sm font-medium text-white">{user.username}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </div>

      <Link
        href="/settings?tab=profile"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
      >
        <UserCircle className="w-4 h-4" />
        <span>Meu Perfil</span>
      </Link>

      <Link
        href="/collaborators"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
      >
        <Users className="w-4 h-4" />
        <span>Colaboradores</span>
      </Link>

      <div className="border-t border-gray-700/50 mt-2 pt-2">
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>,
    document.body
  );
}