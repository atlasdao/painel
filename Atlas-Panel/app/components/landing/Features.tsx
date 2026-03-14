'use client';

import { useRef, useState, useEffect } from 'react';
import { Shield, BarChart3, Link2, Zap, CreditCard, Globe } from 'lucide-react';

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

const features = [
  {
    icon: Link2,
    title: 'Links de Pagamento',
    desc: 'Crie links personalizados para cada produto ou servico. Compartilhe por WhatsApp, Instagram, email ou onde quiser. Seu cliente paga com um clique.',
  },
  {
    icon: BarChart3,
    title: 'Painel de Vendas Completo',
    desc: 'Acompanhe todas as transacoes em tempo real. Veja quanto vendeu hoje, esta semana ou no mes. Exporte relatorios e tenha controle total do seu fluxo.',
  },
  {
    icon: Shield,
    title: 'Privacidade de Verdade',
    desc: 'Seus dados pessoais e financeiros nunca sao vendidos ou compartilhados. Diferente de outros gateways, sua privacidade e prioridade, nao um detalhe.',
  },
  {
    icon: Zap,
    title: 'Recebimento Rapido',
    desc: 'Receba D+1 com a menor taxa (0,5%) ou instantaneamente (0,8%). Sem travas, sem retencao. O dinheiro e seu e chega rapido.',
  },
  {
    icon: CreditCard,
    title: 'Zero Custos Fixos',
    desc: 'Sem mensalidade, sem taxa de adesao, sem surpresas. Voce so paga a taxa quando realmente recebe um pagamento. Comece sem investir nada.',
  },
  {
    icon: Globe,
    title: 'Suporte Humano e Rapido',
    desc: 'Tempo medio de resposta inferior a 60 segundos. Atendimento humano e dedicado, sem filas e sem bots. Voce nunca fica sozinho.',
  },
];

export default function Features() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`py-16 sm:py-24 md:py-32 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
            Tudo que voce precisa para vender mais
          </h2>
          <p className="text-zinc-400 mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Ferramentas simples e poderosas para comerciantes que querem
            receber pagamentos sem complicacao.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 hover:border-zinc-700 active:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 mb-4">
                <f.icon className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-50">{f.title}</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
