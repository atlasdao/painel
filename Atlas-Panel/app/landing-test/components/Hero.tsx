'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="min-h-[100svh] flex items-center justify-center relative overflow-hidden pt-16">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-blue-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-5 sm:px-6 max-w-4xl mx-auto">
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-5xl md:text-7xl font-bold tracking-tight text-zinc-50">
          Receba via PIX
          <br />
          <span className="text-blue-400">fora do sistema.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mt-5 sm:mt-6 leading-relaxed">
          Crie sua conta, compartilhe seu link de pagamento
          e comece a vender em minutos. A menor taxa do mercado,
          sem burocracia.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-block bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white px-8 py-4 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 w-full sm:w-auto"
          >
            Criar Conta Gratis
          </Link>
          <button
            onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block text-zinc-400 hover:text-white px-8 py-4 text-base sm:text-lg font-medium transition-colors w-full sm:w-auto"
          >
            Como funciona &darr;
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-6 mt-8 text-xs sm:text-sm text-zinc-500">
          <span>Sem mensalidade</span>
          <span>&middot;</span>
          <span>Ativacao instantanea</span>
          <span>&middot;</span>
          <span>Suporte 24/7</span>
        </div>
      </div>
    </section>
  );
}
