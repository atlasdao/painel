'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

interface DocsNavProps {
  onMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

export default function DocsNav({ onMenuToggle, mobileMenuOpen }: DocsNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800'
          : 'bg-zinc-950 border-b border-zinc-800'
      }`}
    >
      <div className="max-w-[90rem] mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={32}
                height={32}
                className="rounded-lg"
                priority
              />
              <span className="text-lg font-bold text-zinc-50">Atlas</span>
            </Link>
            <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Docs</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Home
            </Link>
            <span className="text-white text-sm font-medium">Docs</span>
            <Link href="/status" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Status
            </Link>
            <div className="w-px h-5 bg-zinc-700" />
            <Link href="/login" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Criar Conta
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <Link
              href="/register"
              className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
