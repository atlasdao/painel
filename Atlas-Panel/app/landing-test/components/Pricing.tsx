'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Clock, Zap } from 'lucide-react';

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

const sharedFeatures = [
  'Links de pagamento ilimitados',
  'Painel de vendas completo',
  'Privacidade total dos dados',
  'Suporte 24/7',
  'Sem mensalidade',
  'Sem taxa de adesao',
];

// Calculator
function SavingsCalculator({ isInstant }: { isInstant: boolean }) {
  const [transactions, setTransactions] = useState(100);
  const [ticket, setTicket] = useState(150);

  const volume = transactions * ticket;
  const atlasRate = isInstant ? 0.008 : 0.005;
  const atlasFee = (volume * atlasRate) + (transactions * 0.99);
  const competitorFee = (volume * 0.0499) + (transactions * 0.50);
  const savings = competitorFee - atlasFee;

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8">
      <h3 className="text-base sm:text-lg font-semibold text-zinc-50 mb-6">
        Calcule sua economia
      </h3>

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-zinc-400">Transacoes por mes</label>
            <span className="text-sm font-semibold text-zinc-50">{transactions}</span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={transactions}
            onChange={(e) => setTransactions(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-zinc-400">Ticket medio</label>
            <span className="text-sm font-semibold text-zinc-50">{fmt(ticket)}</span>
          </div>
          <input
            type="range"
            min="10"
            max="5000"
            step="10"
            value={ticket}
            onChange={(e) => setTicket(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Volume mensal</span>
          <span className="text-sm font-medium text-zinc-50">{fmt(volume)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Taxa Atlas ({isInstant ? 'Instantaneo' : 'D+1'})</span>
          <span className="text-sm font-medium text-zinc-50">{fmt(atlasFee)}/mes</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Taxa concorrentes (~5%)</span>
          <span className="text-sm text-zinc-500 line-through">{fmt(competitorFee)}/mes</span>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-400">Voce economiza</span>
          <span className="text-lg sm:text-xl font-bold text-blue-400">{fmt(savings)}/mes</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Isso e {fmt(savings * 12)} por ano no seu bolso.
        </p>
      </div>
    </div>
  );
}

export default function Pricing() {
  const { ref, isVisible } = useScrollReveal();
  const [isInstant, setIsInstant] = useState(false);

  return (
    <section
      id="pricing"
      ref={ref}
      className={`py-16 sm:py-24 md:py-32 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
            Precos transparentes, sem surpresas
          </h2>
          <p className="text-zinc-400 mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Voce so paga quando recebe. Sem mensalidade, sem taxa de adesao,
            sem custos ocultos.
          </p>
        </div>

        {/* Switch D+1 / Instantaneo */}
        <div className="flex items-center justify-center mb-10 sm:mb-12">
          <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
            <button
              onClick={() => setIsInstant(false)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                !isInstant
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm">D+1</div>
                <div className="text-[10px] sm:text-xs opacity-80">0,5% + R$0,99</div>
              </div>
            </button>
            <button
              onClick={() => setIsInstant(true)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                isInstant
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm">Instantaneo</div>
                <div className="text-[10px] sm:text-xs opacity-80">0,8% + R$0,99</div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Pricing Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              {isInstant ? <Zap className="w-5 h-5 text-blue-400" /> : <Clock className="w-5 h-5 text-blue-400" />}
              <h3 className="text-base sm:text-lg font-semibold text-zinc-50">
                {isInstant ? 'Recebimento Instantaneo' : 'Recebimento D+1'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mb-5">
              {isInstant ? 'O dinheiro cai na sua conta em minutos' : 'Receba no proximo dia util'}
            </p>

            <div className="mb-6">
              <span className="text-3xl sm:text-4xl font-bold text-blue-400">
                {isInstant ? '0,8%' : '0,5%'}
              </span>
              <span className="text-zinc-400 ml-2">+</span>
              <span className="text-zinc-50 font-semibold ml-2">R$ 0,99</span>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">por transacao aprovada</p>
            </div>

            <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
              {sharedFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2.5 sm:gap-3 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block text-center bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white w-full py-3.5 sm:py-3 rounded-lg font-semibold transition-colors"
            >
              Comecar Agora
            </Link>

            <p className="text-xs text-zinc-500 text-center mt-3">
              Sem cartao de credito necessario
            </p>
          </div>

          {/* Savings Calculator */}
          <SavingsCalculator isInstant={isInstant} />
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <p className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-400">Exemplo:</span> em uma venda de R$ 100 no D+1, voce recebe R$ 98,51.
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            No MercadoPago, voce receberia{' '}
            <span className="text-red-400 line-through">R$ 94,02</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
