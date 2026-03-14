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

const rows = [
  { feature: 'Taxa por transacao', atlas: '0,5% + R$ 0,99', others: '2% a 10%' },
  { feature: 'Mensalidade', atlas: 'Nenhuma', others: 'R$ 0 a R$ 79/mes' },
  { feature: 'Privacidade dos dados', atlas: 'Garantida', others: 'Varia' },
  { feature: 'Tempo de ativacao', atlas: 'Minutos', others: '1 a 7 dias' },
  { feature: 'Tempo de resposta do suporte', atlas: 'Media < 60s', others: 'Varia' },
  { feature: 'Documentos exigidos', atlas: 'Nenhum', others: 'CPF, CNPJ, etc.' },
];

export default function Comparison() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`py-16 sm:py-24 md:py-32 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
            Por que comerciantes migram para Atlas
          </h2>
          <p className="text-zinc-400 mt-3 sm:mt-4 text-sm sm:text-base">
            Compare e veja a diferenca.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-zinc-800">
            <div className="p-4 sm:p-5" />
            <div className="p-4 sm:p-5 text-center border-l border-zinc-800">
              <span className="text-sm sm:text-base font-semibold text-blue-400">Atlas</span>
            </div>
            <div className="p-4 sm:p-5 text-center border-l border-zinc-800">
              <span className="text-sm sm:text-base font-semibold text-zinc-500">Outros</span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 ${i < rows.length - 1 ? 'border-b border-zinc-800' : ''}`}
            >
              <div className="p-4 sm:p-5 text-xs sm:text-sm text-zinc-300 flex items-center">
                {row.feature}
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-zinc-800 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-medium text-zinc-50">{row.atlas}</span>
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-zinc-800 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-zinc-500">{row.others}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
