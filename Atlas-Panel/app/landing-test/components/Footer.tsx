'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 pt-12 pb-8">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="text-base font-bold text-zinc-50">Atlas</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-xs">
              Gateway PIX com a menor taxa do mercado
              e privacidade total para seu negocio.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 sm:justify-end text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider mb-1">Produto</span>
              <button
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
              >
                Como Funciona
              </button>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
              >
                Precos
              </button>
              <button
                onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
              >
                Duvidas
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-zinc-400 font-medium text-xs uppercase tracking-wider mb-1">Legal</span>
              <Link href="/termos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Privacidade
              </Link>
            </div>
          </div>
        </div>

        <p className="text-zinc-600 text-xs text-center mt-12">
          &copy; 2026 Atlas. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
