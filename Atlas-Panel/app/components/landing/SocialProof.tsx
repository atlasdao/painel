'use client';

import { useRef, useState, useEffect } from 'react';

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

const testimonials = [
  {
    quote:
      '\u201CMigrei do MercadoPago e economizei mais de R$ 3.000 so no primeiro mes. A taxa de 0,5% faz uma diferenca enorme quando voce vende todo dia.\u201D',
    author: 'Carlos M.',
    role: 'Loja de Eletronicos',
  },
  {
    quote:
      '\u201CConfigurei em 5 minutos e ja comecei a receber. Envio o link pelo WhatsApp e o cliente paga na hora. Muito mais simples que maquininha.\u201D',
    author: 'Juliana R.',
    role: 'Consultoria',
  },
  {
    quote:
      '\u201CFinalmente um gateway que respeita minha privacidade. Sem burocracia e recebo no dia seguinte sem stress nenhum.\u201D',
    author: 'Roberto S.',
    role: 'E-commerce',
  },
];

export default function SocialProof() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`py-16 sm:py-24 md:py-32 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50 text-center mb-10 sm:mb-16">
          O que dizem nossos comerciantes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8"
            >
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {t.quote}
              </p>
              <div className="mt-4 sm:mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm font-medium text-zinc-50">{t.author}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
