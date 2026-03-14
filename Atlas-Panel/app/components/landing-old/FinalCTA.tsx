'use client';

import { ArrowRight, CheckCircle, Zap, Shield, Lock } from 'lucide-react';
import { useState } from 'react';

export default function FinalCTA() {
  const [email, setEmail] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const benefits = [
    'Privacidade total',
    '0,5% + R$0,99',
    'Sem mensalidade',
    'Ativação instantânea'
  ];

  return (
    <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-600 rounded-3xl p-1">
          <div className="bg-gray-800 rounded-3xl p-8 md:p-12">
            {/* Shield icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
              Proteja sua privacidade
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> hoje mesmo</span>
            </h2>

            <p className="text-xl text-gray-300 text-center mb-8 max-w-2xl mx-auto">
              Receba pagamentos com a menor taxa do mercado e total privacidade. Seus dados protegidos, sempre.
            </p>

            {/* Benefits grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Email signup form */}
            <div className="max-w-md mx-auto mb-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = '/register';
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-gray-600 transition-all text-white placeholder-gray-400"
                  required
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 whitespace-nowrap"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <span className="flex items-center justify-center gap-2">
                    Proteger Meus Dados
                    <ArrowRight className={`w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                  </span>
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-3">
                Sem cartão de crédito. Ativação instantânea.
              </p>
            </div>

            {/* Alternative CTA */}
            <div className="text-center">
              <p className="text-gray-400 mb-2">Prefere explorar primeiro?</p>
              <a
                href="/devs"
                className="inline-flex items-center gap-2 text-purple-400 font-semibold hover:text-blue-400 transition-colors"
              >
                Ver documentação da API
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Trust badge */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sistema operacional</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>Dados protegidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Menor taxa do mercado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-2">Ainda tem dúvidas?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                const element = document.getElementById('pricing');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2 text-purple-400 font-medium hover:text-blue-400 transition-colors"
            >
              Ver preços detalhados
            </button>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <a
              href="https://t.me/atlasDAO_support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-purple-400 font-medium hover:text-blue-400 transition-colors"
            >
              Falar no Telegram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}