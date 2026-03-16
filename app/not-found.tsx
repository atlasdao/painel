import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <h1 className="text-7xl font-bold mb-4">404</h1>
      <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
        Página não encontrada
      </p>
      <Link
        href="/"
        className="atlas-btn"
      >
        Voltar
      </Link>
    </div>
  );
}
