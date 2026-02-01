'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Zap, Shield, TrendingUp, Check, Link2, CreditCard, Smartphone } from 'lucide-react';

export default function Hero() {
  const [isHovered, setIsHovered] = useState(false);

  const benefits = [
    'Privacidade e anonimato garantidos',
    'Seus dados nunca são compartilhados',
    'Receba na hora via PIX'
  ];

  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

      {/* Animated background shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>Privacidade em primeiro lugar</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Pagamentos com
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Privacidade Total</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Receba via PIX com segurança e anonimato. Seus dados protegidos, suas transações privadas.
              Taxas justas para quem valoriza a própria liberdade.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                Criar Conta Grátis
                <ChevronRight className={`w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
              </Link>

              <button
                onClick={() => {
                  const element = document.getElementById('pricing');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center justify-center gap-2 bg-gray-800 border-2 border-gray-700 text-gray-300 px-8 py-4 rounded-lg font-semibold hover:border-blue-400 hover:text-blue-400 transition-all duration-300"
              >
                Ver Como Funciona
              </button>
            </div>

            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-green-900/50 border border-green-700/50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Payment Link Demo */}
          <div className="relative">
            <div className="relative bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
              {/* Payment Link Interface Demo */}
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-2">Seu Link de Pagamento</p>
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <Link2 className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300 font-mono text-sm flex-1">painel.atlasdao.info/sua-loja</span>
                  <button className="text-blue-400 hover:text-blue-300 font-medium text-sm">Copiar</button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 rounded-lg p-4 border border-purple-700/50">
                  <p className="text-2xl font-bold text-purple-400">100%</p>
                  <p className="text-xs text-gray-400">privacidade</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-green-700/50">
                  <p className="text-2xl font-bold text-green-400">Instantâneo</p>
                  <p className="text-xs text-gray-400">receba na hora</p>
                </div>
              </div>

              {/* Recent payments */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Últimos recebimentos</p>

                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-900/50 border border-green-700/50 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">PIX Recebido</p>
                      <p className="text-sm text-gray-400">Via link de pagamento</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">+R$ 150,00</p>
                    <p className="text-xs text-gray-400">há 2 min</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-900/50 border border-green-700/50 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">QR Code Pago</p>
                      <p className="text-sm text-gray-400">Cliente móvel</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">+R$ 89,90</p>
                    <p className="text-xs text-gray-400">há 5 min</p>
                  </div>
                </div>
              </div>

              {/* Simple badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Simples Assim
              </div>
            </div>

            {/* Trust badge - responsive */}
            <div className="mt-8 flex justify-center">
              <div className="bg-gray-800 rounded-full shadow-lg px-4 sm:px-6 py-3 flex items-center gap-2 border border-gray-700">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Plataforma segura e confiável</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}