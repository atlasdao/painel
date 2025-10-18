'use client';

import { Shield, Zap, Lock, Globe2, Sparkles, Users } from 'lucide-react';

export default function WhyAtlas() {
  const reasons = [
    {
      icon: Shield,
      title: 'Sem KYC, Sem Burocracia',
      description: 'Comece a receber pagamentos imediatamente. Não exigimos documentos complexos ou análise de crédito. Sua privacidade é respeitada.',
      highlight: 'Ativação instantânea'
    },
    {
      icon: Lock,
      title: 'Soberania Financeira',
      description: 'Você mantém controle total sobre seus fundos. Sem bloqueios arbitrários, sem retenções desnecessárias. Seu dinheiro, suas regras.',
      highlight: 'Controle total'
    },
    {
      icon: Zap,
      title: 'Infraestrutura Moderna',
      description: 'Construído com as tecnologias mais recentes. API REST moderna, webhooks em tempo real, e performance excepcional.',
      highlight: '99.9% uptime'
    },
    {
      icon: Globe2,
      title: 'Focado em Privacidade',
      description: 'Não vendemos seus dados. Não rastreamos desnecessariamente. Transparência total sobre como suas informações são usadas.',
      highlight: 'Seus dados protegidos'
    },
    {
      icon: Sparkles,
      title: 'Inovação Constante',
      description: 'Sempre adicionando novos recursos. Em breve: cartões, boletos, e mais métodos de pagamento para expandir seu negócio.',
      highlight: 'Sempre evoluindo'
    },
    {
      icon: Users,
      title: 'Comunidade Crescente',
      description: 'Junte-se a dezenas de empresas que já escolheram a liberdade. Compartilhe experiências e cresça junto com outros empreendedores.',
      highlight: 'Crescemos juntos'
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Por que escolher Atlas?
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Mais que um gateway,
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> uma filosofia</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Acreditamos em um futuro onde empresas têm controle total sobre seus pagamentos,
            sem intermediários desnecessários ou burocracias que limitam o crescimento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <div
                key={index}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

                <div className="relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-transparent h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {reason.title}
                      </h3>

                      <p className="text-gray-600 mb-3 leading-relaxed">
                        {reason.description}
                      </p>

                      <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 rounded-full text-sm font-medium">
                        {reason.highlight}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-30 translate-y-30" />
          </div>

          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Pronto para ter controle total sobre seus pagamentos?
            </h3>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Junte-se às empresas que escolheram liberdade, transparência e inovação.
              Sem burocracia, sem surpresas, apenas pagamentos que funcionam.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300"
              >
                Criar Conta Grátis
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="/devs"
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all duration-300"
              >
                Ver Documentação
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}