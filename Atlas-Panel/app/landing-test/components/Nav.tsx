'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function Nav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-lg font-bold text-zinc-50">Atlas</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo('como-funciona')}
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Como Funciona
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Precos
            </button>
            <button
              onClick={() => scrollTo('faq')}
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Duvidas
            </button>
            <div className="w-px h-5 bg-zinc-700" />
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Criar Conta
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800">
          <div className="px-5 py-6 space-y-4">
            <button
              onClick={() => scrollTo('como-funciona')}
              className="block text-zinc-400 hover:text-white font-medium transition-colors py-2 text-left w-full"
            >
              Como Funciona
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="block text-zinc-400 hover:text-white font-medium transition-colors py-2 text-left w-full"
            >
              Precos
            </button>
            <button
              onClick={() => scrollTo('faq')}
              className="block text-zinc-400 hover:text-white font-medium transition-colors py-2 text-left w-full"
            >
              Duvidas
            </button>
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <Link
                href="/login"
                className="block text-center text-zinc-300 bg-zinc-900 px-5 py-3 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="block text-center bg-blue-500 text-white px-5 py-3 rounded-lg font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
