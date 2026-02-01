import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pagina nao encontrada | Atlas',
  description: 'A pagina que voce procura nao existe ou foi movida. Volte para a pagina inicial do Atlas.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <Image
            src="/atlas-logo.jpg"
            alt="Atlas"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <span className="text-2xl font-bold text-white">Atlas</span>
        </Link>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-white mb-4">
          Pagina nao encontrada
        </h2>
        <p className="text-gray-400 mb-8">
          A pagina que voce procura nao existe, foi movida ou esta temporariamente indisponivel.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Voltar ao Inicio
          </Link>
          <Link
            href="/devs"
            className="inline-flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 px-6 py-3 rounded-lg font-semibold hover:border-gray-600 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Documentacao API
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm mb-4">Paginas populares:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Entrar
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              Criar Conta
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/status" className="text-blue-400 hover:text-blue-300 transition-colors">
              Status
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/termos" className="text-blue-400 hover:text-blue-300 transition-colors">
              Termos
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-8">
          <p className="text-gray-500 text-sm">
            Precisa de ajuda?{' '}
            <a
              href="https://t.me/atlasDAO_support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Fale conosco no Telegram
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
