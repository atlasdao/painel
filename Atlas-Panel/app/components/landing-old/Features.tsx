'use client';

import { Shield, Lock, Eye, EyeOff, Zap, CreditCard, Link2, BarChart3, HeadphonesIcon, UserX } from 'lucide-react';

const features = [
  {
    icon: EyeOff,
    title: 'Anonimato Total',
    description: 'Seus clientes pagam sem que seus dados pessoais sejam expostos. Privacidade para você e para quem compra.',
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    icon: Shield,
    title: 'Dados Protegidos',
    description: 'Não compartilhamos suas informações com terceiros. Seus dados são seus e de mais ninguém.',
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    icon: Lock,
    title: 'Transações Seguras',
    description: 'Criptografia de ponta a ponta em todas as operações. Segurança de nível bancário sem a burocracia.',
    gradient: 'from-green-400 to-emerald-600'
  },
  {
    icon: Zap,
    title: 'PIX Instantâneo',
    description: 'Receba pagamentos em segundos, 24 horas por dia, 7 dias por semana. Seu dinheiro na hora.',
    gradient: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Link2,
    title: 'Links de Pagamento',
    description: 'Crie links personalizados e compartilhe com seus clientes. Simples, rápido e sem complicação.',
    gradient: 'from-pink-400 to-rose-500'
  },
  {
    icon: UserX,
    title: 'Sem Burocracia',
    description: 'Comece a receber pagamentos imediatamente. Sem análise de crédito, sem documentação complexa.',
    gradient: 'from-teal-400 to-cyan-500'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Privacidade como prioridade
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Liberdade financeira com
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> privacidade real</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Em um mundo onde seus dados são o produto, oferecemos uma alternativa:
            pagamentos seguros onde você mantém o controle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-gray-900 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-700 hover:border-purple-700/50"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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

        {/* Bottom message */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 bg-gray-900 rounded-full px-6 py-3 border border-gray-700">
            <Lock className="w-5 h-5 text-purple-400" />
            <span className="text-gray-300">Privacidade tem seu valor. E nós oferecemos pelo preço justo.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
