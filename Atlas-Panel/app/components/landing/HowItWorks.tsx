'use client';

import { UserPlus, Store, DollarSign } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua Conta',
    description: 'Cadastro em 30 segundos. Só precisamos do básico: nome, email e senha. Sem documentos, sem espera.',
    color: 'blue'
  },
  {
    number: '02',
    icon: Store,
    title: 'Crie sua Loja',
    description: 'Crie links de pagamento personalizados para seus produtos ou serviços. Compartilhe onde quiser.',
    color: 'purple'
  },
  {
    number: '03',
    icon: DollarSign,
    title: 'Receba na Hora',
    description: 'Cliente paga via PIX, você recebe instantaneamente. Acompanhe tudo pelo painel em tempo real.',
    color: 'green'
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-900/50 border border-blue-700/50 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            Simples e rápido
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Como funciona?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Em apenas 3 passos simples, você já está recebendo pagamentos.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-700 via-purple-700 to-green-700" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            const colorClasses = {
              blue: 'from-blue-500 to-blue-700 shadow-blue-900/50',
              purple: 'from-purple-500 to-purple-700 shadow-purple-900/50',
              green: 'from-green-500 to-green-700 shadow-green-900/50'
            };

            return (
              <div key={index} className="relative">
                <div className="bg-gray-800 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 border border-gray-700 group">
                  {/* Step number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gray-900 rounded-full border-4 border-gray-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-400">{step.number}</span>
                  </div>

                  {/* Icon */}
                  <div className={`w-20 h-20 bg-gradient-to-br ${colorClasses[step.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3 text-center">
                    {step.title}
                  </h3>

                  <p className="text-gray-400 text-center leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-gray-300 mb-6">
            Sem complicação, sem burocracia. É realmente assim, simples!
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            Criar Minha Conta Grátis
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}