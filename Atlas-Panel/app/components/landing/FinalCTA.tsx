'use client';

import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="py-16 sm:py-24 md:py-32 border-t border-zinc-800">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
          Comece a vender com a menor taxa do mercado.
        </h2>
        <p className="text-zinc-400 mt-3 sm:mt-4 max-w-lg mx-auto text-sm sm:text-base">
          Crie sua conta em segundos e comece a receber pagamentos PIX
          com privacidade e sem burocracia.
        </p>

        <div className="mt-8 sm:mt-10">
          <Link
            href="/register"
            className="inline-block bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white px-8 py-4 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 w-full sm:w-auto"
          >
            Criar Conta Gratis
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-zinc-500 mt-5 sm:mt-6">
          Sem cartao de credito &middot; Sem documentos &middot; Ativacao instantanea
        </p>
      </div>
    </section>
  );
}
