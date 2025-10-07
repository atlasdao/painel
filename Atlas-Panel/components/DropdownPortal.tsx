'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement>;
}

export function DropdownPortal({ children, isOpen, onClose, targetRef }: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Calculate position
      let top = rect.bottom + scrollTop + 8;
      let left = rect.left + scrollLeft - 150; // Offset for menu width
      
      // Ensure menu doesn't go off screen
      const menuWidth = 200;
      const menuHeight = 300; // Approximate height
      
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 20;
      }
      
      if (left < 0) {
        left = 20;
      }
      
      if (top + menuHeight > window.innerHeight + scrollTop) {
        top = rect.top + scrollTop - menuHeight - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, targetRef]);

  useEffect(() => {
    if (isOpen) {
      const handleClick = (e: MouseEvent) => {
        if (targetRef.current && !targetRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose, targetRef]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className="fixed z-50 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}