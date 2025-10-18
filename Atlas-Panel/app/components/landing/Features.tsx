'use client';

import { Zap, CreditCard, Link2, BarChart3, Shield, HeadphonesIcon } from 'lucide-react';

const features = [
  {
    icon: Link2,
    title: 'Links de Pagamento',
    description: 'Crie links personalizados e compartilhe com seus clientes via Telegram, email ou redes sociais.',
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    icon: CreditCard,
    title: 'Apenas R$ 0,99',
    description: 'Taxa fixa de R$ 0,99 por transação. Sem mensalidade, sem taxa de setup, sem surpresas.',
    gradient: 'from-green-400 to-emerald-600'
  },
  {
    icon: Zap,
    title: 'PIX Instantâneo',
    description: 'Receba pagamentos em segundos, 24 horas por dia, 7 dias por semana. Seu dinheiro na hora.',
    gradient: 'from-yellow-400 to-orange-500'
  },
  {
    icon: BarChart3,
    title: 'Dashboard Simples',
    description: 'Acompanhe suas vendas e recebimentos em tempo real. Tudo organizado em um só lugar.',
    gradient: 'from-purple-400 to-pink-500'
  },
  {
    icon: Shield,
    title: 'Sem Burocracia',
    description: 'Comece a receber pagamentos imediatamente. Sem análise de crédito, sem documentação complexa.',
    gradient: 'from-red-400 to-rose-500'
  },
  {
    icon: HeadphonesIcon,
    title: 'Suporte Humanizado',
    description: 'Equipe pronta para ajudar você via Telegram. Respostas rápidas quando você precisar.',
    gradient: 'from-teal-400 to-cyan-500'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo que você precisa para
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> vender online</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Plataforma completa para receber pagamentos PIX de forma simples e transparente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-gray-900 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-700 hover:border-gray-600"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  {/* Icon with gradient background */}
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">
            Simples, transparente e eficiente.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 text-blue-400 font-semibold hover:text-purple-400 transition-colors"
          >
            Começar agora gratuitamente
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}