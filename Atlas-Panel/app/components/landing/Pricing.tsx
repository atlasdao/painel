'use client';

import { useState } from 'react';
import { Check, Calculator, TrendingDown, Info } from 'lucide-react';

export default function Pricing() {
  const [monthlyTransactions, setMonthlyTransactions] = useState(100);
  const [averageTicket, setAverageTicket] = useState(150);
  const [showComparison, setShowComparison] = useState(false);

  // Atlas fee: R$ 0.99 per transaction (fixed)
  const atlasFeePerTransaction = 0.99;

  // Competitors average (MercadoPago, PagSeguro, etc): ~4.99% + R$ 0.50
  const competitorPercentage = 0.0499;
  const competitorFixed = 0.50;

  const monthlyVolume = monthlyTransactions * averageTicket;
  const atlasMonthlyFee = monthlyTransactions * atlasFeePerTransaction;
  const competitorMonthlyFee = (monthlyVolume * competitorPercentage) + (monthlyTransactions * competitorFixed);
  const monthlySavings = competitorMonthlyFee - atlasMonthlyFee;
  const yearlySavings = monthlySavings * 12;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const features = [
    'PIX instantâneo 24/7',
    'Links de pagamento ilimitados',
    'Dashboard em tempo real',
    'QR Code para pagamento',
    'Sem taxa de setup',
    'Sem mensalidade',
    'Suporte humanizado'
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-700/50 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <TrendingDown className="w-4 h-4" />
            Economize até 80% em taxas
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preço único e transparente
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Apenas R$ 0,99 por transação. Sem percentual, sem mensalidade, sem pegadinhas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Calculator */}
          <div className="bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-blue-400" />
              <h3 className="text-2xl font-bold text-white">Calcule sua economia</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transações por mês
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={monthlyTransactions}
                  onChange={(e) => setMonthlyTransactions(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-white">
                    {monthlyTransactions} transações
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ticket médio
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(averageTicket)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div>
                  <p className="text-sm text-gray-400">Com Atlas</p>
                  <p className="text-xl font-semibold text-white">{formatCurrency(atlasMonthlyFee)}/mês</p>
                </div>
                <span className="text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded">R$ 0,99/transação</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-900/50">
                <div>
                  <p className="text-sm text-gray-400">Outros gateways</p>
                  <p className="text-xl font-semibold text-gray-500 line-through">
                    {formatCurrency(competitorMonthlyFee)}/mês
                  </p>
                </div>
                <span className="text-xs text-red-400">~5% + taxas</span>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-700/50 mt-6">
              <p className="text-sm font-medium text-green-400 mb-2">Você economiza</p>
              <p className="text-3xl font-bold text-green-400 mb-1">
                {formatCurrency(monthlySavings)}/mês
              </p>
              <p className="text-lg font-semibold text-green-300">
                {formatCurrency(yearlySavings)}/ano
              </p>
            </div>

            <button
              onClick={() => setShowComparison(!showComparison)}
              className="mt-4 text-sm text-blue-400 hover:text-purple-400 font-medium flex items-center gap-1"
            >
              <Info className="w-4 h-4" />
              {showComparison ? 'Ocultar' : 'Ver'} comparação detalhada
            </button>

            {showComparison && (
              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg text-sm text-gray-300 border border-blue-900/50">
                <p className="font-medium mb-2 text-white">Comparação de taxas:</p>
                <ul className="space-y-1">
                  <li className="text-green-400">• Atlas: R$ 0,99 fixo</li>
                  <li>• MercadoPago: 4.99% + R$ 0.60</li>
                  <li>• PagSeguro: 4.99% + R$ 0.40</li>
                  <li>• Stone: 4.78% + mensalidade</li>
                  <li>• Cielo: 5.00% + aluguel</li>
                </ul>
              </div>
            )}
          </div>

          {/* Pricing card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Taxa Única</h3>
              <p className="text-blue-100">Simples e transparente</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">R$ 0,99</span>
                <span className="text-xl text-blue-100">por transação</span>
              </div>
              <p className="text-sm text-blue-100 mt-2">Sem percentual • Sem mensalidade • Sem surpresas</p>
            </div>

            <div className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="/register"
              className="block w-full bg-white text-blue-600 px-6 py-4 rounded-lg font-semibold text-center hover:bg-blue-50 transition-colors"
            >
              Começar Agora Gratuitamente
            </a>

            <p className="text-xs text-blue-100 text-center mt-4">
              Sem cartão de crédito • Ativação instantânea
            </p>
          </div>
        </div>

        {/* Bottom trust indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-900/50 border border-blue-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-400">0%</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Taxa de Setup</h4>
            <p className="text-sm text-gray-400">Comece sem custos iniciais</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-900/50 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-400">24h</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Receba Sempre</h4>
            <p className="text-sm text-gray-400">PIX disponível 24/7</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-900/50 border border-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-400">D+0</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Saque Imediato</h4>
            <p className="text-sm text-gray-400">Seu dinheiro na hora</p>
          </div>
        </div>
      </div>
    </section>
  );
}