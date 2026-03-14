'use client';

import { useRef, useState, useEffect } from 'react';
import { UserPlus, Link2, QrCode, Wallet } from 'lucide-react';

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

const steps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Crie sua conta em segundos',
    desc: 'Cadastro rapido com email e senha. Sem enviar documentos, sem analise de credito, sem esperar aprovacao. Sua conta fica ativa na hora.',
  },
  {
    num: '02',
    icon: Link2,
    title: 'Gere links de pagamento',
    desc: 'Crie links personalizados para seus produtos ou servicos. Defina o valor, adicione uma descricao e compartilhe com seus clientes via WhatsApp, Instagram ou qualquer canal.',
  },
  {
    num: '03',
    icon: QrCode,
    title: 'Seu cliente paga via PIX',
    desc: 'O cliente acessa o link, escaneia o QR Code e paga com PIX em qualquer banco. O pagamento e confirmado automaticamente em menos de 5 segundos.',
  },
  {
    num: '04',
    icon: Wallet,
    title: 'Voce recebe o dinheiro',
    desc: 'Escolha receber no proximo dia util (D+1 com taxa de 0,5%) ou instantaneamente (taxa de 0,8%). Acompanhe tudo em tempo real pelo painel.',
  },
];

export default function HowItWorks() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      id="como-funciona"
      ref={ref}
      className={`py-16 sm:py-24 md:py-32 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
            Como funciona para seu negocio
          </h2>
          <p className="text-zinc-400 mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Em 4 passos simples voce comeca a receber pagamentos PIX
            com a menor taxa do mercado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {steps.map((s) => (
            <div
              key={s.num}
              className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/10 shrink-0">
                  <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" strokeWidth={1.5} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-400/60 uppercase tracking-wider">Passo {s.num}</span>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-50 mt-1">{s.title}</h3>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
