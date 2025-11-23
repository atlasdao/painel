'use client';

import { Send } from 'lucide-react';

export default function DepositPage() {
  return (
    <div className="w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-white break-words">Adquirir DePix</h1>
          <p className="text-sm sm:text-base text-gray-400 break-words">Compre DePix de forma rápida e segura</p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-5 sm:p-6 lg:p-8 border border-gray-700 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Icon */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Send className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left w-full min-w-0">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg lg:text-xl font-medium text-white break-words">
                  Agora via Telegram
                </h2>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words">
                  A compra de DePix foi migrada para nosso bot do Telegram para oferecer uma experiência mais rápida e prática.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-1 w-full">
                <a
                  href="https://t.me/atlas_bridge_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm sm:text-base font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <Send size={18} className="flex-shrink-0" />
                  <span className="truncate">Abrir @atlas_bridge_bot</span>
                </a>
                <span className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                  Responde em segundos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="glass-card p-3.5 sm:p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Vantagem</div>
            <div className="text-white text-sm sm:text-base font-medium break-words">Resposta instantânea</div>
          </div>
          <div className="glass-card p-3.5 sm:p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Vantagem</div>
            <div className="text-white text-sm sm:text-base font-medium break-words">Disponível 24/7</div>
          </div>
          <div className="glass-card p-3.5 sm:p-4 border border-gray-700">
            <div className="text-gray-400 text-xs sm:text-sm mb-1">Vantagem</div>
            <div className="text-white text-sm sm:text-base font-medium break-words">Interface simplificada</div>
          </div>
        </div>
      </div>
    </div>
  );
}
