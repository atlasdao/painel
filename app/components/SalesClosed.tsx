'use client';

import React from 'react';
import Image from 'next/image';

export default function SalesClosed() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/5"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-md w-full">
        {/* Logo - Above gradient effects */}
        <div className="flex justify-center mb-8">
          <div className="relative z-20 w-32 h-32 bg-white rounded-2xl p-4 shadow-2xl">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas Pay"
              width={112}
              height={112}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Vendas Encerradas
          </h1>

          {/* Message */}
          <p className="text-gray-300 text-center text-lg mb-8">
            Este link de pagamento está temporariamente desativado.
          </p>

          {/* Decorative line */}
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"></div>
          </div>

          {/* Additional info */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Para mais informações, entre em contato com o vendedor.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Powered by{' '}
            <span className="font-semibold text-white">Atlas Pay</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}