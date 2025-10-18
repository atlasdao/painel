'use client';

import { ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { useState } from 'react';

export default function FinalCTA() {
  const [email, setEmail] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const benefits = [
    'Setup em minutos',
    'Sem mensalidade',
    'Sem taxa de setup',
    'Ativação instantânea'
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-1">
          <div className="bg-white rounded-3xl p-8 md:p-12">
            {/* Lightning icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              Comece a receber pagamentos
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> hoje mesmo</span>
            </h2>

            <p className="text-xl text-gray-600 text-center mb-8 max-w-2xl mx-auto">
              Junte-se às dezenas de empresas que já economizam milhares de reais em taxas todos os meses.
            </p>

            {/* Benefits grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
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
                  className="flex-1 px-6 py-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  required
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 whitespace-nowrap"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <span className="flex items-center justify-center gap-2">
                    Começar Grátis
                    <ArrowRight className={`w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                  </span>
                </button>
              </form>
              <p className="text-xs text-gray-500 text-center mt-3">
                Não pedimos cartão de crédito. Cancele quando quiser.
              </p>
            </div>

            {/* Alternative CTA */}
            <div className="text-center">
              <p className="text-gray-600 mb-2">Prefere explorar primeiro?</p>
              <a
                href="/devs"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-purple-600 transition-colors"
              >
                Ver documentação da API
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Trust badge */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sistema operacional</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>99.9% uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Suporte 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-2">Ainda tem dúvidas?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                const element = document.getElementById('pricing');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-purple-600 transition-colors"
            >
              Ver preços detalhados
            </button>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <a
              href="https://t.me/atlasDAO_support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              Falar no Telegram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}