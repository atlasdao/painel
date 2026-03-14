'use client';

import { useState } from 'react';
import { Check, Calculator, Shield, Info, Sparkles, Lock, EyeOff, Zap, Clock } from 'lucide-react';

export default function Pricing() {
  const [monthlyTransactions, setMonthlyTransactions] = useState(100);
  const [averageTicket, setAverageTicket] = useState(150);
  const [showComparison, setShowComparison] = useState(false);
  const [isInstant, setIsInstant] = useState(false);

  // Atlas fee - D+1: 0.5% + R$ 0.99 per transaction
  const atlasD1Percentage = 0.005; // 0.5%
  const atlasInstantPercentage = 0.008; // 0.8%
  const atlasFixed = 0.99;

  // Competitors average (MercadoPago, PagSeguro, etc): ~4.99% + R$ 0.50
  const competitorPercentage = 0.0499;
  const competitorFixed = 0.50;

  const monthlyVolume = monthlyTransactions * averageTicket;
  const atlasD1MonthlyFee = (monthlyVolume * atlasD1Percentage) + (monthlyTransactions * atlasFixed);
  const atlasInstantMonthlyFee = (monthlyVolume * atlasInstantPercentage) + (monthlyTransactions * atlasFixed);
  const competitorMonthlyFee = (monthlyVolume * competitorPercentage) + (monthlyTransactions * competitorFixed);

  // Use the selected option for calculations
  const atlasMonthlyFee = isInstant ? atlasInstantMonthlyFee : atlasD1MonthlyFee;
  const atlasPercentage = isInstant ? atlasInstantPercentage : atlasD1Percentage;
  const monthlySavings = competitorMonthlyFee - atlasMonthlyFee;
  const yearlySavings = monthlySavings * 12;
  const savingsPercentage = competitorMonthlyFee > 0 ? Math.round((monthlySavings / competitorMonthlyFee) * 100) : 0;

  // Calculate effective rate for Atlas
  const effectiveAtlasRate = monthlyVolume > 0 ? ((atlasMonthlyFee / monthlyVolume) * 100).toFixed(2) : '0';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const features = [
    { text: 'Privacidade total garantida', icon: EyeOff },
    { text: 'Dados nunca compartilhados', icon: Lock },
    { text: 'PIX instantâneo 24/7', icon: null },
    { text: 'Links de pagamento ilimitados', icon: null },
    { text: 'Dashboard em tempo real', icon: null },
    { text: 'Sem mensalidade', icon: null },
    { text: 'Suporte humanizado', icon: null }
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Privacidade tem seu valor
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preço justo pela sua liberdade
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Enquanto outros vendem seus dados e ainda cobram caro, nós protegemos sua privacidade
            com taxas transparentes. Escolha o modelo que melhor se adapta ao seu negócio.
          </p>

          {/* Toggle Switch for payment options */}
          <div className="flex items-center justify-center gap-4 bg-gray-900 rounded-2xl p-2 max-w-md mx-auto border border-gray-700">
            <button
              onClick={() => setIsInstant(false)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                !isInstant
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Clock className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm">D+1</div>
                <div className="text-xs opacity-90">0,5% + R$0,99</div>
              </div>
            </button>
            <div className="w-px h-12 bg-gray-700"></div>
            <button
              onClick={() => setIsInstant(true)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isInstant
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Zap className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm">Instantâneo</div>
                <div className="text-xs opacity-90">0,8% + R$0,99</div>
              </div>
            </button>
          </div>
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
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
                  max="5000"
                  step="10"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(averageTicket)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/30">
                <p className="text-sm text-gray-400">Volume mensal</p>
                <p className="text-xl font-bold text-white">{formatCurrency(monthlyVolume)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className={`flex items-center justify-between p-5 bg-gradient-to-br rounded-xl border-2 transition-all duration-300 ${
                isInstant
                  ? 'from-blue-900/40 to-purple-900/40 border-blue-500/50 shadow-lg shadow-blue-500/20'
                  : 'from-green-900/40 to-emerald-900/40 border-green-500/50 shadow-lg shadow-green-500/20'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isInstant ? <Zap className="w-5 h-5 text-blue-400" /> : <Clock className="w-5 h-5 text-green-400" />}
                    <Shield className="w-4 h-4 text-white/70" />
                    <p className={`text-sm font-medium ${isInstant ? 'text-blue-400' : 'text-green-400'}`}>
                      Atlas {isInstant ? 'Instantâneo' : 'D+1'} + Privacidade
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{formatCurrency(atlasMonthlyFee)}/mês</p>
                  <p className="text-xs text-gray-400">Taxa efetiva: {effectiveAtlasRate}%</p>
                  <p className={`text-xs mt-2 ${isInstant ? 'text-blue-300' : 'text-green-300'}`}>
                    {isInstant ? '⚡ Receba na hora' : '📅 Receba em 1 dia útil'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-4 py-2 rounded-full font-bold ${
                    isInstant
                      ? 'text-blue-400 bg-blue-900/50 border border-blue-500/50'
                      : 'text-green-400 bg-green-900/50 border border-green-500/50'
                  }`}>
                    {isInstant ? '0,8%' : '0,5%'} + R$0,99
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg border border-red-900/50">
                <div>
                  <p className="text-sm text-gray-400">Outros (vendem seus dados)</p>
                  <p className="text-xl font-semibold text-gray-500 line-through">
                    {formatCurrency(competitorMonthlyFee)}/mês
                  </p>
                </div>
                <span className="text-xs text-red-400">~5% + dados</span>
              </div>
            </div>

            <div className={`p-6 rounded-xl border mt-6 transition-all duration-300 ${
              isInstant
                ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50'
                : 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-700/50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-5 h-5 ${isInstant ? 'text-blue-400' : 'text-green-400'}`} />
                <p className={`text-sm font-medium ${isInstant ? 'text-blue-400' : 'text-green-400'}`}>
                  Você economiza {savingsPercentage}% e mantém sua privacidade
                </p>
              </div>
              <p className={`text-3xl font-bold mb-1 ${isInstant ? 'text-blue-400' : 'text-green-400'}`}>
                {formatCurrency(monthlySavings)}/mês
              </p>
              <p className={`text-lg font-semibold ${isInstant ? 'text-blue-300' : 'text-green-300'}`}>
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
              <div className="mt-4 p-4 bg-purple-900/20 rounded-lg text-sm text-gray-300 border border-purple-900/50">
                <p className="font-medium mb-3 text-white">Comparação honesta:</p>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span className="text-green-400 font-medium flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Atlas D+1
                    </span>
                    <span className="text-green-400 font-bold">0,5% + R$0,99 + Privacidade</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-blue-400 font-medium flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Atlas Instantâneo
                    </span>
                    <span className="text-blue-400 font-bold">0,8% + R$0,99 + Privacidade</span>
                  </li>
                  <li className="flex justify-between items-center text-gray-400">
                    <span>MercadoPago</span>
                    <span>4,99% + R$0,60 + seus dados</span>
                  </li>
                  <li className="flex justify-between items-center text-gray-400">
                    <span>PagSeguro</span>
                    <span>4,99% + R$0,40 + seus dados</span>
                  </li>
                  <li className="flex justify-between items-center text-gray-400">
                    <span>Stone</span>
                    <span>4,78% + mensalidade + seus dados</span>
                  </li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    💡 Exemplo: venda de R$100
                  </p>
                  <p className="text-xs mt-1">
                    <span className="text-green-400">Atlas D+1: R$1,49 + privacidade</span>
                  </p>
                  <p className="text-xs mt-1">
                    <span className="text-blue-400">Atlas Instantâneo: R$1,79 + privacidade</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-red-400">Outros: ~R$5,50 + vendem seus dados</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pricing card */}
          <div className={`rounded-2xl shadow-xl p-8 text-white relative overflow-hidden transition-all duration-500 ${
            isInstant
              ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700'
              : 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700'
          }`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium mb-3">
                  <Lock className="w-4 h-4" />
                  Privacidade inclusa
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {isInstant ? 'Recebimento Instantâneo' : 'Recebimento D+1'}
                </h3>
                <p className={isInstant ? 'text-blue-100' : 'text-green-100'}>
                  {isInstant ? 'Seu dinheiro disponível na hora' : 'Receba em 1 dia útil'}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  {isInstant ? <Zap className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold">{isInstant ? '0,8%' : '0,5%'}</span>
                    <span className="text-2xl font-bold text-white/80">+</span>
                    <span className="text-4xl font-bold">R$0,99</span>
                  </div>
                </div>
                <p className={`text-sm mb-4 ${isInstant ? 'text-blue-100' : 'text-green-100'}`}>
                  por transação aprovada
                </p>
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-xs text-white/90">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Inclui: privacidade total, anonimato e proteção de dados
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {features.map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        {FeatureIcon ? <FeatureIcon className="w-3 h-3 text-white" /> : <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-white/90">{feature.text}</span>
                    </div>
                  );
                })}
              </div>

              <a
                href="/register"
                className="block w-full bg-white text-purple-600 px-6 py-4 rounded-lg font-semibold text-center hover:bg-purple-50 transition-colors shadow-lg"
              >
                Proteger Minha Privacidade
              </a>

              <p className="text-xs text-purple-100 text-center mt-4">
                Sem cartão de crédito • Ativação instantânea
              </p>
            </div>
          </div>
        </div>

        {/* Bottom trust indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-900/50 border border-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-7 h-7 text-purple-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">Anonimato Total</h4>
            <p className="text-sm text-gray-400">Seus dados nunca são vendidos</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-900/50 border border-blue-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-blue-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">100% Seguro</h4>
            <p className="text-sm text-gray-400">Criptografia de ponta</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-900/50 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-sm font-bold text-green-400">D+1/D+0</span>
            </div>
            <h4 className="font-semibold text-white mb-2">Saque Flexível</h4>
            <p className="text-sm text-gray-400">D+1 ou instantâneo</p>
          </div>
        </div>
      </div>
    </section>
  );
}
