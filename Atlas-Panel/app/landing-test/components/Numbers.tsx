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

const metrics = [
  { value: 'R$ 2M+', label: 'ja processados' },
  { value: '0,5%', label: 'menor taxa do mercado' },
  { value: '< 5 seg', label: 'para confirmar pagamento' },
  { value: '< 60s', label: 'tempo medio de resposta' },
];

export default function Numbers() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`border-y border-zinc-800 py-10 sm:py-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-50">{m.value}</div>
              <div className="text-xs sm:text-sm text-zinc-500 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
