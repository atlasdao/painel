'use client';

import { useState } from 'react';
import { Search, ChevronRight, FileText } from 'lucide-react';
import { navigation, type NavGroup, type NavItem } from '../data/navigation';

interface DocsSidebarProps {
  activeSection: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocsSidebar({ activeSection, isOpen, onClose }: DocsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pix', 'payment-links', 'webhooks']));

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

  const matchesSearch = (item: NavItem): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (item.label.toLowerCase().includes(q)) return true;
    if (item.children) return item.children.some((c) => c.label.toLowerCase().includes(q));
    return false;
  };

  const isActive = (id: string) => activeSection === id;

  const renderItem = (item: NavItem, depth: number = 0) => {
    if (!matchesSearch(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const active = isActive(item.id);

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleGroup(item.id);
            } else {
              scrollTo(item.id);
            }
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm transition-colors ${
            active
              ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400 -ml-[2px]'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
          } ${depth > 0 ? 'pl-6' : ''}`}
        >
          {hasChildren && (
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
          <span className="truncate">{item.label}</span>
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.filter(matchesSearch).map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-zinc-800">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((group: NavGroup) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-3">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.filter(matchesSearch).map((item) => renderItem(item))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <a
          href="/devs/llms.md"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>llms.md (LLM-friendly)</span>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="fixed top-16 w-64 h-[calc(100vh-4rem)] bg-zinc-900/50 border-r border-zinc-800">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
          <aside className="fixed top-16 left-0 z-50 w-72 h-[calc(100vh-4rem)] bg-zinc-900 border-r border-zinc-800 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
