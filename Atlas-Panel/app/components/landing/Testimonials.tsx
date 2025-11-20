'use client';

import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Carlos Mendes',
      role: 'CEO',
      company: 'TechStart Solutions',
      avatar: 'CM',
      content: 'Finalmente um gateway que entende startups. Sem burocracia, taxas justas e o melhor: começamos a receber no mesmo dia. Atlas mudou nosso jogo.',
      rating: 5,
      highlight: 'Ativação no mesmo dia'
    },
    {
      name: 'Ana Beatriz',
      role: 'Fundadora',
      company: 'E-commerce Boutique',
      avatar: 'AB',
      content: 'Migrei do MercadoPago e economizei R$ 3.000 só no primeiro mês. A API é simples, o suporte responde rápido e não tive nenhum problema até hoje.',
      rating: 5,
      highlight: 'Economia de 40% em taxas'
    },
    {
      name: 'Roberto Silva',
      role: 'CTO',
      company: 'SaaS Platform',
      avatar: 'RS',
      content: 'A documentação da API é excelente. Integrei em menos de 2 horas e os webhooks funcionam perfeitamente. É raro encontrar essa qualidade técnica.',
      rating: 5,
      highlight: 'Integração em 2 horas'
    },
    {
      name: 'Mariana Costa',
      role: 'Proprietária',
      company: 'Consultoria Digital',
      avatar: 'MC',
      content: 'Sem KYC foi um diferencial enorme para mim. Comecei a usar no mesmo dia e recebo meus pagamentos instantaneamente. Simples e eficiente.',
      rating: 5,
      highlight: 'Sem burocracia'
    },
    {
      name: 'Pedro Alves',
      role: 'Diretor',
      company: 'Agência Criativa',
      avatar: 'PA',
      content: 'O dashboard é intuitivo e completo. Consigo acompanhar tudo em tempo real e os relatórios me ajudam muito na gestão financeira.',
      rating: 5,
      highlight: 'Dashboard completo'
    },
    {
      name: 'Juliana Santos',
      role: 'CEO',
      company: 'EdTech Startup',
      avatar: 'JS',
      content: 'Suporte via Telegram que realmente funciona! Tive uma dúvida às 22h e fui atendida em minutos. Isso faz toda a diferença para quem empreende.',
      rating: 5,
      highlight: 'Suporte 24/7'
    }
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-yellow-600" />
            Avaliação 5.0 de nossos clientes
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Empresas reais,
            <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"> resultados reais</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Dezenas de empresas já transformaram seus pagamentos com Atlas.
            Veja o que elas têm a dizer sobre nossa plataforma.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-gray-200" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-6 leading-relaxed relative z-10">
                "{testimonial.content}"
              </p>

              {/* Highlight */}
              <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 rounded-full text-sm font-medium mb-6">
                {testimonial.highlight}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">
                    {testimonial.role} • {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust metrics */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold mb-2">98%</p>
              <p className="text-blue-100">Satisfação dos clientes</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">2h</p>
              <p className="text-blue-100">Tempo médio de integração</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">40%</p>
              <p className="text-blue-100">Economia média em taxas</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">24/7</p>
              <p className="text-blue-100">Suporte disponível</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}