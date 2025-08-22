import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Ban,
  CheckCircle,
  Shield,
  Key,
  Settings,
  DollarSign,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { UserRole } from '@/app/types/user-role';

interface UserActionsDropdownProps {
  user: any;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onChangeRole: (userId: string, newRole: UserRole) => void;
  onRevokeApiKey: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onManageLimits: (user: any) => void;
}

export default function UserActionsDropdown({
  user,
  onToggleStatus,
  onChangeRole,
  onRevokeApiKey,
  onDeleteUser,
  onManageLimits,
}: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 150, // Offset to align right
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const dropdownContent = (
    <>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[9999] w-56 max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onToggleStatus(user.id, user.isActive))}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center text-white"
            >
              {user.isActive ? (
                <>
                  <Ban size={16} className="mr-2 text-red-400" />
                  Desativar Conta
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2 text-green-400" />
                  Ativar Conta
                </>
              )}
            </button>

            <button
              onClick={() => handleAction(() => onChangeRole(user.id, user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN))}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center text-white"
            >
              <Shield size={16} className="mr-2 text-purple-400" />
              {user.role === UserRole.ADMIN ? 'Remover Admin' : 'Tornar Admin'}
            </button>

            <button
              onClick={() => handleAction(() => onManageLimits(user))}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center text-white"
            >
              <DollarSign size={16} className="mr-2 text-yellow-400" />
              Ajustar Limites
            </button>

            {user.apiKey && (
              <button
                onClick={() => handleAction(() => onRevokeApiKey(user.id))}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center text-white"
              >
                <Key size={16} className="mr-2 text-orange-400" />
                Revogar API Key
              </button>
            )}

            <div className="border-t border-gray-700 my-1" />

            <button
              onClick={() => handleAction(() => onDeleteUser(user.id))}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center text-white"
            >
              <Trash2 size={16} className="mr-2 text-red-400" />
              Excluir Usuário
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical size={16} className="text-gray-400" />
      </button>
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}