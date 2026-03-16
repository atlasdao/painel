'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement | null>;
  onPeriodSelect?: (period: any) => void;
}

export function DropdownPortal({ children, isOpen, onClose, targetRef }: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      let left = rect.left + scrollLeft; // Align with button left edge

      // Ensure menu doesn't go off screen
      const menuWidth = 288; // 72 * 4 (w-72 class)
      const menuHeight = 400; // Max height from transactions page
      
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
        const target = e.target as Node;
        const isInsideTarget = targetRef.current && targetRef.current.contains(target);
        const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

        if (!isInsideTarget && !isInsideDropdown) {
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
    <div
      ref={dropdownRef}
      className="fixed"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 2147483647 // Maximum safe z-index value
      }}
      onClick={(e) => {
        console.log('🏠 Portal container clicked:', e.target);
      }}
      onMouseDown={(e) => {
        console.log('🏠 Portal container mousedown:', e.target);
      }}
    >
      {children}
    </div>,
    document.body
  );
}