'use client';

import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { Activity, Link, QrCode } from 'lucide-react';

interface VendasTabsProps {
  activeTab: 'activity' | 'links' | 'qrcode';
  onTabChange: (tab: 'activity' | 'links' | 'qrcode') => void;
  isCommerce: boolean;
}

const tabs = [
  { id: 'activity' as const, label: 'Atividade', icon: Activity },
  { id: 'links' as const, label: 'Links', icon: Link },
  { id: 'qrcode' as const, label: 'QR Code', icon: QrCode },
];

export default function VendasTabs({ activeTab, onTabChange, isCommerce }: VendasTabsProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Personal users don't see tabs at all
  if (!isCommerce) return null;

  const currentIndex = tabs.findIndex((t) => t.id === activeTab);

  // Update sliding indicator position
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    const activeEl = tabRefs.current.get(activeTab);
    const container = containerRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
      });
    }
  }, [activeTab]);

  // Also recalculate on resize
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const recalc = () => {
      const activeEl = tabRefs.current.get(activeTab);
      const container = containerRef.current;
      if (activeEl && container) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setIndicator({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
        });
      }
    };
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [activeTab]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Only handle horizontal swipes (ignore vertical scrolling)
      if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swipe left -> next tab
        onTabChange(tabs[currentIndex + 1].id);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right -> previous tab
        onTabChange(tabs[currentIndex - 1].id);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentIndex, onTabChange]
  );

  return (
    <div
      ref={containerRef}
      className="bg-[var(--bg-elevated)] rounded-xl p-1 flex relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="tablist"
      aria-label="Navegacao de vendas"
    >
      {/* Animated sliding indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-[var(--accent)] shadow-sm transition-all duration-300 ease-out"
        style={{
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
        }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`vendas-tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-200 min-h-[44px] relative z-10 ${
              isActive
                ? 'text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
